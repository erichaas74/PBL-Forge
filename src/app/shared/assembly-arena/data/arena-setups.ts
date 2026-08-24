import { TEST_SCENARIO_CATALOG } from '../../creation-library/data/test-scenario-catalog';
import { CreationScenarioParticipant, CreationTestScenarioDefinition } from '../../creation-library/models/test-scenario.models';
import {
  ArenaControlMode,
  ArenaSetupConfig,
  ArenaSetupStyleId,
} from '../models/arena.models';

export const ARENA_CONTROL_MODES = [
  {
    id: 'shove-drive',
    name: 'Shove Drive',
    description: 'Direct push forces with steering torque. Good for rough prototypes.',
  },
  {
    id: 'vehicle-drive',
    name: 'Vehicle Drive',
    description: 'Forward-biased force and yaw torque. Best for cars.',
  },
  {
    id: 'righting-assist',
    name: 'Righting Assist',
    description: 'Adds roll torque and jump impulse so robots can recover from tipping.',
  },
  {
    id: 'dragon-attack',
    name: 'Dragon Attack',
    description: 'Dragon movement with bite lunges, wing buffets, and tail sweeps.',
  },
  {
    id: 'ai-hunter',
    name: 'AI Hunter',
    description: 'Computer pushes toward the opponent core.',
  },
  {
    id: 'static-target',
    name: 'Static Target',
    description: 'No active control. Useful for crash tests and practice dummies.',
  },
] as const satisfies readonly {
  id: ArenaControlMode;
  name: string;
  description: string;
}[];

export const ARENA_SETUPS = TEST_SCENARIO_CATALOG.map(toArenaSetup) as readonly ArenaSetupConfig[];

let publishedDragonArenaSetup: ArenaSetupConfig | null = null;

export function getArenaSetup(id: ArenaSetupStyleId): ArenaSetupConfig {
  if (publishedDragonArenaSetup?.id === id) return publishedDragonArenaSetup;
  return ARENA_SETUPS.find(setup => setup.id === id) ?? ARENA_SETUPS[0];
}

export function installPublishedDragonArena(scenario: CreationTestScenarioDefinition): void {
  if (scenario.id !== 'dragon-duel-ring') {
    throw new Error('Published Dragon Garage arena must use the dragon-duel-ring ID.');
  }
  publishedDragonArenaSetup = toArenaSetup(structuredClone(scenario));
}

/**
 * Radius of the round fighting ring drawn inside a rectangular floor.
 *
 * Inscribed in the floor, so no stretch of sand is left without a palisade
 * behind it. Shared by the renderer that draws the ring and the physics that
 * holds the dragons inside it — split in two, the scenery and the boundary
 * would drift apart and a dragon would walk through a fence that was no longer
 * where the solver thought it was.
 */
export function arenaPitRadius(setup: ArenaSetupConfig): number {
  return Math.min(setup.floorSize.x, setup.floorSize.z) / 2;
}

export function toArenaSetup(scenario: CreationTestScenarioDefinition): ArenaSetupConfig {
  const red = getParticipant(scenario, 'red');
  const blue = getParticipant(scenario, 'blue');

  return {
    id: scenario.id as ArenaSetupStyleId,
    name: scenario.name,
    description: scenario.description,
    floorSize: scenario.environment.floorSize,
    wallHeight: scenario.environment.wallHeight,
    ringBoundary: scenario.environment.ringBoundary,
    defaultRedPresetId: red.defaultAssemblyAssetId,
    defaultBluePresetId: blue.defaultAssemblyAssetId,
    redSpawn: red.spawnPosition,
    blueSpawn: blue.spawnPosition,
    redInitialRotation: red.initialRotation,
    blueInitialRotation: blue.initialRotation,
    redControlMode: toArenaControlMode(red.defaultControlMode, 'shove-drive'),
    blueControlMode: toArenaControlMode(blue.defaultControlMode, 'static-target'),
    raceFinishX: scenario.winCondition.type === 'finish-line'
      ? scenario.winCondition.finishX
      : undefined,
    winCondition: { ...scenario.winCondition },
    physics: scenario.physics ? { ...scenario.physics } : undefined,
    obstacles: scenario.environment.obstacles.map(obstacle => ({
      id: obstacle.id,
      label: obstacle.label,
      position: obstacle.position,
      size: obstacle.size,
      rotation: obstacle.rotation,
      color: obstacle.color,
    })),
  };
}

function getParticipant(
  scenario: CreationTestScenarioDefinition,
  team: 'red' | 'blue',
): CreationScenarioParticipant {
  const participant = scenario.participants.find(item => item.team === team);

  if (participant) {
    return participant;
  }

  return {
    slotId: team,
    team,
    name: team === 'red' ? 'Red' : 'Blue',
    defaultAssemblyAssetId: team === 'red' ? 'robot-load' : 'car-load',
    spawnPosition: { x: team === 'red' ? -2 : 2, y: 0, z: 0 },
    initialRotation: { x: 0, y: 0, z: 0 },
    controllerRole: team === 'red' ? 'player' : 'static',
    defaultControlMode: team === 'red' ? 'shove-drive' : 'static-target',
  };
}

function toArenaControlMode(
  value: string | undefined,
  fallback: ArenaControlMode,
): ArenaControlMode {
  return isArenaControlMode(value) ? value : fallback;
}

function isArenaControlMode(value: string | undefined): value is ArenaControlMode {
  return ARENA_CONTROL_MODES.some(mode => mode.id === value);
}
