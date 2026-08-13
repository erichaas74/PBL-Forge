import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
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
  GenomeMicroscopeLevel,
  GenomeMicroscopeSex,
} from './genome-microscope.models';

interface DnaBasePair {
  index: number;
  left: string;
  right: string;
  y: number;
}

const COMPLEMENT: Readonly<Record<string, string>> = { A: 'T', T: 'A', C: 'G', G: 'C' };

@Component({
  selector: 'app-genome-microscope',
  imports: [ChromosomeSvgComponent],
  templateUrl: './genome-microscope.component.html',
  styleUrl: './genome-microscope.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenomeMicroscopeComponent {
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);
  readonly autosomeChromosomes = input<readonly string[]>(DRAGON_AUTOSOME_LABELS);
  readonly modelSelected = output<string>();

  readonly levels = GENOME_MICROSCOPE_LEVEL_DEFINITIONS;
  readonly level = signal<GenomeMicroscopeLevel>('cell');
  readonly specimenSex = signal<GenomeMicroscopeSex>('female');
  readonly selectedChromosome = signal('Chr 1');
  readonly selectedGeneId = signal<string | null>(null);

  readonly chromosomePairs = computed<readonly GenomeMicroscopeChromosomePair[]>(() => [
    ...this.autosomeChromosomes().map((chromosome) => this.buildPair(chromosome)),
    this.buildSexPair(),
  ]);
  readonly activePair = computed(
    () =>
      this.chromosomePairs().find((pair) => pair.id === this.selectedChromosome()) ??
      this.chromosomePairs()[0],
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
  readonly activeChromosomeModel = computed(
    () => this.activePair()?.maternal ?? this.chromosomeModel('Chr 1', 'maternal'),
  );
  readonly dnaPairs = computed<readonly DnaBasePair[]>(() => {
    const sequence = this.activeAlleles()[0]?.modelSequence ?? 'ATGCATGCATGC'.split('');
    return sequence.slice(0, 12).map((base, index) => ({
      index,
      left: base,
      right: COMPLEMENT[base] ?? 'N',
      y: 42 + index * 25,
    }));
  });
  readonly currentLevelIndex = computed(() => GENOME_MICROSCOPE_LEVELS.indexOf(this.level()));
  readonly canZoomOut = computed(() => this.currentLevelIndex() > 0);
  readonly canZoomIn = computed(
    () => this.currentLevelIndex() < GENOME_MICROSCOPE_LEVELS.length - 1,
  );
  readonly summary = computed(() => {
    const pair = this.activePair();
    const gene = this.activeGene();
    return `${this.levelLabel(this.level())}. ${this.chromosomePairs().length} chromosome pairs are modeled: four autosome pairs and one ${this.specimenSex() === 'female' ? 'XX' : 'XY'} sex-chromosome pair.${pair ? ` Selected ${pair.label}.` : ''}${gene ? ` Focused gene ${gene.sampleCode}.` : ''}`;
  });

  selectLevel(level: GenomeMicroscopeLevel): void {
    this.level.set(level);
    this.emitSelection(level);
  }

  zoomIn(): void {
    const next = GENOME_MICROSCOPE_LEVELS[this.currentLevelIndex() + 1];
    if (next) this.selectLevel(next);
  }

  zoomOut(): void {
    const previous = GENOME_MICROSCOPE_LEVELS[this.currentLevelIndex() - 1];
    if (previous) this.selectLevel(previous);
  }

  selectSex(sex: GenomeMicroscopeSex): void {
    this.specimenSex.set(sex);
  }

  selectChromosome(chromosome: string): void {
    this.selectedChromosome.set(chromosome);
    this.selectedGeneId.set(null);
    this.level.set('chromosome');
    this.emitSelection('chromosome');
  }

  selectGene(geneId: string): void {
    if (!geneId) return;
    this.selectedGeneId.set(geneId);
    this.level.set('gene');
    this.emitSelection('gene');
  }

  selectGeneByLocus(locus: string): void {
    const gene = this.genesForSelectedChromosome().find(
      (candidate) => candidate.sampleCode === locus,
    );
    if (gene) this.selectGene(gene.id);
  }

  chromosomeNumber(chromosome: string): string {
    return chromosome.replace(/^Chr\s*/i, '');
  }

  levelLabel(level: GenomeMicroscopeLevel): string {
    return this.levels.find((candidate) => candidate.id === level)?.label ?? level;
  }

  trackByPair(_: number, pair: GenomeMicroscopeChromosomePair): string {
    return pair.id;
  }

  private buildPair(chromosome: string): GenomeMicroscopeChromosomePair {
    return {
      id: chromosome,
      label: `Chromosome pair ${this.chromosomeNumber(chromosome)}`,
      kind: 'autosome',
      maternal: this.chromosomeModel(chromosome, 'maternal'),
      paternal: this.chromosomeModel(chromosome, 'paternal'),
    };
  }

  private buildSexPair(): GenomeMicroscopeChromosomePair {
    const second = this.specimenSex() === 'female' ? 'Chr X' : 'Chr Y';
    return {
      id: 'sex',
      label: `${this.specimenSex() === 'female' ? 'XX' : 'XY'} sex chromosomes`,
      kind: 'sex',
      maternal: this.chromosomeModel('Chr X', 'maternal'),
      paternal: this.chromosomeModel(second, 'paternal'),
    };
  }

  private chromosomeModel(chromosome: string, origin: 'maternal' | 'paternal'): ChromosomeSvgModel {
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
        symbol: origin === 'maternal' ? `${gene.sampleCode}a` : `${gene.sampleCode}b`,
      })),
    };
  }

  private emitSelection(level: GenomeMicroscopeLevel): void {
    const nodeByLevel: Partial<Record<GenomeMicroscopeLevel, string>> = {
      cell: 'cell',
      nucleus: 'cell',
      'chromosome-set': 'chromosome',
      chromosome: 'chromosome',
      dna: 'gene',
      gene: 'gene',
      allele: 'allele',
    };
    this.modelSelected.emit(nodeByLevel[level] ?? level);
  }
}
