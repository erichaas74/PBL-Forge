import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { SessionService } from '../../../core/firebase/session.service';
import {
  DragonAssignment,
  DragonSimulationDefinition,
  DragonSimulationId,
  DragonSimulationRun,
  GeneratedSimulationQuestion,
  InstructionLevel,
  ResolvedSimulationSettings,
  SimulationResponseRecord,
} from './dragon-simulation.models';
import {
  DEFAULT_DRAGON_ASSIGNMENT,
  DRAGON_SIMULATION_CONTENT_VERSION,
  isDragonSimulationId,
} from './dragon-simulation.registry';
import {
  evaluateSimulationAnswer,
  planSimulationQuestions,
  questionsForRun,
} from './dragon-question.generator';
import { buildStudentInquiryHistory } from '../inquiry/inquiry-history';
import { DEFAULT_INQUIRY_SETTINGS, normalizeInquirySettings } from '../inquiry/inquiry-policy';
import { StudentInquiryHistory } from '../inquiry/inquiry.models';
import { DragonAdaptiveRepository } from './dragon-adaptive.repository';
import { resolveSimulationSettings } from './dragon-assignment.resolver';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  normalizeAlleleVaultGeneIds,
} from '../workstations/allele-workbench/allele-vault.models';
import {
  createEmptyGeneticsNotebook,
  DiscoveryClaimStatus,
  evaluateDiscoveryClaim,
  GeneticsNotebookSnapshot,
  mergeGeneticsNotebooks,
  normalizeGeneticsNotebook,
  recordAlleleExperiment as addAlleleExperiment,
} from '../workstations/shared/genetics-notebook.models';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../workstations/shared/dragon-workstation-context.models';
import { normalizeDragonClassJourneyPlan } from '../journey/config/dragon-journey.registry';

const LOCAL_ASSIGNMENT_KEY = 'pbl-forge.dragon-genetics.assignment.v1';
const LOCAL_RUNS_KEY_PREFIX = 'pbl-forge.dragon-genetics.runs.v1';
const LOCAL_NOTEBOOK_KEY_PREFIX = 'pbl-forge.dragon-genetics.notebook.v1';

@Injectable({ providedIn: 'root' })
export class DragonAdaptiveStore {
  private readonly repository = inject(DragonAdaptiveRepository);
  private readonly session = inject(SessionService);
  private readonly assignmentSignal = signal<DragonAssignment>(loadLocalAssignment());
  private readonly runsSignal = signal<Partial<Record<DragonSimulationId, DragonSimulationRun>>>(
    {},
  );
  private readonly geneticsNotebookSignal = signal<GeneticsNotebookSnapshot>(
    loadLocalGeneticsNotebook(LOCAL_WORKSTATION_STUDENT_ID),
  );
  private readonly teacherPreviewLevelSignal = signal<InstructionLevel | null>(null);
  private hydratedUserId: string | null = null;
  private hydrationRequest = 0;
  private hydrationPromise: Promise<void> | null = null;

  readonly assignment = this.assignmentSignal.asReadonly();
  readonly runs = this.runsSignal.asReadonly();
  readonly geneticsNotebook = this.geneticsNotebookSignal.asReadonly();
  readonly availableAlleleGeneIds = computed(
    () => this.assignmentSignal().alleleCatalog.availableGeneIds,
  );
  readonly teacherPreviewLevel = this.teacherPreviewLevelSignal.asReadonly();
  readonly persistenceState = signal<'loading' | 'saved' | 'saving' | 'error'>('loading');
  readonly ready = signal(false);
  readonly completedCount = computed(
    () => Object.values(this.runsSignal()).filter((run) => run?.complete).length,
  );

  /** Class question policy, concept settings, opt-outs, and teacher-authored items. */
  readonly inquirySettings = computed(
    () => this.assignmentSignal().inquirySettings ?? DEFAULT_INQUIRY_SETTINGS,
  );

  /**
   * What this student has already shown, derived from runs and the genetics notebook that the app
   * already persists. Selection reads this to weight concepts, cool down repeated items, gate on
   * prerequisites, and move the instruction level.
   */
  readonly inquiryHistory = computed<StudentInquiryHistory>(() =>
    buildStudentInquiryHistory(
      this.session.user()?.uid ?? LOCAL_WORKSTATION_STUDENT_ID,
      Object.values(this.runsSignal()).filter((run): run is DragonSimulationRun => !!run),
      this.geneticsNotebookSignal(),
    ),
  );

  constructor() {
    this.hydrationPromise = this.hydrate();
    effect(() => {
      const userId = this.session.user()?.uid ?? null;
      if (userId === this.hydratedUserId) return;
      const storageStudentId = userId ?? LOCAL_WORKSTATION_STUDENT_ID;
      this.ready.set(false);
      this.runsSignal.set(loadLocalRuns(storageStudentId));
      this.geneticsNotebookSignal.set(loadLocalGeneticsNotebook(storageStudentId));
      this.hydrationPromise = this.hydrate();
    });
  }

  settingsFor(
    simulationId: DragonSimulationId,
    studentId = this.session.user()?.uid ?? LOCAL_WORKSTATION_STUDENT_ID,
  ): ResolvedSimulationSettings {
    return resolveSimulationSettings(
      this.assignmentSignal(),
      simulationId,
      studentId,
      this.teacherPreviewLevelSignal(),
    );
  }

  setTeacherPreviewLevel(level: InstructionLevel | null): void {
    this.teacherPreviewLevelSignal.set(level);
  }

  async prepareRun(
    definition: DragonSimulationDefinition,
    forceNew = false,
  ): Promise<DragonSimulationRun> {
    await this.awaitCurrentHydration();
    const user = await this.session.ensureUser();
    const studentId = user?.uid ?? LOCAL_WORKSTATION_STUDENT_ID;
    const settings = this.settingsFor(definition.id, studentId);
    const local = this.runsSignal()[definition.id];
    let remote: DragonSimulationRun | null = null;
    try {
      remote = await this.repository.loadRun(definition.id);
    } catch {
      // Offline/local work continues from the device copy.
    }
    const existing = newerRun(local, remote);
    const canResume =
      !forceNew &&
      existing &&
      existing.contentVersion === DRAGON_SIMULATION_CONTENT_VERSION &&
      (!existing.complete ||
        (existing.assignmentVersion === settings.assignmentVersion &&
          existing.level === settings.level));
    if (canResume) {
      this.putRun(existing);
      return existing;
    }

    const attemptNumber = (existing?.attemptNumber ?? 0) + 1;
    const seed = `${studentId}:${settings.assignmentId}:${definition.id}:${settings.assignmentVersion}:${attemptNumber}`;
    // Selection happens once, here. The chosen items are frozen onto the run so that answering a
    // question — which changes the history selection reads — cannot reshuffle the run in progress.
    const plan = planSimulationQuestions({
      definition,
      settings,
      seed,
      studentId,
      history: this.inquiryHistory(),
      inquirySettings: this.inquirySettings(),
      studentOverride: this.assignmentSignal().studentOverrides[studentId]?.inquiry,
    });
    const questions = plan.questions;
    const now = new Date().toISOString();
    const run: DragonSimulationRun = {
      schemaVersion: 1,
      simulationId: definition.id,
      studentId,
      assignmentId: settings.assignmentId,
      assignmentVersion: settings.assignmentVersion,
      contentVersion: DRAGON_SIMULATION_CONTENT_VERSION,
      level: plan.resolved.level,
      hintsAllowed: plan.resolved.hintsAllowed,
      seed,
      attemptNumber,
      currentQuestionIndex: 0,
      questionIds: questions.map((question) => question.id),
      servedItemIds: questions.map((question) => question.templateId),
      responses: [],
      complete: false,
      score: 0,
      startedAtIso: now,
      updatedAtIso: now,
    };
    this.putRun(run);
    await this.persist(run);
    return run;
  }

  /**
   * Rebuilds a run's questions from the item ids frozen onto it. Never re-runs selection: the
   * student's history changes with each answer, and re-selecting mid-run would swap the questions
   * underneath them.
   */
  questionsFor(
    definition: DragonSimulationDefinition,
    run: DragonSimulationRun,
  ): GeneratedSimulationQuestion[] {
    return questionsForRun(definition, run, this.inquirySettings());
  }

  answer(
    definition: DragonSimulationDefinition,
    question: GeneratedSimulationQuestion,
    selectedOptionId: string,
  ): DragonSimulationRun | null {
    const run = this.runsSignal()[definition.id];
    if (
      !run ||
      run.complete ||
      run.responses.some((response) => response.questionId === question.id)
    ) {
      return run ?? null;
    }
    const evaluation = evaluateSimulationAnswer(question, selectedOptionId);
    const response: SimulationResponseRecord = {
      questionId: question.id,
      templateId: question.templateId,
      sectionId: question.sectionId,
      selectedOptionId,
      correct: evaluation.correct,
      misconceptionFlag: evaluation.misconceptionFlag,
      conceptId: evaluation.conceptId,
      answeredAtIso: new Date().toISOString(),
    };
    const responses = [...run.responses, response];
    const next = {
      ...run,
      responses,
      // A run can legitimately be short when the bank has few eligible items, so guard the divisor.
      score: run.questionIds.length
        ? Math.round((100 * responses.filter((item) => item.correct).length) / run.questionIds.length)
        : 0,
      updatedAtIso: new Date().toISOString(),
    };
    this.putRun(next);
    void this.persist(next);
    return next;
  }

  advance(simulationId: DragonSimulationId): DragonSimulationRun | null {
    const run = this.runsSignal()[simulationId];
    if (!run) return null;
    const answered = run.responses.some(
      (response) => response.questionId === run.questionIds[run.currentQuestionIndex],
    );
    if (!answered) return run;
    const last = run.currentQuestionIndex >= run.questionIds.length - 1;
    const next = {
      ...run,
      currentQuestionIndex: last ? run.currentQuestionIndex : run.currentQuestionIndex + 1,
      complete: last,
      updatedAtIso: new Date().toISOString(),
    };
    this.putRun(next);
    void this.persist(next);
    return next;
  }

  async restart(definition: DragonSimulationDefinition): Promise<DragonSimulationRun> {
    return this.prepareRun(definition, true);
  }

  async saveAssignment(assignment: DragonAssignment): Promise<void> {
    this.persistenceState.set('saving');
    const user = await this.session.ensureUser();
    const next = {
      ...assignment,
      ownerId: user?.uid ?? assignment.ownerId,
      updatedAtIso: new Date().toISOString(),
    };
    try {
      await this.repository.saveAssignment(next);
      this.assignmentSignal.set(next);
      saveLocalAssignment(next);
      this.persistenceState.set('saved');
    } catch (error) {
      console.error('Dragon Genetics assignment could not be saved.', error);
      this.persistenceState.set('error');
      throw error;
    }
  }

  recordAlleleExperiment(
    geneId: string,
    pairIds: readonly [string, string],
    phenotype: string,
  ): void {
    const gene = ALLELE_VAULT_GENES.find((candidate) => candidate.id === geneId);
    if (!gene || !this.availableAlleleGeneIds().includes(geneId)) return;
    const next = addAlleleExperiment(
      this.geneticsNotebookSignal(),
      gene,
      ALLELE_VAULT_ALLELES,
      pairIds,
      phenotype,
    );
    this.putGeneticsNotebook(next);
    void this.persistGeneticsNotebook(this.geneticsNotebookSignal());
  }

  submitAlleleDiscovery(
    geneId: string,
    traitId: string,
    dominantAlleleId: string,
    recessiveAlleleId: string,
  ): DiscoveryClaimStatus {
    const gene = ALLELE_VAULT_GENES.find((candidate) => candidate.id === geneId);
    if (!gene || !this.availableAlleleGeneIds().includes(geneId)) return 'incorrect';
    const result = evaluateDiscoveryClaim(
      this.geneticsNotebookSignal(),
      gene,
      ALLELE_VAULT_ALLELES,
      traitId,
      dominantAlleleId,
      recessiveAlleleId,
    );
    if (result.status === 'solved') {
      this.putGeneticsNotebook(result.notebook);
      this.completeAlleleWorkbenchIfReady(this.geneticsNotebookSignal());
      void this.persistGeneticsNotebook(this.geneticsNotebookSignal());
    }
    return result.status;
  }

  private async hydrate(): Promise<void> {
    const request = ++this.hydrationRequest;
    try {
      const user = await this.session.ensureUser();
      const userId = user?.uid ?? LOCAL_WORKSTATION_STUDENT_ID;
      this.hydratedUserId = user?.uid ?? null;
      const [assignment, remoteRuns, remoteNotebook] = await Promise.all([
        this.repository.loadAssignment(),
        this.repository.loadRuns(),
        this.repository.loadGeneticsNotebook(),
      ]);
      if (request !== this.hydrationRequest || this.session.user()?.uid !== user?.uid) return;
      this.assignmentSignal.set(assignment);
      saveLocalAssignment(assignment);
      const merged = { ...loadLocalRuns(userId) };
      for (const remote of remoteRuns) {
        merged[remote.simulationId] = newerRun(merged[remote.simulationId], remote) ?? remote;
      }
      this.runsSignal.set(merged);
      saveLocalRuns(merged, userId);
      const localNotebook = loadLocalGeneticsNotebook(userId, assignment.id);
      const notebook = mergeGeneticsNotebooks(localNotebook, remoteNotebook);
      this.geneticsNotebookSignal.set(notebook);
      saveLocalGeneticsNotebook(notebook);
      this.persistenceState.set('saved');
    } catch (error) {
      if (request !== this.hydrationRequest) return;
      console.error('Adaptive Dragon Genetics data could not be loaded.', error);
      this.persistenceState.set('error');
    } finally {
      if (request === this.hydrationRequest) this.ready.set(true);
    }
  }

  private putRun(run: DragonSimulationRun): void {
    this.runsSignal.update((runs) => {
      const next = { ...runs, [run.simulationId]: run };
      saveLocalRuns(next, this.session.user()?.uid ?? LOCAL_WORKSTATION_STUDENT_ID);
      return next;
    });
  }

  private async persist(run: DragonSimulationRun): Promise<void> {
    this.persistenceState.set('saving');
    try {
      await this.repository.saveRun(run, this.assignmentSignal().ownerId);
      this.persistenceState.set('saved');
    } catch (error) {
      console.error('Dragon Genetics simulation run could not be saved.', error);
      this.persistenceState.set('error');
    }
  }

  private putGeneticsNotebook(notebook: GeneticsNotebookSnapshot): void {
    const next = {
      ...notebook,
      assignmentId: this.assignmentSignal().id,
      studentId: this.session.user()?.uid ?? notebook.studentId,
    };
    this.geneticsNotebookSignal.set(next);
    saveLocalGeneticsNotebook(next);
  }

  private completeAlleleWorkbenchIfReady(notebook: GeneticsNotebookSnapshot): void {
    const available = this.availableAlleleGeneIds();
    if (!available.length || !available.every((geneId) => !!notebook.discoveries[geneId])) return;
    const run = this.runsSignal()['allele-workbench'];
    if (!run || run.complete) return;
    const next = {
      ...run,
      complete: true,
      score: 100,
      updatedAtIso: new Date().toISOString(),
    };
    this.putRun(next);
    void this.persist(next);
  }

  private async persistGeneticsNotebook(notebook: GeneticsNotebookSnapshot): Promise<void> {
    this.persistenceState.set('saving');
    try {
      await this.repository.saveGeneticsNotebook(notebook, this.assignmentSignal().ownerId);
      this.persistenceState.set('saved');
    } catch (error) {
      console.error('Genetics research chart could not be saved.', error);
      this.persistenceState.set('error');
    }
  }

  private async awaitCurrentHydration(): Promise<void> {
    let pending = this.hydrationPromise;
    while (pending) {
      await pending;
      if (pending === this.hydrationPromise) return;
      pending = this.hydrationPromise;
    }
  }
}

function newerRun(
  first: DragonSimulationRun | null | undefined,
  second: DragonSimulationRun | null | undefined,
): DragonSimulationRun | null {
  if (!first) return second ?? null;
  if (!second) return first;
  return first.updatedAtIso >= second.updatedAtIso ? first : second;
}

function loadLocalAssignment(): DragonAssignment {
  if (typeof localStorage === 'undefined') return DEFAULT_DRAGON_ASSIGNMENT;
  try {
    const stored = JSON.parse(
      localStorage.getItem(LOCAL_ASSIGNMENT_KEY) ?? 'null',
    ) as Partial<DragonAssignment> | null;
    if (!stored) return DEFAULT_DRAGON_ASSIGNMENT;
    const storedGeneIds = Array.isArray(stored.alleleCatalog?.availableGeneIds)
      ? stored.alleleCatalog.availableGeneIds
      : null;
    const isLegacyMockCatalog =
      stored.assignmentVersion === 1 &&
      storedGeneIds?.length === 4 &&
      ['wings', 'fire', 'horns', 'scales'].every((geneId) => storedGeneIds.includes(geneId));
    const storedVersion = stored.assignmentVersion ?? 0;
    return {
      ...DEFAULT_DRAGON_ASSIGNMENT,
      ...stored,
      assignmentVersion:
        isLegacyMockCatalog || storedVersion < DEFAULT_DRAGON_ASSIGNMENT.assignmentVersion
          ? DEFAULT_DRAGON_ASSIGNMENT.assignmentVersion
          : storedVersion,
      alleleCatalog: {
        availableGeneIds:
          storedGeneIds && !isLegacyMockCatalog
            ? normalizeAlleleVaultGeneIds(storedGeneIds)
            : [...DEFAULT_DRAGON_ASSIGNMENT.alleleCatalog.availableGeneIds],
      },
      simulationSettings: stored.simulationSettings ?? {},
      journeyPlan: normalizeDragonClassJourneyPlan(stored.journeyPlan),
      inquirySettings: normalizeInquirySettings(stored.inquirySettings),
      studentOverrides: stored.studentOverrides ?? {},
    };
  } catch {
    return DEFAULT_DRAGON_ASSIGNMENT;
  }
}

function loadLocalGeneticsNotebook(
  studentId: string,
  assignmentId = 'default',
): GeneticsNotebookSnapshot {
  if (typeof localStorage === 'undefined') {
    return createEmptyGeneticsNotebook(studentId, assignmentId);
  }
  try {
    const stored = JSON.parse(
      localStorage.getItem(`${LOCAL_NOTEBOOK_KEY_PREFIX}.${studentId}`) ?? 'null',
    );
    return (
      normalizeGeneticsNotebook(stored, studentId) ??
      createEmptyGeneticsNotebook(studentId, assignmentId)
    );
  } catch {
    return createEmptyGeneticsNotebook(studentId, assignmentId);
  }
}

function saveLocalGeneticsNotebook(notebook: GeneticsNotebookSnapshot): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      `${LOCAL_NOTEBOOK_KEY_PREFIX}.${notebook.studentId}`,
      JSON.stringify(notebook),
    );
  }
}

function saveLocalAssignment(assignment: DragonAssignment): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_ASSIGNMENT_KEY, JSON.stringify(assignment));
  }
}

function loadLocalRuns(
  studentId: string,
): Partial<Record<DragonSimulationId, DragonSimulationRun>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const stored = JSON.parse(
      localStorage.getItem(`${LOCAL_RUNS_KEY_PREFIX}.${studentId}`) ?? '{}',
    ) as Record<string, DragonSimulationRun>;
    return Object.fromEntries(
      Object.entries(stored).filter(([simulationId]) => isDragonSimulationId(simulationId)),
    );
  } catch {
    return {};
  }
}

function saveLocalRuns(
  runs: Partial<Record<DragonSimulationId, DragonSimulationRun>>,
  studentId: string,
): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`${LOCAL_RUNS_KEY_PREFIX}.${studentId}`, JSON.stringify(runs));
  }
}
