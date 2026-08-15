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
 * One cross-section of the skull, as fractions of the part's half extents.
 *
 * `at` runs -0.5 at the occiput to 0.5 at the nose tip, matching the body
 * profile's axial convention so the two read the same way.
 */
export interface DragonHeadStation {
  at: number;
  /** Half-height, as a fraction of `dimensions.y / 2`. */
  height: number;
  /** Half-width, as a fraction of `dimensions.z / 2`. */
  width: number;
  /** Section centre relative to the head axis, as a fraction of `dimensions.y / 2`. */
  drop: number;
}

/**
 * The drawn skull, modulated by the shape parameters.
 *
 * Seven stations: occiput, braincase, brow, orbit, mid-muzzle, fore-muzzle,
 * nose. The pinch at the orbit is what separates a skull from a cone — it is
 * the eye socket, and horns read as growing out of the brow behind it.
 */
export function dragonHeadStations(shape: DragonHeadShape = DEFAULT_HEAD_SHAPE): DragonHeadStation[] {
  return fitStationsToVolume([
    { at: -0.5, height: 0.55 * shape.cranium, width: 0.5 * shape.cheek, drop: 0.05 },
    { at: -0.32, height: 0.88 * shape.cranium, width: 0.78 * shape.cheek, drop: 0.02 },
    { at: -0.14, height: 0.9 * shape.cranium + shape.browRidge, width: 0.86 * shape.cheek, drop: 0 },
    // The orbit blends its neighbours rather than sitting at a fixed size. Held
    // constant, a broad-cheeked skull with a heavy muzzle pinches to an
    // hourglass here — the muzzle ends up wider than the eye socket behind it.
    {
      at: 0.04,
      height: 0.74 * midpoint(shape.cranium, shape.muzzleDepth),
      width: 0.74 * midpoint(shape.cheek, shape.muzzleWidth),
      drop: -0.1 * shape.muzzleDrop,
    },
    { at: 0.26, height: 0.56 * shape.muzzleDepth, width: 0.6 * shape.muzzleWidth, drop: -0.2 * shape.muzzleDrop },
    { at: 0.42, height: 0.45 * shape.muzzleDepth, width: 0.5 * shape.muzzleWidth, drop: -0.28 * shape.muzzleDrop },
    { at: 0.5, height: 0.36 * shape.muzzleDepth, width: 0.42 * shape.muzzleWidth, drop: -0.34 * shape.muzzleDrop },
  ]);
}

/**
 * Shrinks the whole silhouette until it fits inside the part's physics volume.
 *
 * Shape parameters stack: a brute's heavy brow sits on a bulged cranium, and an
 * elongated genome adds more on top. Left alone that skull renders a third
 * larger than the box it collides with, so it reads as a head wearing its own
 * hitbox. Scaling every station by the overflow keeps the *proportions* the
 * parameters asked for — a heavy brow still reads heavy, relative to the rest
 * of the skull — while the mesh hugs its volume like every other part here.
 */
function fitStationsToVolume(stations: DragonHeadStation[]): DragonHeadStation[] {
  let peakHeight = 0;
  let peakWidth = 0;
  for (const station of stations) {
    peakHeight = Math.max(peakHeight, Math.abs(station.drop) + station.height);
    peakWidth = Math.max(peakWidth, station.width);
  }

  const heightFit = peakHeight > 1 ? 1 / peakHeight : 1;
  const widthFit = peakWidth > 1 ? 1 / peakWidth : 1;
  if (heightFit === 1 && widthFit === 1) return stations;

  return stations.map(station => ({
    at: station.at,
    height: station.height * heightFit,
    width: station.width * widthFit,
    drop: station.drop * heightFit,
  }));
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

/** A cross-section in world units, at `axialFraction` along the skull. */
export interface DragonHeadSection {
  halfHeight: number;
  halfWidth: number;
  /** Section centre on the head's Y axis. */
  centerY: number;
}

/**
 * Skull cross-section at `axialFraction`, which runs -0.5 (occiput) to 0.5
 * (nose). Values outside that range clamp to the end stations.
 */
export function dragonHeadSection(
  dimensions: Vector3Data,
  axialFraction: number,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): DragonHeadSection {
  const station = sampleHeadStation(axialFraction, shape);
  const halfY = dimensions.y / 2;

  return {
    halfHeight: station.height * halfY,
    halfWidth: station.width * (dimensions.z / 2),
    centerY: station.drop * halfY,
  };
}

/** Interpolated station, still in fractions. Exposed for the mesh loft. */
export function sampleHeadStation(
  axialFraction: number,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Omit<DragonHeadStation, 'at'> {
  const stations = dragonHeadStations(shape);

  for (let index = 1; index < stations.length; index += 1) {
    const from = stations[index - 1];
    const to = stations[index];
    if (axialFraction > to.at && index < stations.length - 1) continue;

    const blend = clamp((axialFraction - from.at) / Math.max(to.at - from.at, 1e-6), 0, 1);
    // Smoothstep, or the skull creases at every station.
    const eased = blend * blend * (3 - 2 * blend);
    return {
      height: from.height + (to.height - from.height) * eased,
      width: from.width + (to.width - from.width) * eased,
      drop: from.drop + (to.drop - from.drop) * eased,
    };
  }

  const last = stations[stations.length - 1];
  return { height: last.height, width: last.width, drop: last.drop };
}

/**
 * A point on the skull surface, in head-local space.
 *
 * @param axialFraction -0.5 at the occiput, 0.5 at the nose.
 * @param angle Radians around the snout axis, from straight up toward +Z. So
 *   `0` is the crown, `Math.PI / 2` the right flank, and `Math.PI` the
 *   underside of the jaw.
 */
export function dragonHeadSurfacePoint(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  const section = dragonHeadSection(dimensions, axialFraction, shape);

  return {
    x: axialFraction * dimensions.x,
    y: section.centerY + Math.cos(angle) * section.halfHeight,
    z: Math.sin(angle) * section.halfWidth,
  };
}

/**
 * Where the upper jaw mounts: the **top** of the muzzle at the meeting station.
 *
 * Read from the muzzle profile rather than the bounding box, which is what the
 * head definitions used to do: a flat `{ x: 0.34, y: -0.08, z: 0 }` put the
 * hinge in mid-air once the muzzle drooped, and left the jaw floating clear of
 * the skull it hangs from on any head that was not a sphere.
 *
 * This is the *top* edge and not a point inside the muzzle because the jaw
 * mates to it corner to corner: the jaw's own root sits on its top-back face,
 * so seating that root here puts the top of the jaw exactly level with the top
 * of the snout it meets, on any skull and at any size the genome produces.
 * Pairing two edges is the same trick the lower jaw already uses against the
 * upper one, and it is why neither pair needs a hand-tuned offset that would go
 * stale the moment a head was rescaled.
 */
export function dragonHeadJawMount(
  dimensions: Vector3Data,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  const axial = 0.34;
  const section = dragonHeadSection(dimensions, axial, shape);

  return {
    x: axial * dimensions.x,
    y: section.centerY + section.halfHeight,
    z: 0,
  };
}

/**
 * Jaw hinge for a head, resolved from its variant and its own `dimensions`.
 *
 * The entry point the part definitions use, so a socket never has to restate
 * which skull shape a head wears.
 */
export function dragonHeadJawMountFor(
  profileId: string,
  dimensions: Vector3Data,
  partShape: 'box' | 'sphere' | 'cylinder' | string = 'box',
): Vector3Data {
  const extent = dragonHeadExtent(dimensions, partShape);
  return dragonHeadJawMount(extent, headShapeForProfile(profileId, extent));
}

/**
 * Eye centre, sunk into the orbital pinch so the brow reads as overhanging it.
 *
 * @param side -1 for the left socket (-Z), 1 for the right.
 */
export function dragonHeadEyeSocket(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  const surface = dragonHeadSurfacePoint(dimensions, shape.eyeAxial, side * 1.15, shape);

  // Set into the skull rather than sitting on it: a sphere tangent to the
  // surface reads as a bead glued to the head.
  return { x: surface.x, y: surface.y, z: surface.z * 0.88 };
}

/**
 * Base of a main horn, on the skull behind and above the brow, angled outward.
 *
 * @param side -1 for the left horn (-Z), 1 for the right.
 */
export function dragonHeadHornMount(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  return dragonHeadSurfacePoint(dimensions, -0.22, side * 0.62, shape);
}

/**
 * Nostril, on the upper muzzle just short of the nose tip.
 *
 * @param side -1 for the left nostril (-Z), 1 for the right.
 */
export function dragonHeadNostril(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  return dragonHeadSurfacePoint(dimensions, 0.42, side * 0.75, shape);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}
