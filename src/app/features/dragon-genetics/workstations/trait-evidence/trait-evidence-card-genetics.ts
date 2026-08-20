import {
  DragonCardChromosomeId,
  DragonCardGeneReadout,
  DragonCardGenomeView,
  buildDragonCardGenomeView,
} from '../shared/dragon-card-genome';
import { TraitEvidenceDragon } from './trait-evidence.models';

export type TraitEvidenceCardChromosomeId = DragonCardChromosomeId;
export type TraitEvidenceCardGeneReadout = DragonCardGeneReadout;
export type TraitEvidenceCardGenomeView = DragonCardGenomeView;

/**
 * Resolves one card from the same complete profile, chromosome catalog, allele
 * catalog, and phenotype rules used by the genetics workstations.
 */
export function buildTraitEvidenceCardGenomeView(
  dragon: TraitEvidenceDragon,
): TraitEvidenceCardGenomeView {
  return buildDragonCardGenomeView(dragon.profile, dragon.sex);
}
