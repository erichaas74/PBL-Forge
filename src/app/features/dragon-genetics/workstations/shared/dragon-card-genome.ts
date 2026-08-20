import {
  EXPRESSIVE_DRAGON_TRAITS,
  DragonSex,
  expressivePhenotype,
} from '../../simulation/domain/dragon-expressive-genome';
import { DragonParentProfile } from '../../simulation/domain/dragon-lab.models';
import { dragonParentExpressiveProfile } from '../../simulation/domain/dragon-specimen.profile';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import { CellModelChromosome } from './cell-model.component';
import { DRAGON_AUTOSOME_LABELS } from './dragon-chromosome.catalog';
import { buildDragonChromosomePairs, chromosomePairViewportItems } from './dragon-chromosome-pairs';

export type DragonCardChromosomeId = AlleleVaultGene['chromosome'];

export interface DragonCardGeneReadout {
  id: AlleleVaultGene['id'];
  name: string;
  sampleCode: string;
  genotype: string;
  phenotype: string;
  inheritanceLabel: string;
  locusColor: string;
}

export interface DragonCardGenomeView {
  chromosomes: readonly CellModelChromosome[];
  genesByChromosome: ReadonlyMap<DragonCardChromosomeId, readonly DragonCardGeneReadout[]>;
  sexChromosomes: 'XX' | 'XY';
}

/** Resolves the chromosome side of every dragon card from shared genetics truth. */
export function buildDragonCardGenomeView(
  dragon: DragonParentProfile,
  sex: DragonSex,
): DragonCardGenomeView {
  const profile = dragonParentExpressiveProfile(dragon, sex);
  const chromosomeIds: readonly DragonCardChromosomeId[] = [...DRAGON_AUTOSOME_LABELS, 'Chr X'];
  const pairs = buildDragonChromosomePairs({
    genes: ALLELE_VAULT_GENES,
    alleles: ALLELE_VAULT_ALLELES,
    chromosomes: chromosomeIds,
    sex,
    genotypeForGene: (geneId) => profile.genome[geneId],
  });
  const genesByChromosome = new Map<DragonCardChromosomeId, readonly DragonCardGeneReadout[]>();

  for (const chromosome of chromosomeIds) {
    genesByChromosome.set(
      chromosome,
      ALLELE_VAULT_GENES.filter((gene) => gene.chromosome === chromosome).map((gene) => {
        const trait = EXPRESSIVE_DRAGON_TRAITS.find((candidate) => candidate.id === gene.id);
        if (!trait) throw new Error(`Missing expressive trait for ${gene.id}.`);
        return {
          id: gene.id,
          name: gene.name,
          sampleCode: gene.sampleCode,
          genotype: displayCardGenotype(profile.genome[gene.id], gene.inheritance === 'x-linked'),
          phenotype: expressivePhenotype(profile, trait),
          inheritanceLabel: inheritanceLabel(gene),
          locusColor: gene.locusColor,
        };
      }),
    );
  }

  return {
    chromosomes: chromosomePairViewportItems(pairs),
    genesByChromosome,
    sexChromosomes: sex === 'female' ? 'XX' : 'XY',
  };
}

function displayCardGenotype(pair: readonly [string, string], xLinked: boolean): string {
  if (!xLinked) return pair.join('');
  return pair[1] === 'Y' ? `X${pair[0]}Y` : `X${pair[0]} X${pair[1]}`;
}

function inheritanceLabel(gene: AlleleVaultGene): string {
  switch (gene.inheritance) {
    case 'x-linked':
      return 'X-linked';
    case 'incomplete-dominance':
      return 'Incomplete dominance';
    default:
      return 'Autosomal';
  }
}
