import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { MiniTrialResult } from './mini-dragon.events';
import {
  MINI_DRAGON_GENES,
  MINI_FOUNDERS,
  MiniGeneId,
  MiniGenome,
  MiniPhenotypeForm,
} from './mini-dragon.genetics';
import {
  BloodlineReport,
  CompanionPup,
  ConsistencyReport,
  MaterializedLitter,
  StandardMatch,
  bloodlineReport,
  companionAssembly,
  companionFeatures,
  companionPaint,
  companionRibbons,
  companionShowCard,
  founderLinesRepresented,
  founderToCompanion,
  kennelGenerations,
  litterConsistency,
  meetsStandard,
  rebuildKennel,
  sameStandard,
  standardFormsFor,
  standardMatches,
  standardTargetLabel,
  whelpLitter,
} from './companion-show.domain';
import {
  BreedStandardTarget,
  COMPANION_DRAGON_DRAG_TYPE,
  COMPANION_LITTER_SIZES,
  CompanionDragon,
  CompanionLitterSize,
  CompanionShowSnapshot,
  LitterRecord,
  RegistryEntry,
  parseCompanionDragonDragPayload,
} from './companion-show.models';
import { CompanionShowRepository, emptyCompanionShowSnapshot } from './companion-show.repository';

type PairRole = 'dam' | 'sire';

/** One gene row on the standard bench, with the forms a student can ask for. */
interface StandardRow {
  geneId: MiniGeneId;
  geneName: string;
  observation: string;
  forms: readonly MiniPhenotypeForm[];
  selectedFormId: string | null;
}

/** A registry requirement the student's own records either meet or do not. */
interface EvidenceCheck {
  id: string;
  label: string;
  detail: string;
  met: boolean;
}

const MIN_CITED_LITTERS = 2;
const MIN_GENERATIONS = 3;
const MIN_CLAIM_LENGTH = 40;

@Component({
  selector: 'app-companion-show',
  imports: [SpecimenViewportComponent],
  templateUrl: './companion-show.component.html',
  styleUrl: './companion-show.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanionShowComponent {
  private readonly repository = inject(CompanionShowRepository);

  readonly studentId = input('local-student');
  readonly snapshotChange = output<CompanionShowSnapshot>();
  readonly goal = input(
    'Determine whether a mini dragon you design is reliably inherited across generations.',
  );

  readonly litterSizes = COMPANION_LITTER_SIZES;
  readonly pairRoles: readonly PairRole[] = ['dam', 'sire'];
  readonly founders = MINI_FOUNDERS;
  readonly minCitedLitters = MIN_CITED_LITTERS;
  readonly minGenerations = MIN_GENERATIONS;

  readonly breedName = signal('');
  readonly targets = signal<readonly BreedStandardTarget[]>([]);
  readonly kennelFounderIds = signal<readonly string[]>([]);
  readonly pairIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly litterSize = signal<CompanionLitterSize>(6);
  readonly litters = signal<readonly LitterRecord[]>([]);
  readonly nextRunNumber = signal(1);
  readonly championId = signal<string | null>(null);
  readonly citedLitterIds = signal<readonly string[]>([]);
  readonly claim = signal('');
  readonly registry = signal<readonly RegistryEntry[]>([]);
  readonly activeLitterId = signal<string | null>(null);
  readonly selectedPupId = signal<string | null>(null);
  readonly statusMessage = signal(
    'Adopt founders from the Society register to open your kennel.',
  );

  /**
   * The kennel is derived, never stored: adopted founders plus every pup the
   * student kept, replayed through the mini dragon breeder. Only the two inputs
   * that can change it are read here, so editing a claim or a breed name does not
   * re-breed the whole program.
   */
  private readonly rebuilt = computed(() =>
    rebuildKennel({
      ...emptyCompanionShowSnapshot(this.studentId()),
      kennelFounderIds: this.kennelFounderIds(),
      litters: this.litters(),
    }),
  );
  readonly kennelById = computed(() => this.rebuilt().kennel);
  readonly kennel = computed(() => [...this.rebuilt().kennel.values()]);
  readonly materializedLitters = computed(() =>
    this.litters()
      .map((record) => this.rebuilt().litters.get(record.id))
      .filter((litter): litter is MaterializedLitter => Boolean(litter)),
  );

  readonly standardRows = computed<readonly StandardRow[]>(() => {
    const selected = new Map(this.targets().map((target) => [target.geneId, target.formId]));
    return MINI_DRAGON_GENES.map((gene) => ({
      geneId: gene.id,
      geneName: gene.name,
      observation: gene.observation,
      forms: standardFormsFor(gene.id),
      selectedFormId: selected.get(gene.id) ?? null,
    }));
  });
  readonly standardSummary = computed(() =>
    this.targets()
      .map((target) => standardTargetLabel(target))
      .join(' · '),
  );

  readonly dam = computed(() => this.kennelById().get(this.pairIds()[0] ?? '') ?? null);
  readonly sire = computed(() => this.kennelById().get(this.pairIds()[1] ?? '') ?? null);
  readonly pairReady = computed(() => Boolean(this.dam() && this.sire()));
  readonly damSource = computed(() => specimenSource(this.dam()));
  readonly sireSource = computed(() => specimenSource(this.sire()));

  readonly activeLitter = computed<MaterializedLitter | null>(() => {
    const litters = this.materializedLitters();
    const activeId = this.activeLitterId();
    return litters.find((litter) => litter.record.id === activeId) ?? litters.at(-1) ?? null;
  });
  readonly nurseryPups = computed<readonly CompanionPup[]>(() => this.activeLitter()?.pups ?? []);
  readonly selectedPup = computed<CompanionPup | null>(() => {
    const pups = this.nurseryPups();
    if (!pups.length) return null;
    return pups.find((pup) => pup.id === this.selectedPupId()) ?? pups[0];
  });
  readonly standSource = computed(() => specimenSource(this.selectedPup()));
  readonly standFeatures = computed(() => {
    const pup = this.selectedPup();
    return pup ? companionFeatures(pup.id) : [];
  });
  readonly standShowCard = computed<readonly MiniTrialResult[]>(() => {
    const pup = this.selectedPup();
    return pup ? companionShowCard(pup.genome) : [];
  });

  readonly bloodline = computed<BloodlineReport | null>(() => {
    const dam = this.dam();
    const sire = this.sire();
    return dam && sire ? bloodlineReport(dam, sire, this.kennelById()) : null;
  });
  readonly founderLines = computed(() => founderLinesRepresented(this.kennelById()));
  readonly generations = computed(() => kennelGenerations(this.kennelById()));

  readonly citedLitters = computed(() =>
    this.materializedLitters().filter((litter) => this.citedLitterIds().includes(litter.record.id)),
  );
  readonly consistency = computed<ConsistencyReport>(() =>
    litterConsistency(this.citedLitters(), this.targets()),
  );
  readonly champion = computed(() => this.kennelById().get(this.championId() ?? '') ?? null);
  readonly championSource = computed(() => specimenSource(this.champion()));
  readonly championShowCard = computed<readonly MiniTrialResult[]>(() => {
    const champion = this.champion();
    return champion ? companionShowCard(champion.genome) : [];
  });
  readonly championRibbons = computed(() => {
    const champion = this.champion();
    return champion ? companionRibbons(champion.genome) : 0;
  });
  readonly championCandidates = computed(() =>
    this.targets().length
      ? this.kennel().filter((dragon) => meetsStandard(dragon.genome, this.targets()))
      : [],
  );

  readonly evidenceChecks = computed<readonly EvidenceCheck[]>(() => {
    const consistency = this.consistency();
    const champion = this.champion();
    const targets = this.targets();
    return [
      {
        id: 'name',
        label: 'Breed name',
        detail: this.breedName().trim() || 'Not named yet',
        met: this.breedName().trim().length > 1,
      },
      {
        id: 'standard',
        label: 'Written standard',
        detail: targets.length
          ? `${targets.length} defining characteristic${targets.length === 1 ? '' : 's'}`
          : 'No characteristic chosen',
        met: targets.length > 0,
      },
      {
        id: 'champion',
        label: 'Breed representative',
        detail: champion
          ? `${champion.name} meets the standard`
          : 'No kennel dragon chosen that meets the standard',
        met: champion ? meetsStandard(champion.genome, targets) : false,
      },
      {
        id: 'generations',
        label: `${MIN_GENERATIONS} generations bred`,
        detail: `Kennel reaches generation ${this.generations()}`,
        met: this.generations() >= MIN_GENERATIONS,
      },
      {
        id: 'litters',
        label: `${MIN_CITED_LITTERS} litters of evidence`,
        detail: consistency.litterCount
          ? `${consistency.matchedCount} of ${consistency.pupCount} young matched across ${consistency.litterCount} cited litter${consistency.litterCount === 1 ? '' : 's'}`
          : 'No litters cited yet',
        met: consistency.litterCount >= MIN_CITED_LITTERS,
      },
      {
        id: 'claim',
        label: 'Breeder statement',
        detail: this.claim().trim().length
          ? `${this.claim().trim().length} characters written`
          : 'Not written yet',
        met: this.claim().trim().length >= MIN_CLAIM_LENGTH,
      },
    ];
  });
  readonly canRegister = computed(() => this.evidenceChecks().every((check) => check.met));

  constructor() {
    effect(() => {
      const studentId = this.studentId();
      // restore() writes the same signals the kennel is derived from; tracking
      // them here would make this effect re-enter every time a litter changes.
      untracked(() => this.restore(studentId));
    });
  }

  // ---------------------------------------------------------------------------
  // Breed standard.
  // ---------------------------------------------------------------------------

  setBreedName(event: Event): void {
    this.breedName.set((event.target as HTMLInputElement).value.slice(0, 60));
    this.persist();
  }

  setTarget(geneId: MiniGeneId, formId: string): void {
    const current = this.targets();
    const existing = current.find((target) => target.geneId === geneId);
    const next =
      existing?.formId === formId
        ? current.filter((target) => target.geneId !== geneId)
        : [...current.filter((target) => target.geneId !== geneId), { geneId, formId }];
    this.targets.set(orderTargets(next));
    // Evidence is only comparable within one standard, so changing the standard
    // releases the citations gathered under the previous one.
    this.citedLitterIds.set([]);
    this.statusMessage.set(
      this.targets().length
        ? `Standard now reads: ${this.standardSummary()}.`
        : 'Standard cleared. Choose the characteristics your breed should show.',
    );
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Kennel and pairing.
  // ---------------------------------------------------------------------------

  adoptFounder(role: PairRole, founderId: string): void {
    if (!this.kennelFounderIds().includes(founderId)) {
      this.kennelFounderIds.update((ids) => [...ids, founderId]);
    }
    this.assignToPair(role, founderId);
  }

  founderPreview(founderId: string): { color: string; patchColor: string; emberColor: string } {
    const founder = founderToCompanion(founderId);
    return founder
      ? companionPaint(founder)
      : { color: '#7a6a8a', patchColor: '#7a6a8a', emberColor: '#ffe9c2' };
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dropOnPair(role: PairRole, event: DragEvent): void {
    event.preventDefault();
    const payload = event.dataTransfer?.getData(COMPANION_DRAGON_DRAG_TYPE);
    if (!payload) return;
    const id = parseCompanionDragonDragPayload(payload);
    if (!id) return;
    if (this.kennelById().has(id)) {
      this.assignToPair(role, id);
    } else if (MINI_FOUNDERS.some((founder) => founder.id === id)) {
      this.adoptFounder(role, id);
    }
  }

  startCompanionDrag(event: DragEvent, dragonId: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(COMPANION_DRAGON_DRAG_TYPE, JSON.stringify({ id: dragonId }));
    event.dataTransfer.setData('text/plain', `companion:${dragonId}`);
  }

  assignToPair(role: PairRole, dragonId: string): void {
    const index = role === 'dam' ? 0 : 1;
    const other = index === 0 ? 1 : 0;
    const current = [...this.pairIds()] as [string | null, string | null];
    if (current[other] === dragonId) {
      this.statusMessage.set('A dragon cannot be paired with itself. Choose a second dragon.');
      return;
    }
    current[index] = dragonId;
    this.pairIds.set(current);
    const name = this.kennelById().get(dragonId)?.name ?? 'Dragon';
    this.statusMessage.set(
      this.pairReady()
        ? `${name} paired. The bloodline reading comes from your kennel pedigree.`
        : `${name} moved to the ${role} stand. Choose the second parent.`,
    );
    this.persist();
  }

  clearPair(role: PairRole): void {
    const current = [...this.pairIds()] as [string | null, string | null];
    current[role === 'dam' ? 0 : 1] = null;
    this.pairIds.set(current);
    this.persist();
  }

  setLitterSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value) as CompanionLitterSize;
    if (!COMPANION_LITTER_SIZES.includes(size)) return;
    this.litterSize.set(size);
    this.persist();
  }

  whelp(): void {
    const dam = this.dam();
    const sire = this.sire();
    if (!dam || !sire) return;
    const litter = whelpLitter(dam, sire, this.targets(), this.nextRunNumber(), this.litterSize());
    this.litters.update((records) => [...records, litter.record]);
    this.nextRunNumber.update((run) => run + 1);
    this.activeLitterId.set(litter.record.id);
    this.selectedPupId.set(litter.pups[0]?.id ?? null);
    this.statusMessage.set(
      this.targets().length
        ? `${litter.pups.length} young whelped. ${litter.matchedCount} of ${litter.pups.length} match the current standard.`
        : `${litter.pups.length} young whelped. Write a standard to judge them against one.`,
    );
    this.persist();
  }

  openLitter(litter: MaterializedLitter): void {
    this.activeLitterId.set(litter.record.id);
    this.selectedPupId.set(litter.pups[0]?.id ?? null);
  }

  selectPup(pupId: string): void {
    this.selectedPupId.set(pupId);
  }

  togglePupKept(pup: CompanionPup): void {
    const nowKept = !pup.kept;
    this.litters.update((records) =>
      records.map((record) => {
        if (record.id !== pup.litterId) return record;
        const keptPupIds = nowKept
          ? [...record.keptPupIds, pup.id]
          : record.keptPupIds.filter((id) => id !== pup.id);
        return { ...record, keptPupIds };
      }),
    );
    if (!nowKept) this.detach(pup.id);
    this.statusMessage.set(
      nowKept
        ? `${pup.name} joined the kennel and can now be paired.`
        : `${pup.name} went to a pet home and left the breeding kennel.`,
    );
    this.persist();
  }

  releaseCompanion(dragon: CompanionDragon): void {
    if (dragon.origin === 'founder') {
      this.kennelFounderIds.update((ids) => ids.filter((id) => id !== dragon.id));
    } else if (dragon.litterId) {
      const litterId = dragon.litterId;
      this.litters.update((records) =>
        records.map((record) =>
          record.id === litterId
            ? { ...record, keptPupIds: record.keptPupIds.filter((id) => id !== dragon.id) }
            : record,
        ),
      );
    }
    this.detach(dragon.id);
    this.statusMessage.set(`${dragon.name} left the kennel.`);
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Show ring and registry.
  // ---------------------------------------------------------------------------

  selectChampion(dragonId: string): void {
    this.championId.set(this.championId() === dragonId ? null : dragonId);
    this.persist();
  }

  canCite(litter: MaterializedLitter): boolean {
    return this.targets().length > 0 && sameStandard(litter.record.targets, this.targets());
  }

  isCited(litterId: string): boolean {
    return this.citedLitterIds().includes(litterId);
  }

  toggleCitation(litter: MaterializedLitter): void {
    if (!this.canCite(litter)) return;
    const id = litter.record.id;
    this.citedLitterIds.update((ids) =>
      ids.includes(id) ? ids.filter((cited) => cited !== id) : [...ids, id],
    );
    this.persist();
  }

  setClaim(event: Event): void {
    this.claim.set((event.target as HTMLTextAreaElement).value.slice(0, 600));
    this.persist();
  }

  registerBreed(): void {
    const champion = this.champion();
    if (!this.canRegister() || !champion) return;
    const consistency = this.consistency();
    const entry: RegistryEntry = {
      id: `breed-${this.registry().length + 1}`,
      breedName: this.breedName().trim(),
      targets: this.targets().map((target) => ({ ...target })),
      championId: champion.id,
      championName: champion.name,
      citedLitterIds: [...this.citedLitterIds()],
      claim: this.claim().trim(),
      generations: this.generations(),
      consistencyPercent: consistency.percent,
      pupsObserved: consistency.pupCount,
      inbreedingPercent: this.bloodline()?.inbreedingPercent ?? 0,
      ribbons: companionRibbons(champion.genome),
      submittedAtIso: new Date().toISOString(),
    };
    this.registry.update((entries) => [...entries, entry]);
    this.statusMessage.set(
      `${entry.breedName} recorded: ${entry.consistencyPercent}% of ${entry.pupsObserved} cited young matched the standard.`,
    );
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Display helpers.
  // ---------------------------------------------------------------------------

  matchesFor(genome: MiniGenome): readonly StandardMatch[] {
    return standardMatches(genome, this.targets());
  }

  matchedCountFor(genome: MiniGenome): number {
    return this.matchesFor(genome).filter((match) => match.matched).length;
  }

  meetsCurrentStandard(genome: MiniGenome): boolean {
    return meetsStandard(genome, this.targets());
  }

  ribbonsFor(genome: MiniGenome): number {
    return companionRibbons(genome);
  }

  paintFor(dragon: { id: string; genome: MiniGenome }): {
    color: string;
    patchColor: string;
    emberColor: string;
  } {
    return companionPaint(dragon);
  }

  standardLabel(target: BreedStandardTarget): string {
    return standardTargetLabel(target);
  }

  parentNames(litter: MaterializedLitter): string {
    return litter.record.parentIds
      .map((id) => this.kennelById().get(id)?.name ?? 'Released')
      .join(' × ');
  }

  isPaired(dragonId: string): boolean {
    return this.pairIds().includes(dragonId);
  }

  isAdopted(founderId: string): boolean {
    return this.kennelFounderIds().includes(founderId);
  }

  // ---------------------------------------------------------------------------
  // Persistence.
  // ---------------------------------------------------------------------------

  /** Removes a dragon from any role that assumes it is still in the kennel. */
  private detach(dragonId: string): void {
    this.pairIds.update(
      (ids) => [ids[0] === dragonId ? null : ids[0], ids[1] === dragonId ? null : ids[1]] as const,
    );
    if (this.championId() === dragonId) this.championId.set(null);
  }

  private restore(studentId: string): void {
    const snapshot = this.repository.load(studentId);
    this.breedName.set(snapshot.breedName);
    this.targets.set(snapshot.targets);
    this.kennelFounderIds.set(snapshot.kennelFounderIds);
    this.litterSize.set(snapshot.litterSize);
    this.litters.set(snapshot.litters);
    this.nextRunNumber.set(snapshot.nextRunNumber);
    this.championId.set(snapshot.championId);
    this.citedLitterIds.set(snapshot.citedLitterIds);
    this.claim.set(snapshot.claim);
    this.registry.set(snapshot.registry);
    this.activeLitterId.set(null);
    this.selectedPupId.set(null);

    // The kennel is rebuilt from the records above, so a stored pairing is only
    // restored once the dragons it names exist again.
    const kennel = this.rebuilt().kennel;
    this.pairIds.set([
      snapshot.pairIds[0] && kennel.has(snapshot.pairIds[0]) ? snapshot.pairIds[0] : null,
      snapshot.pairIds[1] && kennel.has(snapshot.pairIds[1]) ? snapshot.pairIds[1] : null,
    ]);
    if (snapshot.championId && !kennel.has(snapshot.championId)) this.championId.set(null);
    this.statusMessage.set(
      snapshot.litters.length
        ? `Restored ${snapshot.litters.length} litter${snapshot.litters.length === 1 ? '' : 's'} and ${kennel.size} kennel dragon${kennel.size === 1 ? '' : 's'}.`
        : 'Adopt founders from the Society register to open your kennel.',
    );
    this.snapshotChange.emit(snapshot);
  }

  private persist(): void {
    const snapshot: CompanionShowSnapshot = {
      schemaVersion: 2,
      studentId: this.studentId().trim() || 'local-student',
      breedName: this.breedName(),
      targets: this.targets(),
      kennelFounderIds: this.kennelFounderIds(),
      pairIds: this.pairIds(),
      litterSize: this.litterSize(),
      litters: this.litters(),
      nextRunNumber: this.nextRunNumber(),
      championId: this.championId(),
      citedLitterIds: this.citedLitterIds(),
      claim: this.claim(),
      registry: this.registry(),
      updatedAtIso: new Date().toISOString(),
    };
    this.repository.save(snapshot);
    this.snapshotChange.emit(snapshot);
  }
}

function orderTargets(targets: readonly BreedStandardTarget[]): readonly BreedStandardTarget[] {
  return MINI_DRAGON_GENES.map((gene) =>
    targets.find((target) => target.geneId === gene.id),
  ).filter((target): target is BreedStandardTarget => Boolean(target));
}

function specimenSource(
  dragon: { id: string; name: string; genome: MiniGenome } | null,
): SpecimenSource | null {
  if (!dragon) return null;
  return {
    kind: 'blueprint',
    id: dragon.id,
    blueprint: companionAssembly(dragon),
    label: dragon.name,
  };
}
