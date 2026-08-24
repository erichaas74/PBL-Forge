import { AssemblyPart } from '../domain/assembly.models';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

/** Breed-neutral shape values consumed by the focused Mini Dragon builders. */
export interface MiniDragonBodyMorphology {
  chestScale: number;
  bellyScale: number;
  hipScale: number;
  waistScale: number;
  spineArch: number;
}

export interface MiniDragonHeadMorphology {
  skullLength: number;
  skullHeight: number;
  skullWidth: number;
  muzzleWidth: number;
  muzzleDepth: number;
  eyeSpacing: number;
  earFold: number;
  hornSpread: number;
  crestScale: number;
}

export interface MiniDragonLimbMorphology {
  thickness: number;
  pawScale: number;
  toeSplay: number;
}

export interface MiniDragonWingMorphology {
  chord: number;
  sweep: number;
  scallop: number;
  camber: number;
}

export interface MiniDragonTailMorphology {
  taper: number;
  curve: number;
  tipScale: number;
}

export const DEFAULT_MINI_DRAGON_BODY_MORPHOLOGY: MiniDragonBodyMorphology = {
  chestScale: 1,
  bellyScale: 1,
  hipScale: 1,
  waistScale: 1,
  spineArch: 0,
};

export const DEFAULT_MINI_DRAGON_HEAD_MORPHOLOGY: MiniDragonHeadMorphology = {
  skullLength: 1,
  skullHeight: 1,
  skullWidth: 1,
  muzzleWidth: 1,
  muzzleDepth: 1,
  eyeSpacing: 1,
  earFold: 0,
  hornSpread: 1,
  crestScale: 1,
};

export const DEFAULT_MINI_DRAGON_LIMB_MORPHOLOGY: MiniDragonLimbMorphology = {
  thickness: 1,
  pawScale: 1,
  toeSplay: 1,
};

export const DEFAULT_MINI_DRAGON_WING_MORPHOLOGY: MiniDragonWingMorphology = {
  chord: 1,
  sweep: 0.18,
  scallop: 0.08,
  camber: 0.08,
};

export const DEFAULT_MINI_DRAGON_TAIL_MORPHOLOGY: MiniDragonTailMorphology = {
  taper: 1,
  curve: 0,
  tipScale: 1,
};

export function miniBodyMorphology(part: AssemblyPart): MiniDragonBodyMorphology {
  return {
    chestScale: miniVisualNumber(part, 'miniChestScale', 1),
    bellyScale: miniVisualNumber(part, 'miniBellyScale', 1),
    hipScale: miniVisualNumber(part, 'miniHipScale', 1),
    waistScale: miniVisualNumber(part, 'miniWaistScale', 1),
    spineArch: miniVisualNumber(part, 'miniSpineArch', 0),
  };
}

export function miniHeadMorphology(part: AssemblyPart): MiniDragonHeadMorphology {
  return {
    skullLength: miniVisualNumber(part, 'miniSkullLength', 1),
    skullHeight: miniVisualNumber(part, 'miniSkullHeight', 1),
    skullWidth: miniVisualNumber(part, 'miniSkullWidth', 1),
    muzzleWidth: miniVisualNumber(part, 'miniMuzzleWidth', 1),
    muzzleDepth: miniVisualNumber(part, 'miniMuzzleDepth', 1),
    eyeSpacing: miniVisualNumber(part, 'miniEyeSpacing', 1),
    earFold: miniVisualNumber(part, 'miniEarFold', 0),
    hornSpread: miniVisualNumber(part, 'miniHornSpread', 1),
    crestScale: miniVisualNumber(part, 'miniCrestScale', 1),
  };
}

export function miniLimbMorphology(part: AssemblyPart): MiniDragonLimbMorphology {
  return {
    thickness: miniVisualNumber(part, 'miniLegThickness', 1),
    pawScale: miniVisualNumber(part, 'miniPawScale', 1),
    toeSplay: miniVisualNumber(part, 'miniToeSplay', 1),
  };
}

export function miniWingMorphology(part: AssemblyPart): MiniDragonWingMorphology {
  return {
    chord: miniVisualNumber(part, 'miniWingChord', 1),
    sweep: miniVisualNumber(part, 'miniWingSweep', 0.18),
    scallop: miniVisualNumber(part, 'miniWingScallop', 0.08),
    camber: miniVisualNumber(part, 'miniWingCamber', 0.08),
  };
}

export function miniTailMorphology(part: AssemblyPart): MiniDragonTailMorphology {
  return {
    taper: miniVisualNumber(part, 'miniTailTaper', 1),
    curve: miniVisualNumber(part, 'miniTailCurve', 0),
    tipScale: miniVisualNumber(part, 'miniTailTipScale', 1),
  };
}

export function miniScaleSize(part: AssemblyPart): number {
  return miniVisualNumber(part, 'miniScaleSize', 1);
}

export function miniFeatherLength(part: AssemblyPart): number {
  return miniVisualNumber(part, 'miniFeatherLength', 1);
}

export function miniPatchScale(part: AssemblyPart): number {
  return miniVisualNumber(part, 'miniPatchScale', 1);
}

export function miniNeckCurve(part: AssemblyPart): number {
  return miniVisualNumber(part, 'miniNeckCurve', 0.15);
}

export function miniNeckThickness(part: AssemblyPart): number {
  return miniVisualNumber(part, 'miniNeckThickness', 1);
}

export function miniToothCount(part: AssemblyPart): number {
  return Math.max(0, Math.round(miniVisualNumber(part, 'miniToothCount', 2)));
}
