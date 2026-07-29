import {
  ArenaControlFrame,
  BattleArenaState,
  BattleBodySnapshot,
  ControlFrameByCombatant,
} from '../models/arena.models';
import { getBodyKey } from '../utils/battle-assembly';
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
  wingAttack: false,
  tailAttack: false,
};

const sensorMemory = new Map<string, SensorMemory>();

export function buildControlFrames(
  state: BattleArenaState,
  snapshots: BattleBodySnapshot[],
  programsByCombatant: Record<string, ControllerProgram>,
  manualControls: ArenaControlFrame,
  overrideControlsByCombatant: ControlFrameByCombatant = {},
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
    const sensors = buildSensors(state, snapshots, combatant.id);
    const programFrame = runControllerProgram(program, sensors, manualControls);
    const baseFrame = combatant.controller === 'player'
      ? mergeManualOverride(programFrame, manualControls)
      : programFrame;

    frames[combatant.id] = overrideControlsByCombatant[combatant.id]
      ? mergeManualOverride(baseFrame, overrideControlsByCombatant[combatant.id])
      : baseFrame;
  }

  return frames;
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
    wingAttack: frame.wingAttack,
    tailAttack: frame.tailAttack,
  };
}

export function buildSensors(
  state: BattleArenaState,
  snapshots: BattleBodySnapshot[],
  combatantId: string,
): StrategySensors {
  const combatant = state.combatants.find(item => item.id === combatantId);
  const opponent = state.combatants.find(item => item.id !== combatantId);
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
    };
  }

  const dx = opponentCoreSnapshot.position.x - coreSnapshot.position.x;
  const dz = opponentCoreSnapshot.position.z - coreSnapshot.position.z;
  const distance = Math.hypot(dx, dz) || 1;
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

  return {
    distanceToOpponent: distance,
    throttleTowardOpponent: clamp(dx / distance, -1, 1),
    strafeTowardOpponent: clamp(dz / distance, -1, 1),
    steerTowardOpponent: clamp(dz / Math.max(Math.abs(dx), 0.65), -1, 1),
    opponentAhead: dx > 0.2,
    tipped,
    upsideDown,
    upsideDownSeconds: memory.upsideDownSeconds,
    linearSpeed,
    stuckSeconds: memory.stuckSeconds,
    nearWall: nearPositiveX || nearNegativeX || nearPositiveZ || nearNegativeZ,
    wallAvoidThrottle,
    wallAvoidStrafe,
    wallAvoidSteer: clamp(wallAvoidStrafe || -sensorsSign(coreSnapshot.position.z), -1, 1),
    elapsedSeconds: state.elapsedSeconds,
    coreHealthRatio,
  };
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
      return applyAction(frame, sensors, getActionParamByKey(block, 'attack', 'bite'), getNumberParam(block, 'amount', 1));
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
        throttle: sensors.throttleTowardOpponent,
        strafe: sensors.strafeTowardOpponent * 0.35,
        steer: sensors.steerTowardOpponent,
        boost: true,
        biteAttack: true,
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
    value === 'wing-buffet' ||
    value === 'tail-sweep'
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
    wingAttack: programFrame.wingAttack || manualControls.wingAttack,
    tailAttack: programFrame.tailAttack || manualControls.tailAttack,
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
