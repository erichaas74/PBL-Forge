import { rotateVectorByQuaternion } from '../../assembly/domain/vector-data';
import {
  ArenaControlFrame,
  BattleArenaState,
  BattleBodySnapshot,
  BattleCombatant,
  BattleCombatantAwareness,
  CombatAwarenessByCombatant,
  CombatantMoveLicense,
  ControlFrameByCombatant,
  MoveLicenseByCombatant,
} from '../models/arena.models';
import {
  coreHalfExtents,
  getBodyKey,
  horizontalTorsoSupport,
} from '../utils/battle-assembly';
import {
  ControllerProgram,
  StrategyAction,
  StrategyBlock,
  StrategySensors,
} from './strategy.models';
import { getStrategyPreset } from './strategy-presets';

interface SensorMemory {
  lastElapsedSeconds: number;
  stuckSeconds: number;
  upsideDownSeconds: number;
}

export const NEUTRAL_CONTROL_FRAME: ArenaControlFrame = {
  throttle: 0,
  steer: 0,
  strafe: 0,
  boost: false,
  biteAttack: false,
  clawAttack: false,
  wingAttack: false,
  tailAttack: false,
  hornCharge: false,
  fireAttack: false,
  guard: false,
  dodge: false,
};

/** Every dragon can do these, whatever it inherited. */
const UNGATED_MOVES: readonly StrategyAction[] = ['bite', 'claw-rake', 'tail-sweep'];

const sensorMemory = new Map<string, SensorMemory>();

/**
 * Live combat context. Optional throughout: the assembly sandbox drives arenas
 * with creations that were never bred and have no genome to gate against, and
 * it must keep working exactly as it does today.
 */
export interface ControlFrameContext {
  /** What each combatant is doing right now, from the physics service. */
  awareness?: CombatAwarenessByCombatant;
  /** Which moves each combatant's genotype permits. */
  licenses?: MoveLicenseByCombatant;
}

export function buildControlFrames(
  state: BattleArenaState,
  snapshots: BattleBodySnapshot[],
  programsByCombatant: Record<string, ControllerProgram>,
  manualControls: ArenaControlFrame,
  overrideControlsByCombatant: ControlFrameByCombatant = {},
  context: ControlFrameContext = {},
): ControlFrameByCombatant {
  const frames: ControlFrameByCombatant = {};

  for (const combatant of state.combatants) {
    if (state.playMode === 'turn-based' && combatant.team !== state.activeTeam) {
      frames[combatant.id] = cloneFrame(NEUTRAL_CONTROL_FRAME);
      continue;
    }

    const fallbackProgram = combatant.controlMode === 'static-target'
      ? getStrategyPreset('static-target')
      : getStrategyPreset('manual-keyboard');
    const program = programsByCombatant[combatant.id] ?? fallbackProgram;
    const sensors = buildSensors(state, snapshots, combatant.id, context);
    const programFrame = runControllerProgram(program, sensors, manualControls);
    const baseFrame = combatant.controller === 'player'
      ? mergeManualOverride(programFrame, manualControls)
      : programFrame;
    const merged = overrideControlsByCombatant[combatant.id]
      ? mergeManualOverride(baseFrame, overrideControlsByCombatant[combatant.id])
      : baseFrame;

    // Gating is applied last, to every controller alike. Doing it in the UI
    // only — which is where the wing and fire rules used to live — left the AI
    // free to breathe fire it had never inherited.
    frames[combatant.id] = applyMoveLicense(merged, context.licenses?.[combatant.id]);
  }

  return frames;
}

/**
 * Strips moves the combatant's genotype does not grant.
 *
 * A missing licence means "nothing on file", not "nothing allowed": creations
 * from the garage have no genome and keep every move.
 */
export function applyMoveLicense(
  frame: ArenaControlFrame,
  license: CombatantMoveLicense | undefined,
): ArenaControlFrame {
  if (!license) return frame;

  return {
    ...frame,
    wingAttack: frame.wingAttack && license.wings,
    fireAttack: frame.fireAttack && license.fire,
    hornCharge: frame.hornCharge && license.horns,
    guard: frame.guard && license.horns,
    dodge: frame.dodge && license.wings,
  };
}

/** The moves a licence grants, named the way a strategy block names them. */
export function licensedMoves(license: CombatantMoveLicense | undefined): StrategyAction[] {
  if (!license) {
    return [...UNGATED_MOVES, 'wing-buffet', 'fire-breath', 'horn-charge', 'guard', 'dodge'];
  }

  return [
    ...UNGATED_MOVES,
    ...(license.wings ? (['wing-buffet', 'dodge'] as const) : []),
    ...(license.fire ? (['fire-breath'] as const) : []),
    ...(license.horns ? (['horn-charge', 'guard'] as const) : []),
  ];
}

export function createActionControlFrame(
  sensors: StrategySensors,
  action: StrategyAction,
  amount: number,
): ArenaControlFrame {
  return applyAction(cloneFrame(NEUTRAL_CONTROL_FRAME), sensors, action, amount);
}

export function runControllerProgram(
  program: ControllerProgram,
  sensors: StrategySensors,
  manualControls: ArenaControlFrame,
): ArenaControlFrame {
  let frame = cloneFrame(NEUTRAL_CONTROL_FRAME);

  for (const block of program.blocks) {
    frame = applyBlock(block, frame, sensors, manualControls);
  }

  return {
    throttle: clamp(frame.throttle, -1, 1),
    steer: clamp(frame.steer, -1, 1),
    strafe: clamp(frame.strafe, -1, 1),
    boost: frame.boost,
    biteAttack: frame.biteAttack,
    clawAttack: frame.clawAttack,
    wingAttack: frame.wingAttack,
    tailAttack: frame.tailAttack,
    hornCharge: frame.hornCharge,
    fireAttack: frame.fireAttack,
    guard: frame.guard,
    dodge: frame.dodge,
  };
}

export function buildSensors(
  state: BattleArenaState,
  snapshots: BattleBodySnapshot[],
  combatantId: string,
  context: ControlFrameContext = {},
): StrategySensors {
  const combatant = state.combatants.find(item => item.id === combatantId);
  const opponent = state.combatants.find(item => item.id !== combatantId);
  const combat = buildCombatSensors(context, combatantId, opponent?.id ?? null);
  const coreSnapshot = combatant
    ? findCoreSnapshot(snapshots, combatant.id, combatant.corePartId)
    : null;
  const opponentCoreSnapshot = opponent
    ? findCoreSnapshot(snapshots, opponent.id, opponent.corePartId)
    : null;

  if (!coreSnapshot || !opponentCoreSnapshot) {
    return {
      distanceToOpponent: Number.POSITIVE_INFINITY,
      throttleTowardOpponent: 0,
      strafeTowardOpponent: 0,
      steerTowardOpponent: 0,
      opponentAhead: false,
      tipped: false,
      upsideDown: false,
      upsideDownSeconds: 0,
      linearSpeed: 0,
      stuckSeconds: 0,
      nearWall: false,
      wallAvoidThrottle: 0,
      wallAvoidStrafe: 0,
      wallAvoidSteer: 0,
      elapsedSeconds: state.elapsedSeconds,
      coreHealthRatio: 1,
      ...combat,
    };
  }

  const dx = opponentCoreSnapshot.position.x - coreSnapshot.position.x;
  const dz = opponentCoreSnapshot.position.z - coreSnapshot.position.z;
  const distance = Math.hypot(dx, dz) || 1;
  /*
   * Reported distance is the *gap between the two animals*, not the gap between
   * the two points at their centres.
   *
   * A dragon torso is nearly four units long, so two dragons standing nose to
   * nose have their cores 3.8 apart. Every threshold in every strategy program
   * was written as though that number meant "how close am I" — which made
   * "if distance less than 3" a condition that could not occur between two
   * dragons, and left the challenger with nothing but `chase` to run. Measuring
   * hide to hide is what makes those thresholds mean what they look like they
   * mean, and it is the same measurement the attack ranges use.
   */
  const gap = Math.max(0, distance
    - torsoSupport(combatant, coreSnapshot, dx / distance, dz / distance)
    - torsoSupport(opponent, opponentCoreSnapshot, dx / distance, dz / distance));
  const linearSpeed = Math.hypot(coreSnapshot.velocity.x, coreSnapshot.velocity.z);
  const upVectorY = getUpVectorY(coreSnapshot);
  const tipped = upVectorY < 0.55;
  const upsideDown = upVectorY < -0.15;
  const memory = updateSensorMemory(
    `${state.matchId}:${combatantId}`,
    state.elapsedSeconds,
    linearSpeed,
    upsideDown,
  );
  const setup = state.setup;
  const wallPadding = 1.05;
  const xLimit = setup.floorSize.x / 2 - wallPadding;
  const zLimit = setup.floorSize.z / 2 - wallPadding;
  const nearPositiveX = coreSnapshot.position.x > xLimit;
  const nearNegativeX = coreSnapshot.position.x < -xLimit;
  const nearPositiveZ = coreSnapshot.position.z > zLimit;
  const nearNegativeZ = coreSnapshot.position.z < -zLimit;
  const wallAvoidThrottle = Number(nearNegativeX) - Number(nearPositiveX);
  const wallAvoidStrafe = Number(nearNegativeZ) - Number(nearPositiveZ);
  const coreStatus = combatant
    ? state.partStatuses[getBodyKey(combatant.id, combatant.corePartId)]
    : null;
  const coreHealthRatio = coreStatus
    ? clamp(coreStatus.health / Math.max(coreStatus.maxHealth, 1), 0, 1)
    : 1;

  // Dragon drive is body-relative (forward = facing), so its guidance sensors
  // must be expressed in the dragon's frame; wheeled/shove modes stay world-space.
  const bodyRelative = combatant?.controlMode === 'dragon-attack';
  let throttleTowardOpponent = clamp(dx / distance, -1, 1);
  let strafeTowardOpponent = clamp(dz / distance, -1, 1);
  let steerTowardOpponent = clamp(dz / Math.max(Math.abs(dx), 0.65), -1, 1);
  let opponentAhead = dx > 0.2;
  let bodyWallAvoidThrottle = wallAvoidThrottle;
  let bodyWallAvoidStrafe = wallAvoidStrafe;
  let wallAvoidSteer = clamp(wallAvoidStrafe || -sensorsSign(coreSnapshot.position.z), -1, 1);

  if (bodyRelative) {
    const basis = horizontalBasis(coreSnapshot);
    const forwardDistance = dx * basis.forward.x + dz * basis.forward.z;
    const rightDistance = dx * basis.right.x + dz * basis.right.z;
    throttleTowardOpponent = clamp(forwardDistance / distance, -1, 1);
    strafeTowardOpponent = clamp(rightDistance / distance, -1, 1);
    steerTowardOpponent = clamp(Math.atan2(rightDistance, forwardDistance) / (Math.PI / 2), -1, 1);
    opponentAhead = forwardDistance > 0.2;

    const avoidForward = wallAvoidThrottle * basis.forward.x + wallAvoidStrafe * basis.forward.z;
    const avoidRight = wallAvoidThrottle * basis.right.x + wallAvoidStrafe * basis.right.z;
    bodyWallAvoidThrottle = clamp(avoidForward, -1, 1);
    bodyWallAvoidStrafe = clamp(avoidRight, -1, 1);
    wallAvoidSteer = avoidForward || avoidRight
      ? clamp(Math.atan2(avoidRight, avoidForward) / (Math.PI / 2), -1, 1)
      : 0;
  }

  return {
    distanceToOpponent: gap,
    throttleTowardOpponent,
    strafeTowardOpponent,
    steerTowardOpponent,
    opponentAhead,
    tipped,
    upsideDown,
    upsideDownSeconds: memory.upsideDownSeconds,
    linearSpeed,
    stuckSeconds: memory.stuckSeconds,
    nearWall: nearPositiveX || nearNegativeX || nearPositiveZ || nearNegativeZ,
    wallAvoidThrottle: bodyWallAvoidThrottle,
    wallAvoidStrafe: bodyWallAvoidStrafe,
    wallAvoidSteer,
    elapsedSeconds: state.elapsedSeconds,
    coreHealthRatio,
    ...combat,
  };
}

/**
 * The combat half of the sensor set.
 *
 * Falls back to "nothing is happening and every move is ready" when no
 * awareness was supplied, so a program written against these sensors still runs
 * — it simply never sees an opening it can react to.
 */
function buildCombatSensors(
  context: ControlFrameContext,
  combatantId: string,
  opponentId: string | null,
): Pick<
  StrategySensors,
  | 'opponentAttacking'
  | 'opponentStriking'
  | 'opponentCommitted'
  | 'opponentGuarding'
  | 'mounted'
  | 'pinned'
  | 'airborne'
  | 'knockedDown'
  | 'guardFatigue'
  | 'readyMoves'
> {
  const self = context.awareness?.[combatantId];
  const other = opponentId ? context.awareness?.[opponentId] : undefined;
  const license = context.licenses?.[combatantId];

  return {
    opponentAttacking: Boolean(other?.ability),
    opponentStriking: Boolean(other?.striking),
    // Only the slow moves are worth reading and answering; a claw rake is over
    // before any controller could respond to it.
    opponentCommitted: isCommittedMove(other),
    opponentGuarding: Boolean(other?.defense.guarding),
    mounted: Boolean(self?.mounted),
    pinned: Boolean(other?.mounted),
    airborne: Boolean(self?.airborne),
    knockedDown: Boolean(self?.defense.knockedDown),
    guardFatigue: self?.defense.guardFatigue ?? 0,
    readyMoves: resolveReadyMoves(self, license),
  };
}

function isCommittedMove(awareness: BattleCombatantAwareness | undefined): boolean {
  if (!awareness?.ability) return false;
  return awareness.ability === 'horn-charge'
    || awareness.ability === 'fire-breath'
    || awareness.ability === 'bite';
}

function resolveReadyMoves(
  awareness: BattleCombatantAwareness | undefined,
  license: CombatantMoveLicense | undefined,
): StrategyAction[] {
  const licensed = licensedMoves(license);
  if (!awareness) return licensed;

  return licensed.filter(move => {
    const cooldown = awareness.cooldowns[move as keyof typeof awareness.cooldowns];
    return cooldown === undefined || cooldown <= 0;
  });
}

/**
 * How far a combatant's torso reaches toward a direction, from the blueprint.
 *
 * Zero for anything without a resolvable core, which keeps the gap equal to the
 * centre distance for creations this cannot measure rather than inventing a
 * size for them.
 */
function torsoSupport(
  combatant: BattleCombatant | undefined,
  snapshot: BattleBodySnapshot,
  dirX: number,
  dirZ: number,
): number {
  const corePart = combatant?.assembly.parts.find(part => part.id === combatant.corePartId);
  if (!corePart) return 0;

  const forward = rotateVectorByQuaternion({ x: 1, y: 0, z: 0 }, snapshot.quaternion);
  const horizontal = normalizeHorizontal(forward.x, forward.z, { x: 1, z: 0 });
  return horizontalTorsoSupport(coreHalfExtents(corePart), horizontal.x, horizontal.z, dirX, dirZ);
}

/** Core forward (+x) and right (+z) axes projected to the ground plane. */
function horizontalBasis(snapshot: BattleBodySnapshot): {
  forward: { x: number; z: number };
  right: { x: number; z: number };
} {
  const forward = rotateVectorByQuaternion({ x: 1, y: 0, z: 0 }, snapshot.quaternion);
  const right = rotateVectorByQuaternion({ x: 0, y: 0, z: 1 }, snapshot.quaternion);
  return {
    forward: normalizeHorizontal(forward.x, forward.z, { x: 1, z: 0 }),
    right: normalizeHorizontal(right.x, right.z, { x: 0, z: 1 }),
  };
}

function normalizeHorizontal(
  x: number,
  z: number,
  fallback: { x: number; z: number },
): { x: number; z: number } {
  const length = Math.hypot(x, z);
  return length > 0.001 ? { x: x / length, z: z / length } : fallback;
}

function applyBlock(
  block: StrategyBlock,
  frame: ArenaControlFrame,
  sensors: StrategySensors,
  manualControls: ArenaControlFrame,
): ArenaControlFrame {
  switch (block.type) {
    case 'manual-input':
      return cloneFrame(manualControls);
    case 'drive':
      return {
        ...frame,
        throttle: getNumberParam(block, 'amount', 1),
      };
    case 'turn':
      return {
        ...frame,
        steer: getNumberParam(block, 'amount', 0.5),
      };
    case 'strafe':
      return {
        ...frame,
        strafe: getNumberParam(block, 'amount', 0.5),
      };
    case 'boost':
      return {
        ...frame,
        boost: getBooleanParam(block, 'enabled', true),
      };
    case 'stop':
      return cloneFrame(NEUTRAL_CONTROL_FRAME);
    case 'back-up':
      return {
        ...frame,
        throttle: -Math.abs(getNumberParam(block, 'amount', 0.7)),
        steer: frame.steer || -sensors.steerTowardOpponent * 0.45,
      };
    case 'chase': {
      const amount = getNumberParam(block, 'amount', 0.85);
      return {
        ...frame,
        throttle: sensors.throttleTowardOpponent * amount,
        strafe: sensors.strafeTowardOpponent * amount,
      };
    }
    case 'dragon-attack':
    case 'dragon-defend': {
      const fallback: StrategyAction = block.type === 'dragon-defend' ? 'guard' : 'bite';
      const key = block.type === 'dragon-defend' ? 'defense' : 'attack';
      const move = getActionParamByKey(block, key, fallback);
      // A move the genotype never granted, or one still on cooldown, is not
      // silently swapped for another: the program simply does nothing this
      // frame, so a student reading it sees the gene decide the outcome.
      return sensors.readyMoves.includes(move)
        ? applyAction(frame, sensors, move, getNumberParam(block, 'amount', 1))
        : frame;
    }
    case 'aim-at-opponent':
    case 'turn-toward-opponent':
      return {
        ...frame,
        steer: sensors.steerTowardOpponent * getNumberParam(block, 'amount', 0.85),
      };
    case 'avoid-wall':
      return sensors.nearWall
        ? applyAction(frame, sensors, 'avoid-wall', getNumberParam(block, 'amount', 1))
        : frame;
    case 'recover-if-tipped':
      return sensors.tipped
        ? applyAction(frame, sensors, 'recover', getNumberParam(block, 'amount', 1))
        : frame;
    case 'if-distance-less':
      return sensors.distanceToOpponent < getNumberParam(block, 'threshold', 2.8)
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'if-distance-more':
      return sensors.distanceToOpponent > getNumberParam(block, 'threshold', 4)
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'if-opponent-attacking':
      return (getBooleanParam(block, 'committedOnly', true)
        ? sensors.opponentCommitted
        : sensors.opponentAttacking)
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'if-health-below':
      return sensors.coreHealthRatio < getNumberParam(block, 'ratio', 0.4)
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'if-tipped':
      return sensors.tipped
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'if-stuck':
      return sensors.stuckSeconds >= getNumberParam(block, 'seconds', 1) &&
        sensors.linearSpeed <= getNumberParam(block, 'speedThreshold', 0.18)
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'if-upside-down-for':
      return sensors.upsideDownSeconds >= getNumberParam(block, 'seconds', 0.45)
        ? applyChildBlocks(block, frame, sensors, manualControls)
        : frame;
    case 'repeat-sequence':
      return applyRepeatSequence(block, frame, sensors);
  }
}

function applyChildBlocks(
  block: StrategyBlock,
  frame: ArenaControlFrame,
  sensors: StrategySensors,
  manualControls: ArenaControlFrame,
): ArenaControlFrame {
  if (!block.children?.length) {
    return applyAction(frame, sensors, getActionParam(block), 1);
  }

  return block.children.reduce(
    (nextFrame, child) => applyBlock(child, nextFrame, sensors, manualControls),
    frame,
  );
}

function applyAction(
  frame: ArenaControlFrame,
  sensors: StrategySensors,
  action: StrategyAction,
  amount: number,
): ArenaControlFrame {
  switch (action) {
    case 'boost':
      return { ...frame, boost: true };
    case 'stop':
      return cloneFrame(NEUTRAL_CONTROL_FRAME);
    case 'back-up':
      return {
        ...frame,
        throttle: -Math.abs(0.75 * amount),
        steer: frame.steer || -sensors.steerTowardOpponent * 0.45,
      };
    case 'chase':
      return {
        ...frame,
        throttle: sensors.throttleTowardOpponent * amount,
        strafe: sensors.strafeTowardOpponent * amount,
      };
    case 'avoid-wall':
      return {
        ...frame,
        throttle: sensors.wallAvoidThrottle * amount || frame.throttle,
        strafe: sensors.wallAvoidStrafe * amount || frame.strafe,
        steer: sensors.wallAvoidSteer * amount || frame.steer,
      };
    case 'aim':
      return {
        ...frame,
        steer: sensors.steerTowardOpponent * amount,
      };
    case 'recover':
      return {
        ...frame,
        throttle: Math.max(frame.throttle, 0.35 * amount),
        steer: sensors.steerTowardOpponent || 0.75,
        strafe: Math.max(frame.strafe, 0.65 * amount),
        boost: true,
      };
    case 'ram':
      return {
        ...frame,
        throttle: sensors.throttleTowardOpponent,
        strafe: sensors.strafeTowardOpponent * 0.35,
        steer: sensors.steerTowardOpponent,
        boost: true,
      };
    case 'bite':
      return {
        ...frame,
        // Closing pressure, not a charge. Driving at full throttle into a body
        // it is already touching is how a dragon ends up climbing the sloped
        // torso in front of it — the lunge belongs to the animation, and the
        // one move that is meant to travel is the charge.
        throttle: sensors.throttleTowardOpponent * 0.45,
        strafe: sensors.strafeTowardOpponent * 0.35,
        steer: sensors.steerTowardOpponent,
        // Deliberately no longer boosting. Boost is a wing beat, and a
        // controller that held it while closing simply took off and landed on
        // whatever it was chasing — which is exactly how the challenger used to
        // end up parked on top of the player.
        biteAttack: true,
      };
    case 'claw-rake':
      return {
        ...frame,
        throttle: Math.max(frame.throttle, sensors.throttleTowardOpponent * 0.25),
        steer: sensors.steerTowardOpponent,
        clawAttack: true,
      };
    case 'horn-charge':
      return {
        ...frame,
        // The charge supplies its own forward drive, so the controller only has
        // to be pointing the right way when it commits.
        throttle: 0,
        steer: sensors.steerTowardOpponent,
        hornCharge: true,
      };
    case 'guard':
      return {
        ...frame,
        throttle: 0,
        strafe: 0,
        steer: sensors.steerTowardOpponent * 0.4,
        boost: false,
        guard: true,
      };
    case 'dodge':
      return {
        ...frame,
        // Roll away from the threat, not into it.
        throttle: -Math.abs(sensors.throttleTowardOpponent) * amount,
        strafe: sensors.strafeTowardOpponent * amount,
        dodge: true,
      };
    case 'wing-buffet':
      return {
        ...frame,
        strafe: frame.strafe || sensors.strafeTowardOpponent || 0.8,
        steer: sensors.steerTowardOpponent,
        wingAttack: true,
      };
    case 'tail-sweep':
      return {
        ...frame,
        throttle: Math.min(frame.throttle, -0.25 * amount),
        steer: sensors.steerTowardOpponent || 0.85,
        tailAttack: true,
      };
    case 'fire-breath':
      return {
        ...frame,
        steer: sensors.steerTowardOpponent * amount,
        fireAttack: true,
      };
  }
}

function applyRepeatSequence(
  block: StrategyBlock,
  frame: ArenaControlFrame,
  sensors: StrategySensors,
): ArenaControlFrame {
  const firstDuration = Math.max(0.1, getNumberParam(block, 'firstDuration', 1.4));
  const secondDuration = Math.max(0.1, getNumberParam(block, 'secondDuration', 0.55));
  const cycle = firstDuration + secondDuration;
  const phase = sensors.elapsedSeconds % cycle;
  const action = phase < firstDuration
    ? getActionParamByKey(block, 'firstAction', 'chase')
    : getActionParamByKey(block, 'secondAction', 'back-up');

  return applyAction(frame, sensors, action, 1);
}

function findCoreSnapshot(
  snapshots: BattleBodySnapshot[],
  combatantId: string,
  corePartId: string,
): BattleBodySnapshot | null {
  const bodyKey = getBodyKey(combatantId, corePartId);
  return snapshots.find(snapshot => snapshot.bodyKey === bodyKey) ?? null;
}

function getUpVectorY(snapshot: BattleBodySnapshot): number {
  const q = snapshot.quaternion;
  return 1 - 2 * (q.x * q.x + q.z * q.z);
}

function getNumberParam(block: StrategyBlock, key: string, fallback: number): number {
  const value = block.params[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getBooleanParam(block: StrategyBlock, key: string, fallback: boolean): boolean {
  const value = block.params[key];
  return typeof value === 'boolean' ? value : fallback;
}

function getActionParam(block: StrategyBlock): StrategyAction {
  return getActionParamByKey(block, 'action', 'boost');
}

function getActionParamByKey(block: StrategyBlock, key: string, fallback: StrategyAction): StrategyAction {
  const value = block.params[key];

  if (
    value === 'boost' ||
    value === 'stop' ||
    value === 'recover' ||
    value === 'ram' ||
    value === 'back-up' ||
    value === 'chase' ||
    value === 'avoid-wall' ||
    value === 'aim' ||
    value === 'bite' ||
    value === 'claw-rake' ||
    value === 'wing-buffet' ||
    value === 'tail-sweep' ||
    value === 'horn-charge' ||
    value === 'fire-breath' ||
    value === 'guard' ||
    value === 'dodge'
  ) {
    return value;
  }

  return fallback;
}

function cloneFrame(frame: ArenaControlFrame): ArenaControlFrame {
  return { ...frame };
}

function mergeManualOverride(
  programFrame: ArenaControlFrame,
  manualControls: ArenaControlFrame,
): ArenaControlFrame {
  const hasManualMotion =
    Math.abs(manualControls.throttle) > 0 ||
    Math.abs(manualControls.steer) > 0 ||
    Math.abs(manualControls.strafe) > 0;

  return {
    throttle: hasManualMotion ? manualControls.throttle : programFrame.throttle,
    steer: hasManualMotion ? manualControls.steer : programFrame.steer,
    strafe: hasManualMotion ? manualControls.strafe : programFrame.strafe,
    boost: programFrame.boost || manualControls.boost,
    biteAttack: programFrame.biteAttack || manualControls.biteAttack,
    clawAttack: programFrame.clawAttack || manualControls.clawAttack,
    wingAttack: programFrame.wingAttack || manualControls.wingAttack,
    tailAttack: programFrame.tailAttack || manualControls.tailAttack,
    hornCharge: programFrame.hornCharge || manualControls.hornCharge,
    fireAttack: programFrame.fireAttack || manualControls.fireAttack,
    guard: programFrame.guard || manualControls.guard,
    dodge: programFrame.dodge || manualControls.dodge,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function updateSensorMemory(
  key: string,
  elapsedSeconds: number,
  linearSpeed: number,
  upsideDown: boolean,
): SensorMemory {
  const previous = sensorMemory.get(key);
  const deltaSeconds = previous
    ? clamp(elapsedSeconds - previous.lastElapsedSeconds, 0, 0.2)
    : 0;
  const next: SensorMemory = {
    lastElapsedSeconds: elapsedSeconds,
    stuckSeconds: linearSpeed < 0.18
      ? (previous?.stuckSeconds ?? 0) + deltaSeconds
      : 0,
    upsideDownSeconds: upsideDown
      ? (previous?.upsideDownSeconds ?? 0) + deltaSeconds
      : 0,
  };

  sensorMemory.set(key, next);
  return next;
}

function sensorsSign(value: number): number {
  return value === 0 ? 0 : Math.sign(value);
}
