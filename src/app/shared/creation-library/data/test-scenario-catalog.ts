import { CreationTestScenarioDefinition } from '../models/test-scenario.models';

export const TEST_SCENARIO_CATALOG = [
  {
    id: 'duel-arena',
    name: 'Duel Arena',
    description: 'Open box arena for robot-versus-car or bot-versus-bot survival.',
    kind: 'battle',
    tags: ['battle', 'arena', 'robot', 'car'],
    compatibleGameIds: ['assembly-arena'],
    environment: {
      floorSize: { x: 12, y: 0.12, z: 9 },
      wallHeight: 0.9,
      obstacles: [],
    },
    participants: [
      participant('red', 'Red', 'robot-load', { x: -2.4, y: 0, z: 0 }, 'player', 'shove-drive'),
      // Face the red combatant: assemblies are authored facing +x.
      participant('blue', 'Blue', 'car-load', { x: 2.4, y: 0, z: 0 }, 'ai', 'ai-hunter', { x: 0, y: Math.PI, z: 0 }),
    ],
    winCondition: { type: 'core-survival' },
    physics: {
      damageEnabled: true,
      jointBreakageEnabled: true,
    },
  },
  {
    id: 'dragon-duel-ring',
    name: 'Dragon Duel Ring',
    description: 'The Berk training ring, sized for two full-grown dragons to circle each other.',
    kind: 'battle',
    tags: ['battle', 'arena', 'dragon'],
    compatibleGameIds: ['assembly-arena'],
    environment: {
      /*
       * Square, so the round pit the renderer draws is inscribed exactly and
       * every stretch of sand has palisade behind it.
       *
       * The size is set off the animal rather than chosen: a grown dragon is
       * roughly six units nose to tail and five across the wings, so a ring
       * this wide is a little over three body lengths across. The old duel
       * arena was nine — barely more than one — which is why two dragons
       * spawned already inside one another and fought by shoving.
       */
      floorSize: { x: 21, y: 0.12, z: 21 },
      // Tall enough to read as an enclosure beside a standing dragon; the
      // palisade is drawn at 1.7x this and the gallery rides on top of it.
      wallHeight: 2.2,
      // Fight inside the palisade that is drawn, not the rectangle behind it.
      ringBoundary: true,
      obstacles: [],
    },
    participants: [
      participant('red', 'Champion', 'classic-dragon-test', { x: -5.4, y: 0, z: 0 }, 'player', 'dragon-attack'),
      // Face the red combatant: assemblies are authored facing +x.
      participant('blue', 'Challenger', 'classic-dragon-test', { x: 5.4, y: 0, z: 0 }, 'ai', 'dragon-attack', { x: 0, y: Math.PI, z: 0 }),
    ],
    winCondition: { type: 'core-survival' },
    physics: {
      damageEnabled: true,
      jointBreakageEnabled: true,
    },
  },
  {
    id: 'car-crash-test',
    name: 'Car Crash Test',
    description: 'A narrow lane with a rigid crash wall and static target car for impact tuning.',
    kind: 'practice',
    tags: ['car', 'crash-test', 'impact', 'arena'],
    compatibleGameIds: ['assembly-arena', 'racecar'],
    environment: {
      floorSize: { x: 14, y: 0.12, z: 4 },
      wallHeight: 0.75,
      obstacles: [
        obstacle('crash-wall', 'Crash Wall', { x: 0.85, y: 0.65, z: 0 }, { x: 0.28, y: 1.3, z: 3.2 }, '#475569', 'wall'),
        obstacle('lane-marker-left', 'Left Lane Bumper', { x: -1.6, y: 0.18, z: -1.35 }, { x: 2.6, y: 0.36, z: 0.18 }, '#f59e0b', 'rail'),
        obstacle('lane-marker-right', 'Right Lane Bumper', { x: -1.6, y: 0.18, z: 1.35 }, { x: 2.6, y: 0.36, z: 0.18 }, '#f59e0b', 'rail'),
      ],
    },
    participants: [
      participant('red', 'Red Car', 'car-load', { x: -4.7, y: 0, z: 0 }, 'player', 'vehicle-drive'),
      participant('blue', 'Target Car', 'car-load', { x: 3.8, y: 0, z: 0 }, 'static', 'static-target', { x: 0, y: Math.PI, z: 0 }),
    ],
    winCondition: { type: 'core-survival' },
    physics: {
      damageEnabled: true,
      jointBreakageEnabled: true,
    },
  },
  {
    id: 'robot-righting',
    name: 'Robot Righting',
    description: 'A practice platform with low rails and a tipped robot using recovery controls.',
    kind: 'practice',
    tags: ['robot', 'righting', 'balance', 'arena'],
    compatibleGameIds: ['assembly-arena'],
    environment: {
      floorSize: { x: 9, y: 0.12, z: 7 },
      wallHeight: 0.55,
      obstacles: [
        obstacle('righting-rail-left', 'Left Recovery Rail', { x: -1.2, y: 0.22, z: -1.35 }, { x: 2.4, y: 0.42, z: 0.22 }, '#14b8a6', 'rail'),
        obstacle('righting-rail-right', 'Right Recovery Rail', { x: -1.2, y: 0.22, z: 1.35 }, { x: 2.4, y: 0.42, z: 0.22 }, '#14b8a6', 'rail'),
        obstacle('balance-block', 'Balance Block', { x: 0.35, y: 0.3, z: 0 }, { x: 0.42, y: 0.6, z: 1.2 }, '#64748b', 'hazard'),
      ],
    },
    participants: [
      participant('red', 'Tipped Robot', 'robot-load', { x: -1.2, y: 0, z: 0 }, 'player', 'righting-assist', { x: 0, y: 0, z: Math.PI / 2 }),
      participant('blue', 'Static Robot', 'robot-load', { x: 2.6, y: 0, z: 0 }, 'static', 'static-target'),
    ],
    winCondition: { type: 'practice-open' },
    physics: {
      damageEnabled: false,
      jointBreakageEnabled: false,
    },
  },
  {
    id: 'dragon-wing-test',
    name: 'Dragon Wing Test',
    description: 'A wide practice pad for watching catalog dragon wing motors, tail hinges, and break-force behavior.',
    kind: 'practice',
    tags: ['dragon', 'wing', 'tail', 'arena'],
    compatibleGameIds: ['assembly-arena'],
    environment: {
      floorSize: { x: 14, y: 0.12, z: 10 },
      wallHeight: 0.65,
      obstacles: [
        obstacle('wing-test-marker-left', 'Left Marker', { x: -2.6, y: 0.03, z: -2.1 }, { x: 1.4, y: 0.06, z: 0.12 }, '#8b5cf6', 'marker'),
        obstacle('wing-test-marker-right', 'Right Marker', { x: -2.6, y: 0.03, z: 2.1 }, { x: 1.4, y: 0.06, z: 0.12 }, '#8b5cf6', 'marker'),
      ],
    },
    participants: [
      participant('red', 'Test Dragon', 'classic-dragon-test', { x: -2.6, y: 0, z: 0 }, 'player', 'dragon-attack'),
      participant('blue', 'Target Car', 'car-load', { x: 3.2, y: 0, z: 0 }, 'static', 'static-target', { x: 0, y: Math.PI, z: 0 }),
    ],
    winCondition: { type: 'practice-open' },
    physics: {
      damageEnabled: false,
      jointBreakageEnabled: false,
    },
  },
  {
    id: 'pinewood-derby-test',
    name: 'Pinewood Derby Test',
    description: 'A gravity race lane with a sloped start ramp, rails, and a finish line for suspension tuning.',
    kind: 'race',
    tags: ['car', 'race', 'derby', 'ramp', 'suspension'],
    compatibleGameIds: ['assembly-arena', 'racecar'],
    environment: {
      floorSize: { x: 12, y: 0.12, z: 6.4 },
      wallHeight: 0.36,
      obstacles: [
        obstacle('derby-ramp', 'Derby Ramp', { x: -0.7, y: 0.52, z: 0 }, { x: 9, y: 0.12, z: 4.8 }, '#94a3b8', 'ramp', { x: 0, y: 0, z: -0.12 }),
        obstacle('derby-left-rail', 'Left Derby Rail', { x: -0.7, y: 0.66, z: -1.8 }, { x: 8.5, y: 0.14, z: 0.08 }, '#0f766e', 'rail', { x: 0, y: 0, z: -0.12 }),
        obstacle('derby-center-rail', 'Center Derby Rail', { x: -0.7, y: 0.66, z: 0 }, { x: 8.5, y: 0.14, z: 0.08 }, '#0f766e', 'rail', { x: 0, y: 0, z: -0.12 }),
        obstacle('derby-right-rail', 'Right Derby Rail', { x: -0.7, y: 0.66, z: 1.8 }, { x: 8.5, y: 0.14, z: 0.08 }, '#0f766e', 'rail', { x: 0, y: 0, z: -0.12 }),
        obstacle('derby-finish-line', 'Finish Line', { x: 4.25, y: 0.04, z: 0 }, { x: 0.08, y: 0.08, z: 4.8 }, '#f8fafc', 'marker'),
      ],
    },
    participants: [
      participant('red', 'Red Derby Car', 'pinewood-derby-car', { x: -4.2, y: 0.96, z: -0.9 }, 'static', 'static-target'),
      participant('blue', 'Blue Derby Car', 'pinewood-derby-car', { x: -4.2, y: 0.96, z: 0.9 }, 'static', 'static-target'),
    ],
    winCondition: { type: 'finish-line', finishX: 4.25 },
    physics: {
      damageEnabled: false,
      jointBreakageEnabled: false,
      floorFriction: 0.55,
      floorRestitution: 0.02,
    },
  },
] as const satisfies readonly CreationTestScenarioDefinition[];

function participant(
  team: 'red' | 'blue',
  name: string,
  defaultAssemblyAssetId: string,
  spawnPosition: CreationTestScenarioDefinition['participants'][number]['spawnPosition'],
  controllerRole: CreationTestScenarioDefinition['participants'][number]['controllerRole'],
  defaultControlMode?: string,
  initialRotation = { x: 0, y: 0, z: 0 },
): CreationTestScenarioDefinition['participants'][number] {
  return {
    slotId: team,
    team,
    name,
    defaultAssemblyAssetId,
    spawnPosition,
    initialRotation,
    controllerRole,
    defaultControlMode,
  };
}

function obstacle(
  id: string,
  label: string,
  position: CreationTestScenarioDefinition['environment']['obstacles'][number]['position'],
  size: CreationTestScenarioDefinition['environment']['obstacles'][number]['size'],
  color: string,
  surface: CreationTestScenarioDefinition['environment']['obstacles'][number]['surface'],
  rotation?: CreationTestScenarioDefinition['environment']['obstacles'][number]['rotation'],
): CreationTestScenarioDefinition['environment']['obstacles'][number] {
  return {
    id,
    label,
    position,
    size,
    rotation,
    color,
    surface,
  };
}
