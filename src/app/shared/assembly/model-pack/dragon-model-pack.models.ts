import { AssemblyBlueprint } from '../domain/assembly.models';

export const DRAGON_MODEL_PACK_SCHEMA_VERSION = 1 as const;
export const DRAGON_RENDERER_CONTRACT_VERSION = 1 as const;

export interface DragonModelPackEntryV1 {
  id: string;
  label: string;
  description: string;
  blueprint: AssemblyBlueprint;
}

/** Published data crossing from Dragon Designer into the student application. */
export interface DragonModelPackV1 {
  schemaVersion: typeof DRAGON_MODEL_PACK_SCHEMA_VERSION;
  packId: string;
  packVersion: string;
  rendererContractVersion: typeof DRAGON_RENDERER_CONTRACT_VERSION;
  defaultModelId: string;
  models: DragonModelPackEntryV1[];
}

export const CLASSIC_DRAGON_PROCEDURAL_PROFILE_IDS = [
  'dragon-body',
  'dragon-head-horned',
  'dragon-upper-jaw',
  'dragon-lower-jaw',
  'dragon-leg',
  'dragon-foot',
  // Grasping forelimbs: the `ll` body plan swaps the front walking chain for
  // these, so a pack that carries one has to be able to name them.
  'dragon-grasp-arm',
  'dragon-grasp-hand',
  'dragon-claw',
  'dragon-wing',
  'dragon-secondary-wing',
  'dragon-wing-claw',
  'dragon-tail',
  'dragon-tail-club',
  'dragon-tail-stinger',
] as const;

export const MINI_DRAGON_PROCEDURAL_PROFILE_IDS = [
  'mini-dragon-body',
  'mini-dragon-dorsal-scales',
  'mini-dragon-neck',
  'mini-dragon-head',
  'mini-dragon-horn',
  'mini-dragon-ear',
  'mini-dragon-jaw',
  'mini-dragon-thigh',
  'mini-dragon-leg',
  'mini-dragon-wing',
  'mini-dragon-tail',
  'mini-dragon-tail-plume',
  'mini-dragon-brow-plates',
  'mini-dragon-whiskers',
  'mini-dragon-chin-tuft',
  'mini-dragon-dewlap',
  'mini-dragon-neck-ruff',
  'mini-dragon-shoulder-plates',
  'mini-dragon-belly-scutes',
  'mini-dragon-flank-fins',
  'mini-dragon-hip-fins',
  'mini-dragon-tail-sail',
  'mini-dragon-face-shield',
  'mini-dragon-nose-horn',
  'mini-dragon-serpent-body-segment',
  'mini-dragon-fork-tail-branch',
  'mini-dragon-fairy-wing',
  'mini-dragon-aero-wing',
] as const;

export const SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS = [
  ...CLASSIC_DRAGON_PROCEDURAL_PROFILE_IDS,
  ...MINI_DRAGON_PROCEDURAL_PROFILE_IDS,
] as const;

export type DragonProceduralProfileId =
  typeof SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS[number];
