import { Vector3Data } from '../domain/assembly.models';

/**
 * Named torso silhouettes supported by the shared classic-dragon renderer.
 *
 * `classic`, `wyvern`, `drake`, and `four-wing` are the original chassis names.
 * The remaining values are body morphotypes: they keep the same semantic snap
 * contract while changing the mass distribution and outline.
 */
export type DragonBodyArchetype =
  | 'classic'
  | 'wyvern'
  | 'drake'
  | 'four-wing'
  | 'regal'
  | 'bulwark'
  | 'courser'
  | 'prowler'
  | 'serpent';

type DragonBodyProfile = readonly (readonly [number, number])[];

/** `[fraction along the spine, radius as a fraction of the half extents]`. */
export const DRAGON_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.28],
  [-0.4, 0.5],
  [-0.24, 0.78],
  [-0.05, 0.97],
  [0.1, 1],
  [0.24, 0.9],
  [0.36, 0.72],
  [0.46, 0.5],
  [0.5, 0.42],
];

const REGAL_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.31],
  [-0.4, 0.55],
  [-0.24, 0.82],
  [-0.05, 0.97],
  [0.12, 1],
  [0.27, 0.91],
  [0.39, 0.73],
  [0.47, 0.52],
  [0.5, 0.44],
];

const BULWARK_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.4],
  [-0.4, 0.7],
  [-0.25, 0.92],
  [-0.08, 1],
  [0.12, 1],
  [0.28, 0.96],
  [0.4, 0.79],
  [0.48, 0.59],
  [0.5, 0.52],
];

const COURSER_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.24],
  [-0.4, 0.42],
  [-0.25, 0.63],
  [-0.08, 0.72],
  [0.12, 0.86],
  [0.26, 1],
  [0.38, 0.78],
  [0.47, 0.47],
  [0.5, 0.35],
];

const PROWLER_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.34],
  [-0.4, 0.65],
  [-0.27, 0.9],
  [-0.08, 0.78],
  [0.1, 0.83],
  [0.27, 0.98],
  [0.39, 0.82],
  [0.47, 0.55],
  [0.5, 0.43],
];

const SERPENT_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.4],
  [-0.43, 0.64],
  [-0.3, 0.82],
  [-0.12, 0.88],
  [0.08, 0.84],
  [0.25, 0.92],
  [0.39, 0.75],
  [0.47, 0.52],
  [0.5, 0.4],
];

const BODY_PROFILES: Readonly<Record<DragonBodyArchetype, DragonBodyProfile>> = {
  classic: DRAGON_BODY_PROFILE,
  wyvern: DRAGON_BODY_PROFILE,
  drake: DRAGON_BODY_PROFILE,
  'four-wing': DRAGON_BODY_PROFILE,
  regal: REGAL_BODY_PROFILE,
  bulwark: BULWARK_BODY_PROFILE,
  courser: COURSER_BODY_PROFILE,
  prowler: PROWLER_BODY_PROFILE,
  serpent: SERPENT_BODY_PROFILE,
};

/** Resolve draft or imported strings without letting an unknown value break a mesh. */
export function dragonBodyArchetype(value: string | undefined): DragonBodyArchetype {
  return value && Object.prototype.hasOwnProperty.call(BODY_PROFILES, value)
    ? value as DragonBodyArchetype
    : 'classic';
}

export function dragonBodyProfile(archetype = 'classic'): DragonBodyProfile {
  return BODY_PROFILES[dragonBodyArchetype(archetype)];
}

/**
 * Radius factor at `axialFraction`, which runs -0.5 (tail end) to 0.5 (nose).
 * Values outside that range clamp to the end caps.
 */
export function sampleDragonBodyRadius(
  axialFraction: number,
  archetype = 'classic',
): number {
  return sampleProfile(dragonBodyProfile(archetype), axialFraction);
}

/**
 * Vertical offset of the torso centreline, as a fraction of body height.
 * Most bodies are straight. The serpent carries a restrained S-curve so the
 * very long torso reads as a living spine rather than a stretched capsule.
 */
export function sampleDragonBodyCenterY(
  axialFraction: number,
  archetype = 'classic',
): number {
  if (dragonBodyArchetype(archetype) !== 'serpent') return 0;

  return sampleProfile([
    [-0.5, -0.01],
    [-0.36, 0.08],
    [-0.18, -0.055],
    [0.02, 0.06],
    [0.2, -0.045],
    [0.38, 0.065],
    [0.5, 0.02],
  ], axialFraction);
}

/**
 * A point on the visible torso surface, in body-local space.
 *
 * @param dimensions Physics dimensions of the body part.
 * @param axialFraction Position along the spine, -0.5 (tail) to 0.5 (nose).
 * @param angle Radians around the spine, from straight down toward +Z. So `0`
 *   is the belly, `Math.PI / 2` the flank, and `Math.PI` the spine.
 * @param archetype Body profile sampled by both the renderer and the sockets.
 */
export function dragonBodySurfacePoint(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
  archetype = 'classic',
): Vector3Data {
  const radius = sampleDragonBodyRadius(axialFraction, archetype);
  const centerY = sampleDragonBodyCenterY(axialFraction, archetype) * dimensions.y;

  return {
    x: axialFraction * dimensions.x,
    y: centerY - Math.cos(angle) * radius * (dimensions.y / 2),
    z: Math.sin(angle) * radius * (dimensions.z / 2),
  };
}

function sampleProfile(profile: DragonBodyProfile, axialFraction: number): number {
  const clamped = Math.max(-0.5, Math.min(0.5, axialFraction));

  for (let index = 1; index < profile.length; index += 1) {
    const [fromT, fromValue] = profile[index - 1];
    const [toT, toValue] = profile[index];
    if (clamped <= toT) {
      const blend = (clamped - fromT) / Math.max(toT - fromT, 1e-6);
      return fromValue + (toValue - fromValue) * Math.max(0, Math.min(1, blend));
    }
  }

  return profile[profile.length - 1][1];
}
