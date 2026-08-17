import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';

/** Designer-only specimens for inspecting the Mini Dragon's shared procedural meshes. */
const COLOR = '#c9a43a';
const COMMON_PARAMETERS = {
  miniDorsalBumps: 1,
  miniPatchColor: '#6e422b',
  miniEmberColor: '#ff7aa8',
  miniJointBall: 1,
} as const;

export const MINI_DRAGON_PART_DEFINITIONS: readonly AssemblyPartDefinition[] = [
  miniPart('mini-lab-body', 'Mini body', 'box', { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-body'),
  miniPart(
    'mini-lab-dorsal-scales', 'Baby-bumpy scale rows', 'box',
    { x: 0.82, y: 0.58, z: 0.54 }, 'mini-dragon-dorsal-scales',
  ),
  miniPart('mini-lab-neck', 'Mini neck', 'cylinder', { x: 0.25, y: 0.3, z: 0.28 }, 'mini-dragon-neck'),
  miniPart(
    'mini-lab-head', 'Mini head', 'box', { x: 0.43, y: 0.48, z: 0.44 }, 'mini-dragon-head',
    {
      miniHornCurl: 1,
      miniHornLength: 0.48,
      miniEyeSize: 0.62,
      miniSnoutLength: 0.46,
      miniEarScale: 0.82,
      miniEarTuft: 0.6,
      miniCheekTuft: 0.6,
      miniCrestCrown: 1,
      miniCrestFrill: 1,
    },
  ),
  miniPart('mini-lab-jaw', 'Mini lower jaw', 'box', { x: 0.21, y: 0.085, z: 0.24 }, 'mini-dragon-jaw'),
  miniPart(
    'mini-lab-thigh', 'Mini hip and thigh', 'cylinder',
    { x: 0.138, y: 0.126, z: 0.138 }, 'mini-dragon-thigh',
  ),
  miniPart(
    'mini-lab-lower-leg', 'Mini lower leg and paw', 'cylinder',
    { x: 0.108, y: 0.174, z: 0.108 }, 'mini-dragon-leg', { miniToeCount: 4 },
  ),
  miniPart(
    'mini-lab-wing', 'Mini broad wing', 'box',
    { x: 0.28, y: 0.22, z: 0.38 }, 'mini-dragon-wing',
    { miniWingSpread: 1, miniWingSide: 1 },
  ),
  miniPart(
    'mini-lab-tail', 'Mini tail segment', 'box',
    { x: 0.22, y: 0.15, z: 0.15 }, 'mini-dragon-tail',
  ),
  miniPart(
    'mini-lab-tail-tip', 'Mini pom tail tip', 'box',
    { x: 0.28, y: 0.19, z: 0.19 }, 'mini-dragon-tail-plume',
    { miniPlumeFan: 0.8, miniTailStyle: 2 },
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
