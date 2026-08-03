import { Vector3Data } from '../domain/assembly.models';

/**
 * The torso silhouette, shared by the body mesh and by the sockets that mount
 * limbs onto it.
 *
 * The body renders as a lathe, not a box: it is at full width around the
 * shoulder and has tapered to two thirds of that by the hips. A socket placed
 * from the bounding box therefore floats clear of the visible surface anywhere
 * but the widest point — which is how legs and wings ended up unattached. Both
 * sides now read the same curve, so a limb lands on the body it can see.
 */

/** `[fraction along the spine, radius as a fraction of the half extents]`. */
export const DRAGON_BODY_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.28],
  [-0.4, 0.5],
  [-0.24, 0.78],
  [-0.05, 0.97],
  [0.1, 1.0],
  [0.24, 0.9],
  [0.36, 0.72],
  [0.46, 0.5],
  [0.5, 0.42],
];

/**
 * Radius factor at `axialFraction`, which runs -0.5 (tail end) to 0.5 (nose).
 * Values outside that range clamp to the end caps.
 */
export function sampleDragonBodyRadius(axialFraction: number): number {
  const profile = DRAGON_BODY_PROFILE;

  for (let index = 1; index < profile.length; index += 1) {
    const [fromT, fromRadius] = profile[index - 1];
    const [toT, toRadius] = profile[index];
    if (axialFraction <= toT) {
      const blend = (axialFraction - fromT) / Math.max(toT - fromT, 1e-6);
      return fromRadius + (toRadius - fromRadius) * Math.max(0, Math.min(1, blend));
    }
  }

  return profile[profile.length - 1][1];
}

/**
 * A point on the torso surface, in body-local space.
 *
 * @param dimensions Physics dimensions of the body part.
 * @param axialFraction Position along the spine, -0.5 (tail) to 0.5 (nose).
 * @param angle Radians around the spine, from straight down toward +Z. So `0`
 *   is the belly, `Math.PI / 2` the flank, and `Math.PI` the spine.
 */
export function dragonBodySurfacePoint(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
): Vector3Data {
  const radius = sampleDragonBodyRadius(axialFraction);

  return {
    x: axialFraction * dimensions.x,
    y: -Math.cos(angle) * radius * (dimensions.y / 2),
    z: Math.sin(angle) * radius * (dimensions.z / 2),
  };
}
