import { AssemblyPreset } from '@pbl/assembly/domain/assembly.models';
import { CAR_LOAD_PRESET } from '@pbl/assembly/assets/car-load';
import { CLASSIC_DRAGON_TEST_PRESET } from './classic-dragon-test';
import { PINEWOOD_DERBY_CAR_PRESET } from '@pbl/assembly/assets/pinewood-derby-car';
import { ROBOT_LOAD_PRESET } from '@pbl/assembly/assets/robot-load';
import { DRAGON_BODY_TYPE_PRESETS } from './dragon-body-types';

export const ASSEMBLY_PRESETS = [
  ROBOT_LOAD_PRESET,
  CAR_LOAD_PRESET,
  PINEWOOD_DERBY_CAR_PRESET,
  CLASSIC_DRAGON_TEST_PRESET,
  ...DRAGON_BODY_TYPE_PRESETS,
] as const satisfies readonly AssemblyPreset[];

export type AssemblyPresetId = typeof ASSEMBLY_PRESETS[number]['id'];
