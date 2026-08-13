import { DragonTraitGenotype } from '../../simulation/domain/dragon-lab.models';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  DragonSex,
  ExpressiveDragonProfile,
  normalizeGenomeForSex,
} from '../../simulation/domain/dragon-expressive-genome';
import { AlleleVaultAllele, AlleleVaultGene } from './allele-vault.models';

/**
 * Builds the controlled specimen used in the workbench. Every non-active locus
 * remains on the same reference genotype, so the installed pair is the only
 * genetic variable the student is observing.
 */
export function allelePairToExpressiveProfile(
  gene: AlleleVaultGene,
  pair: readonly [AlleleVaultAllele | null, AlleleVaultAllele | null],
  sex: DragonSex,
): ExpressiveDragonProfile | null {
  const [first, second] = pair;
  if (!first || !second || first.geneId !== gene.id || second.geneId !== gene.id) return null;

  const profile: ExpressiveDragonProfile = {
    sex,
    genome: {
      ...DEFAULT_EXPRESSIVE_DRAGON.genome,
      [gene.renderTraitId]: [first.symbol, second.symbol] as DragonTraitGenotype,
    },
  };
  return normalizeGenomeForSex(profile, sex);
}
