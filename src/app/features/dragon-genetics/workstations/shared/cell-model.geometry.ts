/**
 * Geometry for the shared dragon cell model.
 *
 * Everything the cell draws — membrane, organelles, nucleus, and the slot each
 * chromosome occupies — is measured in one viewBox, so a chromosome placed by
 * `chromosomeSlots` is guaranteed to sit inside the structure that contains it.
 * The genome microscope used to lay chromosomes out with a CSS grid on top of a
 * decorative membrane, which let them drift outside the cell entirely.
 *
 * Units are SVG user units in `CELL_VIEW`. Nothing here touches the DOM, so the
 * containment rules are covered by `cell-model.geometry.spec.ts`.
 */

export interface CellPoint {
  x: number;
  y: number;
}

export interface CellEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** A rectangle a chromosome drawing is fitted into, positioned by its centre. */
export interface CellChromosomeSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CellViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CellOrganelleKind =
  | 'mitochondrion'
  | 'golgi'
  | 'lysosome'
  | 'vacuole'
  | 'smooth-er'
  | 'centrosome';

export interface CellOrganelle {
  id: string;
  kind: CellOrganelleKind;
  /** Structure name, used for the accessible summary and the labelled diagram. */
  label: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface CellErRibbon {
  id: string;
  path: string;
  ribosomes: readonly CellPoint[];
}

export interface CellAnnotation {
  id: string;
  label: string;
  /** Where the leader line touches the structure. */
  target: CellPoint;
  /** Where the leader line leaves the label — placed clear of the text itself. */
  from: CellPoint;
  /** Where the text sits. */
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

export const CELL_VIEW = { width: 240, height: 160 } as const;

/** The cell body. Organelles and the nucleus are placed relative to this. */
export const CELL_BODY: CellEllipse = { cx: 120, cy: 80, rx: 112, ry: 72 };

/** The nucleus at interphase, which is where chromosomes live by default. */
export const CELL_NUCLEUS: CellEllipse = { cx: 120, cy: 80, rx: 74, ry: 46 };

export const CELL_NUCLEOLUS: CellEllipse = { cx: 158, cy: 104, rx: 11, ry: 8.5 };

/**
 * Which way the cell pulls apart. Meiosis II divides across meiosis I, so the
 * second division needs its poles at the top and bottom rather than the sides.
 */
export type CellDivisionAxis = 'horizontal' | 'vertical';

/** Where the chromosomes gather, and where the two nuclei reform, at each pole. */
export const CELL_POLES = {
  horizontal: {
    a: { cx: 64, cy: 80, rx: 46, ry: 40 },
    b: { cx: 176, cy: 80, rx: 46, ry: 40 },
  },
  vertical: {
    a: { cx: 120, cy: 44, rx: 76, ry: 26 },
    b: { cx: 120, cy: 116, rx: 76, ry: 26 },
  },
} as const satisfies Record<CellDivisionAxis, Record<'a' | 'b', CellEllipse>>;

export const CELL_SPINDLE_POLES = {
  horizontal: { a: { x: 24, y: 80 }, b: { x: 216, y: 80 } },
  vertical: { a: { x: 120, y: 16 }, b: { x: 120, y: 144 } },
} as const satisfies Record<CellDivisionAxis, Record<'a' | 'b', CellPoint>>;

/** Per-vertex radius multipliers that keep the membrane from reading as an oval. */
const MEMBRANE_WOBBLE = [
  1, 0.985, 1.02, 0.995, 1.025, 0.98, 1.01, 0.99, 1.02, 0.985, 1.015, 0.995, 1.03, 0.98, 1.005,
  0.99,
];

const NUCLEUS_WOBBLE = [1, 0.99, 1.01, 0.995, 1.015, 0.99, 1.005, 0.995];

export const CELL_ORGANELLES: readonly CellOrganelle[] = [
  { id: 'mito-1', kind: 'mitochondrion', label: 'Mitochondrion', x: 32, y: 62, rotation: -28, scale: 1 },
  { id: 'mito-2', kind: 'mitochondrion', label: 'Mitochondrion', x: 206, y: 100, rotation: 22, scale: 0.92 },
  { id: 'mito-3', kind: 'mitochondrion', label: 'Mitochondrion', x: 104, y: 21, rotation: -8, scale: 0.86 },
  { id: 'mito-4', kind: 'mitochondrion', label: 'Mitochondrion', x: 152, y: 141, rotation: 10, scale: 0.8 },
  { id: 'golgi-1', kind: 'golgi', label: 'Golgi apparatus', x: 46, y: 112, rotation: -12, scale: 1 },
  { id: 'smooth-er-1', kind: 'smooth-er', label: 'Smooth endoplasmic reticulum', x: 192, y: 44, rotation: 18, scale: 1 },
  { id: 'lysosome-1', kind: 'lysosome', label: 'Lysosome', x: 56, y: 128, rotation: 0, scale: 1 },
  { id: 'lysosome-2', kind: 'lysosome', label: 'Lysosome', x: 26, y: 92, rotation: 0, scale: 0.8 },
  { id: 'vacuole-1', kind: 'vacuole', label: 'Vacuole', x: 186, y: 120, rotation: 0, scale: 1 },
  { id: 'centrosome-1', kind: 'centrosome', label: 'Centrosome', x: 62, y: 30, rotation: -18, scale: 1 },
];

export const CELL_ER_RIBBONS: readonly CellErRibbon[] = [
  erRibbon('rough-er-1', 122, 208, 1.1, 1.28),
  erRibbon('rough-er-2', -46, 38, 1.1, 1.26),
];

export const CELL_RIBOSOMES: readonly CellPoint[] = scatterRibosomes(46);

export const CELL_NUCLEAR_PORES: readonly CellPoint[] = nuclearPores(CELL_NUCLEUS, 18);

/**
 * A labelled diagram needs room outside the membrane for its text, so the
 * annotated view adds a gutter. Label positions live in that gutter; the leader
 * targets stay on the structures inside the cell.
 */
export const CELL_LABEL_GUTTER = { x: -36, y: -14, width: 312, height: 188 } as const;

export const CELL_ANNOTATIONS: readonly CellAnnotation[] = [
  { id: 'membrane', label: 'Cell membrane', target: { x: 28, y: 39 }, from: { x: 2, y: 26 }, x: -34, y: 26, anchor: 'start' },
  { id: 'mitochondrion', label: 'Mitochondrion', target: { x: 32, y: 62 }, from: { x: 2, y: 70 }, x: -34, y: 70, anchor: 'start' },
  { id: 'golgi', label: 'Golgi apparatus', target: { x: 46, y: 112 }, from: { x: 4, y: 130 }, x: -34, y: 130, anchor: 'start' },
  { id: 'cytoplasm', label: 'Cytoplasm', target: { x: 96, y: 136 }, from: { x: 2, y: 162 }, x: -34, y: 162, anchor: 'start' },
  { id: 'centrosome', label: 'Centrosome', target: { x: 62, y: 30 }, from: { x: 97, y: -3 }, x: 100, y: -4, anchor: 'start' },
  { id: 'envelope', label: 'Nuclear envelope', target: { x: 177, y: 50 }, from: { x: 234, y: 17 }, x: 274, y: 16, anchor: 'end' },
  { id: 'rough-er', label: 'Rough ER', target: { x: 202, y: 61 }, from: { x: 238, y: 62 }, x: 274, y: 62, anchor: 'end' },
];

/**
 * The closed membrane outline. `cleavage` pinches a furrow across the division
 * axis — the sides for a vertical split, the top and bottom for a horizontal
 * one — so a dividing cell comes from the same geometry as a resting one.
 */
export function cellMembranePath(
  cleavage = 0,
  scale = 1,
  axis: CellDivisionAxis = 'horizontal',
): string {
  return wobblePath(CELL_BODY, MEMBRANE_WOBBLE, scale, clamp01(cleavage), axis);
}

export function cellNucleusPath(region: CellEllipse = CELL_NUCLEUS, scale = 1): string {
  return wobblePath(region, NUCLEUS_WOBBLE, scale, 0);
}

export function nuclearPores(region: CellEllipse, count: number): readonly CellPoint[] {
  return Array.from({ length: Math.max(0, Math.trunc(count)) }, (_, index) => {
    const angle = (index / Math.max(1, count)) * Math.PI * 2;
    return {
      x: round2(region.cx + Math.cos(angle) * region.rx),
      y: round2(region.cy + Math.sin(angle) * region.ry),
    };
  });
}

/** Cristae folds for one mitochondrion, drawn around its own origin. */
export function mitochondrionCristae(): readonly string[] {
  return [-9.5, -4.75, 0, 4.75, 9.5].map(
    (x) => `M ${x} -4.4 C ${round2(x + 4.2)} -2.2 ${round2(x + 4.2)} 2.2 ${x} 4.4`,
  );
}

/** Stacked Golgi lamellae, widest first, drawn around their own origin. */
export function golgiLamellae(): readonly string[] {
  return [
    { y: -6, width: 17 },
    { y: -2, width: 15 },
    { y: 2, width: 12.5 },
    { y: 6, width: 10 },
  ].map(({ y, width }) => `M ${-width} ${y} Q 0 ${y - 5.5} ${width} ${y}`);
}

/**
 * Fits `count` chromosome drawings inside `region`.
 *
 * `ratio` is the drawing's height divided by its width, which differs between a
 * single chromosome and a replicated one. Every returned slot — including its
 * corners — lies inside `region`, which is the property the cell diagram depends
 * on and which the spec pins down.
 */
export function chromosomeSlots(
  count: number,
  region: CellEllipse,
  ratio: number,
  options: { maxWidth?: number; rows?: number } = {},
): readonly CellChromosomeSlot[] {
  const total = Math.max(0, Math.trunc(count));
  if (total === 0) return [];

  const rows = options.rows ?? preferredRows(total, region);
  const perRow = distributeRows(total, rows, region);
  const slots: CellChromosomeSlot[] = [];

  // Rows are a fixed distance apart, so a slot tall enough to reach the next row
  // would overlap it. Cap the width — which is what sets the height — to keep
  // clear. This matters most on the metaphase plate, one chromosome per row.
  const rowPitch = (2 * region.ry * ROW_FILL) / rows;
  const maxWidth = Math.min(
    options.maxWidth ?? region.rx * 0.92,
    (rowPitch * ROW_CLEARANCE) / Math.max(ratio, 0.01),
  );

  perRow.forEach((rowCount, rowIndex) => {
    if (rowCount === 0) return;
    const offset = rows === 1 ? 0 : (2 * (rowIndex + 0.5)) / rows - 1;
    const y = region.cy + offset * region.ry * ROW_FILL;

    // Slot height reduces the half-width available in the row, and the height
    // comes from the width, so settle both together.
    let width = Math.min(maxWidth, (2 * rowHalfWidth(y, region, 0)) / rowCount);
    for (let pass = 0; pass < 5; pass += 1) {
      const available = rowHalfWidth(y, region, (width * ratio) / 2) * ROW_PADDING;
      width = Math.min(maxWidth, ((2 * available) / rowCount) * SLOT_GAP);
    }

    // Measure the row once more at the settled width and clamp against that
    // measurement, so the pitch used below is never narrower than the slots it
    // has to hold however the passes above converged.
    const usable = rowHalfWidth(y, region, (width * ratio) / 2) * ROW_PADDING;
    const pitch = (2 * usable) / rowCount;
    width = Math.min(width, pitch * SLOT_GAP);
    const height = width * ratio;

    for (let index = 0; index < rowCount; index += 1) {
      slots.push({
        x: round2(region.cx - usable + pitch * (index + 0.5)),
        y: round2(y),
        width: round2(width),
        height: round2(height),
      });
    }
  });

  return slots;
}

/**
 * Chromosomes lined up on the equator.
 *
 * `columns` is 1 for mitosis and meiosis II, where single chromosomes queue up
 * in one file. It is 2 for metaphase I, where each homologous pair straddles the
 * equator with one partner on either side.
 */
export function metaphasePlateSlots(
  count: number,
  ratio: number,
  options: { lanes?: number; axis?: CellDivisionAxis; region?: CellEllipse } = {},
): readonly CellChromosomeSlot[] {
  const total = Math.max(0, Math.trunc(count));
  if (total === 0) return [];

  const region = options.region ?? CELL_BODY;
  const lanes = Math.min(2, Math.max(1, Math.trunc(options.lanes ?? 1)));
  const ranks = Math.max(1, Math.ceil(total / lanes));

  return options.axis === 'vertical'
    ? horizontalPlate(total, ratio, region, lanes, ranks)
    : verticalPlate(total, ratio, region, lanes, ranks);
}

/** Poles at the sides: chromosomes stack down a vertical plate at the centre. */
function verticalPlate(
  total: number,
  ratio: number,
  region: CellEllipse,
  lanes: number,
  rows: number,
): readonly CellChromosomeSlot[] {
  const rowPitch = (2 * region.ry * ROW_FILL) / rows;
  const edgeRow = Math.abs(rowOffset(0, rows)) * region.ry * ROW_FILL;
  const byPitch = (rowPitch * ROW_CLEARANCE) / Math.max(ratio, 0.01);

  // A plate slot is bounded by the gap to the next row, by its lane, and by the
  // cell wall at the outermost row. Settle the three together, then clamp once
  // more against a fresh measurement so the result is never the wider guess.
  const laneWidth = (width: number) => {
    const half = rowHalfWidth(region.cy + edgeRow, region, (width * ratio) / 2) * ROW_PADDING;
    return lanes === 1 ? half * 2 : Math.max(1, half - LANE_GAP);
  };
  let width = byPitch;
  for (let pass = 0; pass < 5; pass += 1) {
    width = Math.min(byPitch, laneWidth(width) * 0.94);
  }
  width = Math.min(width, laneWidth(width) * 0.94);

  const height = width * ratio;
  const offset = width / 2 + LANE_GAP;

  return Array.from({ length: total }, (_, index) => {
    const lane = index % lanes;
    return {
      x: round2(lanes === 1 ? region.cx : region.cx + (lane === 0 ? -offset : offset)),
      y: round2(region.cy + rowOffset(Math.floor(index / lanes), rows) * region.ry * ROW_FILL),
      width: round2(width),
      height: round2(height),
    };
  });
}

/**
 * Poles at the top and bottom: chromosomes spread along a horizontal plate. They
 * stay the same way up, because a chromosome's arms lie across the spindle.
 */
function horizontalPlate(
  total: number,
  ratio: number,
  region: CellEllipse,
  lanes: number,
  columns: number,
): readonly CellChromosomeSlot[] {
  const laneOffset = (height: number) => (lanes === 1 ? 0 : height / 2 + LANE_GAP);
  const columnWidth = (width: number) => {
    const height = width * ratio;
    const half =
      rowHalfWidth(region.cy, region, laneOffset(height) + height / 2) * ROW_PADDING;
    return ((2 * half) / columns) * SLOT_GAP;
  };

  let width = Math.min(region.rx * 0.62, ((2 * region.rx * ROW_PADDING) / columns) * SLOT_GAP);
  for (let pass = 0; pass < 5; pass += 1) {
    width = Math.min(region.rx * 0.62, columnWidth(width));
  }
  width = Math.min(width, columnWidth(width));

  const height = width * ratio;
  const offset = laneOffset(height);
  const usable = rowHalfWidth(region.cy, region, offset + height / 2) * ROW_PADDING;
  const pitch = (2 * usable) / columns;

  return Array.from({ length: total }, (_, index) => {
    const lane = index % lanes;
    return {
      x: round2(region.cx - usable + pitch * (Math.floor(index / lanes) + 0.5)),
      y: round2(lanes === 1 ? region.cy : region.cy + (lane === 0 ? -offset : offset)),
      width: round2(width),
      height: round2(height),
    };
  });
}

/**
 * Chromosomes split between the two poles, as at anaphase. Index order decides
 * the pole so a caller can keep a chromosome's identity across stages.
 */
export function polarSlots(
  count: number,
  ratio: number,
  axis: CellDivisionAxis = 'horizontal',
): readonly CellChromosomeSlot[] {
  const total = Math.max(0, Math.trunc(count));
  const poles = CELL_POLES[axis];
  const half = Math.ceil(total / 2);
  return [
    ...chromosomeSlots(half, poles.a, ratio),
    ...chromosomeSlots(total - half, poles.b, ratio),
  ];
}

export function insideEllipse(point: CellPoint, region: CellEllipse, scale = 1): boolean {
  const rx = region.rx * scale;
  const ry = region.ry * scale;
  if (rx <= 0 || ry <= 0) return false;
  return ((point.x - region.cx) / rx) ** 2 + ((point.y - region.cy) / ry) ** 2 <= 1 + 1e-9;
}

export function slotInsideEllipse(slot: CellChromosomeSlot, region: CellEllipse): boolean {
  const halfWidth = slot.width / 2;
  const halfHeight = slot.height / 2;
  return [
    { x: slot.x - halfWidth, y: slot.y - halfHeight },
    { x: slot.x + halfWidth, y: slot.y - halfHeight },
    { x: slot.x - halfWidth, y: slot.y + halfHeight },
    { x: slot.x + halfWidth, y: slot.y + halfHeight },
  ].every((corner) => insideEllipse(corner, region));
}

/** The drawn view. The labelled diagram is wider because its text sits outside the cell. */
export function cellViewBox(annotated = false): CellViewBox {
  return annotated
    ? { ...CELL_LABEL_GUTTER }
    : { x: 0, y: 0, width: CELL_VIEW.width, height: CELL_VIEW.height };
}

/**
 * The part of the cell a zoomed-in camera should frame: everything the
 * chromosomes currently occupy, plus any nuclei still drawn around them.
 *
 * It follows the division rather than sitting on a fixed nucleus, because
 * chromosomes leave the nucleus — at anaphase they are at the cell poles, and a
 * fixed nuclear frame would cut them off.
 */
export function cellFocusRect(
  slots: readonly CellChromosomeSlot[],
  regions: readonly CellEllipse[] = [],
  padding = 9,
): CellViewBox {
  const bounds = [
    ...slots.map((slot) => ({
      left: slot.x - slot.width / 2,
      right: slot.x + slot.width / 2,
      top: slot.y - slot.height / 2,
      bottom: slot.y + slot.height / 2,
    })),
    ...regions.map((region) => ({
      left: region.cx - region.rx,
      right: region.cx + region.rx,
      top: region.cy - region.ry,
      bottom: region.cy + region.ry,
    })),
  ];

  if (bounds.length === 0) {
    return cellFocusRect([], [CELL_NUCLEUS], padding);
  }

  const left = Math.max(0, Math.min(...bounds.map((box) => box.left)) - padding);
  const right = Math.min(CELL_VIEW.width, Math.max(...bounds.map((box) => box.right)) + padding);
  const top = Math.max(0, Math.min(...bounds.map((box) => box.top)) - padding);
  const bottom = Math.min(CELL_VIEW.height, Math.max(...bounds.map((box) => box.bottom)) + padding);

  return {
    x: round2(left),
    y: round2(top),
    width: round2(Math.max(1, right - left)),
    height: round2(Math.max(1, bottom - top)),
  };
}

const ROW_FILL = 0.74;
const ROW_PADDING = 0.94;
const SLOT_GAP = 0.9;
/** Fraction of the gap between rows a slot may fill. */
const ROW_CLEARANCE = 0.84;
/** Clear space either side of the metaphase I equator. */
const LANE_GAP = 4;

function preferredRows(count: number, region: CellEllipse): number {
  const shape = region.ry / region.rx;
  return Math.min(count, Math.max(1, Math.round(Math.sqrt(count * shape * 2.6))));
}

/** Spreads the remainder over the middle rows, which are the widest. */
function distributeRows(count: number, rows: number, region: CellEllipse): readonly number[] {
  const base = Math.floor(count / rows);
  const perRow = Array.from({ length: rows }, () => base);
  const order = Array.from({ length: rows }, (_, index) => index).sort((left, right) => {
    const leftY = rowOffset(left, rows) * region.ry * ROW_FILL;
    const rightY = rowOffset(right, rows) * region.ry * ROW_FILL;
    return Math.abs(leftY) - Math.abs(rightY);
  });
  for (let remainder = count % rows, index = 0; remainder > 0; remainder -= 1, index += 1) {
    perRow[order[index % rows]] += 1;
  }
  return perRow;
}

function rowOffset(rowIndex: number, rows: number): number {
  return rows === 1 ? 0 : (2 * (rowIndex + 0.5)) / rows - 1;
}

/** Half-width of `region` at `y`, allowing for a drawing of half-height `inset`. */
function rowHalfWidth(y: number, region: CellEllipse, inset: number): number {
  const edge = Math.abs(y - region.cy) + inset;
  if (edge >= region.ry) return 0;
  return region.rx * Math.sqrt(1 - (edge / region.ry) ** 2);
}

function wobblePath(
  region: CellEllipse,
  wobble: readonly number[],
  scale: number,
  cleavage: number,
  axis: CellDivisionAxis = 'horizontal',
): string {
  const vertical = axis === 'vertical';
  const points = wobble.map((factor, index) => {
    const angle = (index / wobble.length) * Math.PI * 2;
    // Concentrated on the two sides of the waist, so the furrow closes between
    // the poles rather than across them.
    const along = vertical ? Math.cos(angle) : Math.sin(angle);
    const pinch = 1 - cleavage * 0.66 * Math.abs(along) ** 6;
    return {
      x: region.cx + Math.cos(angle) * region.rx * factor * scale * (vertical ? pinch : 1),
      y: region.cy + Math.sin(angle) * region.ry * factor * scale * (vertical ? 1 : pinch),
    };
  });
  return closedSmoothPath(points);
}

/** Closed Catmull-Rom spline through `points`, emitted as cubic Beziers. */
function closedSmoothPath(points: readonly CellPoint[]): string {
  const count = points.length;
  if (count < 3) return '';
  const commands = [`M ${round2(points[0].x)} ${round2(points[0].y)}`];
  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count];
    const start = points[index];
    const end = points[(index + 1) % count];
    const next = points[(index + 2) % count];
    const control1 = { x: start.x + (end.x - previous.x) / 6, y: start.y + (end.y - previous.y) / 6 };
    const control2 = { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 };
    commands.push(
      `C ${round2(control1.x)} ${round2(control1.y)} ${round2(control2.x)} ${round2(control2.y)} ${round2(end.x)} ${round2(end.y)}`,
    );
  }
  return `${commands.join(' ')} Z`;
}

/** A closed ribbon following the nucleus outline, used for the rough ER. */
function erRibbon(
  id: string,
  startDegrees: number,
  endDegrees: number,
  innerScale: number,
  outerScale: number,
): CellErRibbon {
  const steps = 14;
  const angleAt = (step: number) =>
    ((startDegrees + ((endDegrees - startDegrees) * step) / steps) * Math.PI) / 180;
  const pointAt = (step: number, scale: number): CellPoint => {
    const angle = angleAt(step);
    return {
      x: round2(CELL_NUCLEUS.cx + Math.cos(angle) * CELL_NUCLEUS.rx * scale),
      y: round2(CELL_NUCLEUS.cy + Math.sin(angle) * CELL_NUCLEUS.ry * scale),
    };
  };

  const outward = Array.from({ length: steps + 1 }, (_, step) => pointAt(step, outerScale));
  const back = Array.from({ length: steps + 1 }, (_, step) => pointAt(steps - step, innerScale));
  const path = [...outward, ...back]
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const ribosomes = Array.from({ length: steps + 1 }, (_, step) =>
    pointAt(step, step % 2 === 0 ? outerScale + 0.03 : innerScale - 0.03),
  );

  return { id, path, ribosomes: ribosomes.filter((point) => insideEllipse(point, CELL_BODY, 0.94)) };
}

/** Free ribosomes, scattered once at module load so the diagram never reshuffles. */
function scatterRibosomes(count: number): readonly CellPoint[] {
  const points: CellPoint[] = [];
  let seed = 20260817;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let guard = 0; points.length < count && guard < count * 80; guard += 1) {
    const point = {
      x: round2(CELL_BODY.cx + (random() * 2 - 1) * CELL_BODY.rx),
      y: round2(CELL_BODY.cy + (random() * 2 - 1) * CELL_BODY.ry),
    };
    if (!insideEllipse(point, CELL_BODY, 0.9)) continue;
    if (insideEllipse(point, CELL_NUCLEUS, 1.14)) continue;
    points.push(point);
  }

  return points;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
