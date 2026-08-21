import { Vector3Data } from '../domain/assembly.models';
import { DEFAULT_HEAD_SHAPE, DragonHeadShape } from './dragon-head-shape';

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
export function dragonHeadStations(
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): DragonHeadStation[] {
  return fitStationsToVolume([
    { at: -0.5, height: 0.55 * shape.cranium, width: 0.5 * shape.cheek, drop: 0.05 },
    { at: -0.32, height: 0.88 * shape.cranium, width: 0.78 * shape.cheek, drop: 0.02 },
    {
      at: -0.14,
      height: 0.9 * shape.cranium + shape.browRidge,
      width: 0.86 * shape.cheek,
      drop: 0,
    },
    // The orbit blends its neighbours rather than sitting at a fixed size. Held
    // constant, a broad-cheeked skull with a heavy muzzle pinches to an
    // hourglass here — the muzzle ends up wider than the eye socket behind it.
    {
      at: 0.04,
      height: 0.74 * midpoint(shape.cranium, shape.muzzleDepth),
      width: 0.74 * midpoint(shape.cheek, shape.muzzleWidth),
      drop: -0.1 * shape.muzzleDrop,
    },
    {
      at: 0.26,
      height: 0.56 * shape.muzzleDepth,
      width: 0.6 * shape.muzzleWidth,
      drop: -0.2 * shape.muzzleDrop,
    },
    {
      at: 0.42,
      height: 0.45 * shape.muzzleDepth,
      width: 0.5 * shape.muzzleWidth,
      drop: -0.28 * shape.muzzleDrop,
    },
    {
      at: 0.5,
      height: 0.36 * shape.muzzleDepth,
      width: 0.42 * shape.muzzleWidth,
      drop: -0.34 * shape.muzzleDrop,
    },
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

  return stations.map((station) => ({
    at: station.at,
    height: station.height * heightFit,
    width: station.width * widthFit,
    drop: station.drop * heightFit,
  }));
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}
