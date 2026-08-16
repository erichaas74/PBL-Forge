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
  dnaSequence,
  transcribedRna,
} from '../../../../shared/dna-process-visuals/dna-process.models';
import { DnaReplicationAnimationComponent } from '../../../../shared/dna-process-visuals/dna-replication-animation.component';
import { DnaTranscriptionAnimationComponent } from '../../../../shared/dna-process-visuals/dna-transcription-animation.component';
import {
  DRAGON_TRAITS,
  genotypeLabel,
} from '../../simulation/domain/dragon-inheritance';
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
import {
  chromosomeVisual,
  DRAGON_AUTOSOME_LABELS,
  DRAGON_LOCUS_COLORS,
} from '../shared/dragon-chromosome.catalog';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import {
  GENOME_MICROSCOPE_LEVEL_DEFINITIONS,
  GENOME_MICROSCOPE_LEVELS,
  GenomeMicroscopeChromosomePair,
  GenomeMicroscopeEvidence,
  GenomeMicroscopeLevel,
  GenomeMicroscopeSex,
} from './genome-microscope.models';

interface AlleleCopyView {
  copy: 0 | 1;
  label: string;
  symbol: string;
  allele: AlleleVaultAllele | null;
  sequence: readonly string[];
  fromLoadedDragon: boolean;
}

interface ProteinCodon {
  id: string;
  codon: string;
  aminoAcidLabel: string;
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
    ChromosomeSvgComponent,
    DnaReplicationAnimationComponent,
    DnaTranscriptionAnimationComponent,
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
  readonly autosomeChromosomes = input<readonly string[]>(DRAGON_AUTOSOME_LABELS);
  readonly initialLevel = input<GenomeMicroscopeLevel>('dragon');
  readonly showSpecimenLoader = input(true);
  readonly showGuideControl = input(true);

  readonly modelSelected = output<string>();
  readonly evidenceChanged = output<GenomeMicroscopeEvidence>();

  readonly levels = GENOME_MICROSCOPE_LEVEL_DEFINITIONS;
  readonly level = linkedSignal<GenomeMicroscopeLevel>(() => {
    const requested = this.initialLevel();
    return this.isMolecularLevel(requested) && !this.genes().length
      ? 'chromosome-set'
      : requested;
  });
  readonly loadedDragonId = linkedSignal<string | null>(() => this.dragons()[0]?.id ?? null);
  readonly selectedChromosome = signal('Chr 1');
  readonly selectedGeneId = signal<string | null>(null);
  readonly selectedAlleleCopy = signal<0 | 1>(0);
  readonly guideOpen = signal(false);
  readonly visitedLevels = signal<readonly GenomeMicroscopeLevel[]>(['dragon']);

  readonly loadedDragon = computed(
    () => this.dragons().find((dragon) => dragon.id === this.loadedDragonId()) ?? null,
  );
  readonly loadedDragonSource = computed<SpecimenSource | null>(() => {
    const dragon = this.loadedDragon();
    return dragon ? dragonParentSource(dragon) : null;
  });
  readonly specimenSex = computed<GenomeMicroscopeSex>(
    () => this.loadedDragon()?.sex ?? 'female',
  );

  readonly chromosomePairs = computed<readonly GenomeMicroscopeChromosomePair[]>(() => [
    ...this.autosomeChromosomes().map((chromosome) => this.buildPair(chromosome)),
    this.buildSexPair(),
  ]);
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
      this.alleleCopies()[this.selectedAlleleCopy()] ??
      this.alleleCopies()[0] ??
      EMPTY_ALLELE_COPY,
  );
  readonly activeDnaSequence = computed(() => {
    const sequence = this.activeAlleleCopy().sequence.join('');
    return sequence ? dnaSequence(sequence).join('') : '';
  });
  readonly activeRnaSequence = computed(() => {
    const sequence = this.activeDnaSequence();
    return sequence ? transcribedRna(dnaSequence(sequence)).join('') : '';
  });
  readonly proteinCodons = computed<readonly ProteinCodon[]>(() => {
    const rna = this.activeRnaSequence();
    const codons = rna.match(/.{1,3}/g)?.filter((codon) => codon.length === 3) ?? [];
    return codons.map((codon, index) => ({
      id: `${index}:${codon}`,
      codon,
      aminoAcidLabel: `AA ${index + 1}`,
    }));
  });

  readonly cellChromosomeCopies = computed<readonly CellChromosomeViewportItem[]>(() =>
    this.chromosomePairs().flatMap((pair) => [
      {
        id: `${pair.id}:0`,
        label: `${pair.label}, inherited copy A`,
        shortLabel: `${this.chromosomeNumber(pair.id)}A`,
        model: pair.maternal,
      },
      {
        id: `${pair.id}:1`,
        label: `${pair.label}, inherited copy B`,
        shortLabel: `${this.chromosomeNumber(pair.id)}B`,
        model: pair.paternal,
      },
    ]),
  );
  readonly activeChromosomeCopies = computed<readonly CellChromosomeViewportItem[]>(() => {
    const pair = this.activePair();
    if (!pair) return [];
    return [
      {
        id: `${pair.id}:0`,
        label: `${pair.label}, inherited copy A`,
        shortLabel: 'Copy A',
        model: pair.maternal,
      },
      {
        id: `${pair.id}:1`,
        label: `${pair.label}, inherited copy B`,
        shortLabel: 'Copy B',
        model: pair.paternal,
      },
    ];
  });
  readonly selectedChromosomeCopyId = computed(
    () => `${this.selectedChromosome()}:${this.selectedAlleleCopy()}`,
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

  loadDragonFromSelect(event: Event): void {
    this.loadDragon((event.target as HTMLSelectElement).value);
  }

  selectLevel(level: GenomeMicroscopeLevel): void {
    if (!this.levelAvailable(level)) return;
    if (this.isMolecularLevel(level)) this.ensureMolecularSelection();
    this.level.set(level);
    this.visitedLevels.update((levels) =>
      levels.includes(level) ? levels : [...levels, level],
    );
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

  selectChromosomeCopy(chromosomeCopyId: string): void {
    const split = chromosomeCopyId.lastIndexOf(':');
    const chromosome = split >= 0 ? chromosomeCopyId.slice(0, split) : chromosomeCopyId;
    const copy = split >= 0 && chromosomeCopyId.slice(split + 1) === '1' ? 1 : 0;
    this.selectedChromosome.set(chromosome);
    this.selectedAlleleCopy.set(copy);
    this.emitSelection(this.level());
  }

  selectGene(geneId: string): void {
    const gene = this.genes().find((candidate) => candidate.id === geneId);
    if (!gene) return;
    this.selectedChromosome.set(gene.chromosome);
    this.selectedGeneId.set(gene.id);
    this.selectLevel('gene');
  }

  selectGeneByLocus(selection: CellChromosomeLocusSelection): void {
    const gene = this.genesForSelectedChromosome().find(
      (candidate) => candidate.sampleCode === selection.locus,
    );
    if (gene) this.selectGene(gene.id);
  }

  selectAlleleCopy(copy: 0 | 1): void {
    this.selectedAlleleCopy.set(copy);
    this.selectLevel('allele');
  }

  chromosomeNumber(chromosome: string): string {
    if (chromosome === 'sex') return this.specimenSex() === 'female' ? 'XX' : 'XY';
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

  private buildPair(chromosome: string): GenomeMicroscopeChromosomePair {
    return {
      id: chromosome,
      label: `Chromosome pair ${this.chromosomeNumber(chromosome)}`,
      kind: 'autosome',
      maternal: this.chromosomeModel(chromosome, 0),
      paternal: this.chromosomeModel(chromosome, 1),
    };
  }

  private buildSexPair(): GenomeMicroscopeChromosomePair {
    const second = this.specimenSex() === 'female' ? 'Chr X' : 'Chr Y';
    return {
      id: 'sex',
      label: `${this.specimenSex() === 'female' ? 'XX' : 'XY'} sex chromosomes`,
      kind: 'sex',
      maternal: this.chromosomeModel('Chr X', 0),
      paternal: this.chromosomeModel(second, 1),
    };
  }

  private chromosomeModel(chromosome: string, copy: 0 | 1): ChromosomeSvgModel {
    const visual = chromosomeVisual(chromosome);
    const chromosomeGenes = this.genes().filter((gene) => gene.chromosome === chromosome);
    const number = this.chromosomeNumber(chromosome);
    return {
      length: visual.length,
      leftLabel: `${number}p`,
      rightLabel: `${number}q`,
      centromere: visual.centromere,
      bands: visual.bands,
      loci: chromosomeGenes.map((gene, index) => ({
        position: visual.locusPositions[index] ?? 0.5,
        label: gene.sampleCode,
        color: DRAGON_LOCUS_COLORS[index % DRAGON_LOCUS_COLORS.length],
        symbol: this.alleleSymbol(gene, copy),
      })),
    };
  }

  private alleleSymbol(gene: AlleleVaultGene, copy: 0 | 1): string | undefined {
    const dragon = this.loadedDragon();
    const trait = DRAGON_TRAITS.find((candidate) => candidate.id === gene.id);
    if (!dragon || !trait) return undefined;
    return dragon.genome[trait.id][copy];
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
    return ['gene', 'dna', 'allele', 'protein'].includes(level);
  }

  private emitSelection(level: GenomeMicroscopeLevel): void {
    const nodeByLevel: Partial<Record<GenomeMicroscopeLevel, string>> = {
      dragon: 'cell',
      cell: 'cell',
      nucleus: 'cell',
      'chromosome-set': 'chromosome',
      chromosome: 'chromosome',
      gene: 'gene',
      dna: 'gene',
      allele: 'allele',
      protein: 'allele',
    };
    this.modelSelected.emit(nodeByLevel[level] ?? level);
    this.evidenceChanged.emit({
      level,
      dragonId: this.loadedDragonId(),
      chromosome: this.selectedChromosome(),
      geneId: this.activeGene()?.id ?? null,
      alleleCopy: this.selectedAlleleCopy(),
    });
  }
}
