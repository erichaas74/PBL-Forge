/**
 * Runtime status: ACTIVE — route owner for all optional chapter-based adventures.
 * Inputs/signals: path, lesson, branch, and chapter route params plus student decisions.
 * Data access: adventure/case progress, lesson evidence, and pedigree lab repositories.
 * Connects to: shared adventure shell, open workstations, outcome engines, and path lessons.
 */
import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { evaluateDragonInTheAshPlan } from '../cases/dragon-in-the-ash.outcome';
import { DragonCasePlan, DragonCaseProgress } from '../cases/dragon-case.models';
import { DragonCaseProgressRepository, emptyProgress } from '../cases/dragon-case-progress.repository';
import { evaluateFoodThatStealsFirePlan } from '../cases/food-that-steals-fire.outcome';
import { isDragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';
import { DragonLessonPlanRepository } from '../lesson-plan/dragon-lesson-plan.repository';
import {
  BloodTestEvidenceDraft,
  DragonLessonEvidenceRecord,
  ProteinRescueEvidenceDraft,
} from '../orchestration/dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from '../orchestration/dragon-lesson-evidence.repository';
import { PedigreeLabRepository } from '../workstations/pedigree-lab/pedigree-lab.repository';
import { createEmptyInvestigationRecord } from '../workstations/pedigree-lab/pedigree-lab.models';
import { DragonWorkstationContextService } from '../workstations/shared/dragon-workstation-context.service';
import { DragonAdventureShellComponent } from './dragon-adventure-shell.component';
import { DragonAdventureId, DragonAdventureProgress } from './dragon-adventure.models';
import { DragonAdventureProgressRepository, emptyDragonAdventureProgress } from './dragon-adventure-progress.repository';
import { DRAGON_ADVENTURE_BY_ID, isDragonAdventureId } from './dragon-adventure.registry';
import { resolvePedigreeAdventureCheckpoints } from './pedigree-adventure-checkpoint.adapter';

@Component({
  selector: 'app-dragon-adventure-page',
  imports: [RouterLink, DragonAdventureShellComponent],
  templateUrl: './dragon-adventure.page.html',
  styleUrl: './dragon-adventure.page.scss',
})
export class DragonAdventurePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  private readonly adventureRepository = inject(DragonAdventureProgressRepository);
  private readonly caseRepository = inject(DragonCaseProgressRepository);
  private readonly pedigreeRepository = inject(PedigreeLabRepository);
  private readonly context = inject(DragonWorkstationContextService);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly pathId = computed(() => this.params().get('pathId'));
  readonly lessonId = computed(
    () => this.params().get('lessonId') ?? String(this.route.snapshot.data['lessonId'] ?? ''),
  );
  readonly adventureId = computed<DragonAdventureId | null>(() => {
    const branch = this.params().get('branch');
    if (isDragonAdventureId(branch)) return branch;
    const lessonId = this.lessonId();
    return isDragonAdventureId(lessonId) && lessonId.startsWith('pedigree-') ? lessonId : null;
  });
  readonly definition = computed(() => {
    const id = this.adventureId();
    return id ? DRAGON_ADVENTURE_BY_ID[id] : null;
  });
  readonly progress = linkedSignal<DragonAdventureProgress>(() => this.loadAdventureProgress());
  readonly caseProgress = linkedSignal<DragonCaseProgress>(() => this.loadCaseProgress());
  readonly evidence = linkedSignal<readonly DragonLessonEvidenceRecord[]>(() => this.loadEvidence());
  readonly pedigreeSnapshot = linkedSignal(() => this.pedigreeRepository.load(this.context.studentId()));
  readonly chapter = computed(() => {
    const definition = this.definition();
    if (!definition) return null;
    const requested = this.params().get('chapterId') ?? this.progress().currentChapterId;
    return definition.chapters.find((candidate) => candidate.id === requested) ?? definition.chapters[0];
  });
  readonly pathLabel = computed(() => {
    const pathId = this.pathId();
    return isDragonPathContextId(pathId)
      ? this.lessonPlan.document().paths[pathId].title
      : 'Dragon Genetics';
  });
  readonly lessonUrl = computed(() => ['/dragon-genetics', 'path', this.pathId(), 'lesson', this.lessonId()]);
  readonly patientEvidence = computed(() => this.bloodEvidence('patient'));
  readonly donorEvidence = computed(() => this.bloodEvidence('donor'));
  readonly rescueEvidence = computed(() => this.evidence().filter(
    (record): record is ProteinEvidenceRecord =>
      record.evidenceType === 'protein-rescue' && record.branchId === this.adventureId(),
  ));
  readonly selectedPatientEvidenceId = signal('');
  readonly selectedDonorEvidenceId = signal('');
  readonly selectedRescueEvidenceId = signal('');
  readonly diagnosis = signal('');
  readonly recommendation = signal('');
  readonly claimReview = signal<DragonCasePlan['claimReview'] | ''>('');
  readonly statusMessage = signal('');
  readonly pedigreeState = computed(() => {
    const adventureId = this.adventureId();
    const definition = this.definition();
    if ((adventureId !== 'pedigree-reading' && adventureId !== 'pedigree-models') || !definition?.workstation.investigationId) return null;
    const record = this.pedigreeSnapshot().investigations[definition.workstation.investigationId]
      ?? createEmptyInvestigationRecord();
    return resolvePedigreeAdventureCheckpoints(adventureId, record);
  });
  readonly completedCheckpointIds = computed(() => {
    const ids = new Set(this.progress().completedCheckpointIds);
    const adventureId = this.adventureId();
    if (adventureId === 'dragon-in-the-ash') {
      if (this.patientEvidence().length) ids.add('patient-record');
      if (this.donorEvidence().length) ids.add('donor-record');
      if (this.caseProgress().plans.length) ids.add('recommendation-submitted');
    } else if (adventureId === 'food-that-steals-fire') {
      if (this.rescueEvidence().length) ids.add('rescue-record');
      const plan = this.caseProgress().plans.at(-1);
      if (plan?.diagnosis.trim()) ids.add('molecular-explanation');
      if (plan?.recommendation.trim() && plan.claimReview) ids.add('diet-and-claim');
    } else {
      for (const id of this.pedigreeState()?.completedCheckpointIds ?? []) ids.add(id);
    }
    return [...ids];
  });
  readonly canSubmit = computed(() => {
    if (this.adventureId() === 'dragon-in-the-ash') {
      return Boolean(this.selectedPatientEvidence() && this.selectedDonorEvidence() && this.diagnosis().trim().length >= 16);
    }
    if (this.adventureId() === 'food-that-steals-fire') {
      return Boolean(this.selectedRescueEvidence() && this.diagnosis().trim().length >= 16 && this.recommendation().trim().length >= 12 && this.claimReview());
    }
    return Boolean(this.pedigreeState()?.completedCheckpointIds.length);
  });

  constructor() {
    effect(() => {
      const pathId = this.pathId();
      const definition = this.definition();
      if (!isDragonPathContextId(pathId) || !definition || definition.lessonId !== this.lessonId()) {
        void this.router.navigate(['/dragon-genetics'], { replaceUrl: true });
      }
    });
  }

  beginAdventure(): void {
    const now = new Date().toISOString();
    this.saveAdventure({ ...this.progress(), runtimeState: 'investigating', acceptedAtIso: this.progress().acceptedAtIso ?? now });
    if (this.isCase()) this.saveCase({ ...this.caseProgress(), runtimeState: 'investigating', acceptedAtIso: this.caseProgress().acceptedAtIso ?? now });
    this.goToChapter('briefing');
  }

  goToChapter(chapterId: string): void {
    const definition = this.definition();
    if (!definition?.chapters.some((chapter) => chapter.id === chapterId)) return;
    this.saveAdventure({ ...this.progress(), currentChapterId: chapterId });
    void this.router.navigate([...this.baseUrl(), 'adventure', chapterId]);
  }

  openWorkstation(): void {
    const definition = this.definition();
    if (!definition) return;
    this.saveAdventure({ ...this.progress(), currentChapterId: 'investigate', runtimeState: 'investigating' });
    void this.router.navigate([definition.workstation.route], { queryParams: this.workstationQueryParams() });
  }

  refreshRecords(): void {
    this.evidence.set(this.loadEvidence());
    this.pedigreeSnapshot.set(this.pedigreeRepository.load(this.context.studentId()));
    this.statusMessage.set('Saved investigation records checked. The evidence trail is up to date.');
  }

  continueFromInvestigation(): void {
    this.refreshRecords();
    const required = this.definition()?.checkpoints.filter((checkpoint) => checkpoint.id !== 'recommendation-submitted' && checkpoint.id !== 'molecular-explanation' && checkpoint.id !== 'diet-and-claim' && checkpoint.id !== 'verdict-written') ?? [];
    if (required.every((checkpoint) => this.completedCheckpointIds().includes(checkpoint.id))) {
      this.goToChapter('decision');
    } else {
      this.statusMessage.set('The investigation is still missing a required record. Open the workspace or check the saved records again.');
    }
  }

  updatePatientEvidence(event: Event): void { this.selectedPatientEvidenceId.set((event.target as HTMLSelectElement).value); }
  updateDonorEvidence(event: Event): void { this.selectedDonorEvidenceId.set((event.target as HTMLSelectElement).value); }
  updateRescueEvidence(event: Event): void { this.selectedRescueEvidenceId.set((event.target as HTMLSelectElement).value); }
  updateDiagnosis(event: Event): void { this.diagnosis.set((event.target as HTMLTextAreaElement).value); }
  updateRecommendation(event: Event): void { this.recommendation.set((event.target as HTMLTextAreaElement).value); }
  updateClaimReview(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.claimReview.set(['supported', 'contradicted', 'insufficient'].includes(value) ? value as NonNullable<DragonCasePlan['claimReview']> : '');
  }

  submitDecision(): void {
    if (this.adventureId() === 'dragon-in-the-ash') this.submitBloodPlan();
    else if (this.adventureId() === 'food-that-steals-fire') this.submitProteinPlan();
    else this.submitPedigreeVerdict();
  }

  revise(): void {
    this.saveAdventure({ ...this.progress(), runtimeState: 'revision-needed' });
    this.goToChapter('investigate');
  }

  evidenceLabel(record: BloodEvidenceRecord): string { return `${record.sampleCode} · ${record.dragonName} · ${record.phenotypeName}`; }
  rescueEvidenceLabel(record: ProteinEvidenceRecord): string { return `${record.patientName} · ${record.claimedGenotype} · ${record.sampleEvidence.length} chromosome copies · ${record.digestionTrials.length} trials`; }

  private submitBloodPlan(): void {
    const patient = this.selectedPatientEvidence();
    const donor = this.selectedDonorEvidence();
    if (!patient || !donor || !this.canSubmit()) return;
    const plan: DragonCasePlan = {
      id: `dragon-in-the-ash:${Date.now()}`, caseId: 'dragon-in-the-ash',
      patientEvidenceId: patient.evidenceId, donorEvidenceId: donor.evidenceId,
      citedEvidenceIds: [patient.evidenceId, donor.evidenceId], diagnosis: this.diagnosis().trim(),
      recommendation: `Use ${donor.dragonName} as donor for ${patient.dragonName}.`, lockedAtIso: new Date().toISOString(),
    };
    this.finishCase(plan, evaluateDragonInTheAshPlan(plan, patient, donor));
  }

  private submitProteinPlan(): void {
    const record = this.selectedRescueEvidence();
    const claimReview = this.claimReview();
    if (!record || !claimReview || !this.canSubmit()) return;
    const plan: DragonCasePlan = {
      id: `food-that-steals-fire:${Date.now()}`, caseId: 'food-that-steals-fire', rescueEvidenceId: record.evidenceId,
      citedEvidenceIds: [record.evidenceId], diagnosis: this.diagnosis().trim(), recommendation: this.recommendation().trim(),
      claimReview, lockedAtIso: new Date().toISOString(),
    };
    this.finishCase(plan, evaluateFoodThatStealsFirePlan(plan, record));
  }

  private finishCase(plan: DragonCasePlan, outcome: NonNullable<DragonCaseProgress['latestOutcome']>): void {
    const definition = this.definition();
    if (!definition) return;
    this.saveCase({
      ...this.caseProgress(), runtimeState: outcome.compatible ? 'resolved' : 'revision-needed',
      plans: [...this.caseProgress().plans, plan], latestOutcome: outcome,
      earnedRewardIds: outcome.compatible ? [...new Set([...this.caseProgress().earnedRewardIds, definition.rewardId])] : this.caseProgress().earnedRewardIds,
    });
    this.saveAdventure({
      ...this.progress(), runtimeState: outcome.compatible ? 'resolved' : 'revision-needed',
      citedEvidenceIds: plan.citedEvidenceIds, decisions: { diagnosis: plan.diagnosis, recommendation: plan.recommendation, claimReview: plan.claimReview ?? '' },
      outcomeMessage: outcome.explanation, completedAtIso: outcome.compatible ? outcome.resolvedAtIso : null,
      completedCheckpointIds: [...new Set([...this.completedCheckpointIds(), ...definition.checkpoints.map((checkpoint) => checkpoint.id)])],
      earnedRewardIds: outcome.compatible ? [...new Set([...this.progress().earnedRewardIds, definition.rewardId])] : this.progress().earnedRewardIds,
    });
    this.goToChapter('outcome');
  }

  private submitPedigreeVerdict(): void {
    const definition = this.definition();
    const state = this.pedigreeState();
    if (!definition || !state) return;
    const complete = state.cleanModel && definition.checkpoints.every((checkpoint) => state.completedCheckpointIds.includes(checkpoint.id));
    const now = new Date().toISOString();
    const explanation = complete
      ? `${state.summary} ${definition.clientName} accepts the documented sequence and written verdict.`
      : `${state.summary} Preserve the archive record and return to the lab to complete every checkpoint.`;
    this.saveAdventure({
      ...this.progress(), runtimeState: complete ? 'resolved' : 'revision-needed',
      completedCheckpointIds: state.completedCheckpointIds, outcomeMessage: explanation,
      completedAtIso: complete ? now : null,
      earnedRewardIds: complete ? [...new Set([...this.progress().earnedRewardIds, definition.rewardId])] : this.progress().earnedRewardIds,
    });
    this.goToChapter('outcome');
  }

  private workstationQueryParams(): Record<string, string | null> {
    const definition = this.definition();
    return { path: this.pathId(), lesson: this.lessonId(), branch: this.isCase() ? this.adventureId() : null, investigation: definition?.workstation.investigationId ?? null };
  }
  private baseUrl(): string[] {
    const base = ['/dragon-genetics', 'path', this.pathId() ?? 'arena', 'lesson', this.lessonId()];
    return this.isCase() ? [...base, 'branch', this.adventureId() ?? ''] : base;
  }
  private isCase(): boolean { return this.adventureId() === 'dragon-in-the-ash' || this.adventureId() === 'food-that-steals-fire'; }
  private selectedPatientEvidence(): BloodEvidenceRecord | null { return this.patientEvidence().find((record) => record.evidenceId === this.selectedPatientEvidenceId()) ?? null; }
  private selectedDonorEvidence(): BloodEvidenceRecord | null { return this.donorEvidence().find((record) => record.evidenceId === this.selectedDonorEvidenceId()) ?? null; }
  private selectedRescueEvidence(): ProteinEvidenceRecord | null { return this.rescueEvidence().find((record) => record.evidenceId === this.selectedRescueEvidenceId()) ?? null; }
  private bloodEvidence(role: BloodTestEvidenceDraft['specimenRole']): BloodEvidenceRecord[] {
    return this.evidence().filter((record): record is BloodEvidenceRecord => record.evidenceType === 'blood-test' && record.branchId === this.adventureId() && record.specimenRole === role);
  }
  private loadEvidence(): readonly DragonLessonEvidenceRecord[] {
    const pathId = this.pathId();
    return isDragonPathContextId(pathId) ? this.evidenceRepository.load(this.context.studentId(), pathId, this.lessonId()) : [];
  }
  private loadAdventureProgress(): DragonAdventureProgress {
    const id = this.adventureId(); const pathId = this.pathId();
    return id && isDragonPathContextId(pathId) ? this.adventureRepository.load(this.context.studentId(), pathId, id) : emptyDragonAdventureProgress(this.context.studentId(), 'arena', 'pedigree-reading');
  }
  private loadCaseProgress(): DragonCaseProgress {
    const id = this.adventureId(); const pathId = this.pathId();
    return (id === 'dragon-in-the-ash' || id === 'food-that-steals-fire') && isDragonPathContextId(pathId)
      ? this.caseRepository.load(this.context.studentId(), pathId, id)
      : emptyProgress(this.context.studentId(), 'arena', 'dragon-in-the-ash');
  }
  private saveAdventure(progress: DragonAdventureProgress): void { this.progress.set(this.adventureRepository.save(progress)); }
  private saveCase(progress: DragonCaseProgress): void { this.caseProgress.set(this.caseRepository.save(progress)); }
}

type BloodEvidenceRecord = DragonLessonEvidenceRecord & BloodTestEvidenceDraft;
type ProteinEvidenceRecord = DragonLessonEvidenceRecord & ProteinRescueEvidenceDraft;
