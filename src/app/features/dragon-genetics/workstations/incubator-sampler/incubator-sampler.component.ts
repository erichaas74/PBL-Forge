import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  DRAGON_TRAITS,
  createEducationalAssembly,
  createVisualGenome,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonBredProfile,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountDragonRecord,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import {
  IncubatorPhenotypeOption,
  MaterializedIncubatorBatch,
  buildIncubatorBatch,
  buildIncubatorPoolBatch,
  parentVisibleTraits,
  phenotypeOptions,
  rebuildIncubatorLineage,
  visiblePhenotypeId,
} from './incubator-sampler.domain';
import {
  IncubatorBatchRecord,
  IncubatorPhenotypeResult,
  IncubatorSamplerSnapshot,
} from './incubator-sampler.models';
import { IncubatorSamplerRepository } from './incubator-sampler.repository';

type ParentRole = DragonSex;

interface IncubatorTraveler {
  id: string;
  label: string;
  color: string;
  accentColor: string;
  laneOffset: number;
  startOffset: number;
  delayMs: number;
  durationMs: number;
  form: 1 | 2;
  traitId: DragonTraitId;
}

interface IncubatorBucketView extends IncubatorPhenotypeResult {
  offspring: readonly DragonBredProfile[];
  hiddenCount: number;
}

@Component({
  selector: 'app-incubator-sampler',
  imports: [AccountGeneticsFileComponent, SpecimenViewportComponent],
  templateUrl: './incubator-sampler.component.html',
  styleUrl: './incubator-sampler.component.scss',
})
export class IncubatorSamplerComponent implements OnDestroy {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(IncubatorSamplerRepository);

  readonly studentId = input.required<string>();
  readonly goal = input(
    'Investigate how visible inherited traits appear and change across offspring and generations.',
  );

  readonly traits = DRAGON_TRAITS;
  readonly sampleSizes = [4, 8, 12, 25, 50, 100] as const;
  readonly originalParentIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly activeParentIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly activeBreedingPoolIds = signal<readonly string[]>([]);
  readonly selectedTraitId = signal<DragonTraitId>(DRAGON_TRAITS[0].id);
  readonly sampleSize = signal<number>(8);
  readonly nextRunNumber = signal(1);
  readonly batches = signal<readonly IncubatorBatchRecord[]>([]);
  readonly running = signal(false);
  readonly animationStarted = signal(false);
  readonly pouringPhenotypeId = signal<string | null>(null);
  readonly pendingBatch = signal<MaterializedIncubatorBatch | null>(null);
  readonly previewIndex = signal(0);
  /**
   * Which stations are showing the account inventory. An empty station always shows it — there is
   * nothing else to show — so this only records the roles a student reopened to swap a parent out.
   */
  readonly picking = signal<Record<ParentRole, boolean>>({ female: false, male: false });
  readonly statusMessage = signal('Choose two parent dragons to wake the incubator.');

  private readonly lineage = signal<ReadonlyMap<string, DragonParentProfile>>(new Map());
  private readonly materializedBatches = signal<ReadonlyMap<string, MaterializedIncubatorBatch>>(
    new Map(),
  );
  private finishTimer: ReturnType<typeof setTimeout> | null = null;
  private kickoffTimer: ReturnType<typeof setTimeout> | null = null;
  private pourTimer: ReturnType<typeof setTimeout> | null = null;

  readonly account = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly parentA = computed(() => this.findSpecimen(this.activeParentIds()[0]));
  readonly parentB = computed(() => this.findSpecimen(this.activeParentIds()[1]));
  readonly breedingPool = computed(() =>
    this.activeBreedingPoolIds()
      .map((id) => this.findSpecimen(id))
      .filter((parent): parent is DragonParentProfile => Boolean(parent)),
  );
  readonly parentsReady = computed(() => this.breedingPool().length >= 2);
  readonly offspringPoolActive = computed(() => {
    const originalIds = new Set(this.originalParentIds().filter((id): id is string => Boolean(id)));
    const poolIds = this.activeBreedingPoolIds();
    return (
      poolIds.length >= 2 &&
      (poolIds.length !== originalIds.size || poolIds.some((id) => !originalIds.has(id)))
    );
  });
  readonly interactionLocked = computed(() => this.running() || Boolean(this.pouringPhenotypeId()));
  readonly selectionLocked = computed(() => this.batches().length > 0 || this.interactionLocked());
  readonly selectedTrait = computed(
    () => this.traits.find((trait) => trait.id === this.selectedTraitId()) ?? this.traits[0],
  );
  readonly categories = computed(() => phenotypeOptions(this.selectedTraitId()));
  readonly latestRecord = computed(() => this.batches().at(-1) ?? null);
  readonly latestBatch = computed(() => {
    const record = this.latestRecord();
    return record ? (this.materializedBatches().get(record.id) ?? null) : null;
  });
  readonly nextGeneration = computed(() => {
    const parents = this.breedingPool();
    return Math.max(0, ...parents.map((parent) => offspringGeneration(parent))) + 1;
  });
  readonly parentASource = computed(() => specimenSource(this.parentA()));
  readonly parentBSource = computed(() => specimenSource(this.parentB()));
  readonly inspectionDragon = computed(() => {
    const batch = this.pendingBatch() ?? this.latestBatch();
    if (!batch?.offspring.length) return null;
    return batch.offspring[this.previewIndex() % batch.offspring.length];
  });
  readonly inspectionSource = computed(() => specimenSource(this.inspectionDragon()));
  readonly inspectionLabel = computed(() => {
    const dragon = this.inspectionDragon();
    return dragon
      ? `${dragon.name}: ${this.visiblePhenotype(dragon)}`
      : 'Hatchling inspection porthole';
  });
  readonly travelers = computed<readonly IncubatorTraveler[]>(() => {
    const batch = this.pendingBatch();
    if (!batch) return [];
    const categories = this.categories();
    return batch.offspring.slice(0, 18).map((dragon, index) => {
      const phenotypeId = visiblePhenotypeId(dragon, this.selectedTraitId());
      const lane = Math.max(
        0,
        categories.findIndex((category) => category.id === phenotypeId),
      );
      const laneOffset =
        categories.length === 1 ? 0 : -175 + (lane * 350) / (categories.length - 1);
      return {
        id: dragon.id,
        label: this.visiblePhenotype(dragon),
        color: dragon.color,
        accentColor: dragon.accentColor,
        laneOffset,
        startOffset: ((stableHash(dragon.id) % 31) - 15) * 0.7,
        delayMs: index * 90 + (stableHash(`${dragon.id}:delay`) % 260),
        durationMs: 2100 + (stableHash(`${dragon.id}:duration`) % 650),
        form: phenotypeId.endsWith('1') ? 1 : 2,
        traitId: this.selectedTraitId(),
      };
    });
  });
  readonly buckets = computed<readonly IncubatorBucketView[]>(() => {
    const batch = this.latestBatch();
    if (!batch) return [];
    const byId = new Map(batch.offspring.map((dragon) => [dragon.id, dragon]));
    return batch.record.results.map((result) => {
      const offspring = result.offspringIds
        .map((id) => byId.get(id))
        .filter((dragon): dragon is DragonBredProfile => Boolean(dragon));
      return {
        ...result,
        offspring: offspring.slice(0, 24),
        hiddenCount: Math.max(0, offspring.length - 24),
      };
    });
  });
  readonly generationTrail = computed(() => [
    'Original parents',
    ...[...new Set(this.batches().map((batch) => `Generation ${batch.generation}`))],
  ]);

  constructor() {
    effect(() => this.restore(this.studentId()));
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  selectAccountRecord(role: ParentRole, record: AccountGeneticsRecord): void {
    if (record.kind !== 'dragon') return;
    this.selectParent(role, record);
  }

  pickerOpen(role: ParentRole): boolean {
    if (this.offspringPoolActive()) return false;
    const loaded = role === 'female' ? this.parentA() : this.parentB();
    return !loaded || this.picking()[role];
  }

  togglePicker(role: ParentRole): void {
    if (this.selectionLocked()) {
      this.statusMessage.set('Clear the current observation before changing the original parents.');
      return;
    }
    this.picking.update((state) => ({ ...state, [role]: !state[role] }));
  }

  allowParentDrop(event: DragEvent): void {
    if (this.selectionLocked()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dropParent(role: ParentRole, event: DragEvent): void {
    event.preventDefault();
    if (this.selectionLocked()) return;
    const value = event.dataTransfer?.getData(ACCOUNT_GENETICS_RECORD_DRAG_TYPE);
    if (!value) return;
    const payload = parseAccountGeneticsDragPayload(value);
    if (!payload) return;
    const record = this.accountLibrary.recordById(this.studentId(), payload.id);
    if (record?.kind === 'dragon') this.selectParent(role, record);
  }

  setTrait(event: Event): void {
    const traitId = (event.target as HTMLSelectElement).value as DragonTraitId;
    if (this.selectionLocked() || !this.traits.some((trait) => trait.id === traitId)) return;
    this.selectedTraitId.set(traitId);
    this.statusMessage.set(`Sorting channels tuned to ${this.selectedTrait().name}.`);
    this.persist();
  }

  setSampleSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!this.sampleSizes.includes(size as (typeof this.sampleSizes)[number])) return;
    this.sampleSize.set(size);
    this.persist();
  }

  startBatch(): void {
    const breedingPool = this.breedingPool();
    if (breedingPool.length < 2 || this.interactionLocked()) return;

    const batch =
      breedingPool.length === 2
        ? buildIncubatorBatch(
            breedingPool[0],
            breedingPool[1],
            this.selectedTraitId(),
            this.nextGeneration(),
            this.nextRunNumber(),
            this.sampleSize(),
          )
        : buildIncubatorPoolBatch(
            breedingPool,
            this.selectedTraitId(),
            this.nextGeneration(),
            this.nextRunNumber(),
            this.sampleSize(),
          );
    this.pendingBatch.set(batch);
    this.previewIndex.set(0);
    this.running.set(true);
    this.animationStarted.set(false);
    this.statusMessage.set(
      `Forge lit. ${this.sampleSize()} eggs are hatching and sorting by visible ${this.selectedTrait().name.toLowerCase()}.`,
    );

    const reducedMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Mount the first real 3D hatchling before the conveyor clock starts. Renderer setup can be
    // expensive on Chromebooks; starting both together let sprites finish while WebGL was blocked.
    this.kickoffTimer = setTimeout(() => {
      this.kickoffTimer = null;
      this.animationStarted.set(true);
      this.finishTimer = setTimeout(() => this.finishBatch(), reducedMotion ? 80 : 3350);
    }, 80);
  }

  finishBatch(): void {
    const batch = this.pendingBatch();
    if (!batch) return;
    if (this.finishTimer) clearTimeout(this.finishTimer);
    if (this.kickoffTimer) clearTimeout(this.kickoffTimer);
    this.finishTimer = null;
    this.kickoffTimer = null;

    const nextLineage = new Map(this.lineage());
    for (const dragon of batch.offspring) nextLineage.set(dragon.id, dragon);
    const nextMaterialized = new Map(this.materializedBatches());
    nextMaterialized.set(batch.record.id, batch);
    this.lineage.set(nextLineage);
    this.materializedBatches.set(nextMaterialized);
    this.batches.update((records) => [...records, batch.record]);
    this.nextRunNumber.update((number) => number + 1);
    this.pendingBatch.set(null);
    this.previewIndex.set(0);
    this.running.set(false);
    this.animationStarted.set(false);
    this.statusMessage.set(
      `Generation ${batch.record.generation} sorted: ${batch.record.results
        .map((result) => `${result.count} ${result.label}`)
        .join(' · ')}.`,
    );
    this.persist();
  }

  breedFromBucket(result: IncubatorPhenotypeResult): void {
    const batch = this.latestBatch();
    if (!batch || result.offspringIds.length < 2 || this.interactionLocked()) return;
    const selectedIds = [...result.offspringIds];
    this.pouringPhenotypeId.set(result.id);
    this.statusMessage.set(
      `${result.count} ${result.label.toLowerCase()} hatchlings are forming a balanced breeding pool.`,
    );

    const updatedRecord: IncubatorBatchRecord = {
      ...batch.record,
      selectedForLaterBreedingIds: selectedIds,
    };
    this.batches.update((records) =>
      records.map((record) => (record.id === updatedRecord.id ? updatedRecord : record)),
    );
    const updatedBatches = new Map(this.materializedBatches());
    updatedBatches.set(updatedRecord.id, { ...batch, record: updatedRecord });
    this.materializedBatches.set(updatedBatches);
    this.persist();

    const reducedMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pourTimer = setTimeout(
      () => {
        this.activeParentIds.set([selectedIds[0], selectedIds[1]]);
        this.activeBreedingPoolIds.set(selectedIds);
        this.pouringPhenotypeId.set(null);
        this.pourTimer = null;
        this.statusMessage.set(
          `${selectedIds.length} ${result.label.toLowerCase()} hatchlings are breeding as an even pool for Generation ${this.nextGeneration()}.`,
        );
        this.persist();
        this.startBatch();
      },
      reducedMotion ? 40 : 1050,
    );
  }

  newObservation(): void {
    if (this.interactionLocked()) return;
    const founders = new Map(this.account().dragons.map((dragon) => [dragon.id, dragon]));
    this.activeParentIds.set(this.originalParentIds());
    this.activeBreedingPoolIds.set(
      this.originalParentIds().filter((id): id is string => Boolean(id)),
    );
    this.lineage.set(founders);
    this.materializedBatches.set(new Map());
    this.batches.set([]);
    this.nextRunNumber.set(1);
    this.previewIndex.set(0);
    this.picking.set({ female: false, male: false });
    this.statusMessage.set(
      'Observation cleared. Change either parent or trait, or repeat this pair.',
    );
    this.persist();
  }

  visibleTraits(parent: DragonParentProfile): readonly { label: string; value: string }[] {
    return parentVisibleTraits(parent);
  }

  visiblePhenotype(parent: DragonParentProfile): string {
    return (
      parentVisibleTraits(parent).find((trait) => trait.label === this.selectedTrait().name)
        ?.value ?? ''
    );
  }

  parentNamesFor(category: IncubatorPhenotypeOption): string {
    const parentIds = this.originalParentIds();
    const parents = parentIds
      .map((id) => this.findSpecimen(id))
      .filter((parent): parent is DragonParentProfile => Boolean(parent));
    const names = parents
      .filter((parent) => visiblePhenotypeId(parent, this.selectedTraitId()) === category.id)
      .map((parent) => parent.name);
    return names.join(', ') || '—';
  }

  resultFor(record: IncubatorBatchRecord, categoryId: string): IncubatorPhenotypeResult | null {
    return record.results.find((result) => result.id === categoryId) ?? null;
  }

  batchLabel(record: IncubatorBatchRecord): string {
    const sameGeneration = this.batches().filter((batch) => batch.generation === record.generation);
    const batchNumber = sameGeneration.findIndex((batch) => batch.id === record.id) + 1;
    return `Generation ${record.generation} · Batch ${batchNumber}`;
  }

  breedingSourceLabel(record: IncubatorBatchRecord): string {
    if (record.breedingPoolIds.length > 2) {
      return `${record.breedingPoolIds.length}-dragon balanced pool`;
    }
    return record.breedingPoolIds
      .map((id) => this.findSpecimen(id)?.name)
      .filter((name): name is string => Boolean(name))
      .join(' + ');
  }

  originalParentsLabel(): string {
    const names = this.originalParentIds()
      .map((id) => this.findSpecimen(id))
      .filter((parent): parent is DragonParentProfile => Boolean(parent))
      .map((parent) => parent.name);
    return names.join(' + ') || '—';
  }

  isSelectedForBreeding(id: string): boolean {
    return this.latestRecord()?.selectedForLaterBreedingIds.includes(id) ?? false;
  }

  private selectParent(role: ParentRole, dragon: AccountDragonRecord): void {
    if (this.selectionLocked()) {
      this.statusMessage.set('Clear the current observation before changing the original parents.');
      return;
    }
    if (dragon.sex !== role) {
      this.statusMessage.set(
        `Choose a ${role} dragon for the ${role === 'female' ? 'egg' : 'sperm'} parent.`,
      );
      return;
    }
    const current = [...this.originalParentIds()] as [string | null, string | null];
    const index = role === 'female' ? 0 : 1;
    const otherIndex = index === 0 ? 1 : 0;
    if (current[otherIndex] === dragon.id) {
      this.statusMessage.set('Choose two different dragons for this breeding pair.');
      return;
    }
    current[index] = dragon.id;
    this.originalParentIds.set(current);
    this.activeParentIds.set(current);
    this.activeBreedingPoolIds.set(current.filter((id): id is string => Boolean(id)));
    this.picking.update((state) => ({ ...state, [role]: false }));
    this.statusMessage.set(
      this.parentsReady()
        ? `${dragon.name} loaded. Choose a visible trait and sample size when ready.`
        : `${dragon.name} loaded as the ${role === 'female' ? 'egg' : 'sperm'} parent. Choose the other parent.`,
    );
    this.persist();
  }

  private restore(studentId: string): void {
    this.clearTimers();
    const snapshot = this.repository.load(studentId);
    const rebuilt = rebuildIncubatorLineage(
      snapshot,
      this.accountLibrary.recordsFor(studentId).dragons,
    );
    const restoredPoolIds = snapshot.activeBreedingPoolIds.filter((id) =>
      rebuilt.specimens.has(id),
    );
    const originalParentIds = this.sexOrderedParentIds(snapshot.originalParentIds);
    const activeBreedingPoolIds =
      snapshot.batches.length && restoredPoolIds.length >= 2
        ? restoredPoolIds
        : originalParentIds.filter((id): id is string => Boolean(id));
    const activeParentIds: readonly [string | null, string | null] = [
      activeBreedingPoolIds[0] ?? null,
      activeBreedingPoolIds[1] ?? null,
    ];
    this.originalParentIds.set(originalParentIds);
    this.activeParentIds.set(activeParentIds);
    this.activeBreedingPoolIds.set(activeBreedingPoolIds);
    this.selectedTraitId.set(snapshot.selectedTraitId);
    this.sampleSize.set(snapshot.sampleSize);
    this.nextRunNumber.set(snapshot.nextRunNumber);
    this.batches.set(snapshot.batches);
    this.lineage.set(rebuilt.specimens);
    this.materializedBatches.set(rebuilt.batches);
    this.running.set(false);
    this.animationStarted.set(false);
    this.pendingBatch.set(null);
    this.pouringPhenotypeId.set(null);
    this.picking.set({ female: false, male: false });
    this.statusMessage.set(
      snapshot.batches.length
        ? `Restored ${snapshot.batches.length} saved batch${snapshot.batches.length === 1 ? '' : 'es'}.`
        : 'Choose two parent dragons to wake the incubator.',
    );
  }

  private persist(): void {
    const snapshot: IncubatorSamplerSnapshot = {
      schemaVersion: 2,
      studentId: normalizeWorkstationStudentId(this.studentId()),
      originalParentIds: this.originalParentIds(),
      activeParentIds: this.activeParentIds(),
      activeBreedingPoolIds: this.activeBreedingPoolIds(),
      selectedTraitId: this.selectedTraitId(),
      sampleSize: this.sampleSize(),
      nextRunNumber: this.nextRunNumber(),
      batches: this.batches(),
    };
    this.repository.save(snapshot);
  }

  private findSpecimen(id: string | null): DragonParentProfile | null {
    return id ? (this.lineage().get(id) ?? null) : null;
  }

  private sexOrderedParentIds(
    ids: readonly [string | null, string | null],
  ): readonly [string | null, string | null] {
    const dragons = ids
      .map((id) => (id ? this.accountLibrary.recordById(this.studentId(), id) : null))
      .filter((record): record is AccountDragonRecord => record?.kind === 'dragon');
    return [
      dragons.find((dragon) => dragon.sex === 'female')?.id ?? null,
      dragons.find((dragon) => dragon.sex === 'male')?.id ?? null,
    ];
  }

  private clearTimers(): void {
    if (this.finishTimer) clearTimeout(this.finishTimer);
    if (this.kickoffTimer) clearTimeout(this.kickoffTimer);
    if (this.pourTimer) clearTimeout(this.pourTimer);
    this.finishTimer = null;
    this.kickoffTimer = null;
    this.pourTimer = null;
  }
}

function offspringGeneration(parent: DragonParentProfile): number {
  return 'generation' in parent && typeof parent.generation === 'number' ? parent.generation : 0;
}

function specimenSource(parent: DragonParentProfile | null): SpecimenSource | null {
  if (!parent) return null;
  const generation = offspringGeneration(parent);
  const blueprint = createEducationalAssembly(
    parent.genome,
    createVisualGenome(parent.id, parent.genome, generation, {
      color: parent.color,
      accentColor: parent.accentColor,
    }),
    { color: parent.color, accentColor: parent.accentColor },
  ).assembly;
  return {
    kind: 'blueprint',
    id: parent.id,
    blueprint,
    label: parent.name,
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
