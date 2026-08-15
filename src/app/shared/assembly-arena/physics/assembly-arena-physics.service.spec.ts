import { createDefaultCombatProfile } from '../../assembly/combat/assembly-combat.models';
import { rotateVectorByQuaternion } from '../../assembly/domain/vector-data';
import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../data/published-dragon-models';
import {
  createFounderDragonGenome,
  generateDragonAssembly,
} from '../../../features/dragon-genetics/simulation/domain/dragon-phenotype-builder';
import { getArenaSetup } from '../data/arena-setups';
import { BattleArenaState } from '../models/arena.models';
import { createCombatant, createPartStatuses } from '../utils/battle-assembly';
import { AssemblyArenaPhysicsService } from './assembly-arena-physics.service';

describe('AssemblyArenaPhysicsService', () => {
  it('keeps battling dragons assembled when a duel begins', () => {
    const genome = createFounderDragonGenome('physics-test-dragon', {
      'body-size': 0.8,
      'wing-span': 0.78,
      'jaw-strength': 0.76,
      'tail-length': 0.7,
      'armor-density': 0.72,
      'pigment-hue': 0.7,
      temperament: 0.8,
    });
    const blueprint = generateDragonAssembly(PUBLISHED_CLASSIC_DRAGON_PRESET.state, genome).blueprint;
    const asset = {
      id: 'physics-test-dragon',
      kind: 'assembly' as const,
      name: 'Physics test dragon',
      description: 'Dragon used by the arena physics regression test.',
      tags: ['dragon'],
      scope: 'built-in' as const,
      schemaVersion: 1 as const,
      assetVersion: 1,
      createdAtIso: '2026-01-01T00:00:00.000Z',
      updatedAtIso: '2026-01-01T00:00:00.000Z',
      compatibleGameIds: ['assembly-arena'],
      authoringTool: 'assembly-garage' as const,
      assembly: blueprint,
      combatProfile: createDefaultCombatProfile(blueprint),
    };
    const setup = getArenaSetup('duel-arena');
    const combatant = createCombatant(
      'red-1',
      asset,
      'red',
      setup.redSpawn,
      'player',
      'dragon-attack',
      setup.redInitialRotation,
    );
    const opponent = createCombatant(
      'blue-1',
      asset,
      'blue',
      setup.blueSpawn,
      'ai',
      'dragon-attack',
      setup.blueInitialRotation,
    );
    const state: BattleArenaState = {
      combatants: [combatant, opponent],
      partStatuses: createPartStatuses([combatant, opponent]),
      isRunning: true,
      winnerId: null,
      elapsedSeconds: 0,
      playMode: 'real-time',
      activeTeam: 'red',
      turnNumber: 1,
      events: [],
      matchId: 1,
      setupStyleId: setup.id,
      setup,
      setupName: setup.name,
      setupDescription: setup.description,
    };
    const service = new AssemblyArenaPhysicsService();
    const brokenPartIds: string[] = [];

    service.rebuild(state);
    for (let frame = 0; frame < 60 * 8; frame += 1) {
      state.elapsedSeconds = frame / 60;
      const result = service.step(state, 1 / 60, {
        'red-1': {
          throttle: 0,
          steer: 0,
          strafe: 0,
          boost: false,
          biteAttack: false,
          wingAttack: false,
          tailAttack: false,
          fireAttack: false,
        },
        'blue-1': {
          throttle: 1,
          steer: 0,
          strafe: 0,
          boost: true,
          biteAttack: true,
          wingAttack: true,
          tailAttack: true,
          fireAttack: false,
        },
      });
      brokenPartIds.push(...result.damageEvents
        .filter(event => event.reason === 'joint break')
        .map(event => event.bodyKey));
    }

    expect(brokenPartIds).withContext(brokenPartIds.join(', ')).toEqual([]);
    for (const dragon of state.combatants) {
      const core = service.getSnapshots().find(snapshot =>
        snapshot.bodyKey === `${dragon.id}:${dragon.corePartId}`,
      );
      expect(core).toBeDefined();
      const up = rotateVectorByQuaternion({ x: 0, y: 1, z: 0 }, core!.quaternion);
      expect(up.y).withContext(`${dragon.id} ended the opening exchange overturned`).toBeGreaterThan(0.5);
    }
  });

  it('self-rights a dragon that has been knocked upside down', () => {
    const asset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const combatant = createCombatant(
      'red-1',
      asset,
      'red',
      { x: setup.redSpawn.x, y: 4, z: setup.redSpawn.z },
      'player',
      'dragon-attack',
      { x: Math.PI, y: 0, z: 0 },
    );
    const state: BattleArenaState = {
      combatants: [combatant],
      partStatuses: createPartStatuses([combatant]),
      isRunning: true,
      winnerId: null,
      elapsedSeconds: 0,
      playMode: 'real-time',
      activeTeam: 'red',
      turnNumber: 1,
      events: [],
      matchId: 2,
      setupStyleId: setup.id,
      setup,
      setupName: setup.name,
      setupDescription: setup.description,
    };
    const service = new AssemblyArenaPhysicsService();

    service.rebuild(state);
    for (let frame = 0; frame < 60 * 6; frame += 1) {
      state.elapsedSeconds = frame / 60;
      service.step(state, 1 / 60, {
        'red-1': {
          throttle: 0,
          steer: 0,
          strafe: 0,
          boost: false,
        },
      });
    }

    const core = service.getSnapshots().find(snapshot =>
      snapshot.bodyKey === `red-1:${combatant.corePartId}`,
    );
    expect(core).toBeDefined();
    const up = rotateVectorByQuaternion({ x: 0, y: 1, z: 0 }, core!.quaternion);
    expect(up.y).toBeGreaterThan(0.75);
    const authoredHeight = asset.assembly.parts
      .find(part => part.id === combatant.corePartId)!.position.y;
    expect(core!.position.y).toBeGreaterThan(authoredHeight * 0.75);
  });

  it('moves the torso forward without using leg contact for locomotion', () => {
    const asset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const combatant = createCombatant(
      'red-1', asset, 'red', setup.redSpawn, 'player', 'dragon-attack', setup.redInitialRotation,
    );
    const state = createTestState(setup, [combatant], 3);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);
    const start = coreSnapshot(service, combatant).position;

    for (let frame = 0; frame < 60 * 2; frame += 1) {
      state.elapsedSeconds = frame / 60;
      service.step(state, 1 / 60, {
        'red-1': { throttle: 1, steer: 0, strafe: 0, boost: false },
      });
    }

    const finish = coreSnapshot(service, combatant);
    const horizontalTravel = Math.hypot(
      finish.position.x - start.x,
      finish.position.z - start.z,
    );
    expect(horizontalTravel)
      .withContext(`start=${JSON.stringify(start)} finish=${JSON.stringify(finish.position)}`)
      .toBeGreaterThan(2);
    const up = rotateVectorByQuaternion({ x: 0, y: 1, z: 0 }, finish.quaternion);
    expect(up.y).toBeGreaterThan(0.5);
    const authoredHeight = asset.assembly.parts
      .find(part => part.id === combatant.corePartId)!.position.y;
    expect(finish.position.y).toBeGreaterThan(authoredHeight * 0.75);
  });

  it('slides a dragon off an opponent it has been dropped on top of', () => {
    const asset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const core = asset.assembly.parts.find(part => part.id === 'classic-dragon-body')!;
    const standing = core.position.y;
    // Stacked: the same spawn point, one torso height apart. This is the pin —
    // before the mount separation the pair simply stayed like this, because
    // dragon-attack mode assigns horizontal velocity outright each frame and
    // discarded whatever separating velocity the contact produced.
    const bottom = createCombatant(
      'red-1', asset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const top = createCombatant(
      'blue-1', asset, 'blue', { x: 0, y: core.dimensions.y * 1.2, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const state = createTestState(setup, [bottom, top], 5);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);

    const idle = { throttle: 0, steer: 0, strafe: 0, boost: false };
    for (let frame = 0; frame < 60 * 3; frame += 1) {
      state.elapsedSeconds = frame / 60;
      service.step(state, 1 / 60, { 'red-1': idle, 'blue-1': idle });
    }

    const bottomCore = coreSnapshot(service, bottom);
    const topCore = coreSnapshot(service, top);
    const rise = topCore.position.y - bottomCore.position.y;
    const apart = Math.hypot(
      topCore.position.x - bottomCore.position.x,
      topCore.position.z - bottomCore.position.z,
    );

    expect(rise)
      .withContext(`still stacked: bottom=${JSON.stringify(bottomCore.position)} top=${JSON.stringify(topCore.position)}`)
      .toBeLessThan(core.dimensions.y);
    // Standing beside each other, not on each other. The pair settle just
    // inside the personal-space floor rather than exactly at it: once the rider
    // is clear of the back the slide disengages and only the soft crowding push
    // remains, which tapers to nothing as the overlap closes.
    expect(apart)
      .withContext(`bottom=${JSON.stringify(bottomCore.position)} top=${JSON.stringify(topCore.position)}`)
      .toBeGreaterThan(core.dimensions.z / 2);
    // Both end the exchange back on their feet rather than one wedged aloft.
    expect(topCore.position.y).toBeLessThan(standing * 1.6);
  });

  it('throws a rider off when the dragon underneath boosts', () => {
    const asset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const core = asset.assembly.parts.find(part => part.id === 'classic-dragon-body')!;
    const bottom = createCombatant(
      'red-1', asset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const top = createCombatant(
      'blue-1', asset, 'blue', { x: 0, y: core.dimensions.y * 1.2, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const state = createTestState(setup, [bottom, top], 6);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);

    const idle = { throttle: 0, steer: 0, strafe: 0, boost: false };
    let fastestThrow = 0;
    for (let frame = 0; frame < 30; frame += 1) {
      state.elapsedSeconds = frame / 60;
      service.step(state, 1 / 60, {
        'red-1': { ...idle, boost: true },
        'blue-1': idle,
      });
      const rider = coreSnapshot(service, top);
      fastestThrow = Math.max(fastestThrow, Math.hypot(rider.velocity.x, rider.velocity.z));
    }

    // The buck is the carrier's answer to being pinned: without it a rider can
    // only ever be waited out.
    expect(fastestThrow).toBeGreaterThan(3);
  });

  it('shakes off a rider that keeps driving back on top', () => {
    // The reported bug, as a test: the challenger held boost permanently, which
    // granted lift on every frame, and drove itself onto the player's back where
    // its own chase velocity kept re-mounting it faster than the slide could
    // separate the pair. The rider here does exactly that — full throttle at
    // the dragon underneath, boost held — and must still end up on the floor.
    const asset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const core = asset.assembly.parts.find(part => part.id === 'classic-dragon-body')!;
    const bottom = createCombatant(
      'red-1', asset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const top = createCombatant(
      'blue-1', asset, 'blue', { x: 0, y: core.dimensions.y * 1.2, z: 0 }, 'ai', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const state = createTestState(setup, [bottom, top], 7);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);

    // The invariant is not "never on top" — a dragon may land on another one,
    // and that is fine. It is that a mount cannot be *held*: no unbroken stretch
    // of riding may outlast the escalating slide and the carrier's shrug.
    let ridingFrames = 0;
    let longestRide = 0;
    for (let frame = 0; frame < 60 * 8; frame += 1) {
      state.elapsedSeconds = frame / 60;
      service.step(state, 1 / 60, {
        'red-1': { throttle: 0, steer: 0, strafe: 0, boost: false },
        'blue-1': { throttle: 1, steer: 0, strafe: 0, boost: true, biteAttack: true },
      });

      const rise = coreSnapshot(service, top).position.y - coreSnapshot(service, bottom).position.y;
      ridingFrames = rise > core.dimensions.y ? ridingFrames + 1 : 0;
      longestRide = Math.max(longestRide, ridingFrames);
    }

    expect(longestRide / 60)
      .withContext(`pinned for ${(longestRide / 60).toFixed(2)}s of a driven re-mount`)
      .toBeLessThan(2);
  });

  it('does not let a held boost turn into a hover', () => {
    // Lift is a wing beat on a cooldown, not a per-frame force. Holding boost
    // must therefore reach a bounded height and come back down rather than
    // climbing for as long as the button is down.
    const asset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const combatant = createCombatant(
      'red-1', asset, 'red', setup.redSpawn, 'player', 'dragon-attack', setup.redInitialRotation,
    );
    const state = createTestState(setup, [combatant], 8);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);

    const standing = asset.assembly.parts.find(part => part.id === combatant.corePartId)!.position.y;
    let peak = 0;
    for (let frame = 0; frame < 60 * 6; frame += 1) {
      state.elapsedSeconds = frame / 60;
      service.step(state, 1 / 60, {
        'red-1': { throttle: 0, steer: 0, strafe: 0, boost: true },
      });
      peak = Math.max(peak, coreSnapshot(service, combatant).position.y);
    }

    expect(peak).withContext('boost never left the ground').toBeGreaterThan(standing);
    expect(peak).withContext(`climbed to ${peak} on held boost`).toBeLessThan(standing * 4);
  });

  it('absorbs most of a hit for a guarding dragon and none for a rolling one', () => {
    const dragonAsset = createScaledDragonAsset();
    const targetAsset = createTargetAsset();
    const setup = getArenaSetup('duel-arena');
    const attacker = createCombatant(
      'red-1', dragonAsset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const defender = createCombatant(
      'blue-1', targetAsset, 'blue', { x: 2.2, y: 1.32, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );

    const bite = (defence: 'none' | 'guard' | 'dodge'): number => {
      const state = createTestState(setup, [attacker, defender], 9);
      const service = new AssemblyArenaPhysicsService();
      service.rebuild(state);
      let total = 0;

      for (let frame = 0; frame < 90; frame += 1) {
        state.elapsedSeconds = 2 + frame / 60;
        const result = service.step(state, 1 / 60, {
          'red-1': { throttle: 0, steer: 0, strafe: 0, boost: false, biteAttack: frame === 0 },
          'blue-1': {
            throttle: 0,
            steer: 0,
            strafe: 0,
            boost: false,
            guard: defence === 'guard',
            // Timed so the invulnerable window covers the strike rather than
            // being thrown early — which is the skill the roll is testing.
            dodge: defence === 'dodge' && frame === 30,
          },
        });
        total += result.damageEvents
          .filter(event => event.reason === 'bite')
          .reduce((sum, event) => sum + event.amount, 0);
      }

      return total;
    };

    const open = bite('none');
    expect(open).withContext('the bite never landed at all').toBeGreaterThan(0);
    expect(bite('guard')).toBeLessThan(open * 0.5);
    expect(bite('dodge')).toBe(0);
  });

  it('knocks a charged dragon down and takes its controls away', () => {
    const dragonAsset = createScaledDragonAsset();
    const setup = getArenaSetup('duel-arena');
    const attacker = createCombatant(
      'red-1', dragonAsset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const defender = createCombatant(
      'blue-1', dragonAsset, 'blue', { x: 3, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: Math.PI, z: 0 },
    );
    const state = createTestState(setup, [attacker, defender], 10);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);
    const reasons: string[] = [];
    let knockedDown = false;

    for (let frame = 0; frame < 60 * 3; frame += 1) {
      state.elapsedSeconds = 2 + frame / 60;
      const result = service.step(state, 1 / 60, {
        'red-1': { throttle: 0, steer: 0, strafe: 0, boost: false, hornCharge: frame === 0 },
        'blue-1': { throttle: 0, steer: 0, strafe: 0, boost: false },
      });
      reasons.push(...result.damageEvents.map(event => event.reason));
      knockedDown ||= (result.defenses ?? [])
        .some(defence => defence.combatantId === 'blue-1' && defence.knockedDown);
    }

    expect(reasons).toContain('horn-charge');
    expect(knockedDown).withContext('the charge landed without putting anyone down').toBe(true);
  });

  it('holds each move to its own cooldown', () => {
    // Every ability has carried a cooldown in the catalog for as long as the
    // catalog has existed and nothing enforced it, so the only limit on a move
    // was its own animation length.
    const dragonAsset = createScaledDragonAsset();
    const targetAsset = createTargetAsset();
    const setup = getArenaSetup('duel-arena');
    const attacker = createCombatant(
      'red-1', dragonAsset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    const target = createCombatant(
      'blue-1', targetAsset, 'blue', { x: 2.2, y: 1.32, z: 0 }, 'static', 'static-target', { x: 0, y: 0, z: 0 },
    );
    const state = createTestState(setup, [attacker, target], 11);
    const service = new AssemblyArenaPhysicsService();
    service.rebuild(state);
    let charges = 0;

    // Six seconds of mashing the charge. At a two-second cooldown that is at
    // most three of them, however many frames requested it.
    for (let frame = 0; frame < 60 * 6; frame += 1) {
      state.elapsedSeconds = 2 + frame / 60;
      const result = service.step(state, 1 / 60, {
        'red-1': { throttle: 0, steer: 0, strafe: 0, boost: false, hornCharge: true },
      });
      charges += result.damageEvents.filter(event => event.reason === 'horn-charge').length;
    }

    expect(charges).toBeGreaterThan(0);
    expect(charges).withContext(`${charges} charges landed in six seconds`).toBeLessThanOrEqual(3);
  });

  it('runs a timed bite pose and hit without requiring limb contact', () => {
    const dragonAsset = createScaledDragonAsset();
    const targetAsset = createTargetAsset();
    const setup = getArenaSetup('duel-arena');
    const dragon = createCombatant(
      'red-1', dragonAsset, 'red', { x: 0, y: 0, z: 0 }, 'player', 'dragon-attack', { x: 0, y: 0, z: 0 },
    );
    // Clear of the dragon's own torso, so the only damage it can take is the
    // bite: parked inside the body it just gets shoved out, logging impacts.
    const target = createCombatant(
      'blue-1', targetAsset, 'blue', { x: 2.2, y: 1.32, z: 0 }, 'static', 'static-target', { x: 0, y: 0, z: 0 },
    );
    const state = createTestState(setup, [dragon, target], 4);
    const service = new AssemblyArenaPhysicsService();
    const posePhases: number[] = [];
    const damageReasons: string[] = [];
    const biteTargets: string[] = [];
    let strongestTargetReaction = 0;
    service.rebuild(state);

    // Attack anatomy is render/hit-volume only. With no limb bodies in the
    // world, legs, head, jaws, and claws cannot contact the arena surface.
    const dragonPhysicsBodies = service.getSnapshots()
      .filter(snapshot => snapshot.combatantId === dragon.id);
    expect(dragonPhysicsBodies.map(snapshot => snapshot.sourcePartId)).toEqual([dragon.corePartId]);

    for (let frame = 0; frame < 60; frame += 1) {
      state.elapsedSeconds = 2 + frame / 60;
      const result = service.step(state, 1 / 60, {
        'red-1': {
          throttle: 0,
          steer: 0,
          strafe: 0,
          boost: false,
          biteAttack: frame === 0,
        },
      });
      posePhases.push(...(result.attackPoses ?? [])
        .filter(pose => pose.combatantId === 'red-1' && pose.ability === 'bite')
        .map(pose => pose.phase));
      damageReasons.push(...result.damageEvents.map(event => event.reason));
      biteTargets.push(...result.damageEvents
        .filter(event => event.reason === 'bite')
        .map(event => event.bodyKey));
      const targetSnapshot = service.getSnapshots()
        .find(snapshot => snapshot.combatantId === target.id)!;
      strongestTargetReaction = Math.max(
        strongestTargetReaction,
        Math.hypot(targetSnapshot.velocity.x, targetSnapshot.velocity.z),
      );
    }

    expect(posePhases.length).toBeGreaterThan(20);
    expect(Math.max(...posePhases)).toBeGreaterThan(0.75);
    expect(damageReasons).toContain('bite');
    expect(biteTargets).toEqual([`${target.id}:${target.corePartId}`]);
    expect(strongestTargetReaction).toBeGreaterThan(0.1);
  });
});

function createTestState(
  setup: ReturnType<typeof getArenaSetup>,
  combatants: ReturnType<typeof createCombatant>[],
  matchId: number,
): BattleArenaState {
  return {
    combatants,
    partStatuses: createPartStatuses(combatants),
    isRunning: true,
    winnerId: null,
    elapsedSeconds: 0,
    playMode: 'real-time',
    activeTeam: 'red',
    turnNumber: 1,
    events: [],
    matchId,
    setupStyleId: setup.id,
    setup,
    setupName: setup.name,
    setupDescription: setup.description,
  };
}

function coreSnapshot(
  service: AssemblyArenaPhysicsService,
  combatant: ReturnType<typeof createCombatant>,
) {
  return service.getSnapshots().find(snapshot =>
    snapshot.bodyKey === `${combatant.id}:${combatant.corePartId}`,
  )!;
}

function createScaledDragonAsset() {
  const genome = createFounderDragonGenome('self-righting-test-dragon', {
    'body-size': 0.8,
    'wing-span': 0.78,
    'jaw-strength': 0.76,
    'tail-length': 0.7,
    'armor-density': 0.72,
    'pigment-hue': 0.7,
    temperament: 0.8,
  });
  const blueprint = generateDragonAssembly(PUBLISHED_CLASSIC_DRAGON_PRESET.state, genome).blueprint;
  return {
    id: 'self-righting-test-dragon',
    kind: 'assembly' as const,
    name: 'Self-righting test dragon',
    description: 'Dragon used by the arena physics regression test.',
    tags: ['dragon'],
    scope: 'built-in' as const,
    schemaVersion: 1 as const,
    assetVersion: 1,
    createdAtIso: '2026-01-01T00:00:00.000Z',
    updatedAtIso: '2026-01-01T00:00:00.000Z',
    compatibleGameIds: ['assembly-arena'],
    authoringTool: 'assembly-garage' as const,
    assembly: blueprint,
    combatProfile: createDefaultCombatProfile(blueprint),
  };
}

function createTargetAsset() {
  const blueprint = {
    parts: [{
      id: 'target-core',
      label: 'Target core',
      roles: ['core' as const],
      shape: 'box' as const,
      dimensions: { x: 0.2, y: 0.2, z: 0.2 },
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      color: '#64748b',
    }],
    joints: [],
  };
  return {
    id: 'scripted-hit-target',
    kind: 'assembly' as const,
    name: 'Scripted hit target',
    description: 'Small target that does not physically touch the attacking limbs.',
    tags: ['target'],
    scope: 'built-in' as const,
    schemaVersion: 1 as const,
    assetVersion: 1,
    createdAtIso: '2026-01-01T00:00:00.000Z',
    updatedAtIso: '2026-01-01T00:00:00.000Z',
    compatibleGameIds: ['assembly-arena'],
    authoringTool: 'assembly-garage' as const,
    assembly: blueprint,
    combatProfile: createDefaultCombatProfile(blueprint),
  };
}
