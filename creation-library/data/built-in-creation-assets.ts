import { ASSEMBLY_PRESETS } from '../../assembly-garage/data/presets/assembly-presets';
import { AssemblyPreset } from '../../shared/assembly/domain/assembly.models';
import { normalizeAssemblyRoles } from '../../shared/assembly/domain/assembly-clone';
import { createDefaultCombatProfile } from '../../shared/assembly/combat/assembly-combat.models';
import { ATTACK_MOVE_CATALOG } from './attack-move-catalog';
import { TEST_SCENARIO_CATALOG } from './test-scenario-catalog';
import { AttackMoveDefinition } from '../models/attack-move.models';
import {
  CreationAssemblyAsset,
  CreationAttackMoveAsset,
  CreationTestScenarioAsset,
} from '../models/creation-library.models';
import { CreationTestScenarioDefinition } from '../models/test-scenario.models';

const BUILT_IN_TIMESTAMP = '2026-05-24T00:00:00.000Z';

export const BUILT_IN_ASSEMBLY_ASSETS = ASSEMBLY_PRESETS.map(toBuiltInAssemblyAsset);
export const BUILT_IN_ATTACK_MOVE_ASSETS = ATTACK_MOVE_CATALOG.map(toBuiltInAttackMoveAsset);
export const BUILT_IN_TEST_SCENARIO_ASSETS = TEST_SCENARIO_CATALOG.map(toBuiltInTestScenarioAsset);

function toBuiltInAssemblyAsset(preset: AssemblyPreset): CreationAssemblyAsset {
  const assembly = normalizeAssemblyRoles(preset.state);
  return {
    id: preset.id,
    kind: 'assembly',
    name: preset.name,
    description: preset.description,
    tags: inferAssemblyTags(preset),
    compatibleGameIds: inferCompatibleGameIds(preset),
    scope: 'built-in',
    schemaVersion: 1,
    assetVersion: 1,
    createdAtIso: BUILT_IN_TIMESTAMP,
    updatedAtIso: BUILT_IN_TIMESTAMP,
    authoringTool: 'assembly-garage',
    assembly,
    combatProfile: createDefaultCombatProfile(assembly),
  };
}

function toBuiltInAttackMoveAsset(move: AttackMoveDefinition): CreationAttackMoveAsset {
  return {
    id: move.id,
    kind: 'attack-move',
    name: move.name,
    description: move.description,
    tags: move.tags,
    scope: 'built-in',
    schemaVersion: 1,
    assetVersion: 1,
    createdAtIso: BUILT_IN_TIMESTAMP,
    updatedAtIso: BUILT_IN_TIMESTAMP,
    authoringTool: 'assembly-arena',
    move,
  };
}

function toBuiltInTestScenarioAsset(scenario: CreationTestScenarioDefinition): CreationTestScenarioAsset {
  return {
    id: scenario.id,
    kind: 'test-scenario',
    name: scenario.name,
    description: scenario.description,
    tags: scenario.tags,
    scope: 'built-in',
    schemaVersion: 1,
    assetVersion: 1,
    createdAtIso: BUILT_IN_TIMESTAMP,
    updatedAtIso: BUILT_IN_TIMESTAMP,
    authoringTool: 'test-scenario-builder',
    compatibleGameIds: scenario.compatibleGameIds,
    scenario,
  };
}

function inferAssemblyTags(preset: AssemblyPreset): string[] {
  const id = preset.id.toLowerCase();

  if (id.includes('dragon')) {
    return ['dragon', 'creature', 'arena'];
  }

  if (id.includes('robot')) {
    return ['robot', 'arena'];
  }

  if (id === 'pinewood-derby-car') {
    return ['car', 'vehicle', 'race', 'derby', 'suspension', 'ramp'];
  }

  if (id.includes('car')) {
    return ['car', 'vehicle', 'arena'];
  }

  return ['assembly'];
}

function inferCompatibleGameIds(preset: AssemblyPreset): string[] {
  const id = preset.id.toLowerCase();

  if (id.includes('dragon')) {
    return ['assembly-arena'];
  }

  if (id.includes('robot')) {
    return ['assembly-arena', 'robot-battle'];
  }

  if (id === 'pinewood-derby-car') {
    return ['assembly-arena', 'racecar'];
  }

  if (id.includes('car')) {
    return ['assembly-arena', 'racecar'];
  }

  return [];
}
