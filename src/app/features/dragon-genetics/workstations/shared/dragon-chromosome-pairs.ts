import {
  DragonSex,
  ExpressiveDragonTraitId,
} from '../../simulation/domain/dragon-expressive-genome';
import { AlleleVaultAllele, AlleleVaultGene } from '../allele-workbench/allele-vault.models';
import { CellChromosomeViewportItem } from './cell-chromosome-viewport.component';
import { chromosomeVisual } from './dragon-chromosome.catalog';
import { ChromosomeSvgModel } from './chromosome-svg.component';
import { geneAlleleMarking } from './dragon-gene-dna.catalog';

export interface DragonChromosomePair {
  id: AlleleVaultGene['chromosome'];
  label: string;
  kind: 'autosome' | 'sex';
  maternal: ChromosomeSvgModel;
  paternal: ChromosomeSvgModel;
}

export interface DragonChromosomePairOptions {
  genes: readonly AlleleVaultGene[];
  alleles: readonly AlleleVaultAllele[];
  chromosomes: readonly AlleleVaultGene['chromosome'][];
  sex: DragonSex;
  genotypeForGene: (geneId: ExpressiveDragonTraitId) => readonly [string, string] | undefined;
}

/** Builds the homologous chromosome models shared by genetics cell views. */
export function buildDragonChromosomePairs(
  options: DragonChromosomePairOptions,
): readonly DragonChromosomePair[] {
  const autosomes = options.chromosomes
    .filter((chromosome) => chromosome !== 'Chr X')
    .map((chromosome) => buildAutosomePair(chromosome, options));
  if (!options.chromosomes.includes('Chr X')) return autosomes;
  return [...autosomes, buildSexPair(options)];
}

/** Adapts shared scientific pairs to the shared cell viewport presentation. */
export function chromosomePairViewportItems(
  pairs: readonly DragonChromosomePair[],
): readonly CellChromosomeViewportItem[] {
  return pairs.map((pair) => ({
    id: pair.id,
    label: pair.label,
    shortLabel: pair.kind === 'sex' ? pair.label.slice(0, 2) : pair.id.replace(/^Chr\s*/i, ''),
    model: pair.maternal,
    pairedModel: pair.paternal,
    pairRelationship: 'homologous-pair',
  }));
}

function buildAutosomePair(
  chromosome: AlleleVaultGene['chromosome'],
  options: DragonChromosomePairOptions,
): DragonChromosomePair {
  return {
    id: chromosome,
    label: `Chromosome pair ${chromosome.replace(/^Chr\s*/i, '')}`,
    kind: 'autosome',
    maternal: chromosomeModel(chromosome, 0, options),
    paternal: chromosomeModel(chromosome, 1, options),
  };
}

function buildSexPair(options: DragonChromosomePairOptions): DragonChromosomePair {
  const sexChromosomeLabel = options.sex === 'female' ? 'XX' : 'XY';
  return {
    id: 'Chr X',
    label: `${sexChromosomeLabel} sex chromosomes`,
    kind: 'sex',
    maternal: chromosomeModel('Chr X', 0, options),
    paternal: chromosomeModel(options.sex === 'female' ? 'Chr X' : 'Chr Y', 1, options),
  };
}

function chromosomeModel(
  chromosome: AlleleVaultGene['chromosome'] | 'Chr Y',
  copy: 0 | 1,
  options: DragonChromosomePairOptions,
): ChromosomeSvgModel {
  const visual = chromosomeVisual(chromosome);
  const genes = options.genes.filter((gene) => gene.chromosome === chromosome);
  const number = chromosome.replace(/^Chr\s*/i, '');
  return {
    length: visual.length,
    leftLabel: `${number}p`,
    rightLabel: `${number}q`,
    centromere: visual.centromere,
    bands: visual.bands,
    loci: genes.map((gene, index) => {
      const symbol = options.genotypeForGene(gene.id)?.[copy];
      const allele = options.alleles.find(
        (candidate) => candidate.geneId === gene.id && candidate.symbol === symbol,
      );
      const alleleIndex: 0 | 1 = allele && gene.alleleIds.indexOf(allele.id) === 1 ? 1 : 0;
      return {
        position: visual.locusPositions[index] ?? 0.5,
        label: gene.sampleCode,
        symbol,
        color: gene.locusColor,
        marking: geneAlleleMarking(gene.id, alleleIndex),
      };
    }),
  };
}
