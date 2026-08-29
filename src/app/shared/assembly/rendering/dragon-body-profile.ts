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

/** Per-definition Designer refinements layered over a genetic body archetype. */
export interface DragonBodyStationParameters {
  readonly neckWidth: number;
  readonly chestWidth: number;
  readonly chestHeight: number;
  readonly waistWidth: number;
  readonly bellyDepth: number;
  readonly hipWidth: number;
  readonly spineArch: number;
  readonly tailRootWidth: number;
}

export const DEFAULT_DRAGON_BODY_STATIONS: DragonBodyStationParameters = {
  neckWidth: 1,
  chestWidth: 1,
  chestHeight: 1,
  waistWidth: 1,
  bellyDepth: 1,
  hipWidth: 1,
  spineArch: 0,
  tailRootWidth: 1,
};

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
  [-0.5, 0.24],
  [-0.4, 0.43],
  [-0.24, 0.69],
  [-0.05, 0.82],
  [0.12, 0.96],
  [0.27, 1.04],
  [0.39, 0.76],
  [0.47, 0.47],
  [0.5, 0.36],
];

const BULWARK_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.5],
  [-0.4, 0.78],
  [-0.25, 1.02],
  [-0.08, 1.06],
  [0.12, 1.05],
  [0.28, 1.02],
  [0.4, 0.86],
  [0.48, 0.67],
  [0.5, 0.58],
];

const COURSER_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.16],
  [-0.4, 0.28],
  [-0.25, 0.43],
  [-0.08, 0.49],
  [0.12, 0.68],
  [0.27, 1.02],
  [0.39, 0.68],
  [0.47, 0.34],
  [0.5, 0.24],
];

const PROWLER_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.26],
  [-0.4, 0.58],
  [-0.27, 1.04],
  [-0.08, 0.56],
  [0.1, 0.61],
  [0.27, 0.9],
  [0.39, 0.67],
  [0.47, 0.39],
  [0.5, 0.29],
];

const SERPENT_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.3],
  [-0.43, 0.46],
  [-0.3, 0.55],
  [-0.12, 0.59],
  [0.08, 0.56],
  [0.25, 0.6],
  [0.39, 0.52],
  [0.47, 0.39],
  [0.5, 0.3],
];

const FOUR_WING_BODY_PROFILE: DragonBodyProfile = [
  [-0.5, 0.24],
  [-0.4, 0.45],
  [-0.24, 0.82],
  [-0.08, 1.03],
  [0.04, 0.72],
  [0.2, 1.04],
  [0.36, 0.7],
  [0.47, 0.42],
  [0.5, 0.31],
];

const BODY_PROFILES: Readonly<Record<DragonBodyArchetype, DragonBodyProfile>> = {
  classic: DRAGON_BODY_PROFILE,
  wyvern: DRAGON_BODY_PROFILE,
  drake: DRAGON_BODY_PROFILE,
  'four-wing': FOUR_WING_BODY_PROFILE,
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

/** Vertical cross-section multiplier, separate from flank width. */
export function sampleDragonBodyHeightScale(
  axialFraction: number,
  archetype = 'classic',
): number {
  switch (dragonBodyArchetype(archetype)) {
    case 'regal':
      return sampleProfile([[-0.5, 0.88], [-0.12, 0.94], [0.28, 1.18], [0.5, 0.9]], axialFraction);
    case 'bulwark':
      return sampleProfile([[-0.5, 1], [-0.25, 1.12], [0.28, 1.14], [0.5, 1]], axialFraction);
    case 'courser':
      return sampleProfile([[-0.5, 0.84], [-0.08, 0.94], [0.27, 1.22], [0.5, 0.88]], axialFraction);
    case 'prowler':
      return sampleProfile([[-0.5, 0.72], [-0.27, 0.78], [0.28, 0.7], [0.5, 0.66]], axialFraction);
    case 'serpent':
      return 0.78;
    case 'four-wing':
      return sampleProfile([[-0.5, 0.9], [-0.08, 1.08], [0.04, 0.9], [0.2, 1.1], [0.5, 0.86]], axialFraction);
    default:
      return 1;
  }
}

/** Side-to-side cross-section multiplier used by both the mesh and mounts. */
export function sampleDragonBodyDepthScale(
  axialFraction: number,
  archetype = 'classic',
): number {
  switch (dragonBodyArchetype(archetype)) {
    case 'regal':
      return sampleProfile([[-0.5, 0.8], [-0.12, 0.9], [0.28, 1.08], [0.5, 0.82]], axialFraction);
    case 'bulwark':
      return sampleProfile([[-0.5, 1.08], [-0.25, 1.2], [0.28, 1.2], [0.5, 1.08]], axialFraction);
    case 'courser':
      return sampleProfile([[-0.5, 0.64], [-0.08, 0.68], [0.27, 0.76], [0.5, 0.62]], axialFraction);
    case 'prowler':
      return sampleProfile([[-0.5, 1.04], [-0.27, 1.22], [0.28, 1.12], [0.5, 0.92]], axialFraction);
    case 'serpent':
      return 0.74;
    case 'four-wing':
      return sampleProfile([[-0.5, 0.78], [-0.08, 1.16], [0.04, 0.82], [0.2, 1.18], [0.5, 0.76]], axialFraction);
    default:
      return 1;
  }
}

/**
 * Vertical offset of the torso centreline, as a fraction of body height.
 * Most bodies are straight. The serpent carries a pronounced S-curve so its
 * narrow torso reads as a living spine rather than a stretched capsule.
 */
export function sampleDragonBodyCenterY(
  axialFraction: number,
  archetype = 'classic',
  stations: DragonBodyStationParameters = DEFAULT_DRAGON_BODY_STATIONS,
): number {
  const archetypeCurve = dragonBodyArchetype(archetype) === 'serpent'
    ? sampleProfile([
      [-0.5, 0],
      [-0.36, 0.145],
      [-0.18, -0.11],
      [0.02, 0.12],
      [0.2, -0.095],
      [0.38, 0.12],
      [0.5, 0],
    ], axialFraction)
    : 0;
  const bodyArch = stations.spineArch
    * Math.sin((Math.max(-0.5, Math.min(0.5, axialFraction)) + 0.5) * Math.PI);
  return archetypeCurve + bodyArch;
}

/** Side-to-side refinement sampled between the five draggable body stations. */
export function sampleDragonBodyStationWidth(
  axialFraction: number,
  stations: DragonBodyStationParameters = DEFAULT_DRAGON_BODY_STATIONS,
): number {
  return sampleProfile([
    [-0.5, stations.tailRootWidth],
    [-0.28, stations.hipWidth],
    [-0.04, stations.waistWidth],
    [0.27, stations.chestWidth],
    [0.5, stations.neckWidth],
  ], axialFraction);
}

/** Extra vertical lift concentrated around the chest station. */
export function sampleDragonBodyStationHeight(
  axialFraction: number,
  stations: DragonBodyStationParameters = DEFAULT_DRAGON_BODY_STATIONS,
): number {
  return sampleProfile([
    [-0.5, 1],
    [-0.12, 1],
    [0.27, stations.chestHeight],
    [0.5, 1],
  ], axialFraction);
}

/** Lower-half-only depth so the belly can drop without raising the spine. */
export function sampleDragonBodyBellyDepth(
  axialFraction: number,
  stations: DragonBodyStationParameters = DEFAULT_DRAGON_BODY_STATIONS,
): number {
  return sampleProfile([
    [-0.5, 1],
    [-0.3, 1],
    [-0.05, stations.bellyDepth],
    [0.24, stations.bellyDepth],
    [0.5, 1],
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
  stations: DragonBodyStationParameters = DEFAULT_DRAGON_BODY_STATIONS,
): Vector3Data {
  const radius = sampleDragonBodyRadius(axialFraction, archetype);
  const height = sampleDragonBodyHeightScale(axialFraction, archetype)
    * sampleDragonBodyStationHeight(axialFraction, stations);
  const depth = sampleDragonBodyDepthScale(axialFraction, archetype)
    * sampleDragonBodyStationWidth(axialFraction, stations);
  const belly = Math.cos(angle) > 0
    ? sampleDragonBodyBellyDepth(axialFraction, stations)
    : 1;
  const centerY = sampleDragonBodyCenterY(axialFraction, archetype, stations) * dimensions.y;

  return {
    x: axialFraction * dimensions.x,
    y: centerY - Math.cos(angle) * radius * height * belly * (dimensions.y / 2),
    z: Math.sin(angle) * radius * depth * (dimensions.z / 2),
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
