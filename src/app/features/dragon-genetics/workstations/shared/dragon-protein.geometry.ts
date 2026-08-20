/**
 * Deterministic protein and molecule geometry.
 *
 * Every shape drawn for a dragon protein is generated here from that protein's
 * residue chain, so a shape cannot be authored independently of the DNA that
 * produced it. Change a base in the gene catalog and the folded silhouette, the
 * enzyme body, and the substrate shapes all change with it.
 *
 * The lock-and-key shapes are built from one contour — a stepped skyline across
 * the molecule box. The enzyme is everything below that line, the product is
 * everything above it, and the two substrates are the product cut down the
 * middle along an interlocking connector. Nothing is fitted by eye: the four
 * shapes are complements of the same line, so a product always drops exactly
 * into the active site it came from.
 *
 *      product        ┌───────────────┐
 *                     │ ▁▁▁█▁▁▁▁█▁▁▁▁ │   ← contour
 *      enzyme         └───────────────┘
 *
 * Lock-and-key paths use a `0 0 160 120` box. The folded-protein silhouette is
 * centred on the origin instead and fits `-90 -50 180 100`.
 */

export interface ProteinGeometryPoint {
  x: number;
  y: number;
}

/** How the two substrates interlock where they meet in the middle. */
export type ProteinConnectorType =
  | 'round'
  | 'wideRound'
  | 'diamond'
  | 'tShape'
  | 'hex'
  | 'square';

export const PROTEIN_CONNECTOR_TYPES: readonly ProteinConnectorType[] = [
  'round',
  'wideRound',
  'diamond',
  'tShape',
  'hex',
  'square',
];

export interface EnzymeShapeSet {
  /** The stepped active-site line every shape in this set is cut from. */
  contour: readonly ProteinGeometryPoint[];
  connector: ProteinConnectorType;
  /** Catalyst body: everything below the contour. Its top edge is the active site. */
  enzyme: string;
  /** The molecule that exactly fills that active site. */
  product: string;
  /** Left half of the product. */
  substrateA: string;
  /** Right half of the product. */
  substrateB: string;
}

/** Box every lock-and-key shape is drawn in. */
export const MOLECULE_BOX = { width: 160, height: 120 } as const;

const MID_X = 80;
/** Height the contour holds across the middle, where the two substrates meet. */
const MID_Y = 46;
const TOWER_BOTTOM = 66;
const TOWER_STEP = 6;
const TOWER_LEVELS = 5;

const PROTEIN_RADIUS_X = 62;
const PROTEIN_RADIUS_Y = 36;
const PROTEIN_SAMPLES = 12;
const PROTEIN_RANGE = 0.36;
const CONTOUR_WOBBLE = 0.05;
/** Half-extents a folded silhouette is scaled to fill, inside the shared viewBox. */
const PROTEIN_FRAME_X = 76;
const PROTEIN_FRAME_Y = 42;

/**
 * The four interlocking shapes for one residue chain.
 *
 * Tower heights come from the residues: a buried hydrophobic residue leaves the
 * active site shallow there, a bulky charged one cuts a deep notch. The
 * connector at the seam is chosen by the residue sitting at the middle of the
 * chain, which is the part of a real active site that does the joining.
 */
export function enzymeShapeSet(radii: readonly number[], seed: number): EnzymeShapeSet {
  const contour = activeSiteContour(radii, seed);
  const connector = connectorFor(radii, seed);
  const { left, right } = splitContour(contour);
  const firstY = contour[0].y;
  const lastY = contour[contour.length - 1].y;

  return {
    contour,
    connector,
    enzyme: `M 0 ${firstY} ${forward(contour)} V ${MOLECULE_BOX.height} H 0 Z`,
    product: `M 0 0 H ${MOLECULE_BOX.width} V ${lastY} ${backward(contour)} Z`,
    substrateA: `M 0 0 H ${MID_X} ${connectorDown(connector)} ${backward(left)} Z`,
    substrateB: `M ${MID_X} 0 H ${MOLECULE_BOX.width} V ${lastY} ${backward(right)} ${connectorUp(connector)} Z`,
  };
}

/**
 * A receptor plate with one molecule-shaped hole punched through it.
 *
 * Must be rendered with `fill-rule="evenodd"`. Works for any molecule path, so
 * a receptor is always the exact negative of the molecule that opens it —
 * including a fragment released by a break-down enzyme.
 */
export function socketPlatePath(moleculePath: string): string {
  return `M 0 0 H ${MOLECULE_BOX.width} V ${MOLECULE_BOX.height} H 0 Z ${moleculePath}`;
}

/**
 * A folded protein silhouette.
 *
 * Residue radii come from `aminoAcidGroupRadius`, so buried hydrophobic
 * residues pinch the contour inwards while charged and aromatic residues push
 * lobes outwards. Used where nothing docks — the protein-identity card — so it
 * can be an organic blob rather than a key.
 */
export function foldedProteinPath(radii: readonly number[], seed: number): string {
  const points = contourPoints(
    radii,
    seed,
    PROTEIN_RADIUS_X,
    PROTEIN_RADIUS_Y,
    PROTEIN_SAMPLES,
    PROTEIN_RANGE,
    // Orientation is a strong cue at badge size, and two chains with similar
    // lobes still read as different molecules when they lie at different angles.
    noise(seed + 3) * Math.PI,
  );
  return smoothClosedPath(fitPoints(points, PROTEIN_FRAME_X, PROTEIN_FRAME_Y));
}

/**
 * A short chain of connected residue beads, used as a protein backbone glyph.
 *
 * Kept well inside the folded silhouette, so it reads as the chain coiled up
 * within the protein rather than a line escaping from it.
 */
export function residueChainPath(radii: readonly number[], seed: number): string {
  if (!radii.length) return '';
  const step = 66 / Math.max(1, radii.length - 1);
  return radii
    .map((radius, index) => {
      const x = round(-33 + step * index);
      const y = round(Math.sin(index * 1.15 + noise(seed + index) * 1.6) * 8 * radius);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

/** Deterministic 0 to 1 value; keeps generated shapes stable across runs and tests. */
export function noise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * The stepped active-site line.
 *
 * Three towers each side of a flat middle run. The middle is held at one height
 * so both substrates meet on level ground, which is what lets a single
 * connector shape join any two of them.
 */
function activeSiteContour(
  radii: readonly number[],
  seed: number,
): readonly ProteinGeometryPoint[] {
  const leftEdge = 50 + Math.round(noise(seed + 1) * 14);
  const rightEdge = MOLECULE_BOX.width - (50 + Math.round(noise(seed + 2) * 14));
  const points: ProteinGeometryPoint[] = [];

  addTowers(points, spanBoundaries(0, leftEdge), towerHeights(radii, 0));
  points.push({ x: leftEdge, y: MID_Y });
  points.push({ x: MID_X, y: MID_Y });
  points.push({ x: rightEdge, y: MID_Y });
  addTowers(points, spanBoundaries(rightEdge, MOLECULE_BOX.width), towerHeights(radii, 3));

  return points;
}

function spanBoundaries(from: number, to: number): readonly number[] {
  const width = to - from;
  return [from, Math.round(from + width / 3), Math.round(from + (width * 2) / 3), to];
}

function towerHeights(radii: readonly number[], offset: number): readonly number[] {
  return [0, 1, 2].map((index) => {
    const radius = residueRadiusAt(radii, (offset + index) / 6, 1);
    const level = Math.round(Math.min(1, Math.max(0, (radius - 0.72) / 0.52)) * TOWER_LEVELS);
    return TOWER_BOTTOM - level * TOWER_STEP;
  });
}

/**
 * Emits one tower per height as a horizontal run followed by a vertical step.
 *
 * The vertical is implicit: the run for tower `i` starts at the same x the
 * previous run ended on, so the polyline steps up or down between them.
 */
function addTowers(
  points: ProteinGeometryPoint[],
  boundaries: readonly number[],
  heights: readonly number[],
): void {
  heights.forEach((height, index) => {
    points.push({ x: boundaries[index], y: height });
    points.push({ x: boundaries[index + 1], y: height });
  });
}

function connectorFor(radii: readonly number[], seed: number): ProteinConnectorType {
  const middle = residueRadiusAt(radii, 0.5, 1);
  const index = Math.floor(
    Math.min(0.999, Math.max(0, (middle - 0.7) / 0.55) * 0.7 + noise(seed + 4) * 0.3) *
      PROTEIN_CONNECTOR_TYPES.length,
  );
  return PROTEIN_CONNECTOR_TYPES[index];
}

function splitContour(points: readonly ProteinGeometryPoint[]): {
  left: readonly ProteinGeometryPoint[];
  right: readonly ProteinGeometryPoint[];
} {
  const index = points.findIndex((point) => point.x === MID_X);
  return { left: points.slice(0, index + 1), right: points.slice(index) };
}

function forward(points: readonly ProteinGeometryPoint[]): string {
  return points
    .slice(1)
    .map((point) => `L ${point.x} ${point.y}`)
    .join(' ');
}

function backward(points: readonly ProteinGeometryPoint[]): string {
  return forward([...points].reverse());
}

/** The seam from the top edge down to the middle of the contour. */
function connectorDown(type: ProteinConnectorType): string {
  switch (type) {
    case 'square':
      return 'V 14 H 96 V 28 H 104 V 38 H 96 V 46 H 80';
    case 'diamond':
      return 'V 14 L 96 22 L 104 30 L 96 38 L 80 46';
    case 'wideRound':
      return 'V 12 C 98 12, 108 20, 108 29 C 108 38, 98 46, 80 46';
    case 'tShape':
      return 'V 14 H 90 V 20 H 104 V 38 H 90 V 46 H 80';
    case 'hex':
      return 'V 14 L 94 14 L 104 24 L 104 36 L 94 46 L 80 46';
    default:
      return 'V 14 C 94 14, 102 21, 102 30 C 102 39, 94 46, 80 46';
  }
}

/** The same seam walked back up, so the two substrates share one boundary. */
function connectorUp(type: ProteinConnectorType): string {
  switch (type) {
    case 'square':
      return 'H 96 V 38 H 104 V 28 H 96 V 14 H 80 V 0';
    case 'diamond':
      return 'L 96 38 L 104 30 L 96 22 L 80 14 V 0';
    case 'wideRound':
      return 'C 98 46, 108 38, 108 29 C 108 20, 98 12, 80 12 V 0';
    case 'tShape':
      return 'H 90 V 38 H 104 V 20 H 90 V 14 H 80 V 0';
    case 'hex':
      return 'L 94 46 L 104 36 L 104 24 L 94 14 L 80 14 V 0';
    default:
      return 'C 94 46, 102 39, 102 30 C 102 21, 94 14, 80 14 V 0';
  }
}

function contourPoints(
  radii: readonly number[],
  seed: number,
  radiusX: number,
  radiusY: number,
  samples: number,
  range: number,
  rotation = 0,
): readonly ProteinGeometryPoint[] {
  const count = samples || (radii.length ? radii.length : 8);
  const points: ProteinGeometryPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const radius = residueRadiusAt(radii, index / count, range);
    const wobble = 1 - CONTOUR_WOBBLE + noise(seed + index * 3) * CONTOUR_WOBBLE * 2;
    const x = Math.cos(angle) * radiusX * radius * wobble;
    const y = Math.sin(angle) * radiusY * radius * wobble;
    points.push({
      x: round(x * Math.cos(rotation) - y * Math.sin(rotation)),
      y: round(x * Math.sin(rotation) + y * Math.cos(rotation)),
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
function residueRadiusAt(radii: readonly number[], progress: number, range: number): number {
  if (!radii.length) return 1;
  const position = progress * radii.length;
  const index = Math.floor(position);
  const blend = position - index;
  const current = clamp(radii[index % radii.length], 0.7, 1.24);
  const next = clamp(radii[(index + 1) % radii.length], 0.7, 1.24);
  const mixed = current + (next - current) * blend;
  return range === 1 ? mixed : 1 + ((mixed - 0.97) / 0.27) * range;
}

/**
 * Scales a contour to fill the given half-extents without distorting it.
 *
 * A rotated silhouette can otherwise reach past the viewBox, and normalising
 * every protein to one frame also means two badges differ by shape rather than
 * by how much of the tile they happen to fill.
 */
function fitPoints(
  points: readonly ProteinGeometryPoint[],
  maxX: number,
  maxY: number,
): readonly ProteinGeometryPoint[] {
  const widest = Math.max(...points.map((point) => Math.abs(point.x)), 1);
  const tallest = Math.max(...points.map((point) => Math.abs(point.y)), 1);
  const scale = Math.min(maxX / widest, maxY / tallest);
  return points.map((point) => ({ x: round(point.x * scale), y: round(point.y * scale) }));
}

function smoothClosedPath(points: readonly ProteinGeometryPoint[]): string {
  if (points.length < 3) return '';
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

function clamp(value: number | undefined, min: number, max: number): number {
  if (value === undefined || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
