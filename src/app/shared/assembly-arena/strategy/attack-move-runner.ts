import {
  ArenaControlFrame,
  BattleArenaState,
  BattleBodySnapshot,
  ControlFrameByCombatant,
} from '../models/arena.models';
import {
  ActiveAttackMove,
  AttackMoveDefinition,
  AttackMoveStep,
} from '../models/attack-move.models';
import {
  buildSensors,
  createActionControlFrame,
  NEUTRAL_CONTROL_FRAME,
} from './strategy-runner';

export function buildAttackMoveControlFrames(
  state: BattleArenaState,
  snapshots: BattleBodySnapshot[],
  moves: readonly AttackMoveDefinition[],
  activeMove: ActiveAttackMove | null,
): ControlFrameByCombatant {
  if (!activeMove || activeMove.team !== state.activeTeam) {
    return {};
  }

  const move = moves.find(item => item.id === activeMove.moveId);
  const combatant = state.combatants.find(item => item.team === activeMove.team);

  if (!move || !combatant) {
    return {};
  }

  const step = getActiveAttackMoveStep(move, state.elapsedSeconds - activeMove.startedAtSeconds);

  if (!step) {
    return {};
  }

  const sensors = buildSensors(state, snapshots, combatant.id);

  return {
    [combatant.id]: clampFrame(createActionControlFrame(sensors, step.action, step.amount)),
  };
}

export function getActiveAttackMoveStep(
  move: AttackMoveDefinition,
  elapsedSeconds: number,
): AttackMoveStep | null {
  if (elapsedSeconds < 0) {
    return move.steps[0] ?? null;
  }

  let cursor = 0;

  for (const step of move.steps) {
    cursor += Math.max(step.durationSeconds, 0);

    if (elapsedSeconds <= cursor) {
      return step;
    }
  }

  return null;
}

function clampFrame(frame: ArenaControlFrame): ArenaControlFrame {
  return {
    ...NEUTRAL_CONTROL_FRAME,
    ...frame,
    throttle: clamp(frame.throttle, -1, 1),
    steer: clamp(frame.steer, -1, 1),
    strafe: clamp(frame.strafe, -1, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
