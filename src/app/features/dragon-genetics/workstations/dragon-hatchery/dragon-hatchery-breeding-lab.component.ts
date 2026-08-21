import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  DRAGON_TRAITS,
  fertilizeLabGametes,
  genotypeLabel,
  getTrait,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonOffspring,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import {
  dragonOffspringSource,
  provideDragonSpecimenProfile,
} from '../../simulation/domain/dragon-specimen.profile';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountDragonRecord,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import {
  CellChromosomeViewportComponent,
  CellChromosomeViewportItem,
  CellChromosomeLocusSelection,
} from '../shared/cell-chromosome-viewport.component';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { DragonHatcheryBreedingRepository } from './dragon-hatchery-breeding.repository';
import {
  DragonHatcheryBreedingSnapshot,
  HatcheryFertilizationRecord,
} from './dragon-hatchery-breeding.models';
import { coreGameteGenome } from './meiosis-gamete.domain';
import { meiosisGameteViewportItems } from './meiosis-gamete.viewport';
import {
  MEIOSIS_GAMETE_DRAG_TYPE,
  MeiosisRun,
  SelectedMeiosisGamete,
} from './meiosis-gamete.models';
import { MeiosisGameteSelectorComponent } from './meiosis-gamete-selector.component';

type ParentRole = 'female' | 'male';
type FertilizationState = 'loading' | 'fusing' | 'egg';

interface FertilizedGeneAnalysis {
  chromosome: string;
  traitName: string;
  geneSymbol: string;
  eggAllele: string;
  spermAllele: string;
}

interface ParentGameteGeneAnalysis {
  chromosome: string;
  traitName: string;
  geneSymbol: string;
  allele: string;
  dominance: 'dominant' | 'recessive';
  recombinant: boolean;
}

const GAMETE_CHROMOSOME_LABELS = ['Chr 1', 'Chr 2', 'Chr 3', 'Chr 4', 'Chr X'] as const;

@Component({
  selector: 'app-dragon-hatchery-breeding-lab',
  imports: [
    MeiosisGameteSelectorComponent,
    AccountGeneticsFileComponent,
    CellChromosomeViewportComponent,
    SpecimenViewportComponent,
  ],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './dragon-hatchery-breeding-lab.component.html',
  styleUrl: './dragon-hatchery-breeding-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonHatcheryBreedingLabComponent implements OnDestroy {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(DragonHatcheryBreedingRepository);

  readonly studentId = input.required<string>();
  readonly seed = input('dragon-hatchery');

  readonly eggParentId = signal<string | null>(null);
  readonly spermParentId = signal<string | null>(null);
  readonly targetTraitId = signal<DragonTraitId>('scales');
  readonly activeRole = signal<ParentRole>('female');
  readonly eggSelection = signal<SelectedMeiosisGamete | null>(null);
  readonly spermSelection = signal<SelectedMeiosisGamete | null>(null);
  readonly femaleRun = signal<MeiosisRun | null>(null);
  readonly maleRun = signal<MeiosisRun | null>(null);
  readonly fertilizations = signal<readonly HatcheryFertilizationRecord[]>([]);
  readonly clutch = signal<readonly DragonOffspring[]>([]);
  readonly statusMessage = signal('Choose one female dragon and one male dragon for this family.');
  readonly fertilizationState = signal<FertilizationState>('loading');
  readonly formedEggChromosomes = signal<readonly CellChromosomeViewportItem[]>([]);
  readonly inspectedEggChromosome = signal<string | null>(null);
  readonly inspectedEggLocus = signal<string | null>(null);
  readonly inspectedEggGameteChromosome = signal<string | null>(null);
  readonly inspectedEggGameteLocus = signal<string | null>(null);
  readonly inspectedSpermGameteChromosome = signal<string | null>(null);
  readonly inspectedSpermGameteLocus = signal<string | null>(null);
  readonly babyDragonRevealed = signal(false);

  readonly account = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly eggParent = computed(() => this.findDragon(this.eggParentId()));
  readonly spermParent = computed(() => this.findDragon(this.spermParentId()));
  readonly parentsReady = computed(() => Boolean(this.eggParent() && this.spermParent()));
  readonly targetTrait = computed(() => getTrait(this.targetTraitId()));
  readonly selectedPair = computed<readonly [DragonParentProfile, DragonParentProfile] | null>(() => {
    const eggParent = this.eggParent();
    const spermParent = this.spermParent();
    return eggParent && spermParent ? [eggParent, spermParent] : null;
  });
  readonly canFertilize = computed(() => Boolean(this.eggSelection() && this.spermSelection()));
  /**
   * The fusion visual exists only once both gametes are in. It then takes over
   * the space the two selected gametes occupied, so the animation plays where
   * the student put them rather than in a separate panel that was always there.
   */
  readonly fusionVisible = computed(
    () => this.canFertilize() || this.fertilizationState() !== 'loading',
  );
  readonly gameteOutlineChromosomes = computed<readonly CellChromosomeViewportItem[]>(() =>
    GAMETE_CHROMOSOME_LABELS.map((label) => {
      const visual = chromosomeVisual(label);
      return {
        id: label,
        label,
        placeholder: true,
        model: {
          length: visual.length,
          leftLabel: '',
          rightLabel: '',
          centromere: visual.centromere,
          bands: visual.bands,
          loci: [],
        },
      };
    }),
  );
  readonly eggGameteChromosomes = computed(() =>
    this.eggSelection()
      ? meiosisGameteViewportItems(this.eggSelection()!.gamete.chromosomes)
      : [],
  );
  readonly spermGameteChromosomes = computed(() =>
    this.spermSelection()
      ? meiosisGameteViewportItems(this.spermSelection()!.gamete.chromosomes)
      : [],
  );
  readonly fertilizedChromosomePairs = computed<readonly CellChromosomeViewportItem[]>(() => {
    return this.combineGameteChromosomes(
      this.eggGameteChromosomes(),
      this.spermGameteChromosomes(),
    );
  });
  readonly activeParent = computed(() =>
    this.activeRole() === 'female' ? this.eggParent() : this.spermParent(),
  );
  readonly selectedEggChromosome = computed(() => {
    const target = `Chr ${this.targetTrait().chromosomeModel}`;
    return (
      this.inspectedEggChromosome() ??
      this.formedEggChromosomes().find((item) => item.id === target)?.id ??
      this.formedEggChromosomes()[0]?.id ??
      null
    );
  });
  readonly selectedEggLocus = computed(() => {
    const selected = this.inspectedEggLocus();
    if (selected) return selected;
    const chromosome = this.formedEggChromosomes().find(
      (item) => item.id === this.selectedEggChromosome(),
    );
    return (
      chromosome?.model.loci.find((locus) => locus.label === this.targetTrait().geneSymbol)?.label ??
      chromosome?.model.loci[0]?.label ??
      null
    );
  });
  readonly fertilizedGeneAnalysis = computed<FertilizedGeneAnalysis | null>(() => {
    const chromosome = this.formedEggChromosomes().find(
      (item) => item.id === this.selectedEggChromosome(),
    );
    const locus = this.selectedEggLocus();
    const eggLocus = chromosome?.model.loci.find((candidate) => candidate.label === locus);
    const spermLocus = chromosome?.pairedModel?.loci.find(
      (candidate) => candidate.label === locus,
    );
    if (!chromosome || !eggLocus || !spermLocus) return null;
    const trait = DRAGON_TRAITS.find((candidate) => candidate.geneSymbol === locus);
    return {
      chromosome: chromosome.id,
      traitName: trait?.name ?? locus ?? 'Gene',
      geneSymbol: locus ?? '',
      eggAllele: eggLocus.symbol ?? eggLocus.label,
      spermAllele: spermLocus.symbol ?? spermLocus.label,
    };
  });
  readonly newDragon = computed(() => this.clutch().at(-1) ?? null);
  readonly newDragonSource = computed(() => {
    const dragon = this.newDragon();
    return dragon ? dragonOffspringSource(dragon) : null;
  });

  private fusionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const studentId = this.studentId();
      untracked(() => this.restore(studentId));
    });
  }

  ngOnDestroy(): void {
    this.stopFusionTimer();
  }

  selectParent(role: ParentRole, dragon: AccountDragonRecord): void {
    this.assignParent(role, dragon);
  }

  selectInventoryParent(role: ParentRole, record: AccountGeneticsRecord): void {
    if (record.kind === 'dragon') this.assignParent(role, record);
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dropParent(role: ParentRole, event: DragEvent): void {
    event.preventDefault();
    const value = event.dataTransfer?.getData(ACCOUNT_GENETICS_RECORD_DRAG_TYPE);
    if (!value) return;
    const payload = parseAccountGeneticsDragPayload(value);
    if (!payload) return;
    const record = this.accountLibrary.recordById(this.studentId(), payload.id);
    if (record?.kind !== 'dragon') {
      this.statusMessage.set('A parent chamber accepts a whole dragon record, not one chromosome.');
      return;
    }
    this.assignParent(role, record);
  }


  inspectParentMeiosis(role: ParentRole): void {
    if (!this.parentsReady() || this.clutch().length) return;
    this.activeRole.set(role);
    const selection = role === 'female' ? this.eggSelection() : this.spermSelection();
    this.statusMessage.set(
      selection
        ? `${role === 'female' ? 'Egg' : 'Sperm'} gamete secured. You can inspect or replace it.`
        : `Investigating the ${role === 'female' ? 'egg' : 'sperm'} parent’s meiosis.`,
    );
  }

  selectGamete(role: ParentRole, selection: SelectedMeiosisGamete): void {
    if (this.fertilizationState() === 'egg') {
      this.fertilizationState.set('loading');
      this.formedEggChromosomes.set([]);
      this.resetEggInspection();
    }
    if (role === 'female') {
      this.eggSelection.set(selection);
      this.inspectedEggGameteChromosome.set(null);
      this.inspectedEggGameteLocus.set(null);
      if (!this.spermSelection()) this.activeRole.set('male');
      this.statusMessage.set('Egg gamete secured. Either parent remains available for comparison.');
    } else {
      this.spermSelection.set(selection);
      this.inspectedSpermGameteChromosome.set(null);
      this.inspectedSpermGameteLocus.set(null);
      if (!this.eggSelection()) this.activeRole.set('female');
      this.statusMessage.set(
        this.eggSelection()
          ? 'Both gametes are secured. The fertilization chamber is ready.'
          : 'Sperm gamete secured. Either parent remains available for comparison.',
      );
    }
    this.persist();
    if (this.canFertilize()) this.fertilize();
  }

  captureRun(role: ParentRole, run: MeiosisRun): void {
    if (role === 'female') this.femaleRun.set(run);
    else this.maleRun.set(run);
  }

  dropGamete(role: ParentRole, event: DragEvent): void {
    event.preventDefault();
    const id = event.dataTransfer?.getData(MEIOSIS_GAMETE_DRAG_TYPE);
    const run = role === 'female' ? this.femaleRun() : this.maleRun();
    const gamete = run?.gametes.find((candidate) => candidate.id === id);
    if (!run || !gamete) return;
    this.selectGamete(role, {
      run,
      gamete,
      reason: '',
      selectedAtIso: new Date().toISOString(),
    });
  }

  fertilize(): void {
    if (this.fertilizationState() === 'fusing') return;
    const eggParent = this.eggParent();
    const spermParent = this.spermParent();
    const eggSelection = this.eggSelection();
    const spermSelection = this.spermSelection();
    if (!eggParent || !spermParent || !eggSelection || !spermSelection) return;

    this.stopFusionTimer();
    this.babyDragonRevealed.set(false);
    this.formedEggChromosomes.set(this.fertilizedChromosomePairs());
    this.resetEggInspection();
    this.fertilizationState.set('fusing');

    const sequence = this.clutch().length + 1;
    const stamp = Date.now();
    const recordId = `fertilization-${stamp}-${sequence}`;
    const offspringId = `selected-clutch-${stamp}-${sequence}`;
    const offspring = fertilizeLabGametes(
      eggParent,
      spermParent,
      coreGameteGenome(eggSelection.gamete),
      coreGameteGenome(spermSelection.gamete),
      offspringId,
      1,
      `Hatchling ${sequence}`,
      sequence,
    );
    const createdAtIso = new Date(stamp).toISOString();
    const record: HatcheryFertilizationRecord = {
      id: recordId,
      eggParentId: eggParent.id,
      spermParentId: spermParent.id,
      targetTraitId: this.targetTraitId(),
      eggSelection,
      spermSelection,
      offspringId,
      offspringGenome: offspring.genome,
      createdAtIso,
    };
    this.accountLibrary.saveDragon(this.studentId(), this.inventoryRecordFor(offspring, record));
    this.clutch.update((current) => [...current, offspring]);
    this.fertilizations.update((current) => [...current, record]);
    this.statusMessage.set(`Egg ${sequence} is forming as the selected gamete nuclei combine.`);
    this.persist();
    this.fusionTimer = setTimeout(() => {
      this.fertilizationState.set('egg');
      this.eggSelection.set(null);
      this.spermSelection.set(null);
      this.activeRole.set('female');
      this.statusMessage.set(`Egg ${sequence} formed and was saved to your Dragon inventory.`);
      this.persist();
      this.fusionTimer = null;
    }, 1900);
  }

  newFamily(): void {
    this.stopFusionTimer();
    this.eggParentId.set(null);
    this.spermParentId.set(null);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.femaleRun.set(null);
    this.maleRun.set(null);
    this.fertilizations.set([]);
    this.clutch.set([]);
    this.fertilizationState.set('loading');
    this.formedEggChromosomes.set([]);
    this.resetEggInspection();
    this.resetGameteInspection();
    this.babyDragonRevealed.set(false);
    this.activeRole.set('female');
    this.statusMessage.set('Choose two dragons for a new family.');
    this.persist();
  }

  parentGenotype(parent: DragonParentProfile): string {
    return genotypeLabel(parent.genome[this.targetTraitId()]);
  }

  private assignParent(role: ParentRole, dragon: AccountDragonRecord): void {
    if (this.clutch().length) {
      this.statusMessage.set('Start a new family before changing parents for this clutch.');
      return;
    }
    if (dragon.sex !== role) {
      this.statusMessage.set(
        `Choose a ${role} dragon for the ${role === 'female' ? 'egg' : 'sperm'} parent.`,
      );
      return;
    }
    const otherId = role === 'female' ? this.spermParentId() : this.eggParentId();
    if (otherId === dragon.id) {
      this.statusMessage.set('Choose two different account dragons for this family.');
      return;
    }
    if (role === 'female') this.eggParentId.set(dragon.id);
    else this.spermParentId.set(dragon.id);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.fertilizationState.set('loading');
    this.formedEggChromosomes.set([]);
    this.resetEggInspection();
    this.resetGameteInspection();
    this.babyDragonRevealed.set(false);
    this.activeRole.set('female');
    this.statusMessage.set(`${dragon.name} loaded as the ${role === 'female' ? 'egg' : 'sperm'} parent.`);
    this.persist();
  }

  private restore(studentId: string): void {
    this.stopFusionTimer();
    const snapshot = this.repository.load(studentId);
    const eggParent = this.findDragon(snapshot.eggParentId);
    const spermParent = this.findDragon(snapshot.spermParentId);
    this.eggParentId.set(eggParent?.sex === 'female' ? eggParent.id : null);
    this.spermParentId.set(spermParent?.sex === 'male' ? spermParent.id : null);
    this.targetTraitId.set(snapshot.targetTraitId);
    this.eggSelection.set(eggParent?.sex === 'female' ? snapshot.pendingEggSelection : null);
    this.spermSelection.set(spermParent?.sex === 'male' ? snapshot.pendingSpermSelection : null);
    this.fertilizations.set(snapshot.fertilizations);
    const clutch = this.restoreClutch(snapshot.fertilizations);
    this.clutch.set(clutch);
    this.fertilizationState.set(clutch.length ? 'egg' : 'loading');
    const latest = snapshot.fertilizations.at(-1);
    this.formedEggChromosomes.set(
      latest
        ? this.combineGameteChromosomes(
            meiosisGameteViewportItems(latest.eggSelection.gamete.chromosomes),
            meiosisGameteViewportItems(latest.spermSelection.gamete.chromosomes),
          )
        : [],
    );
    this.resetEggInspection();
    this.resetGameteInspection();
    this.babyDragonRevealed.set(false);
    this.syncClutchToInventory(clutch, snapshot.fertilizations);
    this.activeRole.set(this.eggSelection() ? 'male' : 'female');
  }

  private restoreClutch(
    records: readonly HatcheryFertilizationRecord[],
  ): readonly DragonOffspring[] {
    return records.flatMap((record, index) => {
      const eggParent = this.findDragon(record.eggParentId);
      const spermParent = this.findDragon(record.spermParentId);
      if (!eggParent || !spermParent) return [];
      try {
        return [
          fertilizeLabGametes(
            eggParent,
            spermParent,
            coreGameteGenome(record.eggSelection.gamete),
            coreGameteGenome(record.spermSelection.gamete),
            record.offspringId,
            1,
            `Hatchling ${index + 1}`,
            index + 1,
          ),
        ];
      } catch {
        return [];
      }
    });
  }

  private syncClutchToInventory(
    clutch: readonly DragonOffspring[],
    records: readonly HatcheryFertilizationRecord[],
  ): void {
    const existingIds = new Set(this.account().dragons.map((dragon) => dragon.id));
    const missing = clutch.flatMap((offspring) => {
      if (existingIds.has(offspring.id)) return [];
      const record = records.find((candidate) => candidate.offspringId === offspring.id);
      return record ? [this.inventoryRecordFor(offspring, record)] : [];
    });
    if (missing.length) this.accountLibrary.saveDragons(this.studentId(), missing);
  }

  private inventoryRecordFor(
    offspring: DragonOffspring,
    record: HatcheryFertilizationRecord,
  ): AccountDragonRecord {
    const sexChromosome = record.spermSelection.gamete.chromosomes.find(
      (chromosome) => chromosome.chromosome === 'Chr X',
    )?.sexChromosome;
    return {
      kind: 'dragon',
      id: offspring.id,
      name: offspring.name,
      title: offspring.title,
      color: offspring.color,
      accentColor: offspring.accentColor,
      genome: offspring.genome,
      sex: sexChromosome === 'Y' ? 'male' : 'female',
      source: 'student',
      storedAtIso: record.createdAtIso,
      generation: offspring.generation,
      parentIds: offspring.parentIds,
      originRecordId: record.id,
    };
  }

  private persist(): void {
    const snapshot: DragonHatcheryBreedingSnapshot = {
      schemaVersion: 1,
      studentId: normalizeWorkstationStudentId(this.studentId()),
      eggParentId: this.eggParentId(),
      spermParentId: this.spermParentId(),
      targetTraitId: this.targetTraitId(),
      pendingEggSelection: this.eggSelection(),
      pendingSpermSelection: this.spermSelection(),
      fertilizations: this.fertilizations(),
    };
    this.repository.save(snapshot);
  }

  private stopFusionTimer(): void {
    if (this.fusionTimer) clearTimeout(this.fusionTimer);
    this.fusionTimer = null;
  }

  inspectFertilizedChromosome(chromosomeId: string): void {
    this.inspectedEggChromosome.set(chromosomeId);
    const firstLocus = this.formedEggChromosomes().find(
      (item) => item.id === chromosomeId,
    )?.model.loci[0]?.label;
    this.inspectedEggLocus.set(firstLocus ?? null);
  }

  inspectFertilizedLocus(selection: CellChromosomeLocusSelection): void {
    this.inspectedEggChromosome.set(selection.chromosomeId);
    this.inspectedEggLocus.set(selection.locus);
  }

  inspectedGameteChromosome(role: ParentRole): string | null {
    const selected =
      role === 'female'
        ? this.inspectedEggGameteChromosome()
        : this.inspectedSpermGameteChromosome();
    const chromosomes =
      role === 'female' ? this.eggGameteChromosomes() : this.spermGameteChromosomes();
    const target = `Chr ${this.targetTrait().chromosomeModel}`;
    return (
      selected ??
      chromosomes.find((item) => item.id === target)?.id ??
      chromosomes[0]?.id ??
      null
    );
  }

  inspectedGameteLocus(role: ParentRole): string | null {
    const selected =
      role === 'female' ? this.inspectedEggGameteLocus() : this.inspectedSpermGameteLocus();
    if (selected) return selected;
    const chromosomes =
      role === 'female' ? this.eggGameteChromosomes() : this.spermGameteChromosomes();
    const chromosome = chromosomes.find(
      (item) => item.id === this.inspectedGameteChromosome(role),
    );
    return (
      chromosome?.model.loci.find((locus) => locus.label === this.targetTrait().geneSymbol)?.label ??
      chromosome?.model.loci[0]?.label ??
      null
    );
  }

  inspectGameteChromosome(role: ParentRole, chromosomeId: string): void {
    const chromosomes =
      role === 'female' ? this.eggGameteChromosomes() : this.spermGameteChromosomes();
    const firstLocus =
      chromosomes.find((item) => item.id === chromosomeId)?.model.loci[0]?.label ?? null;
    if (role === 'female') {
      this.inspectedEggGameteChromosome.set(chromosomeId);
      this.inspectedEggGameteLocus.set(firstLocus);
    } else {
      this.inspectedSpermGameteChromosome.set(chromosomeId);
      this.inspectedSpermGameteLocus.set(firstLocus);
    }
  }

  inspectGameteLocus(role: ParentRole, selection: CellChromosomeLocusSelection): void {
    if (role === 'female') {
      this.inspectedEggGameteChromosome.set(selection.chromosomeId);
      this.inspectedEggGameteLocus.set(selection.locus);
    } else {
      this.inspectedSpermGameteChromosome.set(selection.chromosomeId);
      this.inspectedSpermGameteLocus.set(selection.locus);
    }
  }

  gameteGeneAnalysis(role: ParentRole): ParentGameteGeneAnalysis | null {
    const selection = role === 'female' ? this.eggSelection() : this.spermSelection();
    const chromosomeId = this.inspectedGameteChromosome(role);
    const locus = this.inspectedGameteLocus(role);
    const chromosome = selection?.gamete.chromosomes.find(
      (candidate) => candidate.chromosome === chromosomeId,
    );
    const allele = chromosome?.loci.find((candidate) => candidate.geneSymbol === locus);
    if (!chromosome || !allele) return null;
    return {
      chromosome: chromosome.sexChromosome === 'Y' ? 'Chr Y' : chromosome.chromosome,
      traitName: allele.traitName,
      geneSymbol: allele.geneSymbol,
      allele: allele.allele,
      dominance: allele.dominance,
      recombinant: chromosome.recombinant,
    };
  }

  revealBabyDragon(): void {
    const dragon = this.newDragon();
    if (this.fertilizationState() !== 'egg' || !dragon) return;
    this.babyDragonRevealed.set(true);
    this.statusMessage.set(`${dragon.name} emerged from the fertilized egg.`);
  }

  private resetEggInspection(): void {
    this.inspectedEggChromosome.set(null);
    this.inspectedEggLocus.set(null);
  }

  private resetGameteInspection(): void {
    this.inspectedEggGameteChromosome.set(null);
    this.inspectedEggGameteLocus.set(null);
    this.inspectedSpermGameteChromosome.set(null);
    this.inspectedSpermGameteLocus.set(null);
  }

  private combineGameteChromosomes(
    eggs: readonly CellChromosomeViewportItem[],
    sperm: readonly CellChromosomeViewportItem[],
  ): readonly CellChromosomeViewportItem[] {
    const spermById = new Map(sperm.map((item) => [item.id, item]));
    if (!eggs.length || !spermById.size) return [];
    return eggs.flatMap((egg) => {
      const spermChromosome = spermById.get(egg.id);
      if (!spermChromosome) return [];
      return [
        {
          id: egg.id,
          label: `${egg.label} + ${spermChromosome.label}`,
          shortLabel: `${egg.label.replace('Chr ', '')}/${spermChromosome.label.replace('Chr ', '')}`,
          model: egg.model,
          pairedModel: spermChromosome.model,
          pairRelationship: 'gamete-fusion' as const,
          recombinant: Boolean(egg.recombinant || spermChromosome.recombinant),
        },
      ];
    });
  }

  private findDragon(id: string | null): AccountDragonRecord | null {
    if (!id) return null;
    return this.account().dragons.find((dragon) => dragon.id === id) ?? null;
  }
}
