/**
 * Shared visual contract for Mini Dragon breed morphology.
 *
 * The student genetics feature owns allele inheritance, while this shared
 * module owns the visible combinations that both the student renderer and the
 * private Designer must agree on. Derived anatomy is intentionally based on
 * expressed forms rather than a breed id: any bred dragon with the same visible
 * combination receives the same parts.
 */

export type MiniDragonBreedPresetId =
  | 'puggle'
  | 'fairy'
  | 'triceratops'
  | 'imperial-serpent'
  | 'amphiptere';

export interface MiniDragonFormSelection {
  coat: string;
  plumage: string;
  horns: string;
  wings: string;
  pattern: string;
  ember: string;
  size: string;
  eyes: string;
  ears: string;
  muzzle: string;
  legs: string;
  tail: string;
  crest: string;
  frame: string;
  brow: string;
  whiskers: string;
  chin: string;
  dewlap: string;
  ruff: string;
  shoulders: string;
  belly: string;
  'flank-fins': string;
  'hip-fins': string;
  'tail-sail': string;
}

export type MiniDragonBreedWingProfile =
  | 'mini-dragon-wing'
  | 'mini-dragon-fairy-wing'
  | 'mini-dragon-aero-wing';

export interface MiniDragonBreedMorphology {
  eyeSize: number;
  hornScale: number;
  earRoundness: number;
  legThicknessMultiplier: number;
  pawScaleMultiplier: number;
  featherVolume: number;
  crownScaleMultiplier: number;
  faceShieldScale: number;
  noseHornScale: number;
  serpentSegmentScale: number;
  splitTailAngle: number;
  forkTailBranches: boolean;
  wingProfileId: MiniDragonBreedWingProfile;
}

export const MINI_DRAGON_NEUTRAL_FORMS: MiniDragonFormSelection = {
  coat: 'coat:sleek',
  plumage: 'plumage:bare',
  horns: 'horns:curled',
  wings: 'wings:small',
  pattern: 'pattern:ash-gold',
  ember: 'ember:pale',
  size: 'size:standard',
  eyes: 'eyes:medium',
  ears: 'ears:petal',
  muzzle: 'muzzle:medium',
  legs: 'legs:medium',
  tail: 'tail:pom',
  crest: 'crest:frill',
  frame: 'frame:balanced',
  brow: 'brow:soft',
  whiskers: 'whiskers:short',
  chin: 'chin:smooth',
  dewlap: 'dewlap:half',
  ruff: 'ruff:mane-petal',
  shoulders: 'shoulders:soft',
  belly: 'belly:pebbled',
  'flank-fins': 'flank-fins:petal',
  'hip-fins': 'hip-fins:petal',
  'tail-sail': 'tail-sail:ridge',
};

/** Complete reference genomes, including non-defining choices used for art direction. */
export const MINI_DRAGON_REFERENCE_FORMS: Readonly<
  Record<MiniDragonBreedPresetId, MiniDragonFormSelection>
> = {
  puggle: {
    ...MINI_DRAGON_NEUTRAL_FORMS,
    frame: 'frame:round',
    muzzle: 'muzzle:pug',
    legs: 'legs:waddler',
    ears: 'ears:button',
    size: 'size:teacup',
    eyes: 'eyes:large',
    brow: 'brow:soft',
    dewlap: 'dewlap:full',
    whiskers: 'whiskers:none',
    chin: 'chin:smooth',
    ruff: 'ruff:petal',
    'flank-fins': 'flank-fins:none',
    'hip-fins': 'hip-fins:none',
    'tail-sail': 'tail-sail:none',
  },
  fairy: {
    ...MINI_DRAGON_NEUTRAL_FORMS,
    frame: 'frame:balanced',
    crest: 'crest:frill',
    ears: 'ears:petal',
    eyes: 'eyes:large',
    wings: 'wings:broad',
    tail: 'tail:pom',
    plumage: 'plumage:full',
    ruff: 'ruff:petal',
    'hip-fins': 'hip-fins:petal',
    whiskers: 'whiskers:none',
    dewlap: 'dewlap:none',
    belly: 'belly:soft',
    'tail-sail': 'tail-sail:none',
  },
  triceratops: {
    ...MINI_DRAGON_NEUTRAL_FORMS,
    crest: 'crest:crown',
    muzzle: 'muzzle:long',
    coat: 'coat:fluffy',
    legs: 'legs:medium',
    tail: 'tail:star',
    shoulders: 'shoulders:shield',
    belly: 'belly:plated',
    horns: 'horns:straight',
    brow: 'brow:crowned',
    whiskers: 'whiskers:none',
    ruff: 'ruff:mane',
    'flank-fins': 'flank-fins:none',
    'hip-fins': 'hip-fins:none',
    'tail-sail': 'tail-sail:none',
  },
  'imperial-serpent': {
    ...MINI_DRAGON_NEUTRAL_FORMS,
    frame: 'frame:long',
    wings: 'wings:vestigial',
    muzzle: 'muzzle:long',
    legs: 'legs:waddler',
    horns: 'horns:straight',
    crest: 'crest:crown-frill',
    tail: 'tail:split',
    pattern: 'pattern:gold',
    whiskers: 'whiskers:long',
    chin: 'chin:plume',
    plumage: 'plumage:fringe',
    belly: 'belly:soft',
    'flank-fins': 'flank-fins:none',
    'hip-fins': 'hip-fins:none',
    'tail-sail': 'tail-sail:ribbon',
  },
  amphiptere: {
    ...MINI_DRAGON_NEUTRAL_FORMS,
    frame: 'frame:long',
    wings: 'wings:broad',
    legs: 'legs:waddler',
    muzzle: 'muzzle:long',
    coat: 'coat:sleek',
    ears: 'ears:sail',
    tail: 'tail:fork',
    'flank-fins': 'flank-fins:sail',
    'tail-sail': 'tail-sail:ribbon',
    horns: 'horns:straight',
    whiskers: 'whiskers:none',
    chin: 'chin:smooth',
    dewlap: 'dewlap:none',
    ruff: 'ruff:petal',
    shoulders: 'shoulders:soft',
    belly: 'belly:soft',
    'hip-fins': 'hip-fins:sail',
  },
};

export function resolveMiniDragonBreedMorphology(
  forms: Readonly<MiniDragonFormSelection>,
): MiniDragonBreedMorphology {
  const puggle = forms.frame === 'frame:round' && forms.muzzle === 'muzzle:pug';
  const fairy = forms.wings === 'wings:broad' && forms.plumage === 'plumage:full';
  const triceratops = forms.crest === 'crest:crown'
    && forms.coat === 'coat:fluffy'
    && forms.shoulders === 'shoulders:shield';
  const imperial = forms.frame === 'frame:long' && forms.tail === 'tail:split';
  const amphiptere = forms.frame === 'frame:long'
    && forms.wings === 'wings:broad'
    && forms.tail === 'tail:fork';

  return {
    eyeSize: forms.eyes === 'eyes:large' ? 1.02 : forms.eyes === 'eyes:small' ? 0.42 : 0.68,
    hornScale: puggle ? 0.3 : fairy ? 0.42 : amphiptere ? 0.56 : triceratops ? 1.12 : 1,
    earRoundness: forms.ears === 'ears:button' ? 0.94 : forms.ears === 'ears:sail' ? 0.46 : 0.74,
    legThicknessMultiplier: puggle ? 0.84 : imperial ? 0.66 : amphiptere ? 0.56 : 1,
    pawScaleMultiplier: puggle ? 0.8 : imperial ? 0.62 : amphiptere ? 0.52 : 1,
    featherVolume: fairy ? 1.38 : forms.plumage === 'plumage:fringe' ? 1.08 : 1,
    crownScaleMultiplier: triceratops ? 1.22 : 1,
    faceShieldScale: triceratops ? 1.12 : 0,
    noseHornScale: triceratops ? 1.05 : 0,
    serpentSegmentScale: imperial ? 1.12 : amphiptere ? 0.94 : 0,
    splitTailAngle: imperial ? 0.5 : 0.34,
    forkTailBranches: forms.tail === 'tail:fork',
    wingProfileId: fairy
      ? 'mini-dragon-fairy-wing'
      : amphiptere
        ? 'mini-dragon-aero-wing'
        : 'mini-dragon-wing',
  };
}
