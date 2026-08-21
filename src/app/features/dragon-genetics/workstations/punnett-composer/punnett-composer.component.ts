import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  EXPRESSIVE_DRAGON_TRAITS,
  ExpressiveDragonProfile,
  ExpressiveDragonTraitDefinition,
  ExpressiveDragonTraitId,
  GENERIC_HETEROZYGOUS_XY_DRAGON,
  expressivePhenotype,
  toCoreLabGenome,
} from '../../simulation/domain/dragon-expressive-genome';
import { DragonTraitGenotype } from '../../simulation/domain/dragon-lab.models';
import { dragonParentExpressiveProfile } from '../../simulation/domain/dragon-specimen.profile';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import {
  LOCAL_WORKSTATION_STUDENT_ID,
  normalizeWorkstationStudentId,
} from '../shared/dragon-workstation-context.models';
import {
  AccountDragonRecord,
  AccountGeneticsRecord,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import {
  DragonChromosomePair,
  buildDragonChromosomePairs,
  chromosomePairViewportItems,
} from '../shared/dragon-chromosome-pairs';
import {
  DragonChromosomeSelection,
  DragonChromosomeSelectorComponent,
  DragonGeneSelection,
} from '../shared/dragon-chromosome-selector.component';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import { CellChromosomeViewportComponent } from '../shared/cell-chromosome-viewport.component';
import { DRAGON_AUTOSOME_LABELS } from '../shared/dragon-chromosome.catalog';
import {
  createEmptyPunnettSnapshot,
  PendingPunnettGamete,
  PUNNETT_GAMETE_DRAG_TYPE,
  PunnettComposerMode,
  PunnettComposerSnapshot,
  PunnettGameteSlots,
  PunnettOffspringCellModel,
  PunnettParentSide,
  PunnettSavedCross,
} from './punnett-composer.models';
import { PunnettComposerRepository } from './punnett-composer.repository';

const TEST_FEMALE: AccountDragonRecord = testDragon(
  'punnett-test-female',
  'Heterozygous XX cell',
  'female',
  '#915ca8',
  '#dfb8f2',
);
const TEST_MALE: AccountDragonRecord = testDragon(
  'punnett-test-male',
  'Heterozygous XY cell',
  'male',
  '#3d8196',
  '#a5e4ef',
);

@Component({
  selector: 'app-punnett-composer',
  imports: [
    DragonChromosomeSelectorComponent,
    CellChromosomeViewportComponent,
    ChromosomeSvgComponent,
  ],
  templateUrl: './punnett-composer.component.html',
  styleUrl: './punnett-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PunnettComposerComponent {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(PunnettComposerRepository);

  readonly studentId = input.required<string>();
  readonly goal = input(
    'Determine how one allele from each parent combines in possible offspring.',
  );
  readonly crossSaved = output<PunnettSavedCross>();

  readonly traits = EXPRESSIVE_DRAGON_TRAITS;
  readonly genes = ALLELE_VAULT_GENES;
  readonly testDragons = [TEST_FEMALE, TEST_MALE] as const;
  readonly parentSides = ['parent1', 'parent2'] as const;
  readonly snapshot = signal<PunnettComposerSnapshot>(
    createEmptyPunnettSnapshot(LOCAL_WORKSTATION_STUDENT_ID),
  );
  readonly selectedChromosome = signal<AlleleVaultGene['chromosome']>('Chr 1');
  readonly stagedAccountRecord = signal<AccountGeneticsRecord | null>(null);
  readonly stagedChromosome = signal<string | null>(null);
  readonly pendingGamete = signal<PendingPunnettGamete | null>(null);
  readonly selectedCellIndex = signal<number | null>(null);
  readonly recordMessage = signal('');
  private loadedStudentId: string | null = null;

  readonly accountSnapshot = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly selectorDragons = computed<readonly AccountDragonRecord[]>(() =>
    this.snapshot().mode === 'test' ? this.testDragons : this.accountSnapshot().dragons,
  );
  readonly femaleSelectorDragons = computed(() =>
    this.selectorDragons().filter((dragon) => dragon.sex === 'female'),
  );
  readonly maleSelectorDragons = computed(() =>
    this.selectorDragons().filter((dragon) => dragon.sex === 'male'),
  );
  readonly parent1 = computed<AccountDragonRecord | null>(() =>
    this.snapshot().mode === 'test'
      ? TEST_FEMALE
      : this.accountParentById(this.snapshot().parent1Id),
  );
  readonly parent2 = computed<AccountDragonRecord | null>(() =>
    this.snapshot().mode === 'test' ? TEST_MALE : this.accountParentById(this.snapshot().parent2Id),
  );
  readonly activeTrait = computed<ExpressiveDragonTraitDefinition>(
    () => this.traits.find((trait) => trait.id === this.snapshot().traitId) ?? this.traits[0],
  );
  readonly activeGene = computed<AlleleVaultGene>(
    () => this.genes.find((gene) => gene.id === this.snapshot().traitId) ?? this.genes[0],
  );
  readonly chromosomeGenes = computed(() =>
    this.genes.filter((gene) => gene.chromosome === this.selectedChromosome()),
  );
  readonly parent1Profile = computed(() => this.profileFor('parent1'));
  readonly parent2Profile = computed(() => this.profileFor('parent2'));
  readonly parent1Alleles = computed<readonly string[]>(
    () => this.parent1Profile()?.genome[this.snapshot().traitId] ?? [],
  );
  readonly parent2Alleles = computed<readonly string[]>(
    () => this.parent2Profile()?.genome[this.snapshot().traitId] ?? [],
  );
  readonly parent1ChromosomePair = computed(() => this.chromosomePairFor(this.parent1Profile()));
  readonly parent2ChromosomePair = computed(() => this.chromosomePairFor(this.parent2Profile()));
  readonly parent1CellChromosomes = computed(() => this.cellChromosomesFor(this.parent1Profile()));
  readonly parent2CellChromosomes = computed(() => this.cellChromosomesFor(this.parent2Profile()));
  readonly cells = computed<readonly PunnettOffspringCellModel[]>(() => {
    const state = this.snapshot();
    const trait = this.activeTrait();
    return Array.from({ length: 4 }, (_, index) => {
      const row = Math.floor(index / 2);
      const column = index % 2;
      const parent1Allele = state.parent1Gametes[row];
      const parent2Allele = state.parent2Gametes[column];
      if (!parent1Allele || !parent2Allele) {
        return {
          index,
          row,
          column,
          parent1Allele,
          parent2Allele,
          genotype: null,
          phenotype: null,
        };
      }
      const genotypePair = normalizeAllelePair([parent1Allele, parent2Allele]);
      return {
        index,
        row,
        column,
        parent1Allele,
        parent2Allele,
        genotype: genotypePair.join(''),
        phenotype: expressivePhenotype(this.offspringProfile(genotypePair), trait),
      };
    });
  });
  readonly selectedCell = computed(() => {
    const index = this.selectedCellIndex();
    return index === null ? null : (this.cells()[index] ?? null);
  });
  readonly selectedCellChromosomePair = computed<DragonChromosomePair | null>(() => {
    const cell = this.selectedCell();
    if (!cell?.parent1Allele || !cell.parent2Allele) return null;
    return this.chromosomePairFor(
      this.offspringProfile(normalizeAllelePair([cell.parent1Allele, cell.parent2Allele])),
    );
  });
  readonly squareComplete = computed(() => this.cells().every((cell) => !!cell.genotype));
  readonly genotypeCounts = computed(() => countCellValues(this.cells(), 'genotype'));
  readonly phenotypeCounts = computed(() => countCellValues(this.cells(), 'phenotype'));
  readonly savedCrosses = computed(() => this.snapshot().savedCrosses);
  readonly placementStatus = computed(() => {
    const gamete = this.pendingGamete();
    if (gamete) {
      return `${this.parentLabel(gamete.parent)} allele ${gamete.allele} selected. Choose one of its axis boxes.`;
    }
    if (this.snapshot().mode === 'test') {
      return 'Choose a gene, then drag or select each chromosome copy for its matching allele box.';
    }
    if (!this.parent1() || !this.parent2()) {
      return 'Flip each dragon card, choose a chromosome, and select a gene to load that parent.';
    }
    return 'Select the same gene on both dragon cards to load their chromosome copies into the square.';
  });

  constructor() {
    effect(() => {
      const studentId = normalizeWorkstationStudentId(this.studentId());
      if (studentId === this.loadedStudentId) return;
      this.loadedStudentId = studentId;
      const loaded = this.sanitizeSnapshot(this.repository.load(studentId));
      this.snapshot.set(loaded);
      this.selectedChromosome.set(this.traitFor(loaded.traitId).chromosome);
      this.stagedAccountRecord.set(null);
      this.stagedChromosome.set(null);
      this.pendingGamete.set(null);
      this.selectedCellIndex.set(null);
    });
  }

  selectMode(mode: PunnettComposerMode): void {
    if (this.snapshot().mode === mode) return;
    this.updateSnapshot((state) => ({
      ...state,
      mode,
      parent1Gametes: [null, null],
      parent2Gametes: [null, null],
    }));
    this.stagedAccountRecord.set(null);
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set('');
  }

  selectAccountRecord(record: AccountGeneticsRecord): void {
    this.stagedAccountRecord.set(record);
    this.pendingGamete.set(null);
    this.recordMessage.set('');
  }

  selectSelectorDragon(side: PunnettParentSide, dragon: AccountDragonRecord): void {
    this.stagedChromosome.set(null);
    if (this.snapshot().mode === 'parents') {
      this.loadAccountRecord(dragon, side);
    }
  }

  useFirstAvailableParent(side: PunnettParentSide): void {
    const dragon =
      side === 'parent1' ? this.femaleSelectorDragons()[0] : this.maleSelectorDragons()[0];
    if (dragon) this.selectSelectorDragon(side, dragon);
  }

  selectSelectorChromosome(selection: DragonChromosomeSelection): void {
    const chromosome = selection.chromosome as AlleleVaultGene['chromosome'];
    const firstGene = this.genes.find((gene) => gene.chromosome === chromosome);
    if (!firstGene) return;
    this.stagedChromosome.set(chromosome);
    this.selectedChromosome.set(chromosome);
    this.selectTrait(firstGene.id);
  }

  selectSelectorGene(side: PunnettParentSide, selection: DragonGeneSelection): void {
    this.selectedChromosome.set(selection.chromosome);
    if (this.snapshot().mode === 'parents') {
      this.loadAccountRecord(selection.dragon, side);
    }
    this.selectTrait(selection.geneId);
    if (this.snapshot().mode === 'parents') {
      this.loadParentGeneCopies(side);
    }
  }

  selectTestChromosome(chromosome: string): void {
    const chromosomeId = chromosome as AlleleVaultGene['chromosome'];
    const firstGene = this.genes.find((gene) => gene.chromosome === chromosomeId);
    if (!firstGene) return;
    this.selectedChromosome.set(chromosomeId);
    this.selectTrait(firstGene.id);
  }

  loadStagedRecord(side: PunnettParentSide): void {
    const record = this.stagedAccountRecord();
    if (!record) return;
    this.loadAccountRecord(record, side);
  }

  loadAccountRecord(record: AccountGeneticsRecord, side: PunnettParentSide): void {
    if (this.snapshot().mode !== 'parents') return;
    const dragonId = record.kind === 'dragon' ? record.id : record.dragonId;
    const dragon = this.accountParentById(dragonId);
    if (!dragon) return;
    const expectedSex = side === 'parent1' ? 'female' : 'male';
    if (dragon.sex !== expectedSex) {
      this.recordMessage.set(
        `${dragon.name} is ${dragon.sex}; choose the ${this.parentLabel(side).toLowerCase()} bay.`,
      );
      return;
    }
    if (record.kind === 'chromosome') this.selectTrait(record.traitId);
    this.updateSnapshot((state) => ({
      ...state,
      [side === 'parent1' ? 'parent1Id' : 'parent2Id']: dragonId,
      [side === 'parent1' ? 'parent1Gametes' : 'parent2Gametes']: [null, null],
    }));
    this.stagedAccountRecord.set(null);
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set('');
  }

  selectTrait(traitId: ExpressiveDragonTraitId): void {
    const trait = this.traitFor(traitId);
    this.selectedChromosome.set(trait.chromosome);
    if (this.snapshot().traitId === traitId) return;
    this.updateSnapshot((state) => ({
      ...state,
      traitId,
      parent1Gametes: [null, null],
      parent2Gametes: [null, null],
    }));
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set('');
  }

  selectGamete(parent: PunnettParentSide, sourceIndex: number): void {
    const allele = this.allelesFor(parent)[sourceIndex];
    if (!allele) return;
    this.pendingGamete.set({ parent, sourceIndex, allele });
    this.stagedAccountRecord.set(null);
    this.recordMessage.set('');
  }

  startGameteDrag(event: DragEvent, parent: PunnettParentSide, sourceIndex: number): void {
    const allele = this.allelesFor(parent)[sourceIndex];
    if (!event.dataTransfer || !allele) return;
    const payload: PendingPunnettGamete = { parent, sourceIndex, allele };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(PUNNETT_GAMETE_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', `${this.parentLabel(parent)} allele ${allele}`);
  }

  placePendingGamete(parent: PunnettParentSide, slotIndex: number): void {
    const pending = this.pendingGamete();
    if (!pending || pending.parent !== parent) return;
    this.placeGamete(parent, slotIndex, pending.allele);
  }

  dropGamete(event: DragEvent, parent: PunnettParentSide, slotIndex: number): void {
    event.preventDefault();
    const pending = parseGametePayload(event.dataTransfer?.getData(PUNNETT_GAMETE_DRAG_TYPE) ?? '');
    if (!pending || pending.parent !== parent) return;
    this.placeGamete(parent, slotIndex, pending.allele);
  }

  allowGameteDrop(event: DragEvent, parent: PunnettParentSide): void {
    const pending = parseGametePayload(event.dataTransfer?.getData(PUNNETT_GAMETE_DRAG_TYPE) ?? '');
    if (
      pending?.parent === parent ||
      event.dataTransfer?.types.includes(PUNNETT_GAMETE_DRAG_TYPE)
    ) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }

  clearSquare(): void {
    this.updateSnapshot((state) => ({
      ...state,
      parent1Gametes: [null, null],
      parent2Gametes: [null, null],
    }));
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set(
      this.snapshot().mode === 'parents'
        ? 'Square cleared. Select genes on the parent cards to load it again.'
        : 'Square cleared. Heterozygous chromosome sources remain available.',
    );
  }

  selectCell(index: number): void {
    this.selectedCellIndex.set(index);
  }

  saveCross(): void {
    const parent1 = this.parent1();
    const parent2 = this.parent2();
    const trait = this.activeTrait();
    if (!parent1 || !parent2 || !this.squareComplete()) return;
    const savedAtIso = new Date().toISOString();
    const record: PunnettSavedCross = {
      id: `${parent1.id}:${parent2.id}:${trait.id}:${Date.now()}`,
      parent1Id: parent1.id,
      parent1Name: parent1.name,
      parent2Id: parent2.id,
      parent2Name: parent2.name,
      traitId: trait.id,
      traitName: trait.name,
      genotypeCounts: this.genotypeCounts(),
      phenotypeCounts: this.phenotypeCounts(),
      savedAtIso,
    };
    this.updateSnapshot((state) => ({
      ...state,
      savedCrosses: [record, ...state.savedCrosses].slice(0, 24),
    }));
    this.recordMessage.set(`Saved ${parent1.name} × ${parent2.name} for ${trait.name}.`);
    this.crossSaved.emit(record);
  }

  parentGeneCopyModel(parent: PunnettParentSide, index: number): ChromosomeSvgModel | null {
    const pair = parent === 'parent1' ? this.parent1ChromosomePair() : this.parent2ChromosomePair();
    return index === 0 ? (pair?.maternal ?? null) : (pair?.paternal ?? null);
  }

  slotValue(parent: PunnettParentSide, index: number): string | null {
    return parent === 'parent1'
      ? this.snapshot().parent1Gametes[index]
      : this.snapshot().parent2Gametes[index];
  }

  slotAriaLabel(parent: PunnettParentSide, index: number): string {
    const value = this.slotValue(parent, index);
    return value
      ? `${this.parentLabel(parent)} axis box ${index + 1}, loaded with allele ${value}`
      : `${this.parentLabel(parent)} axis box ${index + 1}, empty`;
  }

  cellAriaLabel(cell: PunnettOffspringCellModel): string {
    return cell.genotype
      ? `Offspring cell ${cell.index + 1}, genotype ${cell.genotype}, ${cell.phenotype}`
      : `Offspring cell ${cell.index + 1}, incomplete. Select to examine missing alleles.`;
  }

  countEntries(values: Readonly<Record<string, number>>): readonly [string, number][] {
    return Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
  }

  parentLabel(parent: PunnettParentSide): string {
    return parent === 'parent1' ? 'Female parent' : 'Male parent';
  }

  private allelesFor(parent: PunnettParentSide): readonly string[] {
    return parent === 'parent1' ? this.parent1Alleles() : this.parent2Alleles();
  }

  private loadParentGeneCopies(parent: PunnettParentSide): void {
    const alleles = this.allelesFor(parent);
    if (alleles.length < 2) return;
    const key = parent === 'parent1' ? 'parent1Gametes' : 'parent2Gametes';
    this.updateSnapshot((state) => ({
      ...state,
      [key]: [alleles[0], alleles[1]],
    }));
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set(
      `${this.parentLabel(parent)} ${this.activeGene().sampleCode} chromosome copies loaded.`,
    );
  }

  private placeGamete(parent: PunnettParentSide, slotIndex: number, allele: string): void {
    const sourceAlleles = this.allelesFor(parent);
    if (!sourceAlleles.includes(allele)) return;
    const key = parent === 'parent1' ? 'parent1Gametes' : 'parent2Gametes';
    this.updateSnapshot((state) => {
      const slots = [...state[key]] as [string | null, string | null];
      const availableCopies = sourceAlleles.filter((candidate) => candidate === allele).length;
      const loadedElsewhere = slots.filter(
        (candidate, index) => index !== slotIndex && candidate === allele,
      ).length;
      if (loadedElsewhere >= availableCopies) {
        const previousSlot = slots.findIndex(
          (candidate, index) => index !== slotIndex && candidate === allele,
        );
        if (previousSlot >= 0) slots[previousSlot] = null;
      }
      slots[slotIndex] = allele;
      return { ...state, [key]: slots };
    });
    this.pendingGamete.set(null);
    this.recordMessage.set('');
  }

  private profileFor(side: PunnettParentSide): ExpressiveDragonProfile | null {
    if (this.snapshot().mode === 'test') {
      return side === 'parent1' ? DEFAULT_EXPRESSIVE_DRAGON : GENERIC_HETEROZYGOUS_XY_DRAGON;
    }
    const parent = side === 'parent1' ? this.parent1() : this.parent2();
    return parent ? dragonParentExpressiveProfile(parent, parent.sex) : null;
  }

  private offspringProfile(genotype: DragonTraitGenotype): ExpressiveDragonProfile {
    const trait = this.activeTrait();
    const sex = trait.inheritance === 'x-linked' && genotype.includes('Y') ? 'male' : 'female';
    const baseline = sex === 'male' ? GENERIC_HETEROZYGOUS_XY_DRAGON : DEFAULT_EXPRESSIVE_DRAGON;
    return {
      sex,
      genome: { ...baseline.genome, [trait.id]: genotype },
    };
  }

  private chromosomePairFor(profile: ExpressiveDragonProfile | null): DragonChromosomePair | null {
    if (!profile) return null;
    return (
      buildDragonChromosomePairs({
        genes: this.genes,
        alleles: ALLELE_VAULT_ALLELES,
        chromosomes: [this.selectedChromosome()],
        sex: profile.sex,
        genotypeForGene: (geneId) => profile.genome[geneId],
      })[0] ?? null
    );
  }

  private cellChromosomesFor(profile: ExpressiveDragonProfile | null) {
    if (!profile) return [];
    return chromosomePairViewportItems(
      buildDragonChromosomePairs({
        genes: this.genes,
        alleles: ALLELE_VAULT_ALLELES,
        chromosomes: [...DRAGON_AUTOSOME_LABELS, 'Chr X'],
        sex: profile.sex,
        genotypeForGene: (geneId) => profile.genome[geneId],
      }),
    );
  }

  private accountParentById(id: string | null): AccountDragonRecord | null {
    return this.accountSnapshot().dragons.find((dragon) => dragon.id === id) ?? null;
  }

  private traitFor(id: ExpressiveDragonTraitId): ExpressiveDragonTraitDefinition {
    return this.traits.find((trait) => trait.id === id) ?? this.traits[0];
  }

  private updateSnapshot(
    update: (snapshot: PunnettComposerSnapshot) => PunnettComposerSnapshot,
  ): void {
    const next = {
      ...update(this.snapshot()),
      studentId: normalizeWorkstationStudentId(this.studentId()),
      updatedAtIso: new Date().toISOString(),
    };
    this.snapshot.set(next);
    this.repository.save(next);
  }

  private sanitizeSnapshot(snapshot: PunnettComposerSnapshot): PunnettComposerSnapshot {
    const parent1 = this.accountParentById(snapshot.parent1Id);
    const parent2 = this.accountParentById(snapshot.parent2Id);
    const validParent1 = parent1?.sex === 'female' ? parent1 : null;
    const validParent2 = parent2?.sex === 'male' ? parent2 : null;
    const traitId = this.traitFor(snapshot.traitId).id;
    return {
      ...snapshot,
      traitId,
      parent1Id: validParent1?.id ?? null,
      parent2Id: validParent2?.id ?? null,
      parent1Gametes: validGametes(
        snapshot.mode === 'test' ? DEFAULT_EXPRESSIVE_DRAGON : this.profileFrom(validParent1),
        traitId,
        snapshot.parent1Gametes,
      ),
      parent2Gametes: validGametes(
        snapshot.mode === 'test' ? GENERIC_HETEROZYGOUS_XY_DRAGON : this.profileFrom(validParent2),
        traitId,
        snapshot.parent2Gametes,
      ),
    };
  }

  private profileFrom(parent: AccountDragonRecord | null): ExpressiveDragonProfile | null {
    return parent ? dragonParentExpressiveProfile(parent, parent.sex) : null;
  }
}

function testDragon(
  id: string,
  name: string,
  sex: AccountDragonRecord['sex'],
  color: string,
  accentColor: string,
): AccountDragonRecord {
  const profile = sex === 'female' ? DEFAULT_EXPRESSIVE_DRAGON : GENERIC_HETEROZYGOUS_XY_DRAGON;
  return {
    kind: 'dragon',
    id,
    name,
    title: 'Standardized heterozygous reference',
    color,
    accentColor,
    genome: toCoreLabGenome(profile),
    sex,
    source: 'foundation',
    storedAtIso: '2026-01-01T00:00:00.000Z',
    generation: 0,
  };
}

function normalizeAllelePair(pair: DragonTraitGenotype): DragonTraitGenotype {
  return [...pair].sort((left, right) => {
    if (left === 'Y') return 1;
    if (right === 'Y') return -1;
    const leftDominant = left === left.toUpperCase();
    const rightDominant = right === right.toUpperCase();
    return leftDominant === rightDominant ? left.localeCompare(right) : leftDominant ? -1 : 1;
  }) as DragonTraitGenotype;
}

function parseGametePayload(value: string): PendingPunnettGamete | null {
  try {
    const candidate = JSON.parse(value) as Partial<PendingPunnettGamete>;
    if (
      (candidate.parent === 'parent1' || candidate.parent === 'parent2') &&
      typeof candidate.sourceIndex === 'number' &&
      typeof candidate.allele === 'string'
    ) {
      return {
        parent: candidate.parent,
        sourceIndex: candidate.sourceIndex,
        allele: candidate.allele,
      };
    }
  } catch {
    // Ignore data from unrelated drag sources.
  }
  return null;
}

function validGametes(
  parent: ExpressiveDragonProfile | null,
  traitId: ExpressiveDragonTraitId,
  gametes: PunnettGameteSlots,
): PunnettGameteSlots {
  if (!parent) return [null, null];
  const remaining = [...parent.genome[traitId]];
  return gametes.map((allele) => {
    const match = allele ? remaining.indexOf(allele) : -1;
    if (match < 0) return null;
    remaining.splice(match, 1);
    return allele;
  }) as [string | null, string | null];
}

function countCellValues(
  cells: readonly PunnettOffspringCellModel[],
  key: 'genotype' | 'phenotype',
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const cell of cells) {
    const value = cell[key];
    if (value) counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
