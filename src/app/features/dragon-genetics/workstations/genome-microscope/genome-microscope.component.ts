import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import {
  RnaTranslationStep,
  dnaSequence,
  transcribedRna,
  translateRna,
} from '../../../../shared/dna-process-visuals/dna-process.models';
import { DnaReplicationAnimationComponent } from '../../../../shared/dna-process-visuals/dna-replication-animation.component';
import { DnaTranscriptionAnimationComponent } from '../../../../shared/dna-process-visuals/dna-transcription-animation.component';
import { RnaTranslationAnimationComponent } from '../../../../shared/dna-process-visuals/rna-translation-animation.component';
import { DRAGON_TRAITS, genotypeLabel } from '../../simulation/domain/dragon-inheritance';
import {
  dragonParentSource,
  provideDragonSpecimenProfile,
} from '../../simulation/domain/dragon-specimen.profile';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import { AccountDragonRecord } from '../shared/account-genetics-library.models';
import {
  CellChromosomeLocusSelection,
  CellChromosomeViewportComponent,
  CellChromosomeViewportItem,
} from '../shared/cell-chromosome-viewport.component';
import { CellModelComponent } from '../shared/cell-model.component';
import { DRAGON_AUTOSOME_LABELS } from '../shared/dragon-chromosome.catalog';
import { DragonCardDeckSelectorComponent } from '../shared/dragon-card-deck-selector.component';
import {
  buildDragonChromosomePairs,
  chromosomePairViewportItems,
  DragonChromosomePair,
} from '../shared/dragon-chromosome-pairs';
import {
  DragonGeneProtein,
  DragonProteinForm,
  geneDnaRecord,
} from '../shared/dragon-gene-dna.catalog';
import {
  GENOME_MICROSCOPE_LEVEL_DEFINITIONS,
  GENOME_MICROSCOPE_LEVELS,
  GenomeMicroscopeEvidence,
  GenomeMicroscopeLevel,
  GenomeMicroscopeSex,
} from './genome-microscope.models';
import { DnaRnaBaseExplorerComponent } from './dna-rna-base-explorer.component';
import { ChromosomeUnravelingComponent } from './chromosome-unraveling.component';
import {
  EnzymeReactionExplorerComponent,
  EnzymeReactionResult,
} from './enzyme-reaction-explorer.component';
import { ProteinTraitExpressionComponent } from './protein-trait-expression.component';

interface AlleleCopyView {
  copy: 0 | 1;
  label: string;
  symbol: string;
  allele: AlleleVaultAllele | null;
  sequence: readonly string[];
  fromLoadedDragon: boolean;
}

const EMPTY_ALLELE_COPY: AlleleCopyView = {
  copy: 0,
  label: 'No allele loaded',
  symbol: '?',
  allele: null,
  sequence: [],
  fromLoadedDragon: false,
};

@Component({
  selector: 'app-genome-microscope',
  imports: [
    SpecimenViewportComponent,
    CellChromosomeViewportComponent,
    CellModelComponent,
    ChromosomeUnravelingComponent,
    DnaReplicationAnimationComponent,
    DnaTranscriptionAnimationComponent,
    RnaTranslationAnimationComponent,
    DnaRnaBaseExplorerComponent,
    EnzymeReactionExplorerComponent,
    ProteinTraitExpressionComponent,
    DragonCardDeckSelectorComponent,
  ],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './genome-microscope.component.html',
  styleUrl: './genome-microscope.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenomeMicroscopeComponent {
  readonly dragons = input<readonly AccountDragonRecord[]>([]);
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);
  readonly autosomeChromosomes =
    input<readonly AlleleVaultGene['chromosome'][]>(DRAGON_AUTOSOME_LABELS);
  readonly initialLevel = input<GenomeMicroscopeLevel>('dragon');
  readonly showSpecimenLoader = input(true);
  readonly showGuideControl = input(true);

  readonly modelSelected = output<string>();
  readonly evidenceChanged = output<GenomeMicroscopeEvidence>();

  readonly levels = GENOME_MICROSCOPE_LEVEL_DEFINITIONS;
  readonly level = linkedSignal<GenomeMicroscopeLevel>(() => {
    const requested = this.initialLevel();
    return this.isMolecularLevel(requested) && !this.genes().length ? 'chromosome-set' : requested;
  });
  readonly loadedDragonId = linkedSignal<string | null>(() => this.dragons()[0]?.id ?? null);
  readonly selectedChromosome = signal('Chr 1');
  readonly selectedGeneId = signal<string | null>(null);
  readonly selectedAlleleCopy = signal<0 | 1>(0);
  readonly guideOpen = signal(false);
  readonly dragonDeckOpen = signal(true);
  readonly visitedLevels = signal<readonly GenomeMicroscopeLevel[]>(['dragon']);
  readonly enzymeResult = signal<EnzymeReactionResult | null>(null);

  readonly loadedDragon = computed(
    () => this.dragons().find((dragon) => dragon.id === this.loadedDragonId()) ?? null,
  );
  readonly loadedDragonSource = computed<SpecimenSource | null>(() => {
    const dragon = this.loadedDragon();
    return dragon ? dragonParentSource(dragon) : null;
  });
  readonly specimenSex = computed<GenomeMicroscopeSex>(() => this.loadedDragon()?.sex ?? 'female');

  readonly chromosomePairs = computed<readonly DragonChromosomePair[]>(() =>
    buildDragonChromosomePairs({
      genes: this.genes(),
      alleles: this.alleles(),
      chromosomes: [...this.autosomeChromosomes(), 'Chr X'],
      sex: this.specimenSex(),
      genotypeForGene: (geneId) => {
        const dragon = this.loadedDragon();
        const trait = DRAGON_TRAITS.find((candidate) => candidate.id === geneId);
        return dragon && trait ? dragon.genome[trait.id] : undefined;
      },
    }),
  );
  readonly activePair = computed(
    () =>
      this.chromosomePairs().find((pair) => pair.id === this.selectedChromosome()) ??
      this.chromosomePairs()[0] ??
      null,
  );
  readonly genesForSelectedChromosome = computed(() =>
    this.genes().filter((gene) => gene.chromosome === this.selectedChromosome()),
  );
  readonly activeGene = computed<AlleleVaultGene | null>(() => {
    const chromosomeGenes = this.genesForSelectedChromosome();
    return (
      chromosomeGenes.find((gene) => gene.id === this.selectedGeneId()) ??
      chromosomeGenes[0] ??
      null
    );
  });
  readonly activeAlleles = computed(() => {
    const gene = this.activeGene();
    return gene ? this.alleles().filter((allele) => allele.geneId === gene.id) : [];
  });
  readonly alleleCopies = computed<readonly AlleleCopyView[]>(() => this.buildAlleleCopies());
  readonly activeAlleleCopy = computed(
    () =>
      this.alleleCopies()[this.selectedAlleleCopy()] ?? this.alleleCopies()[0] ?? EMPTY_ALLELE_COPY,
  );
  readonly activeDnaSequence = computed(() => {
    const sequence = this.activeAlleleCopy().sequence.join('');
    return sequence ? dnaSequence(sequence).join('') : '';
  });
  readonly activeRnaSequence = computed(() => {
    const sequence = this.activeDnaSequence();
    return sequence ? transcribedRna(dnaSequence(sequence)).join('') : '';
  });
  readonly proteinCodons = computed<readonly RnaTranslationStep[]>(
    () => translateRna(this.activeRnaSequence()).steps,
  );

  /**
   * The protein the selected gene codes for.
   *
   * This is the same record the enzyme bench and the expression model read, so
   * the shape a student meets here is the shape they meet two levels later.
   */
  readonly activeProtein = computed<DragonGeneProtein | null>(() => {
    const gene = this.activeGene();
    return gene ? geneDnaRecord(gene.id).protein : null;
  });
  /** The protein form for the allele copy currently under the objective. */
  readonly activeProteinForm = computed<DragonProteinForm | null>(() => {
    const gene = this.activeGene();
    if (!gene) return null;
    const record = geneDnaRecord(gene.id);
    const sequence = this.activeDnaSequence();
    /*
     * Both sides go through `dnaSequence` before comparison. It caps a strand
     * at 24 bases, so an insertion allele would never match its own 25-base
     * record if only one side were normalised.
     */
    const marking =
      record.alleles.find((allele) => dnaSequence(allele.sequence).join('') === sequence) ??
      record.alleles[0];
    return marking.protein;
  });

  /**
   * The nucleus presents homologs as five aligned pairs instead of ten loose
   * chromosome copies. The same pair models feed the nucleus, chromosome-set,
   * chromosome, and gene magnifications so a selection stays spatially stable.
   */
  readonly cellChromosomePairs = computed<readonly CellChromosomeViewportItem[]>(() =>
    chromosomePairViewportItems(this.chromosomePairs()),
  );

  readonly currentLevelIndex = computed(() => GENOME_MICROSCOPE_LEVELS.indexOf(this.level()));
  readonly currentLevel = computed(
    () => this.levels.find((candidate) => candidate.id === this.level()) ?? this.levels[0],
  );
  readonly canZoomOut = computed(() => this.currentLevelIndex() > 0);
  readonly canZoomIn = computed(
    () =>
      this.currentLevelIndex() < GENOME_MICROSCOPE_LEVELS.length - 1 &&
      !(this.level() === 'chromosome' && !this.genesForSelectedChromosome().length),
  );
  readonly specimenGenotype = computed(() => {
    const dragon = this.loadedDragon();
    const gene = this.activeGene();
    if (!dragon || !gene) return null;
    const trait = DRAGON_TRAITS.find((candidate) => candidate.id === gene.id);
    return trait ? genotypeLabel(dragon.genome[trait.id]) : null;
  });
  readonly summary = computed(() => {
    const dragon = this.loadedDragon();
    const gene = this.activeGene();
    const copy = this.activeAlleleCopy();
    return [
      this.currentLevel().label,
      dragon ? `Specimen ${dragon.name}` : 'No dragon loaded',
      this.selectedChromosome(),
      gene?.sampleCode,
      copy.label,
      this.level() === 'enzyme' ? this.enzymeResult()?.productName : null,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  loadDragon(dragonId: string): void {
    if (!this.dragons().some((dragon) => dragon.id === dragonId)) return;
    this.loadedDragonId.set(dragonId);
    this.selectedChromosome.set(this.autosomeChromosomes()[0] ?? 'Chr 1');
    this.selectedGeneId.set(null);
    this.selectedAlleleCopy.set(0);
    this.selectLevel('dragon');
  }

  selectLevel(level: GenomeMicroscopeLevel): void {
    if (!this.levelAvailable(level)) return;
    if (this.isMolecularLevel(level)) this.ensureMolecularSelection();
    this.level.set(level);
    this.visitedLevels.update((levels) => (levels.includes(level) ? levels : [...levels, level]));
    this.emitSelection(level);
  }

  zoomIn(): void {
    const next = GENOME_MICROSCOPE_LEVELS[this.currentLevelIndex() + 1];
    if (next && this.canZoomIn()) this.selectLevel(next);
  }

  zoomOut(): void {
    const previous = GENOME_MICROSCOPE_LEVELS[this.currentLevelIndex() - 1];
    if (previous) this.selectLevel(previous);
  }

  selectChromosome(chromosome: string): void {
    this.selectedChromosome.set(chromosome);
    this.selectedGeneId.set(null);
    this.selectedAlleleCopy.set(0);
    this.selectLevel('chromosome');
  }

  openGeneFromChromosome(chromosome: string): void {
    this.selectedChromosome.set(chromosome);
    this.selectedAlleleCopy.set(0);
    const firstGene = this.genes().find((gene) => gene.chromosome === chromosome) ?? null;
    this.selectedGeneId.set(firstGene?.id ?? null);
    this.selectLevel(firstGene ? 'gene' : 'chromosome');
  }

  selectGene(geneId: string): void {
    const gene = this.genes().find((candidate) => candidate.id === geneId);
    if (!gene) return;
    this.selectedChromosome.set(gene.chromosome);
    this.selectedGeneId.set(gene.id);
    this.selectLevel('gene');
  }

  selectGeneByLocus(selection: CellChromosomeLocusSelection): void {
    const gene = this.genes().find(
      (candidate) =>
        candidate.chromosome === selection.chromosomeId && candidate.sampleCode === selection.locus,
    );
    if (gene) this.selectGene(gene.id);
  }

  selectAlleleCopy(copy: 0 | 1): void {
    this.selectedAlleleCopy.set(copy);
    this.selectLevel('allele');
  }

  recordEnzymeReaction(result: EnzymeReactionResult): void {
    this.enzymeResult.set(result);
    // Product formation is evidence inside the current level, not a request to
    // advance an outer adaptive question. Keeping those signals separate lets
    // the automatic catalyst continue through repeated reaction cycles.
    this.emitEvidence('enzyme');
  }

  chromosomeNumber(chromosome: string): string {
    if (chromosome === 'Chr X') return this.specimenSex() === 'female' ? 'XX' : 'XY';
    return chromosome.replace(/^Chr\s*/i, '');
  }

  levelLabel(level: GenomeMicroscopeLevel): string {
    return this.levels.find((candidate) => candidate.id === level)?.label ?? level;
  }

  isVisited(level: GenomeMicroscopeLevel): boolean {
    return this.level() === level || this.visitedLevels().includes(level);
  }

  levelAvailable(level: GenomeMicroscopeLevel): boolean {
    return !this.isMolecularLevel(level) || this.genes().length > 0;
  }

  private buildAlleleCopies(): readonly AlleleCopyView[] {
    const gene = this.activeGene();
    if (!gene) return [];
    const releasedAlleles = this.activeAlleles();
    const dragon = this.loadedDragon();
    const trait = DRAGON_TRAITS.find((candidate) => candidate.id === gene.id);
    const symbols = dragon && trait ? dragon.genome[trait.id] : null;
    return ([0, 1] as const).map((copy) => {
      const symbol = symbols?.[copy] ?? releasedAlleles[copy]?.symbol ?? '?';
      const allele =
        releasedAlleles.find((candidate) => candidate.symbol === symbol) ??
        releasedAlleles[copy] ??
        null;
      return {
        copy,
        label: `Inherited copy ${copy === 0 ? 'A' : 'B'}`,
        symbol,
        allele,
        sequence: allele?.modelSequence ?? [],
        fromLoadedDragon: Boolean(symbols),
      };
    });
  }

  private ensureMolecularSelection(): void {
    if (this.genesForSelectedChromosome().length) return;
    const firstGene = this.genes()[0];
    if (!firstGene) return;
    this.selectedChromosome.set(firstGene.chromosome);
    this.selectedGeneId.set(firstGene.id);
  }

  private isMolecularLevel(level: GenomeMicroscopeLevel): boolean {
    return [
      'chromatin',
      'gene',
      'dna',
      'allele',
      'rna',
      'base-chemistry',
      'protein',
      'enzyme',
      'expression',
    ].includes(level);
  }

  private emitSelection(level: GenomeMicroscopeLevel): void {
    const nodeByLevel: Partial<Record<GenomeMicroscopeLevel, string>> = {
      dragon: 'cell',
      cell: 'cell',
      nucleus: 'cell',
      'chromosome-set': 'chromosome',
      chromosome: 'chromosome',
      chromatin: 'chromosome',
      gene: 'gene',
      dna: 'gene',
      allele: 'allele',
      rna: 'allele',
      'base-chemistry': 'allele',
      protein: 'allele',
      enzyme: 'allele',
      expression: 'trait',
    };
    this.modelSelected.emit(nodeByLevel[level] ?? level);
    this.emitEvidence(level);
  }

  private emitEvidence(level: GenomeMicroscopeLevel): void {
    this.evidenceChanged.emit({
      level,
      dragonId: this.loadedDragonId(),
      chromosome: this.selectedChromosome(),
      geneId: this.activeGene()?.id ?? null,
      alleleCopy: this.selectedAlleleCopy(),
      ...(level === 'enzyme' && this.enzymeResult()
        ? {
            enzymeId: this.enzymeResult()?.enzymeId,
            productId: this.enzymeResult()?.productId,
          }
        : {}),
    });
  }
}
