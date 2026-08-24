import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';

/** Designer-only specimens for inspecting the Mini Dragon's shared procedural meshes. */
const COLOR = '#c9a43a';
const COMMON_PARAMETERS = {
  miniDorsalBumps: 1,
  miniPatchColor: '#6e422b',
  miniEmberColor: '#ff7aa8',
  miniAccentColor: '#00d9ff',
  miniPatternStyle: 'saddle',
  miniSurfaceStyle: 'sleek',
  miniJointBall: 1,
} as const;

export const MINI_DRAGON_PART_DEFINITIONS: readonly AssemblyPartDefinition[] = [
  miniPart(
    'mini-lab-body', 'Mini body', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-body',
    {
      miniChestScale: 1,
      miniBellyScale: 1,
      miniHipScale: 1,
      miniWaistScale: 1,
      miniSpineArch: 0.05,
      miniFeatherCoverage: 0,
      miniFeatherLength: 1,
      miniFeatherVolume: 1,
      miniPatchScale: 1,
    },
  ),
  miniPart(
    'mini-lab-dorsal-scales', 'Baby-bumpy scale rows', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-dorsal-scales',
    {
      miniChestScale: 1,
      miniBellyScale: 1,
      miniHipScale: 1,
      miniWaistScale: 1,
      miniSpineArch: 0.05,
      miniScaleSize: 1,
    },
  ),
  miniPart(
    'mini-lab-neck', 'Mini neck', 'cylinder',
    { x: 0.25, y: 0.3, z: 0.28 }, 'mini-dragon-neck',
    { miniNeckCurve: 0.2, miniNeckThickness: 1 },
  ),
  miniPart(
    'mini-lab-head', 'Mini head', 'box', { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-head',
    {
      miniEyeSize: 0.62,
      miniEyeSpacing: 1,
      miniSkullLength: 1,
      miniSkullHeight: 1,
      miniSkullWidth: 1,
      miniSnoutLength: 0.46,
      miniMuzzleWidth: 1,
      miniMuzzleDepth: 1,
      miniCheekTuft: 0.6,
      miniCrestCrown: 1,
      miniCrestFrill: 1,
      miniCrestScale: 1,
    },
  ),
  miniPart(
    'mini-lab-horn', 'Separate mini horn', 'cylinder',
    { x: 0.346, y: 0.062, z: 0.057 }, 'mini-dragon-horn',
    { miniHornCurl: 1, miniHornLength: 0.48, miniHornSpread: 0.82, miniHornScale: 1, miniHornSide: 1 },
  ),
  miniPart(
    'mini-lab-ear', 'Movable mini ear', 'box',
    { x: 0.114, y: 0.202, z: 0.031 }, 'mini-dragon-ear',
    { miniEarScale: 0.82, miniEarFold: 0.42, miniEarRoundness: 0.74, miniEarTuft: 0.6, miniEarSide: 1 },
  ),
  miniPart(
    'mini-lab-jaw', 'Mini lower jaw', 'box',
    { x: 0.21, y: 0.085, z: 0.24 }, 'mini-dragon-jaw',
    { miniToothCount: 2 },
  ),
  miniPart(
    'mini-lab-thigh', 'Mini hip and thigh', 'cylinder',
    { x: 0.138, y: 0.126, z: 0.138 }, 'mini-dragon-thigh',
    { miniLegThickness: 1 },
  ),
  miniPart(
    'mini-lab-lower-leg', 'Mini lower leg and paw', 'cylinder',
    { x: 0.108, y: 0.174, z: 0.108 }, 'mini-dragon-leg',
    { miniToeCount: 4, miniLegThickness: 1, miniPawScale: 1, miniToeSplay: 1 },
  ),
  miniPart(
    'mini-lab-wing', 'Mini broad wing', 'box',
    { x: 0.28, y: 0.22, z: 0.38 }, 'mini-dragon-wing',
    {
      miniWingSpread: 1,
      miniWingSide: 1,
      miniWingChord: 1,
      miniWingSweep: 0.18,
      miniWingScallop: 0.08,
      miniWingCamber: 0.08,
      miniFeatherCoverage: 0,
      miniFeatherLength: 1,
      miniFeatherVolume: 1,
    },
  ),
  miniPart(
    'mini-lab-tail', 'Mini tail segment', 'box',
    { x: 0.22, y: 0.15, z: 0.15 }, 'mini-dragon-tail',
    { miniTailTaper: 1, miniTailCurve: 0.03 },
  ),
  miniPart(
    'mini-lab-tail-tip', 'Mini pom tail tip', 'box',
    { x: 0.28, y: 0.19, z: 0.19 }, 'mini-dragon-tail-plume',
    { miniPlumeFan: 0.8, miniTailStyle: 2, miniTailTipScale: 1 },
  ),
  miniPart(
    'mini-lab-brow-plates', 'Inherited brow plates', 'box',
    { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-brow-plates',
    { miniBrowScale: 1 },
  ),
  miniPart(
    'mini-lab-whiskers', 'Inherited whiskers', 'box',
    { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-whiskers',
    { miniWhiskerScale: 1 },
  ),
  miniPart(
    'mini-lab-chin-tuft', 'Inherited chin tuft', 'box',
    { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-chin-tuft',
    { miniChinScale: 1 },
  ),
  miniPart(
    'mini-lab-dewlap', 'Inherited dewlap', 'box',
    { x: 0.25, y: 0.3, z: 0.28 }, 'mini-dragon-dewlap',
    { miniDewlapScale: 1 },
  ),
  miniPart(
    'mini-lab-neck-ruff', 'Inherited neck ruff', 'box',
    { x: 0.25, y: 0.3, z: 0.28 }, 'mini-dragon-neck-ruff',
    { miniRuffScale: 1 },
  ),
  miniPart(
    'mini-lab-shoulder-plates', 'Inherited shoulder plates', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-shoulder-plates',
    { miniShoulderScale: 1 },
  ),
  miniPart(
    'mini-lab-belly-scutes', 'Inherited belly scutes', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-belly-scutes',
    { miniBellyScuteScale: 1 },
  ),
  miniPart(
    'mini-lab-flank-fins', 'Inherited flank fins', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-flank-fins',
    { miniFlankFinScale: 1 },
  ),
  miniPart(
    'mini-lab-hip-fins', 'Inherited hip fins', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-hip-fins',
    { miniHipFinScale: 1 },
  ),
  miniPart(
    'mini-lab-tail-sail', 'Inherited tail sail', 'box',
    { x: 0.38, y: 0.2, z: 0.17 }, 'mini-dragon-tail-sail',
    { miniTailSailScale: 1 },
  ),
  miniPart(
    'mini-lab-face-shield', 'Triceratops face shield', 'box',
    { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-face-shield',
    { miniFaceShieldScale: 1.12 },
  ),
  miniPart(
    'mini-lab-nose-horn', 'Triceratops nose horn', 'cylinder',
    { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-nose-horn',
    { miniNoseHornScale: 1.05 },
  ),
  miniPart(
    'mini-lab-serpent-segment', 'Articulated serpent body segment', 'box',
    { x: 0.42, y: 0.48, z: 0.46 }, 'mini-dragon-serpent-body-segment',
    { miniSerpentSegmentScale: 1 },
  ),
  miniPart(
    'mini-lab-fork-tail-branch', 'Fork-tail branch and paddle', 'box',
    { x: 0.36, y: 0.16, z: 0.14 }, 'mini-dragon-fork-tail-branch',
    { miniForkTailScale: 1 },
  ),
  miniPart(
    'mini-lab-fairy-wing', 'Rounded fairy wing', 'box',
    { x: 0.3, y: 0.22, z: 0.42 }, 'mini-dragon-fairy-wing',
    {
      miniWingSpread: 1,
      miniWingSide: 1,
      miniWingChord: 1.35,
      miniWingSweep: 0.18,
      miniWingScallop: 0.26,
      miniWingCamber: 0.2,
      miniFeatherCoverage: 1,
      miniFeatherLength: 1.18,
      miniFeatherVolume: 1.38,
    },
  ),
  miniPart(
    'mini-lab-aero-wing', 'Long amphiptere wing', 'box',
    { x: 0.32, y: 0.2, z: 0.5 }, 'mini-dragon-aero-wing',
    {
      miniWingSpread: 1,
      miniWingSide: 1,
      miniWingChord: 0.9,
      miniWingSweep: 0.46,
      miniWingScallop: 0.06,
      miniWingCamber: 0.1,
      miniFeatherCoverage: 0,
      miniFeatherLength: 1,
      miniFeatherVolume: 1,
    },
  ),
];

function miniPart(
  id: string,
  label: string,
  shape: AssemblyPartDefinition['shape'],
  dimensions: AssemblyPartDefinition['dimensions'],
  profileId: string,
  parameters: Readonly<Record<string, string | number | boolean>> = {},
): AssemblyPartDefinition {
  return {
    id,
    label,
    family: 'dragon',
    shape,
    dimensions,
    mass: 0.2,
    color: COLOR,
    snapPoints: [],
    visualProfile: {
      profileId,
      meshType: 'procedural',
      parameters: { ...COMMON_PARAMETERS, ...parameters },
    },
  };
}
