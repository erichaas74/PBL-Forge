/**
 * Canonical amino-acid chemistry shared by every view that draws a protein.
 *
 * The translation animation, the genome microscope's protein level, and the
 * dragon gene catalog all read residue groups, colors, and side-chain labels
 * from this table, so a residue cannot be drawn one way in one instrument and
 * a different way in the next.
 */
export type AminoAcidGroup =
  | 'hydrophobic'
  | 'polar'
  | 'positive'
  | 'negative'
  | 'aromatic'
  | 'special';

export interface AminoAcidGroupPalette {
  /** Body fill for a residue bead. */
  main: string;
  /** Outline and shadow tone. */
  deep: string;
  /** Highlight tone. */
  light: string;
}

export interface AminoAcidVisual {
  /** Marker consumed by residue stylesheets to pick a side-chain silhouette. */
  shape: string;
  group: AminoAcidGroup;
  groupLabel: string;
  sideChain: string;
}

export interface AminoAcidChemistry extends AminoAcidVisual, AminoAcidGroupPalette {
  shortName: string;
}

export const AMINO_ACID_GROUP_PALETTES: Readonly<Record<AminoAcidGroup, AminoAcidGroupPalette>> = {
  hydrophobic: { main: '#f0a62e', deep: '#8b5210', light: '#ffe4a3' },
  polar: { main: '#54c6b7', deep: '#176e69', light: '#c8f4e9' },
  positive: { main: '#5c8ff0', deep: '#214f9a', light: '#d2e2ff' },
  negative: { main: '#ea6d79', deep: '#94323d', light: '#ffd7db' },
  aromatic: { main: '#b676dd', deep: '#66398a', light: '#ead5fb' },
  special: { main: '#8abf62', deep: '#416f25', light: '#dff2c6' },
};

/**
 * How far a residue pushes the protein surface out from its center.
 *
 * Buried hydrophobic residues pull the contour in, charged and polar residues
 * sit on the outside, and bulky aromatic rings make the widest lobes. Folding
 * is far more subtle than this in a real cell; the reusable idea a student can
 * carry away is that the residue order decides the shape.
 */
export const AMINO_ACID_GROUP_RADII: Readonly<Record<AminoAcidGroup, number>> = {
  hydrophobic: 0.7,
  polar: 1.06,
  positive: 1.16,
  negative: 1.12,
  aromatic: 1.24,
  special: 0.86,
};

const AMINO_ACID_VISUALS: Readonly<Record<string, AminoAcidVisual>> = {
  Ala: visual('small-diamond', 'hydrophobic', 'Hydrophobic', 'CH3'),
  Val: visual('branched', 'hydrophobic', 'Hydrophobic', 'branched'),
  Leu: visual('long-branch', 'hydrophobic', 'Hydrophobic', 'long branch'),
  Ile: visual('asymmetric-branch', 'hydrophobic', 'Hydrophobic', 'branch'),
  Met: visual('sulfur-chain', 'hydrophobic', 'Hydrophobic', 'S'),
  Phe: visual('aromatic-ring', 'aromatic', 'Aromatic', 'ring'),
  Tyr: visual('aromatic-hydroxyl', 'aromatic', 'Aromatic + polar', 'OH'),
  Trp: visual('double-ring', 'aromatic', 'Aromatic', '2 rings'),
  Ser: visual('hydroxyl', 'polar', 'Polar', 'OH'),
  Thr: visual('branched-hydroxyl', 'polar', 'Polar', 'OH'),
  Asn: visual('amide', 'polar', 'Polar', 'amide'),
  Gln: visual('long-amide', 'polar', 'Polar', 'amide'),
  Cys: visual('sulfur-drop', 'polar', 'Polar', 'SH'),
  Lys: visual('positive-tail', 'positive', 'Positive', '+'),
  Arg: visual('positive-fork', 'positive', 'Positive', '+'),
  His: visual('imidazole', 'positive', 'Positive', '+ ring'),
  Asp: visual('negative-short', 'negative', 'Negative', '-'),
  Glu: visual('negative-long', 'negative', 'Negative', '-'),
  Gly: visual('small-bead', 'special', 'Flexible', 'H'),
  Pro: visual('proline-ring', 'special', 'Rigid turn', 'ring'),
  STOP: visual('stop', 'special', 'Stop signal', 'STOP'),
};

const FALLBACK_AMINO_ACID_VISUAL = visual('amino-core', 'special', 'Amino acid', 'R');

export function aminoAcidVisual(shortName: string): AminoAcidVisual {
  return AMINO_ACID_VISUALS[shortName] ?? FALLBACK_AMINO_ACID_VISUAL;
}

export function aminoAcidChemistry(shortName: string): AminoAcidChemistry {
  const chemistry = aminoAcidVisual(shortName);
  return { shortName, ...chemistry, ...AMINO_ACID_GROUP_PALETTES[chemistry.group] };
}

export function aminoAcidGroupRadius(shortName: string): number {
  return AMINO_ACID_GROUP_RADII[aminoAcidVisual(shortName).group];
}

function visual(
  shape: string,
  group: AminoAcidGroup,
  groupLabel: string,
  sideChain: string,
): AminoAcidVisual {
  return { shape, group, groupLabel, sideChain };
}
