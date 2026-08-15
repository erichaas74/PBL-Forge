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
 *
 * ## A spread bat wing, not a folded one
 *
 * This wing extends out from the flank with the membrane stretched between the
 * fingers, and it has no resting fold. There used to be one: a wrist rotation
 * that swung everything outboard of the elbow back along the body, plus a
 * planform reshaped to survive it — flat panels, straight edges, no sag between
 * the fingers, no scalloped trailing edge. The fold worked, and the wing it left
 * behind was worse than the wing it replaced, because every curve that made the
 * thing read as a membrane had been taken out to keep the gather clean.
 *
 * So the curves are back and the fold is gone. What holds the membrane out is
 * the finger set: {@link WING_STATIONS} pins it at the root, at each finger tip
 * and at the wingtip, and it sags and scallops between them.
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
  /**
   * Flat panels and straight edges.
   *
   * Every curve is off: no sag between the fingers, no scalloped trailing edge,
   * and the little camber left is there to catch light across the sheet rather
   * than to bow it. Kept because it is the cheapest thing to read at thumbnail
   * size, but it is not what ships — a membrane with no sag in it reads as a
   * kite.
   */
  angular: { camber: 0.03, fingerSag: 0, dihedral: 0.03, scallop: 0 },
  /** Nearly flat — close to the original sheet, with just enough bow to catch light. */
  taut: { camber: 0.05, fingerSag: 0.03, dihedral: 0.02, scallop: 0.1 },
  /** A single clean airfoil bow. */
  cambered: { camber: 0.12, fingerSag: 0.06, dihedral: 0.04, scallop: 0.13 },
  /**
   * The shipped wing: deep scalloped sag between the fingers, like a bat's.
   *
   * The sag and the scallop are the whole read. Skin stretched between spread
   * fingers cannot be flat — it bellies down between them and cuts back in at
   * the trailing edge, and those two together are why this is recognisably a
   * membrane on a hand rather than a panel on a strut.
   */
  bat: { camber: 0.1, fingerSag: 0.17, dihedral: 0.05, scallop: 0.19 },
  /** Strong upward sweep, as if catching air. */
  soaring: { camber: 0.15, fingerSag: 0.08, dihedral: 0.17, scallop: 0.13 },
} as const satisfies Record<string, WingMembraneShape>;

/** Shipped default. Change this line to adopt a tuned shape permanently. */
export const DEFAULT_WING_SHAPE: WingMembraneShape = WING_SHAPES.bat;

/**
 * How much deeper the membrane is than the plate it collides with.
 *
 * Raised from 2.6. A dragon's wing is the largest thing about it, and at 2.6 the
 * membrane was narrow enough that the arm and finger bones — which are keratin
 * cream, not membrane — carried the silhouette, so the wings read as a bundle of
 * struts with a sheet between them rather than as wings.
 *
 * Everything downstream follows this: `wingLeadingEdge` sweeps by a fraction of
 * it, and `wingClawAnchor` places the hand claw from it, so the sockets stay on
 * the surface when it changes.
 */
const CHORD_RATIO = 3.3;

/** Membrane depth, front to back. */
export function wingChord(dimensions: Vector3Data): number {
  return dimensions.x * CHORD_RATIO;
}

/**
 * Span fraction of the wrist — the knuckle the fingers radiate from.
 *
 * The arm bone runs root-to-wrist along the leading edge and the fingers fan out
 * from here to the trailing edge, which is what puts a joint in the middle of
 * the wing instead of one long spar.
 */
export const WING_ELBOW_S = 0.45;

/**
 * Leading edge, at span fraction `s` — 0 at the root, 1 at the tip.
 *
 * A **straight** sweep: the edge rakes back at a constant rate rather than
 * curving away. It used to run as `s^1.5`, which put nearly all the sweep in
 * the outer third and bent the front of the wing backwards like a scythe. The
 * arm bone runs along this line, so the curve was not only in the outline — the
 * whole leading edge of the wing bowed with it.
 */
export function wingLeadingEdge(dimensions: Vector3Data, s: number): number {
  return dimensions.x * 0.5 - wingChord(dimensions) * 0.12 * s;
}

/**
 * Chord depth at each of the stations the membrane is pinned at — the root, the
 * three finger tips, and the wingtip — as a fraction of the full chord.
 *
 * Three fingers rather than two, because the fingers are what a bat wing is: the
 * membrane between them is free to sag, so each one added puts another belly and
 * another scallop into the outline. Two left the outer half of the wing as one
 * long unbroken panel.
 *
 * The depth holds up well out along the span and then collapses over the last
 * sixth. That is a bat's planform: broad where the digits are spread, drawn to a
 * point at the tip. The tip figure is small rather than merely smaller — seen
 * from above, anything much over a tenth leaves the wing ending in a squared-off
 * flag corner instead of a point. Read from here rather than a formula so the
 * mesh, the finger struts and anything measuring the wing agree about where the
 * fingers are.
 */
export const WING_STATIONS: readonly number[] = [0, 0.36, 0.62, 0.83, 1];
const WING_STATION_CHORDS: readonly number[] = [1, 0.94, 0.82, 0.63, 0.1];

/** The interior stations: one finger strut runs to each. */
export const WING_FINGER_STATIONS: readonly number[] = WING_STATIONS.slice(1, -1);

/** Chord depth at span fraction `s`, linear between the stations. */
export function wingChordFraction(s: number): number {
  for (let index = 1; index < WING_STATIONS.length; index += 1) {
    const from = WING_STATIONS[index - 1];
    const to = WING_STATIONS[index];
    if (s > to) continue;
    const blend = (s - from) / Math.max(to - from, 1e-6);
    const span = WING_STATION_CHORDS[index] - WING_STATION_CHORDS[index - 1];
    return WING_STATION_CHORDS[index - 1] + span * Math.max(0, Math.min(1, blend));
  }
  return WING_STATION_CHORDS[WING_STATION_CHORDS.length - 1];
}

/**
 * Where the hand claw mounts: on the **leading edge** at the wingtip, so the
 * talon projects forward past the front of the wing.
 *
 * The claw is authored to run along +x once mounted — the dragon's forward — so
 * the only thing deciding whether it reads as a hooked thumb or as a spur buried
 * in the membrane is how far back along the chord this sits. It used to be a full
 * 0.06 of the chord behind the edge, which put the base inside the sheet and left
 * a stub poking out; a fifth of that buries the base in the arm bone that ends
 * here and leaves the whole talon in front of the wing.
 *
 * The height matters nearly as much. It used to be a hardcoded `-0.02`, which put
 * the claw below a membrane that arcs upward — the claw read as a loose spike
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
    x: wingLeadingEdge(dimensions, 1) - wingChord(dimensions) * 0.012,
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
