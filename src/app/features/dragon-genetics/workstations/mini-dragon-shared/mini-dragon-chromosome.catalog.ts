import { ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import { CellModelChromosome } from '../shared/cell-model.component';
import {
  MINI_DRAGON_GENES,
  MiniGeneDefinition,
  MiniGeneId,
  MiniGenome,
  miniGenomeGenotype,
  miniPhenotypeLabel,
} from '../companion-show/mini-dragon.genetics';
import { DragonCardGenomeView, DragonCardGeneReadout } from '../shared/dragon-card-genome';

export type MiniChromosomeId = 'Mini Chr 1' | 'Mini Chr 2' | 'Mini Chr 3' | 'Mini Chr 4';

/** Authoritative Mini Dragon linkage groups. Workstations consume these; they do not assign loci. */
export const MINI_CHROMOSOME_GENE_IDS: Readonly<Record<MiniChromosomeId, readonly MiniGeneId[]>> = {
  'Mini Chr 1': ['coat', 'plumage', 'horns', 'wings', 'pattern', 'ember'],
  'Mini Chr 2': ['size', 'eyes', 'ears', 'muzzle', 'legs', 'tail'],
  'Mini Chr 3': ['crest', 'frame', 'brow', 'whiskers', 'chin', 'dewlap'],
  'Mini Chr 4': ['ruff', 'shoulders', 'belly', 'flank-fins', 'hip-fins', 'tail-sail'],
};

export const MINI_CHROMOSOME_IDS = Object.keys(
  MINI_CHROMOSOME_GENE_IDS,
) as readonly MiniChromosomeId[];

const LOCUS_COLORS = ['#ef6f5b', '#56b4e9', '#66c27a', '#d8a33f', '#ad7bd5', '#4fc4b5'];

export function miniChromosomeForGene(geneId: MiniGeneId): MiniChromosomeId {
  const chromosome = MINI_CHROMOSOME_IDS.find((id) =>
    MINI_CHROMOSOME_GENE_IDS[id].includes(geneId),
  );
  if (!chromosome) throw new Error(`Mini Dragon gene ${geneId} has no chromosome assignment.`);
  return chromosome;
}

export function buildMiniDragonCardGenomeView(
  genome: MiniGenome,
  sex: 'female' | 'male' | null = null,
): DragonCardGenomeView {
  const genesByChromosome = new Map<string, readonly DragonCardGeneReadout[]>();
  const chromosomes = MINI_CHROMOSOME_IDS.map((chromosomeId, chromosomeIndex) => {
    const genes = MINI_CHROMOSOME_GENE_IDS[chromosomeId].map((geneId, index) => {
      const gene = MINI_DRAGON_GENES.find((candidate) => candidate.id === geneId);
      if (!gene) throw new Error(`Missing Mini Dragon gene definition for ${geneId}.`);
      return cardGene(gene, genome, chromosomeIndex, index);
    });
    genesByChromosome.set(chromosomeId, genes);
    const first = chromosomeModel(chromosomeId, genes, genome, chromosomeIndex, 0);
    const second = chromosomeModel(chromosomeId, genes, genome, chromosomeIndex, 1);
    return {
      id: chromosomeId,
      label: chromosomeId,
      shortLabel: chromosomeId.replace('Mini Chr ', ''),
      model: first,
      pairedModel: second,
      pairRelationship: 'homologous-pair' as const,
    } satisfies CellModelChromosome;
  });

  return { chromosomes, genesByChromosome, sexChromosomes: sex === 'male' ? 'XY' : 'XX' };
}

function cardGene(
  gene: MiniGeneDefinition,
  genome: MiniGenome,
  chromosomeIndex: number,
  geneIndex: number,
): DragonCardGeneReadout {
  return {
    id: gene.id,
    name: gene.name,
    sampleCode: `M${chromosomeIndex + 1}-G${geneIndex + 1}`,
    genotype: miniGenomeGenotype(genome, gene.id).join(''),
    phenotype: miniPhenotypeLabel(gene.id, genome),
    inheritanceLabel: inheritanceLabel(gene.pattern),
    locusColor: LOCUS_COLORS[geneIndex % LOCUS_COLORS.length],
  };
}

function chromosomeModel(
  chromosomeId: MiniChromosomeId,
  genes: readonly DragonCardGeneReadout[],
  genome: MiniGenome,
  chromosomeIndex: number,
  copy: 0 | 1,
): ChromosomeSvgModel {
  const centromere = 0.42 + chromosomeIndex * 0.035;
  return {
    length: 0.96 - chromosomeIndex * 0.08,
    leftLabel: `${chromosomeIndex + 1}p`,
    rightLabel: `${chromosomeIndex + 1}q`,
    centromere,
    bands: Array.from({ length: 8 }, (_, index) => ({
      start: index / 8,
      end: (index + 1) / 8,
      color: index % 2 ? '#72808d' : '#d8d1b8',
    })),
    loci: genes.map((gene, index) => {
      const allele = miniGenomeGenotype(genome, gene.id as MiniGeneId)[copy];
      return {
        position: 0.1 + (index * 0.8) / Math.max(genes.length - 1, 1),
        label: gene.sampleCode,
        symbol: allele,
        color: gene.locusColor,
      };
    }),
  };
}

function inheritanceLabel(pattern: MiniGeneDefinition['pattern']): string {
  switch (pattern) {
    case 'incomplete-dominance': return 'Incomplete dominance';
    case 'codominance': return 'Codominance';
    case 'multiple-alleles': return 'Multiple alleles';
    default: return 'Autosomal';
  }
}
