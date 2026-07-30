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
  id: 'allele-diagram-chromosome',
  version: '1.0.0',
  body: { width: 18, height: 200, radius: 9, top: 12 },
  columns: { left: 37, right: 77 },
  labels: { leftText: 26, leftLeader: 28, rightLeader: 96, rightText: 106 },
  viewportWidth: 132,
  fill: '#e0ffff',
  stroke: '#1d4ed8',
  strokeWidth: 1.5,
  banding: [
    { y: 10, height: 10, fill: '#a5f3fc' },
    { y: 37, height: 20, fill: '#67e8f9' },
    { y: 77, height: 15, fill: '#a5f3fc' },
    { y: 108, height: 15, fill: '#a5f3fc' },
    { y: 142, height: 20, fill: '#67e8f9' },
    { y: 182, height: 12, fill: '#a5f3fc' },
  ],
  geneBands: [
    { id: 'band-1', y: 25, height: 6, fill: '#dc2626' },
    { id: 'band-2', y: 65, height: 6, fill: '#16a34a' },
    { id: 'band-3', y: 130, height: 6, fill: '#1e3a8a' },
    { id: 'band-4', y: 170, height: 6, fill: '#9333ea' },
  ],
  shield: { fill: '#1b2b3f', stroke: '#e6b849', hatch: '#3d5876' },
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
