import { getTrait, showsDominantPhenotype } from '../../simulation/domain/dragon-inheritance';
import { DragonLabGenome, DragonTraitId } from '../../simulation/domain/dragon-lab.models';

/**
 * One observable form of a modelled trait.
 *
 * Phenotype-only workstations need to name what a student can *see* without
 * naming the allele pair behind it. The id is deliberately neutral — the trait
 * plus an ordinal — so a stored record never carries `W`/`w` into a surface that
 * is meant to hide the genotype. Labels come from the shared trait catalog, so a
 * reworded phenotype updates every lab that shows one.
 */
export interface VisiblePhenotypeForm {
  id: string;
  label: string;
}

export function visiblePhenotypeForms(traitId: DragonTraitId): readonly VisiblePhenotypeForm[] {
  const trait = getTrait(traitId);
  return [
    { id: `${trait.id}:visible-form-1`, label: trait.dominantPhenotype },
    { id: `${trait.id}:visible-form-2`, label: trait.recessivePhenotype },
  ];
}

export function visiblePhenotypeFormId(genome: DragonLabGenome, traitId: DragonTraitId): string {
  return `${traitId}:visible-form-${showsDominantPhenotype(genome[traitId], traitId) ? '1' : '2'}`;
}

export function visiblePhenotypeFormLabel(genome: DragonLabGenome, traitId: DragonTraitId): string {
  const formId = visiblePhenotypeFormId(genome, traitId);
  return visiblePhenotypeForms(traitId).find((form) => form.id === formId)?.label ?? '';
}

export function isVisiblePhenotypeFormId(value: unknown, traitId: DragonTraitId): boolean {
  return (
    typeof value === 'string' && visiblePhenotypeForms(traitId).some((form) => form.id === value)
  );
}
