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
  'dragon-head-snout',
  'dragon-head-armored',
  'dragon-upper-jaw',
  'dragon-lower-jaw',
  'dragon-leg',
  'dragon-foot',
  'dragon-claw',
  'dragon-wing',
  'dragon-secondary-wing',
  'dragon-wing-claw',
  'dragon-tail',
  'dragon-tail-club',
  'dragon-tail-stinger',
] as const;

