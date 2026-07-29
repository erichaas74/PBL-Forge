import { CreationAction } from '../../creation-library/models/action.models';

export type StrategyProgramId =
  | 'manual-keyboard'
  | 'car-ram-opponent'
  | 'car-circle-and-ram'
  | 'dragon-attack-combo'
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
  | 'aim-at-opponent'
  | 'turn-toward-opponent'
  | 'avoid-wall'
  | 'recover-if-tipped'
  | 'if-distance-less'
  | 'if-tipped'
  | 'if-stuck'
  | 'if-upside-down-for'
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
}
