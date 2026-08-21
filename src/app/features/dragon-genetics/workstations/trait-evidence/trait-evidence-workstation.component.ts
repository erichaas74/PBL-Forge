import {
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
import { DragonFlipCardComponent, DragonFlipCardView } from '../shared/dragon-flip-card.component';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import { FannedCardDeckComponent, FannedDeckItem } from '../shared/fanned-card-deck.component';
import {
  TraitEvidenceCardChromosomeId,
  buildTraitEvidenceCardGenomeView,
} from './trait-evidence-card-genetics';
import {
  DRAGON_FIRE_REFLEX_MOTION,
  DRAGON_LEARNED_BEHAVIOR_MOTIONS,
  DRAGON_NOTICE_MOTION,
} from './dragon-learned-behaviors';
import {
  TRAIT_EVIDENCE_DRAGONS,
  availableObservations,
  isTrialObservation,
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
  imports: [SpecimenViewportComponent, FannedCardDeckComponent, DragonFlipCardComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './trait-evidence-workstation.component.html',
  styleUrl: './trait-evidence-workstation.component.scss',
})
export class TraitEvidenceWorkstationComponent {
  readonly studentId = input.required<string>();
  readonly snapshotChange = output<TraitEvidenceSnapshot>();

  @ViewChild('viewport') private viewport?: SpecimenViewportComponent;

  private readonly repository = inject(TraitEvidenceRepository);
  private readonly snapshotSignal = signal<TraitEvidenceSnapshot>(emptyTraitEvidenceSnapshot());
  private contextStudentId = '';

  readonly dragons = TRAIT_EVIDENCE_DRAGONS;
  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly selectedDragonId = signal(TRAIT_EVIDENCE_DRAGONS[0].id);
  readonly selectedObservationId = signal<TraitEvidenceObservationId>('horns');
  readonly selectedEvidenceIds = signal<readonly string[]>([]);
  readonly classification = signal<TraitEvidenceClassification>('insufficient');
  readonly playing = signal(false);
  readonly reflexActive = signal(false);
  readonly flippedDragonIds = signal<readonly string[]>([]);
  readonly dragonCardViews = new Map(
    this.dragons.map((dragon) => [
      dragon.id,
      {
        id: dragon.id,
        name: dragon.name,
        title: dragon.profile.title,
        color: dragon.profile.color,
        accentColor: dragon.profile.accentColor,
        source: dragon.source,
        seriesLabel: dragon.card.seriesLabel,
        catalogNumber: dragon.card.catalogNumber,
        arenaRating: dragon.card.arenaRating,
        battleRole: dragon.card.battleRole,
        stats: dragon.card.stats,
      } satisfies DragonFlipCardView,
    ]),
  );
  readonly cardGenomeViews = new Map(
    this.dragons.map((dragon) => [dragon.id, buildTraitEvidenceCardGenomeView(dragon)]),
  );
  readonly selectedCardChromosomeIds = signal<
    Readonly<Record<string, TraitEvidenceCardChromosomeId>>
  >(Object.fromEntries(this.dragons.map((dragon) => [dragon.id, 'Chr 1'])));
  readonly dragonCardLabel = (item: FannedDeckItem): string =>
    this.dragonCardViews.get(item.id)?.name ?? item.id;
  readonly dragonCardSubtitle = (item: FannedDeckItem): string =>
    this.dragonCardViews.get(item.id)?.battleRole ?? '';

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
          (trial) => trial.specimenId === dragon.id && trial.observationId === observationId,
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
    if (!isTrialObservation(observationId)) {
      return observationResult(this.selectedDragon(), observationId);
    }
    const latest = [...this.snapshot().trials]
      .reverse()
      .find(
        (trial) =>
          trial.specimenId === this.selectedDragonId() && trial.observationId === observationId,
      );
    return latest?.result ?? observationResult(this.selectedDragon(), observationId);
  });

  constructor() {
    effect(() => {
      const studentId = normalizeWorkstationStudentId(this.studentId());
      if (studentId === this.contextStudentId) return;
      this.contextStudentId = studentId;
      const snapshot = this.repository.load(studentId);
      this.snapshotSignal.set(snapshot);
      this.snapshotChange.emit(snapshot);
      this.loadClaimDraft();
    });
  }

  selectDragonById(id: string): void {
    this.setDragon(id);
  }

  toggleDragonCard(id: string): void {
    this.flippedDragonIds.update((ids) =>
      ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id],
    );
  }

  isDragonCardFlipped(id: string): boolean {
    return this.flippedDragonIds().includes(id);
  }

  selectCardChromosome(dragonId: string, chromosomeId: string): void {
    const view = this.cardGenomeViews.get(dragonId);
    const chromosome = view?.chromosomes.find((candidate) => candidate.id === chromosomeId);
    if (!chromosome) return;
    this.selectedCardChromosomeIds.update((selected) => ({
      ...selected,
      [dragonId]: chromosome.id as TraitEvidenceCardChromosomeId,
    }));
  }

  selectedCardChromosomeId(dragonId: string): TraitEvidenceCardChromosomeId {
    return this.selectedCardChromosomeIds()[dragonId] ?? 'Chr 1';
  }

  dragonTrialCount(id: string): number {
    return this.snapshot().trials.filter((trial) => trial.specimenId === id).length;
  }

  dragonSupportedClaimCount(id: string): number {
    return this.snapshot().claims.filter((claim) => claim.specimenId === id && claim.supported)
      .length;
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
      : roles.includes('tail')
        ? 'tail'
        : roles.includes('head')
          ? 'horns'
          : roles.includes('jaw')
            ? 'fire'
            : 'scales';
    this.selectObservation(observationId);
  }

  async runObservation(): Promise<void> {
    const observationId = this.selectedObservationId();
    if (this.playing()) return;
    const dragon = this.selectedDragon();
    const definition = observationDefinition(observationId);
    this.playing.set(true);

    try {
      if (definition.ability) {
        const available =
          observationId === 'horns'
            ? dragon.horned
            : observationId === 'fire'
              ? dragon.fireBreathing
              : true;
        if (available) await this.viewport?.playAbility(definition.ability);
        else await this.viewport?.playMotion(DRAGON_NOTICE_MOTION);
        return;
      }

      if (!isTrialObservation(observationId)) return;

      const isReflex = observationId === 'fire-reflex';
      const responded = isReflex || dragon.trainedBehaviorIds.includes(observationId);
      if (isReflex) this.reflexActive.set(true);
      const motion = this.viewport?.playMotion(
        isReflex
          ? DRAGON_FIRE_REFLEX_MOTION
          : responded
            ? DRAGON_LEARNED_BEHAVIOR_MOTIONS[observationId]
            : DRAGON_NOTICE_MOTION,
      );
      if (isReflex) {
        // Keep the shutters readable even when WebGL or motion is unavailable.
        await Promise.all([motion, pause(900)]);
      } else {
        await motion;
      }

      const now = new Date().toISOString();
      const trial: TraitEvidenceTrial = {
        id: `${dragon.id}-${observationId}-${Date.now()}`,
        specimenId: dragon.id,
        observationId,
        kind: isReflex ? 'reflex' : 'command',
        responded,
        result: isReflex
          ? `${dragon.name} closed both eyelids and both nostrils in ${dragon.reflexLatencyMs} ms.`
          : responded
            ? `${dragon.name} performed the trained response after the command.`
            : `${dragon.name} noticed the command but did not perform the response.`,
        ...(isReflex ? { reactionTimeMs: dragon.reflexLatencyMs } : {}),
        testedAtIso: now,
      };
      const current = this.snapshot();
      this.persist({
        ...current,
        observedCharacteristicIds: unique([...current.observedCharacteristicIds, observationId]),
        trials: [...current.trials, trial].slice(-30),
        updatedAtIso: now,
      });
      this.selectedEvidenceIds.update((ids) => unique([...ids, `trial:${trial.id}`]));
    } finally {
      this.reflexActive.set(false);
      this.playing.set(false);
    }
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
      value === 'innate' ||
      value === 'learned' ||
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
      inherited: 'Inherited anatomy or ability',
      innate: 'Innate reflex',
      learned: 'Learned response',
      insufficient: 'Needs evidence',
    }[classification];
  }

  observationKindLabel(): string {
    return {
      appearance: 'Body characteristic',
      ability: 'Fighting ability',
      reflex: 'Protective reflex',
      command: 'Command response',
    }[this.selectedObservation().kind];
  }

  isEvidenceSelected(evidenceId: string): boolean {
    return this.selectedEvidenceIds().includes(evidenceId);
  }

  private setDragon(id: string): void {
    if (!this.dragons.some((dragon) => dragon.id === id)) return;
    this.selectedDragonId.set(id);
    if (
      !this.observations().some((observation) => observation.id === this.selectedObservationId())
    ) {
      this.selectedObservationId.set('horns');
    }
    this.recordObservation();
    this.loadClaimDraft();
  }

  private selectObservation(observationId: TraitEvidenceObservationId): void {
    this.selectedObservationId.set(observationId);
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
    const defaultEvidence = isTrialObservation(observationId)
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

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
