/**
 * Deterministic protein and molecule geometry.
 *
 * Every shape drawn for a dragon protein is generated here from that protein's
 * residue chain, so a shape cannot be authored independently of the DNA that
 * produced it. Change a base in the gene catalog and the folded silhouette, the
 * enzyme body, and the substrate shapes all change with it.
 *
 * Coordinate space for every returned path is centred on the origin and fits
 * the shared protein viewBox of -90 -50 180 100 unless a builder documents
 * otherwise.
 */

export interface ProteinGeometryPoint {
  x: number;
  y: number;
}

export interface EnzymeMoleculeGeometry {
  /** Left-hand fragment; carries the interlocking seam. */
  fragmentA: string;
  /** Right-hand fragment; carries the matching seam. */
  fragmentB: string;
  /** Both fragments fused along the seam, drawn as one molecule. */
  joined: string;
}

const PROTEIN_RADIUS_X = 62;
const PROTEIN_RADIUS_Y = 36;
const MOLECULE_RADIUS_X = 74;
const MOLECULE_RADIUS_Y = 37;
const ENZYME_RADIUS_X = 138;
const ENZYME_RADIUS_Y = 68;
const JOINED_SCALE = 1.07;
const ARC_SAMPLES = 20;

/**
 * How far a residue is allowed to move a contour.
 *
 * Wide enough that two different chains are visibly different molecules, tight
 * enough that the outline still reads as one smooth body rather than a splat.
 * The seam tab, not the contour noise, is what a student should be reading.
 */
const CONTOUR_RANGE = 0.16;
const CONTOUR_WOBBLE = 0.05;

/**
 * A folded protein is free to vary more than an enzyme substrate.
 *
 * Substrate contours have to stay calm so the seam is the thing a student
 * reads. A protein silhouette carries no seam, so its shape alone has to
 * identify it at receptor size — it gets the wider range and more sample
 * points.
 */
const PROTEIN_RANGE = 0.36;
const PROTEIN_SAMPLES = 12;

/**
 * A folded protein silhouette.
 *
 * Residue radii come from `aminoAcidGroupRadius`, so buried hydrophobic
 * residues pinch the contour inwards while charged and aromatic residues push
 * lobes outwards. The curve is closed and smoothed through segment midpoints,
 * which keeps it free of the corners a raw polygon would show at this scale.
 */
export function foldedProteinPath(radii: readonly number[], seed: number): string {
  const points = contourPoints(
    radii,
    seed,
    PROTEIN_RADIUS_X,
    PROTEIN_RADIUS_Y,
    PROTEIN_SAMPLES,
    PROTEIN_RANGE,
  );
  return smoothClosedPath(points);
}

/**
 * The enzyme silhouette that carries an active site.
 *
 * A globular body, lumpy in the way its residue chain dictates but smooth
 * enough to read as one molecule. It is drawn centred on the origin, spanning
 * roughly 138 units either side and 68 above and below; the caller cuts the
 * active site out of its upper half with the substrate shapes.
 */
export function enzymeBodyPath(radii: readonly number[], seed: number): string {
  const points = contourPoints(radii, seed, ENZYME_RADIUS_X, ENZYME_RADIUS_Y, 22);
  return smoothClosedPath(points);
}

/**
 * A substrate pair and the molecule they form.
 *
 * Both fragments are cut along one shared seam, so `fragmentA` and `fragmentB`
 * always interlock and always tile back into `joined`. A build reaction runs
 * fragments into the joined molecule; a break-down reaction runs the joined
 * molecule back into fragments, using the same geometry in the other direction.
 */
export function enzymeMoleculeGeometry(
  radii: readonly number[],
  seed: number,
): EnzymeMoleculeGeometry {
  const seam = seamPoints(radii, seed);
  const leftArc = halfArcPoints(radii, seed, 'left');
  const rightArc = halfArcPoints(radii, seed + 31, 'right');

  return {
    fragmentA: polygonPath([...seam, ...leftArc]),
    fragmentB: polygonPath([...seam, ...rightArc]),
    joined: polygonPath(
      [...leftArc, ...reversed(rightArc)].map((point) => ({
        x: round(point.x * JOINED_SCALE),
        y: round(point.y * JOINED_SCALE),
      })),
    ),
  };
}

/** A short chain of connected residue beads, used as a protein backbone glyph. */
export function residueChainPath(radii: readonly number[], seed: number): string {
  if (!radii.length) return '';
  const step = 118 / Math.max(1, radii.length - 1);
  return radii
    .map((radius, index) => {
      const x = round(-59 + step * index);
      const y = round(Math.sin(index * 1.15 + noise(seed + index) * 1.6) * 13 * radius);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

/** Deterministic 0 to 1 value; keeps generated shapes stable across runs and tests. */
export function noise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function contourPoints(
  radii: readonly number[],
  seed: number,
  radiusX: number,
  radiusY: number,
  samples = 0,
  range = CONTOUR_RANGE,
): readonly ProteinGeometryPoint[] {
  const count = samples || (radii.length ? radii.length : 8);
  const points: ProteinGeometryPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const radius = residueRadiusAt(radii, index / count, range);
    const wobble = 1 - CONTOUR_WOBBLE + noise(seed + index * 3) * CONTOUR_WOBBLE * 2;
    points.push({
      x: round(Math.cos(angle) * radiusX * radius * wobble),
      y: round(Math.sin(angle) * radiusY * radius * wobble),
    });
  }
  return points;
}

/**
 * The contour scale at a point along the chain.
 *
 * Residue radii are interpolated rather than sampled, so neighbouring residues
 * blend into a lobe instead of spiking the outline point to point.
 */
function residueRadiusAt(
  radii: readonly number[],
  progress: number,
  range = CONTOUR_RANGE,
): number {
  if (!radii.length) return 1;
  const position = progress * radii.length;
  const index = Math.floor(position);
  const blend = position - index;
  const current = clamp(radii[index % radii.length], 0.7, 1.24);
  const next = clamp(radii[(index + 1) % radii.length], 0.7, 1.24);
  const mixed = current + (next - current) * blend;
  // Map the residue range onto a narrow band around 1 so shapes stay readable.
  return 1 + ((mixed - 0.97) / 0.27) * range;
}

/**
 * The interlocking boundary between the two fragments.
 *
 * Runs top to bottom through x = 0 with one tab. Both fragments consume these
 * points in the same order, which is what guarantees the fit.
 */
function seamPoints(radii: readonly number[], seed: number): readonly ProteinGeometryPoint[] {
  const height = MOLECULE_RADIUS_Y;
  const direction = noise(seed + 5) > 0.5 ? 1 : -1;
  const depth = round(20 + clamp(radii[1], 0.7, 1.24) * 12);
  const half = round(9 + clamp(radii[2], 0.7, 1.24) * 7);
  const neck = round(half * 0.55);
  const center = round(-7 + noise(seed + 11) * 14);

  /*
   * A jigsaw tab: the seam runs straight down the middle, necks in, swells out
   * to the side, and returns. One fragment gets the tab, the other the socket,
   * which is what makes the fit obvious at a glance.
   */
  return [
    { x: 0, y: -height },
    { x: 0, y: round(center - half - 4) },
    { x: round(direction * neck), y: round(center - half) },
    { x: round(direction * depth), y: round(center - half * 0.55) },
    { x: round(direction * depth), y: round(center + half * 0.55) },
    { x: round(direction * neck), y: round(center + half) },
    { x: 0, y: round(center + half + 4) },
    { x: 0, y: height },
  ];
}

/** Outer contour of one fragment, sampled from the bottom seam end back to the top. */
function halfArcPoints(
  radii: readonly number[],
  seed: number,
  side: 'left' | 'right',
): readonly ProteinGeometryPoint[] {
  const sweep = side === 'left' ? Math.PI : -Math.PI;
  const points: ProteinGeometryPoint[] = [];

  for (let index = 1; index < ARC_SAMPLES; index += 1) {
    const progress = index / ARC_SAMPLES;
    const angle = Math.PI / 2 + sweep * progress;
    const radius = residueRadiusAt(radii, progress);
    const wobble = 1 - CONTOUR_WOBBLE + noise(seed + index * 7) * CONTOUR_WOBBLE * 2;
    points.push({
      x: round(Math.cos(angle) * MOLECULE_RADIUS_X * radius * wobble),
      y: round(Math.sin(angle) * MOLECULE_RADIUS_Y * radius * wobble),
    });
  }
  return points;
}

function polygonPath(points: readonly ProteinGeometryPoint[]): string {
  if (!points.length) return '';
  const commands = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  return `${commands} Z`;
}

function smoothClosedPath(points: readonly ProteinGeometryPoint[]): string {
  if (points.length < 3) return polygonPath(points);
  const start = midpoint(points[points.length - 1], points[0]);
  let path = `M ${start.x} ${start.y}`;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const end = midpoint(current, points[(index + 1) % points.length]);
    path += ` Q ${current.x} ${current.y} ${end.x} ${end.y}`;
  }
  return `${path} Z`;
}

function midpoint(a: ProteinGeometryPoint, b: ProteinGeometryPoint): ProteinGeometryPoint {
  return { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) };
}

function reversed(points: readonly ProteinGeometryPoint[]): readonly ProteinGeometryPoint[] {
  return [...points].reverse();
}

function clamp(value: number | undefined, min: number, max: number): number {
  if (value === undefined || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
