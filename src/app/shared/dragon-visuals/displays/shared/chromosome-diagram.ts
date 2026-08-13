import { BERK, BERK_TRAIT_BANDS } from '../../../design/berk-palette';

/**
 * Chromosome geometry and palette taken from `docs/allelle-diagram.html`.
 *
 * The source diagram draws a chromosome as an 18 x 200 rounded bar with a centromere line,
 * pale banding, and four coloured trait bands whose allele letters sit on leader lines to the
 * left and right of the pair. Those exact coordinates and colours are preserved here so every
 * station that shows alleles or genotypes uses one visual language.
 *
 * Edit this file (or pass a modified `ChromosomeDiagramTheme`) to restyle chromosomes
 * everywhere; no station code depends on the numbers.
 */
export interface ChromosomeBand {
  /** Top offset inside the 200-unit chromosome, matching the source diagram. */
  y: number;
  height: number;
  fill: string;
}

export interface ChromosomeGeneBand extends ChromosomeBand {
  id: string;
}

export interface ChromosomeDiagramTheme {
  id: string;
  version: string;
  /** Chromosome body geometry in SVG user units. */
  body: { width: number; height: number; radius: number; top: number };
  /** Horizontal positions of the two chromosomes in the pair. */
  columns: { left: number; right: number };
  /** Label and leader-line geometry. */
  labels: { leftText: number; leftLeader: number; rightLeader: number; rightText: number };
  viewportWidth: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Decorative banding that gives the chromosome its texture. */
  banding: readonly ChromosomeBand[];
  /** One band per modelled gene, in chromosome-model order. */
  geneBands: readonly ChromosomeGeneBand[];
  shield: { fill: string; stroke: string; hatch: string };
}

export const CHROMOSOME_DIAGRAM: ChromosomeDiagramTheme = {
  id: 'berk-chromosome',
  version: '2.0.0',
  body: { width: 18, height: 200, radius: 9, top: 12 },
  columns: { left: 37, right: 77 },
  labels: { leftText: 26, leftLeader: 28, rightLeader: 96, rightText: 106 },
  viewportWidth: 132,
  /*
   * Bone over a slate console, not the neon cyan this started as. The body and
   * its decorative banding are *substrate* — they exist so the gene bands have
   * something to sit on — so they are deliberately the lowest-contrast marks
   * here. Anything that competes with the coloured loci is a bug.
   */
  fill: '#e6ded0',
  stroke: BERK.slate,
  strokeWidth: 1.5,
  banding: [
    { y: 10, height: 10, fill: '#d3c8b6' },
    { y: 37, height: 20, fill: '#c2b6a1' },
    { y: 77, height: 15, fill: '#d3c8b6' },
    { y: 108, height: 15, fill: '#d3c8b6' },
    { y: 142, height: 20, fill: '#c2b6a1' },
    { y: 182, height: 12, fill: '#d3c8b6' },
  ],
  /*
   * The four trait loci. These are the only saturated marks on the diagram and
   * they are load-bearing: a student learns "the red band is the wing locus"
   * at the microscope and has to recognise it again in other chromosome
   * instruments. See BERK_TRAIT_BANDS for why these four hues.
   */
  geneBands: [
    { id: 'band-1', y: 25, height: 6, fill: BERK_TRAIT_BANDS[0] },
    { id: 'band-2', y: 65, height: 6, fill: BERK_TRAIT_BANDS[1] },
    { id: 'band-3', y: 130, height: 6, fill: BERK_TRAIT_BANDS[2] },
    { id: 'band-4', y: 170, height: 6, fill: BERK_TRAIT_BANDS[3] },
  ],
  shield: { fill: '#22303a', stroke: BERK.gold, hatch: '#44555f' },
};

/** Centre line of a gene band in diagram coordinates, including the top margin. */
export function geneBandCentre(theme: ChromosomeDiagramTheme, geneIndex: number): number {
  const band = theme.geneBands[clampGeneIndex(theme, geneIndex)];
  return theme.body.top + band.y + band.height / 2;
}

export function clampGeneIndex(theme: ChromosomeDiagramTheme, geneIndex: number): number {
  return Math.min(Math.max(geneIndex, 0), theme.geneBands.length - 1);
}

/** Full-pair view box, or a locus crop centred on one gene band. */
export function chromosomeViewBox(
  theme: ChromosomeDiagramTheme,
  geneIndex: number,
  view: 'full' | 'locus',
): string {
  if (view === 'full') {
    return `0 0 ${theme.viewportWidth} ${theme.body.height + theme.body.top * 2}`;
  }
  const centre = geneBandCentre(theme, geneIndex);
  const height = 52;
  return `0 ${centre - height / 2} ${theme.viewportWidth} ${height}`;
}
