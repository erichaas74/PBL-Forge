import { ExpressiveDragonTraitId } from '../../simulation/domain/dragon-expressive-genome';

export interface DragonEnzymeMolecule {
  readonly id: string;
  readonly name: string;
  readonly path: string;
}

export interface DragonEnzymeReaction {
  readonly id: string;
  readonly enzymeCode: string;
  readonly enzymeName: string;
  readonly cellRole: string;
  readonly expressionTraitId: ExpressiveDragonTraitId;
  readonly substrateA: DragonEnzymeMolecule;
  readonly substrateB: DragonEnzymeMolecule;
  readonly product: DragonEnzymeMolecule;
}

/**
 * Fictional dragon-cell reactions used to model enzyme specificity. The names
 * and products are intentionally imaginative; the reusable scientific idea is
 * that an enzyme binds particular substrates, lowers the reaction barrier, and
 * is released unchanged with the product.
 */
export const DRAGON_ENZYME_REACTIONS: readonly DragonEnzymeReaction[] = [
  {
    id: 'ember-synthase',
    enzymeCode: 'ENZ-E01',
    enzymeName: 'Ember synthase',
    cellRole: 'Joins an energy-rich sugar shape to an oxygen-carrying molecule.',
    expressionTraitId: 'fire',
    substrateA: {
      id: 'spark-sugar',
      name: 'Spark sugar',
      path: 'M-70 -38 H-8 V-16 C6 -16 14 -9 14 0 C14 9 6 16 -8 16 V34 H-26 V25 H-43 V34 H-52 V18 H-70 Z',
    },
    substrateB: {
      id: 'oxygen-carrier',
      name: 'Oxygen carrier',
      path: 'M-14 -38 H70 V34 H28 V18 H8 V27 H-8 V16 C6 16 14 9 14 0 C14 -9 6 -16 -8 -16 H-14 Z',
    },
    product: {
      id: 'ember-fuel',
      name: 'Ember-fuel vesicle',
      path: 'M-78 -40 H0 V-18 C14 -18 23 -10 23 0 C23 10 14 18 0 18 V36 H-28 V25 H-48 V36 H-60 V18 H-78 Z M0 -40 H78 V36 H38 V18 H18 V28 H0 V18 C14 18 23 10 23 0 C23 -10 14 -18 0 -18 Z',
    },
  },
  {
    id: 'scale-chromatase',
    enzymeCode: 'ENZ-C17',
    enzymeName: 'Scale chromatase',
    cellRole: 'Combines a colorless precursor with a metal-shaped cofactor.',
    expressionTraitId: 'scales',
    substrateA: {
      id: 'pigment-precursor',
      name: 'Pigment precursor',
      path: 'M-68 -38 H-10 L18 -8 L-10 20 V34 H-30 V20 H-50 V34 H-68 Z',
    },
    substrateB: {
      id: 'copper-cofactor',
      name: 'Copper cofactor',
      path: 'M-18 -8 L10 -38 H68 V34 H38 V18 H18 V28 H0 V18 L18 -8 L0 -24 Z',
    },
    product: {
      id: 'scale-pigment',
      name: 'Iridescent scale pigment',
      path: 'M-78 -40 H-10 L18 -10 L-10 20 V36 H-34 V22 H-54 V36 H-78 Z M18 -10 L-10 -40 H78 V36 H44 V18 H22 V28 H2 V18 Z',
    },
  },
  {
    id: 'horn-matrix-ligase',
    enzymeCode: 'ENZ-H24',
    enzymeName: 'Horn-matrix ligase',
    cellRole: 'Links a structural peptide to a sulfur-rich molecular bridge.',
    expressionTraitId: 'horns',
    substrateA: {
      id: 'keratin-peptide',
      name: 'Keratin peptide',
      path: 'M-70 -38 H-18 V-12 H-4 V-30 H14 V-12 H30 C43 -12 50 -5 50 4 C50 13 43 20 30 20 H14 V34 H-8 V22 H-30 V34 H-50 V20 H-70 Z',
    },
    substrateB: {
      id: 'sulfur-bridge',
      name: 'Sulfur bridge',
      path: 'M-50 -38 H-18 V-20 H-2 V-34 H20 V-20 H70 V34 H28 V18 H8 V28 H-12 V18 H-30 V20 C-17 20 -10 13 -10 4 C-10 -5 -17 -12 -30 -12 H-50 Z',
    },
    product: {
      id: 'horn-matrix-link',
      name: 'Cross-linked horn matrix',
      path: 'M-80 -40 H-28 V-16 H-10 V-34 H10 V-16 H28 C42 -16 50 -8 50 1 C50 10 42 18 28 18 H12 V36 H-12 V24 H-34 V36 H-54 V20 H-80 Z M50 -40 H80 V36 H42 V20 H24 V30 H4 V20 H-12 V18 C2 18 10 10 10 1 C10 -8 2 -16 -12 -16 H-28 V-40 Z',
    },
  },
  {
    id: 'wing-membrane-synthase',
    enzymeCode: 'ENZ-W31',
    enzymeName: 'Wing-membrane synthase',
    cellRole: 'Fastens a flexible protein strand to a membrane-compatible anchor.',
    expressionTraitId: 'wings',
    substrateA: {
      id: 'collagen-strand',
      name: 'Collagen strand',
      path: 'M-70 -38 H-18 V-20 H-4 V-4 H14 V-20 H30 V-6 C42 -6 49 1 49 10 C49 19 42 26 30 26 H12 V36 H-10 V24 H-30 V36 H-50 V20 H-70 Z',
    },
    substrateB: {
      id: 'lipid-anchor',
      name: 'Lipid anchor',
      path: 'M-49 -6 H-30 V-20 H-10 V-6 H8 V-22 H28 V-6 H70 V36 H30 V20 H10 V30 H-10 V20 H-28 V26 C-16 26 -9 19 -9 10 C-9 1 -16 -6 -28 -6 Z',
    },
    product: {
      id: 'membrane-patch',
      name: 'Elastic wing-membrane patch',
      path: 'M-80 -40 H-28 V-22 H-12 V-6 H8 V-22 H28 V-8 C42 -8 50 0 50 9 C50 18 42 26 28 26 H10 V36 H-12 V24 H-34 V36 H-54 V20 H-80 Z M50 -40 H80 V36 H40 V20 H20 V30 H0 V20 H-18 V26 C-4 26 4 18 4 9 C4 0 -4 -8 -18 -8 H-28 V-40 Z',
    },
  },
];
