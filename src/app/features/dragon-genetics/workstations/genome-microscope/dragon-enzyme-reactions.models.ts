import { AminoAcidGroupPalette } from '../../../../shared/dna-process-visuals/amino-acid-chemistry.models';
import { ExpressiveDragonTraitId } from '../../simulation/domain/dragon-expressive-genome';
import {
  DRAGON_ENZYME_GENES,
  DragonEnzymeAction,
  DragonMoleculeShape,
  DragonProteinResidue,
} from '../shared/dragon-gene-dna.catalog';

export type DragonEnzymeMolecule = DragonMoleculeShape;

/**
 * A dragon-cell enzyme, projected from the gene catalog for the reaction
 * explorer.
 *
 * Nothing here is authored: the codes, names, shapes, and molecules are read
 * from the gene whose DNA codes for the enzyme, so the active site a student
 * tests is the one this gene's residue chain produced. The reactions themselves
 * are imaginative; the reusable scientific idea is that an enzyme binds
 * particular molecules by shape, changes them, and is released unchanged.
 */
export interface DragonEnzymeReaction {
  /** Protein id; stable across the microscope's levels. */
  readonly id: string;
  readonly geneId: ExpressiveDragonTraitId;
  readonly enzymeCode: string;
  readonly enzymeName: string;
  readonly cellRole: string;
  readonly traitContribution: string;
  /** Whether the enzyme joins molecules or splits one apart. */
  readonly action: DragonEnzymeAction;
  readonly actionLabel: string;
  /** Molecules that must enter the active site. */
  readonly reactants: readonly DragonEnzymeMolecule[];
  /** Molecules released once the reaction runs. */
  readonly products: readonly DragonEnzymeMolecule[];
  /** The released molecule this gene's trait depends on. */
  readonly traitProduct: DragonEnzymeMolecule;
  /**
   * The two interlocking shapes that define the cavity. Both a build and a
   * break-down enzyme carve the same cavity, because the joined molecule is
   * exactly the two fragments tiled together.
   */
  readonly activeSite: readonly [DragonEnzymeMolecule, DragonEnzymeMolecule];
  /** Enzyme silhouette generated from the residue chain. */
  readonly bodyPath: string;
  readonly equation: string;
  /** Palette taken from the chain's commonest residue group. */
  readonly palette: AminoAcidGroupPalette;
  readonly residues: readonly DragonProteinResidue[];
  readonly rnaSequence: string;
  readonly chainLabel: string;
}

export const DRAGON_ENZYME_REACTIONS: readonly DragonEnzymeReaction[] = DRAGON_ENZYME_GENES.map(
  (record): DragonEnzymeReaction => {
    const { protein } = record;
    const activity = protein.activity;
    if (!activity || !protein.bodyPath) {
      throw new Error(`Dragon gene ${record.geneId} is listed as an enzyme without an activity.`);
    }

    return {
      id: protein.proteinId,
      geneId: record.geneId,
      enzymeCode: protein.proteinCode,
      enzymeName: protein.name,
      cellRole: protein.cellRole,
      traitContribution: protein.traitContribution,
      action: activity.action,
      actionLabel: activity.actionLabel,
      reactants: activity.reactants,
      products: activity.products,
      traitProduct: activity.traitProduct,
      activeSite: [activity.fragmentA, activity.fragmentB],
      bodyPath: protein.bodyPath,
      equation: activity.equation,
      palette: protein.palette,
      residues: protein.form.residues,
      rnaSequence: protein.form.rnaSequence,
      chainLabel: protein.form.chainLabel,
    };
  },
);

export function enzymeReaction(reactionId: string): DragonEnzymeReaction {
  const reaction = DRAGON_ENZYME_REACTIONS.find((candidate) => candidate.id === reactionId);
  if (!reaction) throw new Error(`Dragon enzyme ${reactionId} is not registered.`);
  return reaction;
}
