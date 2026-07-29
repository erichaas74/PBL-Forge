import { CreationAction } from './action.models';

export interface AttackMoveStep {
  action: CreationAction;
  durationSeconds: number;
  amount: number;
}

export interface AttackMoveDefinition {
  id: string;
  name: string;
  description: string;
  tags: string[];
  steps: AttackMoveStep[];
}

export interface ActiveAttackMove {
  moveId: string;
  team: string;
  startedAtSeconds: number;
}
