import { Vector3Data } from '../domain/assembly.models';

/**
 * The wing planform, shared by the membrane mesh and by the sockets mounted on
 * it.
 *
 * The physics box is a thin plate; the membrane it stands for is far deeper in
 * chord and arcs upward toward the tip. Sockets authored against the box
 * therefore miss the surface — the hand claw sat below the membrane it hangs
 * from, because the arc it needed to ride was only ever computed in the mesh
 * builder.
 */

export interface WingMembraneShape {
  /** Peak downward bow across the chord. Zero is a flat sheet. */
  camber: number;
  /** Extra droop midway between finger struts, on top of the camber. */
  fingerSag: number;
  /** Upward arc from root to tip, as a fraction of span. */
  dihedral: number;
  /** How far the trailing edge scallops inward between fingers. */
  scallop: number;
}

export const WING_SHAPES = {
  /** Nearly flat — close to the original sheet, with just enough bow to catch light. */
  taut: { camber: 0.05, fingerSag: 0.03, dihedral: 0.02, scallop: 0.1 },
  /** A single clean airfoil bow. Reads well at thumbnail size. */
  cambered: { camber: 0.12, fingerSag: 0.06, dihedral: 0.04, scallop: 0.13 },
  /** Deep scalloped sag between the fingers, like a bat at rest. */
  bat: { camber: 0.1, fingerSag: 0.17, dihedral: 0.05, scallop: 0.19 },
  /** Strong upward sweep, as if catching air. */
  soaring: { camber: 0.15, fingerSag: 0.08, dihedral: 0.17, scallop: 0.13 },
} as const satisfies Record<string, WingMembraneShape>;

/** Shipped default. Change this line to adopt a tuned shape permanently. */
export const DEFAULT_WING_SHAPE: WingMembraneShape = WING_SHAPES.cambered;

/**
 * How much deeper the membrane is than the plate it collides with.
 *
 * Raised from 2.6. A dragon's wing is the largest thing about it, and at 2.6 the
 * membrane was narrow enough that the arm and finger bones — which are keratin
 * cream, not membrane — carried the silhouette, so the wings read as a bundle of
 * struts with a sheet between them rather than as wings.
 *
 * Everything downstream follows this: `wingLeadingEdge` sweeps by a fraction of
 * it, and `wingTipMount` places the hand claw from it, so the sockets stay on
 * the surface when it changes.
 */
const CHORD_RATIO = 3.3;

/** Membrane depth, front to back. */
export function wingChord(dimensions: Vector3Data): number {
  return dimensions.x * CHORD_RATIO;
}

// ---------------------------------------------------------------------------
// Folding
// ---------------------------------------------------------------------------

/**
 * The resting fold, owned here rather than in the mesh builder because two
 * things have to agree about it.
 *
 * The builder folds the membrane, the arm and the finger struts. But the hand
 * claw is a separate *part* with its own position, mounted at the wingtip — so
 * when the mesh folded and the claw did not, the claw stayed hanging in the air
 * where the spread wingtip used to be, a cone floating beside the tail. Both
 * sides now read the same numbers and the same transform from here.
 */

/** Span fraction of the wrist. Everything outboard of this rotates. */
export const WING_ELBOW_S = 0.45;
/** Rotation of the hand at full fold. Past 90°, so the tip tucks inboard. */
export const WING_FOLD_ANGLE = 1.95;

/**
 * How much of the fold applies at span fraction `s`: 0 inboard of the wrist,
 * eased to 1 at the tip. Eased rather than linear because a folding wing curls
 * — a constant angle past the wrist reads as the hinge on a deck chair.
 */
export function wingFoldEase(s: number): number {
  if (s <= WING_ELBOW_S) return 0;
  const t = (s - WING_ELBOW_S) / (1 - WING_ELBOW_S);
  return t * t * (3 - 2 * t);
}

/**
 * Swings a point outboard of the wrist back toward the tail.
 *
 * A rotation about the vertical through the wrist. The outboard direction is
 * -z, and this turns -z toward -x, so the hand trails along the flank; past 90
 * degrees it carries on inboard and tucks against the body.
 *
 * Works in the wing's own space, where +z is outboard — the builder mirrors the
 * right wing by scaling the whole group, so both sides fold with these numbers.
 */
export function foldWingPoint(
  point: { x: number; y: number; z: number },
  s: number,
  fold: number,
  elbowX: number,
  elbowZ: number,
): { x: number; y: number; z: number } {
  const angle = fold * WING_FOLD_ANGLE * wingFoldEase(s);
  if (angle === 0) return point;

  const dx = point.x - elbowX;
  const dz = point.z - elbowZ;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: elbowX + dx * cos + dz * sin,
    y: point.y,
    z: elbowZ - dx * sin + dz * cos,
  };
}

/**
 * Leading edge, at span fraction `s` — 0 at the root, 1 at the tip. The edge
 * sweeps back as it goes out, so this is not a constant.
 */
export function wingLeadingEdge(dimensions: Vector3Data, s: number): number {
  return dimensions.x * 0.5 - wingChord(dimensions) * 0.12 * Math.pow(s, 1.5);
}

/**
 * Where the hand claw mounts: at the wrist, meaning the outboard end of the arm
 * bone that runs along the leading edge. Held back from the very tip so the
 * base of the talon finishes inside that bone and only the talon shows.
 *
 * The height matters most. This used to be a hardcoded `-0.02`, which put the
 * claw below a membrane that arcs upward — the claw read as a loose spike
 * floating beside the wing rather than growing out of it.
 *
 * @param side -1 for the tip at -Z, 1 for the tip at +Z. A wing's root snap
 *   sits at the opposite end from its tip.
 */
export function wingClawAnchor(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: WingMembraneShape = DEFAULT_WING_SHAPE,
): Vector3Data {
  const span = dimensions.z;

  return {
    x: wingLeadingEdge(dimensions, 1) - wingChord(dimensions) * 0.06,
    // At the tip the membrane is pinned to a bone, so only the dihedral arc
    // lifts it — the camber and finger sag have both fallen to zero.
    y: shape.dihedral * span,
    z: side * span * 0.47,
  };
}

/**
 * Where the wing meets the torso. Held inboard of the membrane's root edge, so
 * that edge finishes inside the body rather than flush against it, where the
 * curve of the flank would open a gap above and below the join.
 */
export function wingRootMount(dimensions: Vector3Data, side: -1 | 1): Vector3Data {
  return { x: 0, y: 0, z: side * dimensions.z * 0.46 };
}
