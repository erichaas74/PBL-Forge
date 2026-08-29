/**
 * Runtime status: ACTIVE — nested optional field-case route inside a shared lesson.
 * Inputs/signals: path, lesson, and branch route params plus selected evidence and written claims.
 * Data access: local lesson evidence, case progress/settings, and workstation identity repositories.
 * Connects to: its anchor lesson and the blood-compatibility or protein-rescue workstation.
 */
import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragonLessonPlanRepository } from '../lesson-plan/dragon-lesson-plan.repository';
import { isDragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';
import {
  BloodTestEvidenceDraft,
  DragonLessonEvidenceRecord,
  ProteinRescueEvidenceDraft,
} from '../orchestration/dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from '../orchestration/dragon-lesson-evidence.repository';
import { DragonWorkstationContextService } from '../workstations/shared/dragon-workstation-context.service';
import { evaluateDragonInTheAshPlan } from './dragon-in-the-ash.outcome';
import { evaluateFoodThatStealsFirePlan } from './food-that-steals-fire.outcome';
import { DRAGON_CASE_BY_ID, isDragonCaseId } from './dragon-case.registry';
import { DragonCasePlan, DragonCaseProgress } from './dragon-case.models';
import { DragonCaseProgressRepository, emptyProgress } from './dragon-case-progress.repository';
import { DragonCaseSettingsRepository } from './dragon-case-settings.repository';

@Component({
  selector: 'app-dragon-case-page',
  imports: [RouterLink],
  templateUrl: './dragon-case.page.html',
  styleUrl: './dragon-case.page.scss',
})
export class DragonCasePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  private readonly progressRepository = inject(DragonCaseProgressRepository);
  private readonly caseSettings = inject(DragonCaseSettingsRepository);
  private readonly workstationContext = inject(DragonWorkstationContextService);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly pathId = computed(() => this.params().get('pathId'));
  readonly lessonId = computed(() => this.params().get('lessonId') ?? '');
  readonly caseId = computed(() => this.params().get('branch'));
  readonly definition = computed(() => {
    const caseId = this.caseId();
    return isDragonCaseId(caseId) ? DRAGON_CASE_BY_ID[caseId] : null;
  });
  readonly lesson = computed(() =>
    this.lessonPlan.publishedLessons().find((candidate) => candidate.id === this.lessonId()) ?? null,
  );
  readonly lessonUrl = computed(() => [
    '/dragon-genetics',
    'path',
    this.pathId(),
    'lesson',
    this.lessonId(),
  ]);
  readonly progress = linkedSignal<DragonCaseProgress>(() => this.loadProgress());
  readonly evidence = linkedSignal<readonly DragonLessonEvidenceRecord[]>(() => this.loadEvidence());
  readonly patientEvidence = computed(() => this.bloodEvidence('patient'));
  readonly donorEvidence = computed(() => this.bloodEvidence('donor'));
  readonly rescueEvidence = computed(() => {
    const definition = this.definition();
    if (!definition) return [];
    return this.evidence().filter(
      (record): record is ProteinEvidenceRecord =>
        record.evidenceType === 'protein-rescue' && record.branchId === definition.id,
    );
  });
  readonly selectedPatientEvidenceId = signal('');
  readonly selectedDonorEvidenceId = signal('');
  readonly selectedRescueEvidenceId = signal('');
  readonly diagnosis = signal('');
  readonly recommendation = signal('');
  readonly claimReview = signal<DragonCasePlan['claimReview'] | ''>('');
  readonly statusMessage = signal('');
  readonly canSubmit = computed(() => {
    if (this.definition()?.id === 'food-that-steals-fire') {
      return Boolean(
        this.selectedRescueEvidence() &&
        this.diagnosis().trim().length >= 16 &&
        this.recommendation().trim().length >= 12 &&
        this.claimReview(),
      );
    }
    return Boolean(
      this.selectedPatientEvidence() &&
      this.selectedDonorEvidence() &&
      this.diagnosis().trim().length >= 16,
    );
  });

  constructor() {
    effect(() => {
      const pathId = this.pathId();
      const definition = this.definition();
      const lesson = this.lesson();
      if (
        !isDragonPathContextId(pathId) ||
        !definition ||
        !lesson ||
        definition.anchorLessonId !== lesson.id ||
        !definition.pathIds.includes(pathId) ||
        !this.caseSettings.isEnabled(definition.id)
      ) {
        void this.router.navigate(['/dragon-genetics'], { replaceUrl: true });
      }
    });
  }

  beginCase(): void {
    if (this.progress().runtimeState !== 'offered') return;
    this.saveProgress({
      ...this.progress(),
      runtimeState: 'investigating',
      acceptedAtIso: new Date().toISOString(),
    });
  }

  updatePatientEvidence(event: Event): void {
    this.selectedPatientEvidenceId.set((event.target as HTMLSelectElement).value);
  }

  updateDonorEvidence(event: Event): void {
    this.selectedDonorEvidenceId.set((event.target as HTMLSelectElement).value);
  }

  updateDiagnosis(event: Event): void {
    this.diagnosis.set((event.target as HTMLTextAreaElement).value);
  }

  updateRescueEvidence(event: Event): void {
    this.selectedRescueEvidenceId.set((event.target as HTMLSelectElement).value);
  }

  updateRecommendation(event: Event): void {
    this.recommendation.set((event.target as HTMLTextAreaElement).value);
  }

  updateClaimReview(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.claimReview.set(
      ['supported', 'contradicted', 'insufficient'].includes(value)
        ? value as NonNullable<DragonCasePlan['claimReview']>
        : '',
    );
  }

  submitPlan(): void {
    const definition = this.definition();
    if (definition?.id === 'food-that-steals-fire') {
      this.submitProteinPlan();
      return;
    }
    const patientRecord = this.selectedPatientEvidence();
    const donorRecord = this.selectedDonorEvidence();
    if (!definition || !patientRecord || !donorRecord || !this.canSubmit()) return;
    const lockedAtIso = new Date().toISOString();
    const plan: DragonCasePlan = {
      id: `${definition.id}:${Date.now()}`,
      caseId: definition.id,
      patientEvidenceId: patientRecord.evidenceId,
      donorEvidenceId: donorRecord.evidenceId,
      citedEvidenceIds: [patientRecord.evidenceId, donorRecord.evidenceId],
      diagnosis: this.diagnosis().trim(),
      recommendation: `Use ${donorRecord.dragonName} as donor for ${patientRecord.dragonName}.`,
      lockedAtIso,
    };
    const outcome = evaluateDragonInTheAshPlan(plan, patientRecord, donorRecord);
    this.saveProgress({
      ...this.progress(),
      runtimeState: outcome.compatible ? 'resolved' : 'revision-needed',
      plans: [...this.progress().plans, plan],
      latestOutcome: outcome,
      earnedRewardIds: outcome.compatible
        ? [...new Set([...this.progress().earnedRewardIds, 'healers-seal'])]
        : this.progress().earnedRewardIds,
    });
    this.statusMessage.set(
      outcome.compatible
        ? 'Recommendation accepted. The Compatibility Record has been archived.'
        : 'Treatment paused. Your evidence remains available while you revise the recommendation.',
    );
  }

  rescueEvidenceLabel(record: ProteinEvidenceRecord): string {
    return `${record.patientName} · ${record.claimedGenotype} · ${record.sampleEvidence.length} chromosome copies · ${record.digestionTrials.length} trials`;
  }

  evidenceLabel(record: BloodEvidenceRecord): string {
    return `${record.sampleCode} · ${record.dragonName} · ${record.phenotypeName}`;
  }

  workstationQueryParams(): Record<string, string | null> {
    const definition = this.definition();
    return {
      path: this.pathId(),
      lesson: this.lessonId(),
      branch: definition?.id ?? null,
    };
  }

  private selectedPatientEvidence(): BloodEvidenceRecord | null {
    return (
      this.patientEvidence().find(
        (record) => record.evidenceId === this.selectedPatientEvidenceId(),
      ) ?? null
    );
  }

  private selectedDonorEvidence(): BloodEvidenceRecord | null {
    return (
      this.donorEvidence().find(
        (record) => record.evidenceId === this.selectedDonorEvidenceId(),
      ) ?? null
    );
  }

  private selectedRescueEvidence(): ProteinEvidenceRecord | null {
    return (
      this.rescueEvidence().find(
        (record) => record.evidenceId === this.selectedRescueEvidenceId(),
      ) ?? null
    );
  }

  private submitProteinPlan(): void {
    const definition = this.definition();
    const record = this.selectedRescueEvidence();
    const claimReview = this.claimReview();
    if (
      definition?.id !== 'food-that-steals-fire' ||
      !record ||
      !claimReview ||
      !this.canSubmit()
    ) return;
    const plan: DragonCasePlan = {
      id: `${definition.id}:${Date.now()}`,
      caseId: definition.id,
      rescueEvidenceId: record.evidenceId,
      citedEvidenceIds: [record.evidenceId],
      diagnosis: this.diagnosis().trim(),
      recommendation: this.recommendation().trim(),
      claimReview,
      lockedAtIso: new Date().toISOString(),
    };
    const outcome = evaluateFoodThatStealsFirePlan(plan, record);
    this.saveProgress({
      ...this.progress(),
      runtimeState: outcome.compatible ? 'resolved' : 'revision-needed',
      plans: [...this.progress().plans, plan],
      latestOutcome: outcome,
      earnedRewardIds: outcome.compatible
        ? [...new Set([...this.progress().earnedRewardIds, 'molecular-rescue-record'])]
        : this.progress().earnedRewardIds,
    });
    this.statusMessage.set(
      outcome.compatible
        ? 'Rescue plan accepted. The Molecular Rescue Record has been archived.'
        : 'Fen requests a revision. The molecular evidence and prior plan remain preserved.',
    );
  }

  private bloodEvidence(role: BloodTestEvidenceDraft['specimenRole']): BloodEvidenceRecord[] {
    const definition = this.definition();
    if (!definition) return [];
    return this.evidence().filter(
      (record): record is BloodEvidenceRecord =>
        record.evidenceType === 'blood-test' &&
        record.branchId === definition.id &&
        record.specimenRole === role,
    );
  }

  private loadProgress(): DragonCaseProgress {
    const pathId = this.pathId();
    const definition = this.definition();
    return isDragonPathContextId(pathId) && definition
      ? this.progressRepository.load(this.workstationContext.studentId(), pathId, definition.id)
      : emptyProgress(this.workstationContext.studentId(), 'arena', 'dragon-in-the-ash');
  }

  private loadEvidence(): readonly DragonLessonEvidenceRecord[] {
    const pathId = this.pathId();
    if (!isDragonPathContextId(pathId)) return [];
    return this.evidenceRepository.load(
      this.workstationContext.studentId(),
      pathId,
      this.lessonId(),
    );
  }

  private saveProgress(progress: DragonCaseProgress): void {
    this.progress.set(this.progressRepository.save(progress));
  }
}

type BloodEvidenceRecord = DragonLessonEvidenceRecord & BloodTestEvidenceDraft;
type ProteinEvidenceRecord = DragonLessonEvidenceRecord & ProteinRescueEvidenceDraft;
