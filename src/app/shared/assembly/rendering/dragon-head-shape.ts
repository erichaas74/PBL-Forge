import { Vector3Data } from '../domain/assembly.models';

/**
 * The skull silhouette, shared by the head meshes and by the sockets that mount
 * jaws, horns, and eyes onto them.
 *
 * A head is not a body of revolution. At the braincase it is taller than wide,
 * at the muzzle it is narrower and shallower, and the whole snout hangs below
 * the cranium axis. A lathe cannot say that, which is why the horned head
 * shipped as a sphere with `scale.set(1.18, 0.92, 0.9)` — and why it could not
 * show a trait: `buildHornedHead` took `dims.x` alone and discarded the other
 * two axes, so there was nothing for a gene to move. This lofts a sequence of
 * cross-sections instead, each with its own half-height, half-width, and
 * vertical offset.
 *
 * Everything here is a *fraction* of the part's own dimensions, never a world
 * unit, so a skull keeps its character at every genome scale.
 */

export interface DragonHeadShape {
  /** Braincase mass. 1 is as drawn; above that bulges the skull behind the eyes. */
  cranium: number;
  /** Brow ridge overhang, added to the half-height above the eye. 0 is a smooth skull. */
  browRidge: number;
  /** Muzzle depth at the nose, as a multiple of the drawn profile. */
  muzzleDepth: number;
  /** Muzzle width at the nose, as a multiple of the drawn profile. */
  muzzleWidth: number;
  /** How far the muzzle centre falls below the cranium axis. 0 keeps the snout in line. */
  muzzleDrop: number;
  /** Cheek and jugal flare at the widest station. */
  cheek: number;
  /** Where the eye sits, as an axial fraction: -0.5 occiput, 0.5 nose. */
  eyeAxial: number;
}

export const HEAD_SHAPES = {
  /** Balanced hunting skull. The shipped look. */
  drake: {
    cranium: 1,
    browRidge: 0.1,
    muzzleDepth: 1,
    muzzleWidth: 1,
    muzzleDrop: 1,
    cheek: 1,
    eyeAxial: 0.06,
  },
  /** Long, low, and narrow — the muzzle tapers away and droops. */
  serpentine: {
    cranium: 0.86,
    browRidge: 0.03,
    muzzleDepth: 0.72,
    muzzleWidth: 0.68,
    muzzleDrop: 1.35,
    cheek: 0.84,
    eyeAxial: 0.14,
  },
  /**
   * Short and deep, with a heavy brow and a broad blunt muzzle. Breadth comes
   * mostly from the cheek: pushing the muzzle much past the cranium reads as a
   * swollen snout rather than a powerful one.
   */
  brute: {
    cranium: 1.12,
    browRidge: 0.26,
    muzzleDepth: 1.14,
    muzzleWidth: 1.16,
    muzzleDrop: 0.6,
    cheek: 1.22,
    eyeAxial: 0,
  },
} as const satisfies Record<string, DragonHeadShape>;

/** Shipped default. Change this line to adopt a tuned shape permanently. */
export const DEFAULT_HEAD_SHAPE: DragonHeadShape = HEAD_SHAPES.drake;

/**
 * Base character per head variant.
 *
 * Single source of truth: the mesh factory lofts a skull from this table and
 * the part definitions place the jaw hinge from the same table. Split in two,
 * they drift — and a drifted jaw hinge is exactly the failure this module
 * exists to prevent, since the hinge would sit on a skull shape the head does
 * not actually have.
 */
export const HEAD_SHAPE_BY_PROFILE = {
  'dragon-head-horned': HEAD_SHAPES.drake,
} as const satisfies Record<string, DragonHeadShape>;

/** Trait-adjusted shape for a head variant, from the part's own proportions. */
export function headShapeForProfile(profileId: string, extent: Vector3Data): DragonHeadShape {
  const base = HEAD_SHAPE_BY_PROFILE[profileId as keyof typeof HEAD_SHAPE_BY_PROFILE];
  return headShapeFor(extent, base ?? DEFAULT_HEAD_SHAPE);
}

/**
 * Full extent of a part's physics volume, in the box terms this module works in.
 *
 * `dimensions` does not mean the same thing for every shape: a sphere's `x` is
 * its *radius*, a box's `x` is its full width. The horned head is a sphere, so
 * handing its dimensions straight to the profile would loft a skull at half
 * size. Each sphere axis is treated as a semi-axis, which keeps a non-uniform
 * genome visible in the mesh even though collision stays round.
 */
export function dragonHeadExtent(
  dimensions: Vector3Data,
  shape: 'box' | 'sphere' | 'cylinder' | string,
): Vector3Data {
  if (shape === 'sphere') {
    return { x: dimensions.x * 2, y: dimensions.y * 2, z: dimensions.z * 2 };
  }
  if (shape === 'cylinder') {
    return { x: dimensions.x * 2, y: dimensions.y, z: (dimensions.z || dimensions.x) * 2 };
  }
  return { ...dimensions };
}

/**
 * Aspect ratio the shipped stations are drawn at — a head 1.4 times as long as
 * it is tall.
 */
const NEUTRAL_ELONGATION = 1.4;

/**
 * Reshapes the skull from the part's own proportions.
 *
 * **This is how a gene reaches the geometry.** The phenotype builder scales a
 * head's dimensions per locus and hands the mesh factory nothing else — no
 * genome, no phenotype. Reading the resulting aspect ratio here means any locus
 * that touches head dimensions reshapes the skull, and the factory never has to
 * learn that genetics exists.
 *
 * The point is that the change is *qualitative*. Stretching x alone would give
 * a longer version of the same head; here a longer skull also thins and droops
 * its muzzle and loses its brow, arriving at a serpentine profile, while a
 * shorter one deepens and squares up into a brute. One scalar from the genome,
 * a different animal at each end.
 */
export function headShapeFor(
  dimensions: Vector3Data,
  base: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): DragonHeadShape {
  const elongation = dimensions.x / Math.max(dimensions.y, 1e-6);
  // Clamped so an extreme genome distorts the skull without inverting it.
  const stretch = clamp(elongation / NEUTRAL_ELONGATION, 0.6, 1.8);
  const lean = stretch - 1;

  return {
    cranium: base.cranium * (1 - lean * 0.16),
    browRidge: Math.max(0, base.browRidge - lean * 0.22),
    muzzleDepth: base.muzzleDepth * (1 - lean * 0.3),
    muzzleWidth: base.muzzleWidth * (1 - lean * 0.24),
    muzzleDrop: base.muzzleDrop * (1 + lean * 0.5),
    cheek: base.cheek * (1 - lean * 0.14),
    eyeAxial: clamp(base.eyeAxial + lean * 0.06, -0.5, 0.5),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
