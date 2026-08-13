import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import {
  admitAccountDragon,
  advanceIslandGeneration,
  clearProtectedPair,
  genotypeLabel,
  healthEvidence,
  isBreedingAdult,
  isMoonfadeAffected,
  isMoonfadeCarrier,
  metricsForIsland,
  phenotypeEvidence,
  placeProtectedParent,
  relocateDragon,
  scanDragon,
} from './island-diversity.domain';
import {
  CONSERVATION_LOCI,
  ConservationLocusId,
  ISLAND_DEFINITIONS,
  IslandDefinition,
  IslandDiversityWorld,
  IslandId,
  IslandMetrics,
  PopulationDragon,
} from './island-diversity.models';
import { IslandDiversityRepository } from './island-diversity.repository';

const POPULATION_DRAGON_DRAG_TYPE = 'application/x-pbl-island-dragon';

@Component({
  selector: 'app-island-diversity-manager',
  imports: [DatePipe, AccountGeneticsFileComponent],
  templateUrl: './island-diversity-manager.component.html',
  styleUrl: './island-diversity-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IslandDiversityManagerComponent {
  private readonly repository = inject(IslandDiversityRepository);
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);

  readonly studentId = input('local-student');
  readonly islandDefinitions = ISLAND_DEFINITIONS;
  readonly loci = Object.values(CONSERVATION_LOCI);
  readonly populationDots = Array.from({ length: 12 }, (_, index) => index);

  readonly world = signal<IslandDiversityWorld>(this.repository.load('local-student'));
  readonly selectedIslandId = signal<IslandId>('stormbreak');
  readonly selectedDragonId = signal<string | null>(null);
  readonly stagedAccountRecord = signal<AccountGeneticsRecord | null>(null);
  readonly guideOpen = signal(false);
  readonly ledgerOpen = signal(false);
  readonly noteDraft = signal('');
  readonly statusMessage = signal(
    'Stormbreak field records are open. Visit any island or select a dragon to investigate.',
  );

  readonly accountSnapshot = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly selectedDefinition = computed(() => this.islandDefinition(this.selectedIslandId())!);
  readonly selectedPopulation = computed(() => this.world().islands[this.selectedIslandId()]);
  readonly selectedMetrics = computed(() => metricsForIsland(this.selectedPopulation()));
  readonly selectedDragon = computed(() => {
    const id = this.selectedDragonId();
    return id
      ? (this.selectedPopulation().dragons.find((dragon) => dragon.id === id) ?? null)
      : null;
  });
  readonly selectedDragonScanned = computed(() => {
    const dragon = this.selectedDragon();
    return Boolean(dragon && this.world().scannedDragonIds.includes(dragon.id));
  });
  readonly protectedParents = computed(() =>
    this.selectedPopulation().protectedPair.map((id) =>
      id ? (this.selectedPopulation().dragons.find((dragon) => dragon.id === id) ?? null) : null,
    ),
  );
  readonly pairIssue = computed(() => {
    const [first, second] = this.protectedParents();
    if (!first && !second) return 'Wild reproduction will continue without a protected pairing.';
    if (!first || !second)
      return 'One protected berth is still open; wild reproduction remains active.';
    if (first.sex === second.sex)
      return 'This pair cannot produce offspring in the diploid breeding model.';
    return 'The protected pair can contribute up to two offspring; other adults still mate naturally.';
  });
  readonly knownMoonfade = computed(() => {
    const scanned = new Set(this.world().scannedDragonIds);
    const tested = this.selectedPopulation().dragons.filter((dragon) => scanned.has(dragon.id));
    return {
      tested: tested.length,
      carriers: tested.filter(isMoonfadeCarrier).length,
      affected: tested.filter(isMoonfadeAffected).length,
    };
  });
  readonly alerts = computed(() =>
    this.alertsFor(this.selectedDefinition(), this.selectedMetrics()),
  );
  readonly canAdvance = computed(() => {
    const adults = this.selectedPopulation().dragons.filter(isBreedingAdult);
    return (
      adults.some((dragon) => dragon.sex === 'female') &&
      adults.some((dragon) => dragon.sex === 'male')
    );
  });

  private loadedStudentId: string | null = null;

  constructor() {
    effect(() => {
      const studentId = this.studentId().trim() || 'local-student';
      if (studentId === this.loadedStudentId) return;
      this.loadedStudentId = studentId;
      this.world.set(this.repository.load(studentId));
      this.syncNoteDraft(this.selectedIslandId());
    });
  }

  visitIsland(islandId: IslandId): void {
    this.selectedIslandId.set(islandId);
    this.selectedDragonId.set(null);
    this.syncNoteDraft(islandId);
    const definition = this.islandDefinition(islandId)!;
    this.statusMessage.set(
      `${definition.name} field records opened at generation ${this.world().islands[islandId].generation}.`,
    );
  }

  selectDragon(dragon: PopulationDragon): void {
    this.selectedDragonId.set(dragon.id);
    this.statusMessage.set(
      `${dragon.name} selected. Scan the sealed genotype, place the dragon in a protected berth, or relocate it.`,
    );
  }

  startDragonDrag(event: DragEvent, dragon: PopulationDragon): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(POPULATION_DRAGON_DRAG_TYPE, dragon.id);
    event.dataTransfer.setData('text/plain', dragon.name);
  }

  allowIslandDrop(event: DragEvent): void {
    if (
      event.dataTransfer?.types.includes(POPULATION_DRAGON_DRAG_TYPE) ||
      event.dataTransfer?.types.includes(ACCOUNT_GENETICS_RECORD_DRAG_TYPE)
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = event.dataTransfer.types.includes(POPULATION_DRAGON_DRAG_TYPE)
        ? 'move'
        : 'copy';
    }
  }

  dropOnIsland(event: DragEvent, islandId: IslandId): void {
    event.preventDefault();
    const dragonId = event.dataTransfer?.getData(POPULATION_DRAGON_DRAG_TYPE) ?? '';
    if (dragonId) {
      this.relocate(dragonId, islandId);
      return;
    }
    const payload = parseAccountGeneticsDragPayload(
      event.dataTransfer?.getData(ACCOUNT_GENETICS_RECORD_DRAG_TYPE) ?? '',
    );
    if (!payload) return;
    const record = this.accountLibrary.recordById(this.studentId(), payload.id);
    if (record?.kind === payload.kind) {
      this.stagedAccountRecord.set(record);
      if (islandId === 'sanctuary') this.admitRecord(record);
      else
        this.statusMessage.set('Account rescues enter the archipelago through Sanctuary intake.');
    }
  }

  relocateSelected(destinationId: IslandId): void {
    const dragon = this.selectedDragon();
    if (dragon) this.relocate(dragon.id, destinationId);
  }

  scanSelectedDragon(): void {
    const dragon = this.selectedDragon();
    if (!dragon) return;
    const before = this.world();
    const next = scanDragon(before, dragon.id);
    if (next === before) {
      this.statusMessage.set(
        before.scannedDragonIds.includes(dragon.id)
          ? `${dragon.name}'s genotype scan is already in the field record.`
          : 'No research credits remain. Advancing a generation restores one credit.',
      );
      return;
    }
    this.commit(next);
    this.statusMessage.set(
      `${dragon.name}'s three-locus genotype and Moonfade carrier state are now recorded.`,
    );
  }

  placeSelectedParent(berth: 0 | 1): void {
    const dragon = this.selectedDragon();
    if (dragon) this.placeParent(dragon.id, berth);
  }

  allowParentDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(POPULATION_DRAGON_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropProtectedParent(event: DragEvent, berth: 0 | 1): void {
    event.preventDefault();
    this.placeParent(event.dataTransfer?.getData(POPULATION_DRAGON_DRAG_TYPE) ?? '', berth);
  }

  clearPair(): void {
    this.commit(clearProtectedPair(this.world(), this.selectedIslandId()));
    this.statusMessage.set('Protected berths cleared. The wild population state is unchanged.');
  }

  advanceGeneration(): void {
    if (!this.canAdvance()) return;
    const islandId = this.selectedIslandId();
    const next = advanceIslandGeneration(this.world(), islandId);
    this.commit(next);
    const latest = next.islands[islandId].timeline.at(-1)!;
    this.selectedDragonId.set(null);
    this.statusMessage.set(
      `${this.islandDefinition(islandId)!.name} advanced to generation ${latest.generation}. ${latest.event}`,
    );
  }

  selectAccountRecord(record: AccountGeneticsRecord): void {
    this.stagedAccountRecord.set(record);
    const name = record.kind === 'dragon' ? record.name : record.dragonName;
    this.statusMessage.set(`${name} selected for possible admission to Sanctuary Island.`);
  }

  admitStagedAccountDragon(): void {
    const record = this.stagedAccountRecord();
    if (record) this.admitRecord(record);
  }

  updateNote(value: string): void {
    this.noteDraft.set(value);
  }

  saveFieldNote(): void {
    const text = this.noteDraft().trim();
    if (text.length < 12) return;
    const islandId = this.selectedIslandId();
    this.commit({
      ...this.world(),
      notes: {
        ...this.world().notes,
        [islandId]: { islandId, text, savedAtIso: new Date().toISOString() },
      },
      updatedAtIso: new Date().toISOString(),
    });
    this.statusMessage.set(
      `${this.selectedDefinition().name} conservation note saved to the archipelago ledger.`,
    );
  }

  islandMetrics(islandId: IslandId): IslandMetrics {
    return metricsForIsland(this.world().islands[islandId]);
  }

  islandDefinition(islandId: IslandId): IslandDefinition | null {
    return this.islandDefinitions.find((definition) => definition.id === islandId) ?? null;
  }

  phenotypeFor(dragon: PopulationDragon): string {
    return phenotypeEvidence(dragon).join(' · ');
  }

  healthFor(dragon: PopulationDragon): string {
    return healthEvidence(dragon, this.selectedIslandId());
  }

  ageLabel(dragon: PopulationDragon): string {
    if (dragon.ageGenerations === 0) return 'Hatchling';
    if (dragon.ageGenerations >= 5) return 'Elder';
    return 'Breeding adult';
  }

  genotypeFor(dragon: PopulationDragon, locusId: ConservationLocusId): string {
    return genotypeLabel(dragon, locusId);
  }

  isScanned(dragon: PopulationDragon): boolean {
    return this.world().scannedDragonIds.includes(dragon.id);
  }

  moonfadeStatus(dragon: PopulationDragon): string {
    return isMoonfadeAffected(dragon)
      ? 'Affected'
      : isMoonfadeCarrier(dragon)
        ? 'Unaffected carrier'
        : 'No d detected';
  }

  parentNames(dragon: PopulationDragon): string {
    if (!dragon.parents.length) return 'Founding record unavailable';
    return dragon.parents
      .map(
        (parentId) =>
          this.selectedPopulation().dragons.find((candidate) => candidate.id === parentId)?.name ??
          parentId,
      )
      .join(' + ');
  }

  frequencyWidth(frequency: number): number {
    return Math.round(frequency * 100);
  }

  canSaveNote(): boolean {
    return this.noteDraft().trim().length >= 12;
  }

  private relocate(dragonId: string, destinationId: IslandId): void {
    const currentIslandId = this.selectedIslandId();
    if (currentIslandId === destinationId) {
      this.statusMessage.set('That dragon is already in this population.');
      return;
    }
    const dragon = this.selectedPopulation().dragons.find((candidate) => candidate.id === dragonId);
    if (!dragon) return;
    const next = relocateDragon(this.world(), dragonId, destinationId);
    this.commit(next);
    this.selectedDragonId.set(null);
    this.statusMessage.set(
      `${dragon.name} relocated from ${this.islandDefinition(currentIslandId)!.name} to ${this.islandDefinition(destinationId)!.name}. Both population estimates were recalculated.`,
    );
  }

  private placeParent(dragonId: string, berth: 0 | 1): void {
    const dragon = this.selectedPopulation().dragons.find((candidate) => candidate.id === dragonId);
    if (!dragon || !isBreedingAdult(dragon)) {
      this.statusMessage.set('Protected berths accept breeding adults from the current island.');
      return;
    }
    this.commit(placeProtectedParent(this.world(), this.selectedIslandId(), dragonId, berth));
    this.selectedDragonId.set(dragon.id);
    this.statusMessage.set(`${dragon.name} placed in protected berth ${berth === 0 ? 'A' : 'B'}.`);
  }

  private admitRecord(record: AccountGeneticsRecord): void {
    const dragonId = record.kind === 'dragon' ? record.id : record.dragonId;
    const dragon = this.accountSnapshot().dragons.find((candidate) => candidate.id === dragonId);
    if (!dragon) return;
    const before = this.world();
    const next = admitAccountDragon(before, dragon);
    if (next === before) {
      this.statusMessage.set(`${dragon.name} is already registered in Sanctuary Island.`);
      return;
    }
    this.commit(next);
    this.visitIsland('sanctuary');
    this.statusMessage.set(
      `${dragon.name} admitted to Sanctuary. The conservation genotype remains sealed until scanned.`,
    );
  }

  private alertsFor(definition: IslandDefinition, metrics: IslandMetrics): readonly string[] {
    const alerts: string[] = [];
    if (metrics.population <= 12)
      alerts.push('Small population: random allele loss risk is elevated.');
    if (metrics.diversityPercent < 48)
      alerts.push('Low model diversity estimate: variation is concentrated.');
    if (metrics.relatedness === 'High')
      alerts.push('High lineage concentration: related matings are more likely.');
    if (metrics.affectedDragons > 0)
      alerts.push(
        `${metrics.affectedDragons} dragon${metrics.affectedDragons === 1 ? '' : 's'} show Moonfade symptoms.`,
      );
    if (definition.id === 'founders-isle' && metrics.blueHornPercent >= 50) {
      alerts.push('Blue horns are frequent; field evidence does not yet identify why.');
    }
    if (definition.id === 'ash-island') {
      alerts.push(`${metrics.heatTolerantPercent}% show the heat-tolerant scale phenotype.`);
    }
    return alerts.length
      ? alerts
      : ['No alert threshold crossed; continued monitoring is still warranted.'];
  }

  private syncNoteDraft(islandId: IslandId): void {
    this.noteDraft.set(this.world().notes[islandId]?.text ?? '');
  }

  private commit(world: IslandDiversityWorld): void {
    this.world.set(this.repository.save(this.studentId(), world));
  }
}
