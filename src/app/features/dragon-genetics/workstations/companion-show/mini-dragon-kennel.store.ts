import { Injectable, computed, inject, signal } from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import { MiniTrialResult } from './mini-dragon.events';
import {
  MINI_DRAGON_GENES,
  MINI_FOUNDERS,
  MiniGeneId,
  MiniGenome,
  MiniPhenotypeForm,
  miniPhenotypeLabel,
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
  MiniShowDivisionId,
  MiniShowRunRecord,
  MiniTrainingSessionRecord,
  MiniTrainingSkillId,
  RegistryEntry,
  parseCompanionDragonDragPayload,
} from './companion-show.models';
import { CompanionShowRepository, emptyCompanionShowSnapshot } from './companion-show.repository';
import {
  MINI_RARE_TRAIT_TARGETS,
  MiniPedigreeEvidence,
  miniPedigreeEvidence,
  miniRareTraitCount,
  miniRareTraitTarget,
} from './mini-dragon.pedigree';
import {
  MINI_DRAGON_BREEDS,
  MiniBreedDefinition,
  MiniBreedId,
  miniBreed,
  miniBreedTargetPlan,
} from './mini-dragon.breeds';
import {
  MINI_SHOW_DIVISIONS,
  MINI_TRAINING_LEVEL_MAX,
  MINI_TRAINING_SKILLS,
  judgeMiniDragon,
  miniShowDivision,
  miniTrainingLevelLabel,
  miniTrainingLevels,
  showRunFromJudgement,
} from './mini-dragon.show';

export type PairRole = 'dam' | 'sire';

/** One gene row on the standard bench, with the forms a student can ask for. */
export interface StandardRow {
  geneId: MiniGeneId;
  geneName: string;
  observation: string;
  forms: readonly MiniPhenotypeForm[];
  selectedFormId: string | null;
}

/** A registry requirement the student's own records either meet or do not. */
export interface EvidenceCheck {
  id: string;
  label: string;
  detail: string;
  met: boolean;
}

export const MIN_CITED_LITTERS = 2;
export const MIN_GENERATIONS = 3;
export const MIN_CLAIM_LENGTH = 40;

/**
 * The one mini dragon breeding program, shared by every station that looks at it.
 *
 * The kennel, the training ground, the show arena and the pedigree lab are four
 * rooms around a single programme, not four programmes. Each is its own route and
 * so mounts its own component; holding the state here — rather than in any one of
 * them — is what lets a student train a dragon in one room and enter it in the
 * ring in another without the two rooms disagreeing about which dragons exist.
 *
 * Persistence is unchanged: one `CompanionShowSnapshot`, one repository key, so
 * saved progress and the capstone sync carry over untouched.
 */
@Injectable({ providedIn: 'root' })
export class MiniDragonKennelStore {
  private readonly repository = inject(CompanionShowRepository);

  readonly studentId = signal('');

  /** The most recent saved snapshot, for hosts that sync progress. */
  readonly snapshot = signal<CompanionShowSnapshot | null>(null);

  /** Which student the loaded state belongs to, so re-entering a station is free. */
  private restoredStudentId: string | null = null;

  readonly litterSizes = COMPANION_LITTER_SIZES;
  readonly pairRoles: readonly PairRole[] = ['dam', 'sire'];
  readonly founders = MINI_FOUNDERS;
  readonly breeds = MINI_DRAGON_BREEDS;
  readonly showDivisions = MINI_SHOW_DIVISIONS;
  readonly trainingSkills = MINI_TRAINING_SKILLS;
  readonly rareTraitTargets = MINI_RARE_TRAIT_TARGETS;
  readonly trainingLevelMax = MINI_TRAINING_LEVEL_MAX;
  readonly minCitedLitters = MIN_CITED_LITTERS;
  readonly minGenerations = MIN_GENERATIONS;

  readonly breedName = signal('');
  readonly selectedBreedId = signal<MiniBreedId>('puggle');
  readonly targets = signal<readonly BreedStandardTarget[]>([]);
  readonly kennelFounderIds = signal<readonly string[]>([]);
  readonly pairIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly litterSize = signal<CompanionLitterSize>(6);
  readonly litters = signal<readonly LitterRecord[]>([]);
  readonly nextRunNumber = signal(1);
  readonly championId = signal<string | null>(null);
  readonly showDivisionId = signal<MiniShowDivisionId | null>(null);
  readonly trainingSessions = signal<readonly MiniTrainingSessionRecord[]>([]);
  readonly showRuns = signal<readonly MiniShowRunRecord[]>([]);
  readonly rareTraitGeneId = signal<MiniGeneId | null>(null);
  readonly rareCandidateIds = signal<readonly string[]>([]);
  readonly selectedTrainingDragonId = signal<string | null>(null);
  readonly trainingInProgress = signal<MiniTrainingSkillId | null>(null);
  readonly championshipInProgress = signal(false);
  readonly citedLitterIds = signal<readonly string[]>([]);
  readonly claim = signal('');
  readonly registry = signal<readonly RegistryEntry[]>([]);
  readonly activeLitterId = signal<string | null>(null);
  readonly selectedPupId = signal<string | null>(null);
  readonly statusMessage = signal('Adopt founders from the Society register to open your kennel.');

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
  readonly rareTraitTarget = computed(() => miniRareTraitTarget(this.rareTraitGeneId()));
  readonly pedigreePopulation = computed<readonly CompanionDragon[]>(() => {
    const byId = new Map(this.kennel().map((dragon) => [dragon.id, dragon]));
    for (const litter of this.materializedLitters()) {
      for (const pup of litter.pups) byId.set(pup.id, { ...pup, origin: 'bred' });
    }
    return [...byId.values()].sort(
      (first, second) =>
        first.generation - second.generation || first.name.localeCompare(second.name),
    );
  });
  readonly pedigreeGenerations = computed(() => {
    const byGeneration = new Map<number, CompanionDragon[]>();
    for (const dragon of this.pedigreePopulation()) {
      const generation = byGeneration.get(dragon.generation) ?? [];
      generation.push(dragon);
      byGeneration.set(dragon.generation, generation);
    }
    return [...byGeneration.entries()].map(([generation, dragons]) => ({ generation, dragons }));
  });
  readonly rareTraitFoundCount = computed(() => {
    const target = this.rareTraitTarget();
    return target ? miniRareTraitCount(this.pedigreePopulation(), target) : 0;
  });

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
  readonly selectedBreed = computed(() => miniBreed(this.selectedBreedId()));
  readonly selectedBreedSource = computed(() => {
    const breed = this.selectedBreed();
    return specimenSource({
      id: `breed-reference-${breed.id}`,
      name: breed.name,
      genome: breed.exampleGenome,
    });
  });
  readonly selectedBreedPlans = computed(() =>
    this.selectedBreed().targets.map((target) => miniBreedTargetPlan(target)),
  );
  readonly selectedBreedFounderLeads = computed(() => {
    const targets = this.selectedBreed().targets;
    return this.founders
      .map((founder) => ({
        id: founder.id,
        name: founder.name,
        matched: standardMatches(founder.genome, targets).filter((match) => match.matched).length,
        total: targets.length,
      }))
      .sort(
        (first, second) => second.matched - first.matched || first.name.localeCompare(second.name),
      )
      .slice(0, 3);
  });

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
  readonly showDivision = computed(() => miniShowDivision(this.showDivisionId()));
  readonly divisionTargetLabels = computed(
    () => this.showDivision()?.targets.map((target) => standardTargetLabel(target)) ?? [],
  );
  readonly trainingDragon = computed<CompanionDragon | null>(() => {
    const kennel = this.kennelById();
    return (
      kennel.get(this.selectedTrainingDragonId() ?? '') ??
      kennel.get(this.championId() ?? '') ??
      this.kennel()[0] ??
      null
    );
  });
  readonly trainingSource = computed(() => specimenSource(this.trainingDragon()));
  readonly activeTrainingLevels = computed(() => {
    const dragon = this.trainingDragon();
    return dragon
      ? miniTrainingLevels(dragon.id, this.trainingSessions())
      : miniTrainingLevels('', []);
  });
  readonly latestShowRun = computed(() => {
    const championId = this.championId();
    const divisionId = this.showDivisionId();
    if (!championId || !divisionId) return null;
    return (
      [...this.showRuns()]
        .reverse()
        .find((run) => run.dragonId === championId && run.divisionId === divisionId) ?? null
    );
  });
  readonly canEnterShow = computed(() => Boolean(this.champion() && this.showDivision()));

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
        id: 'division',
        label: 'Society show division',
        detail: this.showDivision()?.name ?? 'No division chosen',
        met: Boolean(this.showDivision()),
      },
      {
        id: 'training',
        label: 'Four learned show skills',
        detail: champion
          ? `${
              MINI_TRAINING_SKILLS.filter(
                (skill) => miniTrainingLevels(champion.id, this.trainingSessions())[skill.id] > 0,
              ).length
            } of ${MINI_TRAINING_SKILLS.length} practiced`
          : 'Choose a representative before checking its training',
        met: champion
          ? MINI_TRAINING_SKILLS.every(
              (skill) => miniTrainingLevels(champion.id, this.trainingSessions())[skill.id] > 0,
            )
          : false,
      },
      {
        id: 'show-card',
        label: '50/50 judge card',
        detail: this.latestShowRun()
          ? `${this.latestShowRun()!.combinedScore}/100 - ${this.latestShowRun()!.award}`
          : 'No current representative has entered this division',
        met: Boolean(this.latestShowRun()),
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

  /**
   * Loads the student's programme once. Every station calls this on mount; the
   * second and later calls for the same student are no-ops, so walking between
   * rooms never rewinds work in progress.
   */
  ensureRestored(studentId: string): void {
    const normalized = normalizeWorkstationStudentId(studentId);
    if (this.restoredStudentId === normalized) return;
    this.restoredStudentId = normalized;
    this.studentId.set(studentId);
    this.restore(studentId);
  }

  // ---------------------------------------------------------------------------
  // Breed standard.
  // ---------------------------------------------------------------------------

  selectBreedReference(breedId: MiniBreedId): void {
    this.selectedBreedId.set(breedId);
  }

  applyBreedStandard(breedId: MiniBreedId): void {
    const breed = miniBreed(breedId);
    this.selectedBreedId.set(breedId);
    this.breedName.set(breed.name);
    this.targets.set(orderTargets(breed.targets.map((target) => ({ ...target }))));
    // Previous litter evidence was gathered against a different target set.
    this.citedLitterIds.set([]);
    this.statusMessage.set(
      `${breed.name} standard loaded. Choose founders, breed litters, and test whether the visible traits hold.`,
    );
    this.persist();
  }

  isBreedStandardActive(breed: MiniBreedDefinition): boolean {
    return this.breedName().trim() === breed.name && sameStandard(this.targets(), breed.targets);
  }

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

  setRareTraitGene(geneId: MiniGeneId): void {
    if (!MINI_RARE_TRAIT_TARGETS.some((target) => target.geneId === geneId)) return;
    this.rareTraitGeneId.set(geneId);
    this.rareCandidateIds.set([]);
    const target = miniRareTraitTarget(geneId);
    this.statusMessage.set(
      `Tracing ${target?.formLabel ?? 'a rare form'}. Read the family outcomes, flag candidates, and test a pairing.`,
    );
    this.persist();
  }

  pedigreeEvidenceFor(dragon: CompanionDragon): MiniPedigreeEvidence | null {
    const target = this.rareTraitTarget();
    return target ? miniPedigreeEvidence(dragon, this.pedigreePopulation(), target) : null;
  }

  pedigreeTraitLabel(dragon: CompanionDragon): string {
    const target = this.rareTraitTarget();
    return target ? miniPhenotypeLabel(target.geneId, dragon.genome) : 'Choose a trait';
  }

  toggleRareCandidate(dragonId: string): void {
    if (!this.pedigreePopulation().some((dragon) => dragon.id === dragonId)) return;
    this.rareCandidateIds.update((ids) =>
      ids.includes(dragonId) ? ids.filter((id) => id !== dragonId) : [...ids, dragonId],
    );
    this.persist();
  }

  isRareCandidate(dragonId: string): boolean {
    return this.rareCandidateIds().includes(dragonId);
  }

  isInKennel(dragonId: string): boolean {
    return this.kennelById().has(dragonId);
  }

  keepPedigreeCandidate(dragon: CompanionDragon): void {
    if (dragon.origin !== 'bred' || this.isInKennel(dragon.id)) return;
    const pup = this.materializedLitters()
      .flatMap((litter) => litter.pups)
      .find((candidate) => candidate.id === dragon.id);
    if (pup) this.togglePupKept(pup);
  }

  pedigreeParentNames(dragon: CompanionDragon): string {
    if (!dragon.parentIds) return 'Society founder';
    const population = new Map(
      this.pedigreePopulation().map((candidate) => [candidate.id, candidate]),
    );
    return dragon.parentIds.map((id) => population.get(id)?.name ?? 'Unknown').join(' + ');
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

  setShowDivision(divisionId: MiniShowDivisionId): void {
    this.showDivisionId.set(divisionId);
    this.statusMessage.set(
      `${miniShowDivision(divisionId)?.name ?? 'Show'} selected. Its published combination now guides the genetics half of judging.`,
    );
    this.persist();
  }

  selectTrainingDragon(dragonId: string): void {
    if (!this.kennelById().has(dragonId)) return;
    this.selectedTrainingDragonId.set(dragonId);
  }

  trainingLevel(skillId: MiniTrainingSkillId): number {
    return this.activeTrainingLevels()[skillId];
  }

  trainingLevelLabel(skillId: MiniTrainingSkillId): string {
    return miniTrainingLevelLabel(this.trainingLevel(skillId));
  }

  /**
   * Records one practice session and reports whether it was accepted, so the
   * training ground can play the matching motion. The animation lives with the
   * viewport that owns it; the record lives here.
   */
  recordTrainingSession(skillId: MiniTrainingSkillId): boolean {
    const dragon = this.trainingDragon();
    if (
      !dragon ||
      this.trainingInProgress() ||
      this.trainingLevel(skillId) >= MINI_TRAINING_LEVEL_MAX
    ) {
      return false;
    }

    const sessionNumber =
      this.trainingSessions().filter(
        (session) => session.dragonId === dragon.id && session.skillId === skillId,
      ).length + 1;
    const skill = MINI_TRAINING_SKILLS.find((candidate) => candidate.id === skillId);
    const session: MiniTrainingSessionRecord = {
      id: `${dragon.id}:${skillId}:${sessionNumber}`,
      dragonId: dragon.id,
      skillId,
      practicedAtIso: new Date().toISOString(),
    };
    this.trainingSessions.update((sessions) => [...sessions, session]);
    this.trainingInProgress.set(skillId);
    this.statusMessage.set(
      `${dragon.name} practiced ${skill?.name ?? 'a show skill'}. Training is learned and is not passed to young.`,
    );
    this.persist();
    return true;
  }

  enterShow(): void {
    const champion = this.champion();
    const division = this.showDivision();
    if (!champion || !division) return;
    const levels = miniTrainingLevels(champion.id, this.trainingSessions());
    const judgement = judgeMiniDragon(champion.genome, division, levels);
    const run = showRunFromJudgement(`show-${this.showRuns().length + 1}`, champion.id, judgement);
    this.showRuns.update((runs) => [...runs, run]);
    this.statusMessage.set(
      `${champion.name} earned ${judgement.combinedScore}/100: ${judgement.geneticScore} inherited and ${judgement.trainingScore} trained.`,
    );
    this.persist();
  }

  selectChampion(dragonId: string): void {
    this.championId.set(this.championId() === dragonId ? null : dragonId);
    if (this.championId()) this.selectedTrainingDragonId.set(dragonId);
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
    const showRun = this.latestShowRun();
    if (!this.canRegister() || !champion || !showRun) return;
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
      showDivisionId: showRun.divisionId,
      showRunId: showRun.id,
      geneticScore: showRun.geneticScore,
      trainingScore: showRun.trainingScore,
      combinedScore: showRun.combinedScore,
      award: showRun.award,
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

  divisionLabel(divisionId: MiniShowDivisionId): string {
    return miniShowDivision(divisionId)?.name ?? 'Society division';
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
    if (this.selectedTrainingDragonId() === dragonId) this.selectedTrainingDragonId.set(null);
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
    this.showDivisionId.set(snapshot.showDivisionId);
    this.trainingSessions.set(snapshot.trainingSessions);
    this.showRuns.set(snapshot.showRuns);
    this.rareTraitGeneId.set(snapshot.rareTraitGeneId);
    this.rareCandidateIds.set(snapshot.rareCandidateIds);
    this.citedLitterIds.set(snapshot.citedLitterIds);
    this.claim.set(snapshot.claim);
    this.registry.set(snapshot.registry);
    this.activeLitterId.set(null);
    this.selectedPupId.set(null);
    this.selectedTrainingDragonId.set(snapshot.championId);

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
    this.snapshot.set(snapshot);
  }

  private persist(): void {
    const snapshot: CompanionShowSnapshot = {
      schemaVersion: 4,
      studentId: normalizeWorkstationStudentId(this.studentId()),
      breedName: this.breedName(),
      targets: this.targets(),
      kennelFounderIds: this.kennelFounderIds(),
      pairIds: this.pairIds(),
      litterSize: this.litterSize(),
      litters: this.litters(),
      nextRunNumber: this.nextRunNumber(),
      championId: this.championId(),
      showDivisionId: this.showDivisionId(),
      trainingSessions: this.trainingSessions(),
      showRuns: this.showRuns(),
      rareTraitGeneId: this.rareTraitGeneId(),
      rareCandidateIds: this.rareCandidateIds(),
      citedLitterIds: this.citedLitterIds(),
      claim: this.claim(),
      registry: this.registry(),
      updatedAtIso: new Date().toISOString(),
    };
    this.repository.save(snapshot);
    this.snapshot.set(snapshot);
  }
}

function orderTargets(targets: readonly BreedStandardTarget[]): readonly BreedStandardTarget[] {
  return MINI_DRAGON_GENES.map((gene) =>
    targets.find((target) => target.geneId === gene.id),
  ).filter((target): target is BreedStandardTarget => Boolean(target));
}

export function specimenSource(
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
