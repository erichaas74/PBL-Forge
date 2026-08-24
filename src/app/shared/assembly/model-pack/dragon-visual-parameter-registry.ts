export const DRAGON_VISUAL_PARAMETER_REGISTRY_VERSION = 1 as const;

export type DragonParameterSpecies = 'classic' | 'mini';
export type DragonParameterValueType = 'number' | 'string' | 'boolean';
export type DragonStyleSection = 'wing' | 'body' | 'jaw' | 'head' | 'foot' | 'grasp' | 'joint' | 'tailClub';

export interface DragonVisualParameterDefinition {
  key: string;
  species: DragonParameterSpecies;
  profiles: readonly string[];
  type: DragonParameterValueType;
  defaultValue: string | number | boolean;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  styleSection?: DragonStyleSection;
  geneticsOwned?: boolean;
  deprecatedAliases?: readonly string[];
}

const classic = (
  key: string,
  profiles: readonly string[],
  type: DragonParameterValueType,
  defaultValue: DragonVisualParameterDefinition['defaultValue'],
  label: string,
  options: Partial<DragonVisualParameterDefinition> = {},
): DragonVisualParameterDefinition => ({ key, profiles, type, defaultValue, label, species: 'classic', ...options });

const mini = (
  key: string,
  profiles: readonly string[],
  defaultValue: DragonVisualParameterDefinition['defaultValue'],
  label: string,
  min: number,
  max: number,
  step = 0.02,
): DragonVisualParameterDefinition => ({
  key, profiles, type: 'number', defaultValue, label, min, max, step, species: 'mini',
});

const SKIN_PROFILES = [
  'dragon-body', 'dragon-head-horned', 'dragon-upper-jaw', 'dragon-lower-jaw', 'dragon-leg',
  'dragon-foot', 'dragon-grasp-arm', 'dragon-grasp-hand', 'dragon-claw', 'dragon-wing',
  'dragon-secondary-wing', 'dragon-wing-claw', 'dragon-tail', 'dragon-tail-club',
  'dragon-tail-stinger',
] as const;
const GLOW_PROFILES = ['dragon-body', 'dragon-head-horned', 'dragon-tail', 'dragon-tail-club', 'dragon-tail-stinger'] as const;
const JOINT_PROFILES = ['dragon-head-horned', 'dragon-leg', 'dragon-grasp-arm', 'dragon-grasp-hand', 'dragon-tail'] as const;
const JAW_PROFILES = ['dragon-upper-jaw', 'dragon-lower-jaw'] as const;
const WING_PROFILES = ['dragon-wing', 'dragon-secondary-wing'] as const;
const MINI_ALL = [
  'mini-dragon-body', 'mini-dragon-dorsal-scales', 'mini-dragon-neck', 'mini-dragon-head',
  'mini-dragon-horn', 'mini-dragon-ear', 'mini-dragon-jaw', 'mini-dragon-thigh', 'mini-dragon-leg', 'mini-dragon-wing',
  'mini-dragon-tail', 'mini-dragon-tail-plume',
  'mini-dragon-brow-plates', 'mini-dragon-whiskers', 'mini-dragon-chin-tuft',
  'mini-dragon-dewlap', 'mini-dragon-neck-ruff', 'mini-dragon-shoulder-plates',
  'mini-dragon-belly-scutes', 'mini-dragon-flank-fins', 'mini-dragon-hip-fins',
  'mini-dragon-tail-sail', 'mini-dragon-face-shield', 'mini-dragon-nose-horn',
  'mini-dragon-serpent-body-segment', 'mini-dragon-fork-tail-branch',
  'mini-dragon-fairy-wing', 'mini-dragon-aero-wing',
] as const;

/** Canonical, versioned metadata used by validation, Parts Lab controls, and acceptance reports. */
export const DRAGON_VISUAL_PARAMETER_REGISTRY: readonly DragonVisualParameterDefinition[] = [
  classic('scalePattern', SKIN_PROFILES, 'number', 0, 'Scale pattern', { geneticsOwned: true }),
  classic('patternColor', SKIN_PROFILES, 'string', '#000000', 'Pattern colour', { geneticsOwned: true }),
  classic('glowMarkings', GLOW_PROFILES, 'boolean', false, 'Glow markings', { geneticsOwned: true }),
  classic('jointBall', JOINT_PROFILES, 'number', 1.02, 'Joint ball', { min: 0.6, max: 1.8, step: 0.02, styleSection: 'joint' }),
  classic('bodyArchetype', ['dragon-body'], 'string', 'classic', 'Body archetype', { geneticsOwned: true }),
  classic('spikeCount', ['dragon-body'], 'number', 6, 'Spike count', { min: 0, max: 16, step: 1, styleSection: 'body' }),
  classic('spikeSpread', ['dragon-body'], 'number', 0.73, 'Ridge length', { min: 0.1, max: 0.95, step: 0.01, styleSection: 'body' }),
  classic('spikeHeight', ['dragon-body'], 'number', 0.2, 'Spike height', { min: 0.01, max: 0.3, step: 0.005, styleSection: 'body' }),
  classic('spikeRadius', ['dragon-body'], 'number', 0.051, 'Spike thickness', { min: 0.005, max: 0.12, step: 0.002, styleSection: 'body' }),
  classic('spikeLean', ['dragon-body'], 'number', 0.56, 'Spike lean', { min: -1, max: 1, step: 0.02, styleSection: 'body' }),
  classic('backSpikeCount', ['dragon-body'], 'number', 6, 'Inherited back spikes', { geneticsOwned: true }),
  classic('backSpikeScale', ['dragon-body'], 'number', 1, 'Inherited spike scale', { geneticsOwned: true }),
  classic('cranium', ['dragon-head-horned'], 'number', 1, 'Braincase', { min: 0.6, max: 1.4, step: 0.02, styleSection: 'head' }),
  classic('browRidge', ['dragon-head-horned'], 'number', 0.1, 'Brow ridge', { min: 0, max: 0.5, step: 0.01, styleSection: 'head' }),
  classic('muzzleDepth', ['dragon-head-horned'], 'number', 1, 'Muzzle depth', { min: 0.4, max: 1.6, step: 0.02, styleSection: 'head' }),
  classic('muzzleWidth', ['dragon-head-horned'], 'number', 1, 'Muzzle width', { min: 0.4, max: 1.6, step: 0.02, styleSection: 'head' }),
  classic('muzzleDrop', ['dragon-head-horned'], 'number', 1, 'Muzzle droop', { min: 0, max: 2, step: 0.05, styleSection: 'head' }),
  classic('cheek', ['dragon-head-horned'], 'number', 1, 'Cheek flare', { min: 0.6, max: 1.4, step: 0.02, styleSection: 'head' }),
  classic('eyeAxial', ['dragon-head-horned'], 'number', 0.06, 'Eye position', { min: -0.3, max: 0.4, step: 0.01, styleSection: 'head' }),
  classic('hornLength', ['dragon-head-horned'], 'number', 1.8, 'Horn length', { min: 0.2, max: 3.5, step: 0.05, styleSection: 'head' }),
  classic('hornRadius', ['dragon-head-horned'], 'number', 0.13, 'Horn thickness', { min: 0.04, max: 0.5, step: 0.01, styleSection: 'head' }),
  classic('browLength', ['dragon-head-horned'], 'number', 0.45, 'Brow spike', { min: 0, max: 1.5, step: 0.05, styleSection: 'head' }),
  classic('crestScale', ['dragon-head-horned'], 'number', 1, 'Inherited crest scale', { geneticsOwned: true }),
  classic('eyeColor', ['dragon-head-horned'], 'string', '#ffffff', 'Eye colour', { geneticsOwned: true }),
  classic('sex', ['dragon-head-horned'], 'string', 'female', 'Sex-linked form', { geneticsOwned: true }),
  classic('wiseAvatar', ['dragon-head-horned'], 'boolean', false, 'Wise Dragon avatar', { geneticsOwned: true }),
  classic('toothCount', JAW_PROFILES, 'number', 4, 'Teeth per side', { min: 0, max: 12, step: 1, styleSection: 'jaw' }),
  classic('toothHeight', JAW_PROFILES, 'number', 1.15, 'Tooth length', { min: 0.2, max: 3, step: 0.05, styleSection: 'jaw' }),
  classic('toothRadius', JAW_PROFILES, 'number', 0.1, 'Tooth thickness', { min: 0.02, max: 0.4, step: 0.01, styleSection: 'jaw' }),
  classic('toothStart', JAW_PROFILES, 'number', 0.28, 'Front tooth position', { min: -0.2, max: 0.5, step: 0.01, styleSection: 'jaw' }),
  classic('noseHornLength', JAW_PROFILES, 'number', 0.62, 'Nose horn', { min: 0, max: 2, step: 0.05, styleSection: 'jaw' }),
  classic('fangScale', JAW_PROFILES, 'number', 1, 'Inherited fang scale', { geneticsOwned: true }),
  classic('talonCount', ['dragon-foot'], 'number', 3, 'Talon count', { min: 1, max: 7, step: 1, styleSection: 'foot' }),
  classic('talonLength', ['dragon-foot'], 'number', 0.6, 'Talon length', { min: 0.1, max: 1.6, step: 0.02, styleSection: 'foot' }),
  classic('talonRadius', ['dragon-foot'], 'number', 0.42, 'Talon thickness', { min: 0.1, max: 1, step: 0.02, styleSection: 'foot' }),
  classic('clawScale', ['dragon-foot', 'dragon-grasp-hand'], 'number', 1, 'Inherited claw scale', { geneticsOwned: true }),
  classic('fingerCount', ['dragon-grasp-hand'], 'number', 3, 'Finger count', { min: 2, max: 5, step: 1, styleSection: 'grasp' }),
  classic('fingerLength', ['dragon-grasp-hand'], 'number', 1.65, 'Finger length', { min: 0.4, max: 2.2, step: 0.05, styleSection: 'grasp' }),
  classic('fingerRadius', ['dragon-grasp-hand'], 'number', 0.36, 'Finger thickness', { min: 0.1, max: 0.7, step: 0.02, styleSection: 'grasp' }),
  classic('palmLength', ['dragon-grasp-hand'], 'number', 0.55, 'Wrist offset', { min: 0.2, max: 0.9, step: 0.02, styleSection: 'grasp' }),
  classic('fingerSplay', ['dragon-grasp-hand'], 'number', 0.58, 'Finger splay', { min: 0, max: 0.7, step: 0.02, styleSection: 'grasp' }),
  classic('camber', WING_PROFILES, 'number', 0, 'Camber', { min: 0, max: 0.35, step: 0.005, styleSection: 'wing' }),
  classic('fingerSag', WING_PROFILES, 'number', 0, 'Finger sag', { min: 0, max: 0.35, step: 0.005, styleSection: 'wing' }),
  classic('dihedral', WING_PROFILES, 'number', 0, 'Dihedral', { min: -0.1, max: 0.35, step: 0.005, styleSection: 'wing' }),
  classic('scallop', WING_PROFILES, 'number', 0, 'Trailing scallop', { min: 0, max: 0.4, step: 0.005, styleSection: 'wing' }),
  classic('spikeCount', ['dragon-tail-club'], 'number', 5, 'Club spike count', { min: 1, max: 12, step: 1, styleSection: 'tailClub' }),
  classic('spikeLength', ['dragon-tail-club'], 'number', 0.85, 'Club spike length', { min: 0.1, max: 2, step: 0.05, styleSection: 'tailClub' }),
  classic('spikeRadius', ['dragon-tail-club'], 'number', 0.18, 'Club spike thickness', { min: 0.04, max: 0.5, step: 0.01, styleSection: 'tailClub' }),
  classic('tailClubSpikeCount', ['dragon-tail-club'], 'number', 5, 'Inherited club spikes', { geneticsOwned: true }),
  classic('tailClubSpikeScale', ['dragon-tail-club'], 'number', 1, 'Inherited club spike scale', { geneticsOwned: true }),

  mini('miniDorsalBumps', MINI_ALL, 1, 'Dorsal bumps', 0, 2),
  mini('miniJointBall', MINI_ALL, 1, 'Joint ball', 0.5, 1.8),
  mini('miniChestScale', ['mini-dragon-body', 'mini-dragon-dorsal-scales'], 1, 'Chest volume', 0.65, 1.5),
  mini('miniBellyScale', ['mini-dragon-body', 'mini-dragon-dorsal-scales'], 1, 'Belly drop', 0.65, 1.6),
  mini('miniHipScale', ['mini-dragon-body', 'mini-dragon-dorsal-scales'], 1, 'Hip volume', 0.65, 1.5),
  mini('miniWaistScale', ['mini-dragon-body', 'mini-dragon-dorsal-scales'], 1, 'Waist volume', 0.65, 1.35),
  mini('miniSpineArch', ['mini-dragon-body', 'mini-dragon-dorsal-scales'], 0, 'Spine arch', -0.18, 0.3),
  mini('miniNeckCurve', ['mini-dragon-neck'], 0.15, 'Neck curve', -0.25, 0.65),
  mini('miniNeckThickness', ['mini-dragon-neck'], 1, 'Neck thickness', 0.65, 1.5),
  mini('miniFeatherCoverage', ['mini-dragon-body', 'mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 0, 'Feather coverage', 0, 1),
  mini('miniFeatherLength', ['mini-dragon-body', 'mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 1, 'Feather length', 0.55, 1.75),
  mini('miniFeatherVolume', ['mini-dragon-body', 'mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 1, 'Feather volume', 0.65, 1.65),
  mini('miniPatchScale', ['mini-dragon-body'], 1, 'Patch scale', 0.45, 1.65),
  mini('miniScaleSize', ['mini-dragon-dorsal-scales'], 1, 'Dorsal scale size', 0.55, 1.6),
  // Head remains listed for backward compatibility with already-published
  // packs; new anatomy owns these controls on independent horn/ear parts.
  mini('miniHornCurl', ['mini-dragon-head', 'mini-dragon-horn'], 1, 'Horn curl', 0, 1),
  mini('miniHornLength', ['mini-dragon-head', 'mini-dragon-horn'], 0.48, 'Horn length', 0, 1.5),
  mini('miniHornSpread', ['mini-dragon-head', 'mini-dragon-horn'], 1, 'Horn spread', 0.35, 1.8),
  mini('miniHornScale', ['mini-dragon-horn'], 1, 'Horn scale', 0, 1.5),
  mini('miniHornSide', ['mini-dragon-horn'], 1, 'Horn side', -1, 1, 2),
  mini('miniEyeSize', ['mini-dragon-head'], 0.62, 'Eye size', 0.2, 1.2),
  mini('miniEyeSpacing', ['mini-dragon-head'], 1, 'Eye spacing', 0.65, 1.45),
  mini('miniSkullLength', ['mini-dragon-head'], 1, 'Skull length', 0.72, 1.35),
  mini('miniSkullHeight', ['mini-dragon-head'], 1, 'Skull height', 0.72, 1.35),
  mini('miniSkullWidth', ['mini-dragon-head'], 1, 'Skull width', 0.72, 1.4),
  mini('miniSnoutLength', ['mini-dragon-head'], 0.46, 'Snout length', 0.15, 1.2),
  mini('miniMuzzleWidth', ['mini-dragon-head'], 1, 'Muzzle width', 0.55, 1.55),
  mini('miniMuzzleDepth', ['mini-dragon-head'], 1, 'Muzzle depth', 0.55, 1.5),
  mini('miniEarScale', ['mini-dragon-head', 'mini-dragon-ear'], 0.82, 'Ear scale', 0, 1.5),
  mini('miniEarFold', ['mini-dragon-head', 'mini-dragon-ear'], 0, 'Ear fold', -0.2, 1),
  mini('miniEarRoundness', ['mini-dragon-head', 'mini-dragon-ear'], 0.74, 'Ear roundness', 0.15, 1),
  mini('miniEarTuft', ['mini-dragon-head', 'mini-dragon-ear'], 0.6, 'Ear tuft', 0, 1.5),
  mini('miniEarSide', ['mini-dragon-ear'], 1, 'Ear side', -1, 1, 2),
  mini('miniCheekTuft', ['mini-dragon-head'], 0.6, 'Cheek tuft', 0, 1.5),
  mini('miniCrestCrown', ['mini-dragon-head'], 1, 'Crest crown', 0, 1.5),
  mini('miniCrestFrill', ['mini-dragon-head'], 1, 'Crest frill', 0, 1.5),
  mini('miniCrestScale', ['mini-dragon-head'], 1, 'Crest scale', 0.45, 1.75),
  mini('miniToothCount', ['mini-dragon-jaw'], 2, 'Milk teeth', 0, 6, 1),
  mini('miniToeCount', ['mini-dragon-leg'], 4, 'Toe count', 2, 6, 1),
  mini('miniLegThickness', ['mini-dragon-thigh', 'mini-dragon-leg'], 1, 'Leg thickness', 0.55, 1.55),
  mini('miniPawScale', ['mini-dragon-leg'], 1, 'Paw scale', 0.55, 1.6),
  mini('miniToeSplay', ['mini-dragon-leg'], 1, 'Toe splay', 0.45, 1.6),
  mini('miniWingSpread', ['mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 1, 'Wing spread', 0.4, 1.8),
  mini('miniWingSide', ['mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 1, 'Wing side', -1, 1, 2),
  mini('miniWingChord', ['mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 1, 'Wing chord', 0.55, 1.6),
  mini('miniWingSweep', ['mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 0.18, 'Wing sweep', -0.15, 0.65),
  mini('miniWingScallop', ['mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 0.08, 'Wing scallop', 0, 0.45),
  mini('miniWingCamber', ['mini-dragon-wing', 'mini-dragon-fairy-wing', 'mini-dragon-aero-wing'], 0.08, 'Wing camber', 0, 0.35),
  mini('miniTailTaper', ['mini-dragon-tail'], 1, 'Tail taper', 0.55, 1.45),
  mini('miniTailCurve', ['mini-dragon-tail'], 0, 'Tail curve', -0.5, 0.5),
  mini('miniPlumeFan', ['mini-dragon-tail-plume'], 0.8, 'Plume fan', 0, 1.5),
  mini('miniTailStyle', ['mini-dragon-tail-plume'], 2, 'Tail style', 0, 3, 1),
  mini('miniTailTipScale', ['mini-dragon-tail-plume'], 1, 'Tail tip scale', 0.55, 1.65),
  mini('miniBrowScale', ['mini-dragon-brow-plates'], 0.68, 'Brow plate scale', 0, 1.5),
  mini('miniWhiskerScale', ['mini-dragon-whiskers'], 0.65, 'Whisker length', 0, 1.5),
  mini('miniChinScale', ['mini-dragon-chin-tuft'], 0, 'Chin tuft scale', 0, 1.5),
  mini('miniDewlapScale', ['mini-dragon-dewlap'], 0.65, 'Dewlap scale', 0, 1.5),
  mini('miniRuffScale', ['mini-dragon-neck-ruff'], 0.82, 'Neck ruff scale', 0, 1.5),
  mini('miniShoulderScale', ['mini-dragon-shoulder-plates'], 0.42, 'Shoulder plate scale', 0, 1.5),
  mini('miniBellyScuteScale', ['mini-dragon-belly-scutes'], 0.68, 'Belly scute scale', 0, 1.5),
  mini('miniFlankFinScale', ['mini-dragon-flank-fins'], 0.68, 'Flank fin scale', 0, 1.5),
  mini('miniHipFinScale', ['mini-dragon-hip-fins'], 0.68, 'Hip fin scale', 0, 1.5),
  mini('miniTailSailScale', ['mini-dragon-tail-sail'], 0.65, 'Tail sail scale', 0, 1.5),
  mini('miniFaceShieldScale', ['mini-dragon-face-shield'], 0, 'Face shield scale', 0, 1.5),
  mini('miniNoseHornScale', ['mini-dragon-nose-horn'], 0, 'Nose horn scale', 0, 1.5),
  mini('miniSerpentSegmentScale', ['mini-dragon-serpent-body-segment'], 0, 'Serpent segment scale', 0, 1.5),
  mini('miniForkTailScale', ['mini-dragon-fork-tail-branch'], 1, 'Fork-tail scale', 0, 1.5),
  { key: 'miniPatchColor', profiles: MINI_ALL, type: 'string', defaultValue: '#6e422b', label: 'Patch colour', species: 'mini' },
  { key: 'miniEmberColor', profiles: MINI_ALL, type: 'string', defaultValue: '#ff7aa8', label: 'Ember colour', species: 'mini' },
  { key: 'miniAccentColor', profiles: MINI_ALL, type: 'string', defaultValue: '#00d9ff', label: 'Display accent', species: 'mini' },
  { key: 'miniPatternStyle', profiles: MINI_ALL, type: 'string', defaultValue: 'saddle', label: 'Marking layout', species: 'mini' },
  { key: 'miniSurfaceStyle', profiles: MINI_ALL, type: 'string', defaultValue: 'sleek', label: 'Coat surface', species: 'mini' },
];

export function dragonParametersForProfile(profileId: string): readonly DragonVisualParameterDefinition[] {
  return DRAGON_VISUAL_PARAMETER_REGISTRY.filter(definition => definition.profiles.includes(profileId));
}

export function editableDragonParametersForProfile(profileId: string): readonly DragonVisualParameterDefinition[] {
  return dragonParametersForProfile(profileId).filter(definition =>
    definition.type === 'number' && definition.min !== undefined && definition.max !== undefined);
}
