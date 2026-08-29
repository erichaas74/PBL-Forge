import { DEFAULT_HEAD_SHAPE, DragonHeadShape } from './dragon-head-profile';
import { DEFAULT_WING_SHAPE, WingMembraneShape } from './dragon-wing-profile';

/**
 * Feature counts and proportions shared by the procedural builders and the
 * Designer's Parts Lab. Every length is a fraction of the part it sits on,
 * never a world unit, so genetics can resize parts without distorting details.
 */
export interface DragonBodyStyle {
  spikeCount: number;
  /** Length of ridge the spikes cover, as a fraction of body length. */
  spikeSpread: number;
  /** Spike height, as a fraction of body length. */
  spikeHeight: number;
  /** Spike base radius, as a fraction of body length. */
  spikeRadius: number;
  /** Backward lean, in radians. */
  spikeLean: number;
}

export interface DragonJawStyle {
  /** Teeth per side. */
  toothCount: number;
  /** Tooth height, as a fraction of jaw height. */
  toothHeight: number;
  /** Tooth base radius, as a fraction of jaw depth. */
  toothRadius: number;
  /** Position of the front-most tooth along the jaw, measured from its centre. */
  toothStart: number;
  /** Nose horn length as a fraction of jaw depth. Zero draws no nose horn. */
  noseHornLength: number;
}

/** Skull silhouette controls plus the horn proportions authored beside them. */
export interface DragonHeadStyle extends DragonHeadShape {
  /** Main horn length, as a fraction of head height. */
  hornLength: number;
  /** Main horn base radius, as a fraction of head height. */
  hornRadius: number;
  /** Brow spike length, as a fraction of head height. */
  browLength: number;
}

export interface DragonFootStyle {
  talonCount: number;
  /** Talon length, as a fraction of foot length. */
  talonLength: number;
  /** Talon base radius, as a fraction of foot height. */
  talonRadius: number;
}

/** Controls for the grasping hand, which has different proportions from a foot. */
export interface DragonGraspStyle {
  fingerCount: number;
  /** Finger length, as a fraction of hand length. Above 1 reaches past the palm. */
  fingerLength: number;
  /** Finger base radius, as a fraction of hand height. */
  fingerRadius: number;
  /** Legacy palm-length control, retained as the wrist's fore-aft offset. */
  palmLength: number;
  /** How far the upper fingers separate, as a fraction of hand depth. */
  fingerSplay: number;
}

export interface DragonTailClubStyle {
  spikeCount: number;
  /** Spike length, as a fraction of club depth. */
  spikeLength: number;
  /** Spike base radius, as a fraction of club depth. */
  spikeRadius: number;
}

/** Controls the balls that close the open tubes meeting at each joint. */
export interface DragonJointStyle {
  /** Ball radius as a multiple of the part radius at the joint. */
  ball: number;
}

export interface DragonStyle {
  wing: WingMembraneShape;
  body: DragonBodyStyle;
  jaw: DragonJawStyle;
  head: DragonHeadStyle;
  foot: DragonFootStyle;
  grasp: DragonGraspStyle;
  joint: DragonJointStyle;
  tailClub: DragonTailClubStyle;
}

export const DEFAULT_DRAGON_STYLE: DragonStyle = {
  wing: DEFAULT_WING_SHAPE,
  body: {
    spikeCount: 9,
    spikeSpread: 0.68,
    spikeHeight: 0.2,
    spikeRadius: 0.051,
    spikeLean: 0.56,
  },
  jaw: {
    toothCount: 6,
    toothHeight: 0.9,
    toothRadius: 0.08,
    toothStart: 0.34,
    noseHornLength: 0.62,
  },
  head: {
    ...DEFAULT_HEAD_SHAPE,
    hornLength: 1.8,
    hornRadius: 0.13,
    browLength: 0.45,
  },
  foot: {
    talonCount: 3,
    talonLength: 0.6,
    talonRadius: 0.42,
  },
  grasp: {
    fingerCount: 3,
    fingerLength: 1.65,
    fingerRadius: 0.36,
    palmLength: 0.55,
    fingerSplay: 0.58,
  },
  tailClub: {
    spikeCount: 5,
    spikeLength: 0.85,
    spikeRadius: 0.18,
  },
  joint: {
    ball: 1.02,
  },
};

/**
 * Live tuning state for the private Designer. Production rendering leaves this
 * null and therefore always uses the published defaults.
 */
let styleOverride: DragonStyle | null = null;

export function setDragonStyleOverride(style: DragonStyle | null): void {
  styleOverride = style;
}

export function getActiveDragonStyle(): DragonStyle {
  return styleOverride ?? DEFAULT_DRAGON_STYLE;
}

export function getActiveWingShape(): WingMembraneShape {
  return getActiveDragonStyle().wing;
}
