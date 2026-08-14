import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import { DRAGON_LEARNED_BEHAVIOR_MOTIONS, DRAGON_NOTICE_MOTION } from './dragon-learned-behaviors';
import {
  TRAIT_EVIDENCE_DRAGONS,
  availableObservations,
  isLearnedBehavior,
  liveEvidence,
  observationDefinition,
  observationResult,
  recordsForObservation,
  trialEvidence,
} from './trait-evidence.content';
import {
  supportedClaimCount,
  traitEvidenceStatus,
  upsertTraitEvidenceClaim,
} from './trait-evidence.domain';
import {
  TraitEvidenceClassification,
  TraitEvidenceClaim,
  TraitEvidenceObservationId,
  TraitEvidenceRecord,
  TraitEvidenceSnapshot,
  TraitEvidenceTrial,
} from './trait-evidence.models';
import { TraitEvidenceRepository, emptyTraitEvidenceSnapshot } from './trait-evidence.repository';

@Component({
  selector: 'app-trait-evidence-workstation',
  imports: [SpecimenViewportComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './trait-evidence-workstation.component.html',
  styleUrl: './trait-evidence-workstation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraitEvidenceWorkstationComponent {
  readonly studentId = input('local-student');
  readonly snapshotChange = output<TraitEvidenceSnapshot>();

  @ViewChild('viewport') private viewport?: SpecimenViewportComponent;

  private readonly repository = inject(TraitEvidenceRepository);
  private readonly snapshotSignal = signal<TraitEvidenceSnapshot>(emptyTraitEvidenceSnapshot());
  private contextStudentId = '';

  readonly dragons = TRAIT_EVIDENCE_DRAGONS;
  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly selectedDragonId = signal(TRAIT_EVIDENCE_DRAGONS[0].id);
  readonly selectedObservationId = signal<TraitEvidenceObservationId>('wings');
  readonly selectedEvidenceIds = signal<readonly string[]>([]);
  readonly classification = signal<TraitEvidenceClassification>('insufficient');
  readonly playing = signal(false);
  readonly lastTrial = signal<TraitEvidenceTrial | null>(null);

  readonly selectedDragon = computed(
    () => this.dragons.find((dragon) => dragon.id === this.selectedDragonId()) ?? this.dragons[0],
  );
  readonly observations = computed(() => availableObservations(this.selectedDragon()));
  readonly selectedObservation = computed(() =>
    observationDefinition(this.selectedObservationId()),
  );
  readonly focusedTraitId = computed(() => this.selectedObservation().focusTraitId);
  readonly evidenceRecords = computed<readonly TraitEvidenceRecord[]>(() => {
    const dragon = this.selectedDragon();
    const observationId = this.selectedObservationId();
    return [
      liveEvidence(dragon, observationId),
      ...recordsForObservation(dragon, observationId),
      ...this.snapshot()
        .trials.filter(
          (trial) => trial.specimenId === dragon.id && trial.behaviorId === observationId,
        )
        .map(trialEvidence),
    ];
  });
  readonly currentClaim = computed(() => this.findClaim());
  readonly supportedCount = computed(() => supportedClaimCount(this.snapshot()));
  readonly status = computed(() => traitEvidenceStatus(this.snapshot()));
  readonly canSaveClaim = computed(() =>
    this.classification() === 'insufficient'
      ? this.selectedEvidenceIds().length >= 1
      : this.selectedEvidenceIds().length >= 2,
  );
  readonly resultText = computed(() => {
    const observationId = this.selectedObservationId();
    if (!isLearnedBehavior(observationId)) {
      return observationResult(this.selectedDragon(), observationId);
    }
    const latest = [...this.snapshot().trials]
      .reverse()
      .find(
        (trial) =>
          trial.specimenId === this.selectedDragonId() && trial.behaviorId === observationId,
      );
    return latest?.result ?? observationResult(this.selectedDragon(), observationId);
  });

  constructor() {
    effect(() => {
      const studentId = this.studentId().trim() || 'local-student';
      if (studentId === this.contextStudentId) return;
      this.contextStudentId = studentId;
      const snapshot = this.repository.load(studentId);
      this.snapshotSignal.set(snapshot);
      this.snapshotChange.emit(snapshot);
      this.loadClaimDraft();
    });
  }

  selectDragon(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!this.dragons.some((dragon) => dragon.id === id)) return;
    this.selectedDragonId.set(id);
    if (
      !this.observations().some((observation) => observation.id === this.selectedObservationId())
    ) {
      this.selectedObservationId.set('wings');
    }
    this.lastTrial.set(null);
    this.recordObservation();
    this.loadClaimDraft();
  }

  selectObservationFromEvent(event: Event): void {
    const id = (event.target as HTMLSelectElement).value as TraitEvidenceObservationId;
    if (this.observations().some((observation) => observation.id === id)) {
      this.selectObservation(id);
    }
  }

  selectRenderedPart(partId: string): void {
    const part = this.viewport
      ?.descriptor()
      ?.blueprint.parts.find((candidate) => candidate.id === partId);
    const roles = part?.roles ?? [];
    const observationId: TraitEvidenceObservationId = roles.includes('wing')
      ? 'wings'
      : roles.includes('head')
        ? 'horns'
        : roles.includes('jaw')
          ? 'fire'
          : 'scales';
    this.selectObservation(observationId);
  }

  async testBehavior(): Promise<void> {
    const observationId = this.selectedObservationId();
    if (!isLearnedBehavior(observationId) || this.playing()) return;
    const dragon = this.selectedDragon();
    const responded = dragon.trainedBehaviorIds.includes(observationId);
    this.playing.set(true);
    await this.viewport?.playMotion(
      responded ? DRAGON_LEARNED_BEHAVIOR_MOTIONS[observationId] : DRAGON_NOTICE_MOTION,
    );
    const now = new Date().toISOString();
    const trial: TraitEvidenceTrial = {
      id: `${dragon.id}-${observationId}-${Date.now()}`,
      specimenId: dragon.id,
      behaviorId: observationId,
      responded,
      result: responded
        ? `${dragon.name} performed the trained response after the cue.`
        : `${dragon.name} noticed the cue but did not perform the response.`,
      testedAtIso: now,
    };
    const current = this.snapshot();
    this.persist({
      ...current,
      observedCharacteristicIds: unique([...current.observedCharacteristicIds, observationId]),
      trials: [...current.trials, trial].slice(-30),
      updatedAtIso: now,
    });
    this.lastTrial.set(trial);
    this.selectedEvidenceIds.update((ids) => unique([...ids, `trial:${trial.id}`]));
    this.playing.set(false);
  }

  toggleEvidence(evidenceId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedEvidenceIds.update((ids) =>
      checked ? unique([...ids, evidenceId]) : ids.filter((id) => id !== evidenceId),
    );
  }

  setClassification(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as TraitEvidenceClassification;
    if (
      value === 'inherited' ||
      value === 'learned' ||
      value === 'environmental' ||
      value === 'insufficient'
    ) {
      this.classification.set(value);
    }
  }

  saveClaim(): void {
    if (!this.canSaveClaim()) return;
    const next = upsertTraitEvidenceClaim(this.snapshot(), {
      observationId: this.selectedObservationId(),
      specimenId: this.selectedDragonId(),
      classification: this.classification(),
      evidenceIds: this.selectedEvidenceIds(),
    });
    this.persist(next);
  }

  claimsFor(...classifications: TraitEvidenceClassification[]): readonly TraitEvidenceClaim[] {
    return this.snapshot().claims.filter((claim) => classifications.includes(claim.classification));
  }

  claimLabel(claim: TraitEvidenceClaim): string {
    const dragon = this.dragons.find((candidate) => candidate.id === claim.specimenId);
    return `${dragon?.name ?? claim.specimenId} · ${observationDefinition(claim.observationId).label}`;
  }

  classificationLabel(classification: TraitEvidenceClassification): string {
    return {
      inherited: 'Inherited',
      learned: 'Learned',
      environmental: 'Environmental',
      insufficient: 'Needs evidence',
    }[classification];
  }

  isEvidenceSelected(evidenceId: string): boolean {
    return this.selectedEvidenceIds().includes(evidenceId);
  }

  private selectObservation(observationId: TraitEvidenceObservationId): void {
    this.selectedObservationId.set(observationId);
    this.lastTrial.set(null);
    this.recordObservation();
    this.loadClaimDraft();
  }

  private recordObservation(): void {
    const observationId = this.selectedObservationId();
    if (this.snapshot().observedCharacteristicIds.includes(observationId)) return;
    const now = new Date().toISOString();
    this.persist({
      ...this.snapshot(),
      observedCharacteristicIds: unique([
        ...this.snapshot().observedCharacteristicIds,
        observationId,
      ]),
      updatedAtIso: now,
    });
  }

  private loadClaimDraft(): void {
    const claim = this.findClaim();
    this.classification.set(claim?.classification ?? 'insufficient');
    const observationId = this.selectedObservationId();
    const defaultEvidence = isLearnedBehavior(observationId)
      ? []
      : [liveEvidence(this.selectedDragon(), observationId).id];
    this.selectedEvidenceIds.set(claim?.evidenceIds ?? defaultEvidence);
  }

  private findClaim(): TraitEvidenceClaim | null {
    return (
      this.snapshot().claims.find(
        (claim) =>
          claim.specimenId === this.selectedDragonId() &&
          claim.observationId === this.selectedObservationId(),
      ) ?? null
    );
  }

  private persist(snapshot: TraitEvidenceSnapshot): void {
    this.snapshotSignal.set(snapshot);
    this.repository.save(snapshot);
    this.snapshotChange.emit(snapshot);
  }
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
