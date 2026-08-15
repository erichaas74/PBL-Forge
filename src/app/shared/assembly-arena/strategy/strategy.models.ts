import { CreationAction } from '../../creation-library/models/action.models';

export type StrategyProgramId =
  | 'manual-keyboard'
  | 'car-ram-opponent'
  | 'car-circle-and-ram'
  | 'dragon-attack-combo'
  | 'dragon-defensive-counter'
  | 'robot-right-self'
  | 'robot-shove-and-recover'
  | 'static-target';

export type StrategyBlockType =
  | 'manual-input'
  | 'drive'
  | 'turn'
  | 'strafe'
  | 'boost'
  | 'stop'
  | 'back-up'
  | 'chase'
  | 'dragon-attack'
  | 'dragon-defend'
  | 'aim-at-opponent'
  | 'turn-toward-opponent'
  | 'avoid-wall'
  | 'recover-if-tipped'
  | 'if-distance-less'
  | 'if-distance-more'
  | 'if-tipped'
  | 'if-stuck'
  | 'if-upside-down-for'
  | 'if-opponent-attacking'
  | 'if-health-below'
  | 'repeat-sequence';

export type StrategyAction = CreationAction;
export type StrategyBlockParamValue = number | string | boolean;

export interface StrategyBlock {
  id: string;
  type: StrategyBlockType;
  params: Record<string, StrategyBlockParamValue>;
  children?: StrategyBlock[];
}

export interface ControllerProgram {
  id: StrategyProgramId | string;
  name: string;
  description: string;
  blocks: StrategyBlock[];
}

export interface StrategySensors {
  distanceToOpponent: number;
  throttleTowardOpponent: number;
  strafeTowardOpponent: number;
  steerTowardOpponent: number;
  opponentAhead: boolean;
  tipped: boolean;
  upsideDown: boolean;
  upsideDownSeconds: number;
  linearSpeed: number;
  stuckSeconds: number;
  nearWall: boolean;
  wallAvoidThrottle: number;
  wallAvoidStrafe: number;
  wallAvoidSteer: number;
  elapsedSeconds: number;
  coreHealthRatio: number;
  /**
   * What the opponent is doing, and what this combatant is able to do about it.
   *
   * A controller that can only see *where* its opponent is can only ever chase
   * it. These are what let a program block, roll, or punish a whiffed heavy —
   * the difference between a challenger with one plan and one with a fight in
   * it.
   */
  opponentAttacking: boolean;
  /** The opponent's blow is landing now, not merely wound up. */
  opponentStriking: boolean;
  /** Opponent is committed to a heavy move: the window to punish or evade. */
  opponentCommitted: boolean;
  opponentGuarding: boolean;
  /** This combatant is standing on the opponent, or being stood on. */
  mounted: boolean;
  pinned: boolean;
  airborne: boolean;
  knockedDown: boolean;
  guardFatigue: number;
  /** Moves this combatant's genotype and cooldowns allow right now. */
  readyMoves: readonly StrategyAction[];
}
