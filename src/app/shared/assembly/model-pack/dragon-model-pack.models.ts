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

export const SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS = [
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

export type DragonProceduralProfileId =
  typeof SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS[number];
