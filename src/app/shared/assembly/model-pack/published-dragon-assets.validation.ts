import { CreationScenarioParticipant, CreationStaticObstacle, CreationTestScenarioDefinition } from '../../creation-library/models/test-scenario.models';
import { Vector3Data } from '../domain/assembly.models';
import { parseDragonModelPack } from './dragon-model-pack.validation';
import { PublishedDragonAssetsV1 } from './published-dragon-assets.models';

export function parsePublishedDragonAssets(input: unknown): PublishedDragonAssetsV1 {
  const value = record(input, 'Published dragon assets');
  if (value['schemaVersion'] !== 1) throw new Error('Unsupported published dragon assets schema.');
  const result: PublishedDragonAssetsV1 = {
    schemaVersion: 1,
    versionId: safeId(value['versionId'], 'versionId'),
    modelPack: parseDragonModelPack(value['modelPack']),
    arenaScenario: parseDragonArenaScenario(value['arenaScenario']),
    publishedBy: nonEmptyString(value['publishedBy'], 'publishedBy', 128),
    publishedAt: value['publishedAt'] ?? null,
    releaseNotes: stringValue(value['releaseNotes'], 'releaseNotes', 500),
  };
  const size = JSON.stringify({ ...result, publishedAt: null }).length;
  if (size > 850_000) throw new Error('Published dragon assets exceed the safe Firestore payload budget.');
  return result;
}

export function parseDragonArenaScenario(input: unknown): CreationTestScenarioDefinition {
  const value = record(input, 'arenaScenario');
  if (value['id'] !== 'dragon-duel-ring') throw new Error('Arena ID must be dragon-duel-ring.');
  const kind = nonEmptyString(value['kind'], 'arenaScenario.kind', 20);
  if (!['battle', 'practice', 'challenge'].includes(kind)) throw new Error('Unsupported dragon arena kind.');
  const environment = record(value['environment'], 'arenaScenario.environment');
  const obstacles = array(environment['obstacles'], 'arenaScenario.environment.obstacles');
  if (obstacles.length > 40) throw new Error('Dragon arena supports at most 40 obstacles.');
  const participants = array(value['participants'], 'arenaScenario.participants')
    .map((participant, index) => parseParticipant(participant, index));
  if (!participants.some(item => item.team === 'red') || !participants.some(item => item.team === 'blue')) {
    throw new Error('Dragon arena requires red and blue participants.');
  }
  const winCondition = record(value['winCondition'], 'arenaScenario.winCondition');
  if (winCondition['type'] !== 'core-survival' && winCondition['type'] !== 'practice-open') {
    throw new Error('Dragon arena win condition must be core-survival or practice-open.');
  }
  const physicsValue = value['physics'] === undefined ? undefined : record(value['physics'], 'arenaScenario.physics');
  return {
    id: 'dragon-duel-ring',
    name: nonEmptyString(value['name'], 'arenaScenario.name', 80),
    description: stringValue(value['description'], 'arenaScenario.description', 500),
    kind: kind as CreationTestScenarioDefinition['kind'],
    tags: stringArray(value['tags'], 'arenaScenario.tags', 20),
    compatibleGameIds: optionalStringArray(value['compatibleGameIds'], 'arenaScenario.compatibleGameIds', 10),
    environment: {
      floorSize: positiveVector(environment['floorSize'], 'arenaScenario.environment.floorSize', 100),
      wallHeight: boundedNumber(environment['wallHeight'], 'arenaScenario.environment.wallHeight', 0.1, 20),
      ringBoundary: environment['ringBoundary'] === true,
      obstacles: obstacles.map((obstacle, index) => parseObstacle(obstacle, index)),
    },
    participants,
    winCondition: { type: winCondition['type'] as 'core-survival' | 'practice-open' },
    physics: physicsValue ? {
      gravity: physicsValue['gravity'] === undefined ? undefined : vector(physicsValue['gravity'], 'arenaScenario.physics.gravity', 100),
      floorFriction: optionalBoundedNumber(physicsValue['floorFriction'], 'arenaScenario.physics.floorFriction', 0, 5),
      floorRestitution: optionalBoundedNumber(physicsValue['floorRestitution'], 'arenaScenario.physics.floorRestitution', 0, 1),
      damageEnabled: optionalBoolean(physicsValue['damageEnabled'], 'arenaScenario.physics.damageEnabled'),
      jointBreakageEnabled: optionalBoolean(physicsValue['jointBreakageEnabled'], 'arenaScenario.physics.jointBreakageEnabled'),
    } : undefined,
  };
}

function parseParticipant(input: unknown, index: number): CreationScenarioParticipant {
  const value = record(input, `participants[${index}]`);
  const controller = nonEmptyString(value['controllerRole'], `participants[${index}].controllerRole`, 20);
  if (!['player', 'ai', 'static'].includes(controller)) throw new Error('Invalid arena controller role.');
  return {
    slotId: safeId(value['slotId'], `participants[${index}].slotId`),
    team: nonEmptyString(value['team'], `participants[${index}].team`, 20),
    name: nonEmptyString(value['name'], `participants[${index}].name`, 80),
    defaultAssemblyAssetId: safeId(value['defaultAssemblyAssetId'], `participants[${index}].defaultAssemblyAssetId`),
    spawnPosition: vector(value['spawnPosition'], `participants[${index}].spawnPosition`, 100),
    initialRotation: vector(value['initialRotation'], `participants[${index}].initialRotation`, Math.PI * 4),
    controllerRole: controller as CreationScenarioParticipant['controllerRole'],
    defaultControlMode: value['defaultControlMode'] === undefined
      ? undefined : safeId(value['defaultControlMode'], `participants[${index}].defaultControlMode`),
  };
}

function parseObstacle(input: unknown, index: number): CreationStaticObstacle {
  const value = record(input, `obstacles[${index}]`);
  const surface = value['surface'];
  if (surface !== undefined && !['floor', 'ramp', 'rail', 'wall', 'marker', 'hazard'].includes(surface as string)) {
    throw new Error(`obstacles[${index}].surface is invalid.`);
  }
  return {
    id: safeId(value['id'], `obstacles[${index}].id`),
    label: nonEmptyString(value['label'], `obstacles[${index}].label`, 80),
    position: vector(value['position'], `obstacles[${index}].position`, 100),
    size: positiveVector(value['size'], `obstacles[${index}].size`, 100),
    rotation: value['rotation'] === undefined ? undefined : vector(value['rotation'], `obstacles[${index}].rotation`, Math.PI * 4),
    color: /^#[0-9a-f]{6}$/i.test(String(value['color'])) ? String(value['color']) : '#64748b',
    surface: surface as CreationStaticObstacle['surface'],
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function array(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) throw new Error(`${label} must be an array.`); return value; }
function stringValue(value: unknown, label: string, max: number): string { if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be a string of at most ${max} characters.`); return value; }
function nonEmptyString(value: unknown, label: string, max: number): string { const text = stringValue(value, label, max).trim(); if (!text) throw new Error(`${label} cannot be empty.`); return text; }
function safeId(value: unknown, label: string): string { const id = nonEmptyString(value, label, 100); if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error(`${label} contains unsafe characters.`); return id; }
function finite(value: unknown, label: string): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite.`); return value; }
function boundedNumber(value: unknown, label: string, min: number, max: number): number { const number = finite(value, label); if (number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}.`); return number; }
function optionalBoundedNumber(value: unknown, label: string, min: number, max: number): number | undefined { return value === undefined ? undefined : boundedNumber(value, label, min, max); }
function vector(value: unknown, label: string, limit: number): Vector3Data { const item = record(value, label); return { x: boundedNumber(item['x'], `${label}.x`, -limit, limit), y: boundedNumber(item['y'], `${label}.y`, -limit, limit), z: boundedNumber(item['z'], `${label}.z`, -limit, limit) }; }
function positiveVector(value: unknown, label: string, max: number): Vector3Data { const item = record(value, label); return { x: boundedNumber(item['x'], `${label}.x`, 0.01, max), y: boundedNumber(item['y'], `${label}.y`, 0.01, max), z: boundedNumber(item['z'], `${label}.z`, 0.01, max) }; }
function optionalBoolean(value: unknown, label: string): boolean | undefined { if (value === undefined) return undefined; if (typeof value !== 'boolean') throw new Error(`${label} must be boolean.`); return value; }
function stringArray(value: unknown, label: string, max: number): string[] { const items = array(value, label); if (items.length > max) throw new Error(`${label} has too many entries.`); return items.map((item, index) => nonEmptyString(item, `${label}[${index}]`, 80)); }
function optionalStringArray(value: unknown, label: string, max: number): string[] | undefined { return value === undefined ? undefined : stringArray(value, label, max); }
