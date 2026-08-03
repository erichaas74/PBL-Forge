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

/** How much deeper the membrane is than the plate it collides with. */
const CHORD_RATIO = 2.6;

/** Membrane depth, front to back. */
export function wingChord(dimensions: Vector3Data): number {
  return dimensions.x * CHORD_RATIO;
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
