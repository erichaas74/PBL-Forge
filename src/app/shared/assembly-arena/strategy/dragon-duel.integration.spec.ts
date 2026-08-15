import { createDefaultCombatProfile } from '../../assembly/combat/assembly-combat.models';
import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../data/published-dragon-models';
import {
  createFounderDragonGenome,
  generateDragonAssembly,
} from '../../../features/dragon-genetics/simulation/domain/dragon-phenotype-builder';
import { getArenaSetup } from '../data/arena-setups';
import {
  BattleArenaState,
  MoveLicenseByCombatant,
} from '../models/arena.models';
import { AssemblyArenaPhysicsService } from '../physics/assembly-arena-physics.service';
import { createCombatant, createPartStatuses } from '../utils/battle-assembly';
import { getStrategyPreset } from './strategy-presets';
import { buildControlFrames, NEUTRAL_CONTROL_FRAME } from './strategy-runner';

/**
 * The challenger, end to end.
 *
 * The reported bug was that the AI dragon "just jumps on top and can't be
 * shaken off, not many attacks and no defence". Every part of that had a cause
 * a unit test could not see, because each piece worked in isolation:
 *
 * - attack ranges budgeted for the attacker's torso but not the target's, so no
 *   melee move could reach an opponent's core at all;
 * - the distance sensor reported centre to centre, so every `if-distance-less`
 *   threshold in the AI program was below the closest two dragons could get;
 * - which left `chase` as the only block that ever fired, and boost granting
 *   lift on every frame, so the challenger ran at the player, took off, and
 *   landed on them.
 *
 * This runs the real preset through the real physics and asserts the fight
 * actually happens. It is deliberately behavioural: it does not care which move
 * lands, only that the challenger fights instead of climbing.
 */
function dragonAsset(id: string) {
  const genome = createFounderDragonGenome(id, {
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
    id,
    kind: 'assembly' as const,
    name: id,
    description: 'Dragon used by the duel integration test.',
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

interface DuelResult {
  reasons: string[];
  longestRideSeconds: number;
  /** Fraction of the fight the challenger spent standing on the player. */
  ridingShare: number;
  closestGap: number;
}

function runDuel(licenses: MoveLicenseByCombatant, seconds = 20): DuelResult {
  const asset = dragonAsset('duel-dragon');
  const setup = getArenaSetup('duel-arena');
  const player = createCombatant(
    'red-1', asset, 'red', setup.redSpawn, 'player', 'dragon-attack', setup.redInitialRotation,
  );
  const challenger = createCombatant(
    'blue-1', asset, 'blue', setup.blueSpawn, 'ai', 'dragon-attack', setup.blueInitialRotation,
  );
  const state: BattleArenaState = {
    combatants: [player, challenger],
    partStatuses: createPartStatuses([player, challenger]),
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
  const physics = new AssemblyArenaPhysicsService();
  physics.rebuild(state);

  const programs = {
    'red-1': getStrategyPreset('static-target'),
    'blue-1': getStrategyPreset('dragon-attack-combo'),
  };
  const result: DuelResult = {
    reasons: [],
    longestRideSeconds: 0,
    ridingShare: 0,
    closestGap: Infinity,
  };
  const core = asset.assembly.parts.find(part => part.id === player.corePartId)!;
  let ridingFrames = 0;
  let totalRidingFrames = 0;

  for (let frame = 0; frame < 60 * seconds; frame += 1) {
    state.elapsedSeconds = frame / 60;
    const snapshots = physics.getSnapshots();
    // The player stands still and does nothing at all. Whatever happens is the
    // challenger's doing.
    const frames = buildControlFrames(
      state,
      snapshots,
      programs,
      { ...NEUTRAL_CONTROL_FRAME },
      {},
      { awareness: physics.getCombatAwareness(state), licenses },
    );
    const step = physics.step(state, 1 / 60, frames);
    result.reasons.push(...step.damageEvents.map(event => event.reason));

    const red = physics.getSnapshots().find(item => item.combatantId === 'red-1')!;
    const blue = physics.getSnapshots().find(item => item.combatantId === 'blue-1')!;
    result.closestGap = Math.min(
      result.closestGap,
      Math.hypot(blue.position.x - red.position.x, blue.position.z - red.position.z),
    );
    /*
     * "Riding" is the physics service's own mount test, not a bare height
     * difference. A dragon that is briefly higher than its opponent — knocked
     * up by a hit, mid-leap, scrambling past a flank — is not pinning anybody,
     * and counting it as a pin measures the wrong thing. What the player felt,
     * and what this asserts on, is a rider inside the carrier's footprint with
     * its weight on top: a mount the carrier has to get out from under.
     */
    const riding = blue.position.y - red.position.y > core.dimensions.y
      && physics.getCombatAwareness(state)['blue-1'].mounted;
    ridingFrames = riding ? ridingFrames + 1 : 0;
    totalRidingFrames += riding ? 1 : 0;
    result.longestRideSeconds = Math.max(result.longestRideSeconds, ridingFrames / 60);
  }

  result.ridingShare = totalRidingFrames / (60 * seconds);
  return result;
}

const EVERY_MOVE: MoveLicenseByCombatant = {
  'red-1': { wings: true, fire: true, horns: true },
  'blue-1': { wings: true, fire: true, horns: true },
};

describe('dragon duel', () => {
  it('lands real attacks on a player who is standing still', () => {
    const duel = runDuel(EVERY_MOVE);
    const attacks = duel.reasons.filter(reason => reason !== 'impact' && reason !== 'out of bounds');

    expect(duel.closestGap)
      .withContext('the challenger never even closed the distance')
      .toBeLessThan(5);
    expect(attacks.length)
      .withContext(`only saw: ${[...new Set(duel.reasons)].join(', ')}`)
      .toBeGreaterThan(0);
  });

  it('uses more than one move rather than running the same attack forever', () => {
    const duel = runDuel(EVERY_MOVE);
    const moves = new Set(duel.reasons.filter(reason =>
      reason !== 'impact' && reason !== 'out of bounds' && reason !== 'pinned'));

    expect(moves.size)
      .withContext(`only used: ${[...moves].join(', ')}`)
      .toBeGreaterThan(1);
  });

  it('never holds the player pinned underneath it', () => {
    const duel = runDuel(EVERY_MOVE);

    expect(duel.longestRideSeconds)
      .withContext(`sat on the player for ${duel.longestRideSeconds.toFixed(2)}s`)
      .toBeLessThan(2);
    // Not just "gets off eventually": climbing has to be a rare accident in a
    // fight rather than the thing the challenger spends the fight doing.
    expect(duel.ridingShare)
      .withContext(`spent ${(duel.ridingShare * 100).toFixed(0)}% of the duel on top of the player`)
      .toBeLessThan(0.2);
  });

  it('leaves a wingless, hornless challenger only the moves it inherited', () => {
    // The genotype gate, seen from the fight rather than from the UI: with no W
    // and no H there is no buffet, no charge, no brace and no roll, and the
    // challenger has to win on claws, jaws and tail alone.
    const duel = runDuel({
      'red-1': { wings: true, fire: true, horns: true },
      'blue-1': { wings: false, fire: false, horns: false },
    });
    const moves = new Set(duel.reasons);

    expect(moves.has('wing-buffet')).toBe(false);
    expect(moves.has('horn-charge')).toBe(false);
    expect(moves.has('fire breath')).toBe(false);
  });
});
