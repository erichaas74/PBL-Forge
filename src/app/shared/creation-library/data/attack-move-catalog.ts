import { CreationAction } from '../models/action.models';
import { AttackMoveDefinition } from '../models/attack-move.models';

export const ATTACK_MOVE_ACTION_OPTIONS = [
  { id: 'aim', name: 'Aim' },
  { id: 'chase', name: 'Chase' },
  { id: 'ram', name: 'Ram' },
  { id: 'bite', name: 'Bite' },
  { id: 'wing-buffet', name: 'Wing Buffet' },
  { id: 'tail-sweep', name: 'Tail Sweep' },
  { id: 'back-up', name: 'Back Up' },
  { id: 'recover', name: 'Recover' },
  { id: 'boost', name: 'Boost' },
  { id: 'stop', name: 'Stop' },
] as const satisfies readonly {
  id: CreationAction;
  name: string;
}[];

export const ATTACK_MOVE_CATALOG = [
  {
    id: 'dragon-pounce-bite',
    name: 'Dragon Pounce Bite',
    description: 'Aim, surge toward the target, then fire the bite lunge.',
    tags: ['dragon', 'close'],
    steps: [
      { action: 'aim', durationSeconds: 0.25, amount: 1 },
      { action: 'chase', durationSeconds: 0.45, amount: 1 },
      { action: 'bite', durationSeconds: 0.38, amount: 1 },
      { action: 'stop', durationSeconds: 0.18, amount: 1 },
    ],
  },
  {
    id: 'dragon-wing-tail-combo',
    name: 'Wing Tail Combo',
    description: 'Buffet sideways with the wings, pivot, then sweep the tail.',
    tags: ['dragon', 'area'],
    steps: [
      { action: 'aim', durationSeconds: 0.2, amount: 0.9 },
      { action: 'wing-buffet', durationSeconds: 0.55, amount: 1 },
      { action: 'tail-sweep', durationSeconds: 0.65, amount: 1 },
      { action: 'back-up', durationSeconds: 0.25, amount: 0.65 },
    ],
  },
  {
    id: 'dragon-tail-spin',
    name: 'Tail Spin',
    description: 'Turn into the opponent and hold a longer tail sweep.',
    tags: ['dragon', 'area'],
    steps: [
      { action: 'aim', durationSeconds: 0.25, amount: 1 },
      { action: 'tail-sweep', durationSeconds: 0.9, amount: 1 },
      { action: 'recover', durationSeconds: 0.28, amount: 0.65 },
    ],
  },
  {
    id: 'recover-and-ram',
    name: 'Recover And Ram',
    description: 'Pop upright, line up, then drive hard into the target.',
    tags: ['robot', 'car', 'dragon'],
    steps: [
      { action: 'recover', durationSeconds: 0.45, amount: 1 },
      { action: 'aim', durationSeconds: 0.25, amount: 0.85 },
      { action: 'ram', durationSeconds: 0.55, amount: 1 },
      { action: 'stop', durationSeconds: 0.2, amount: 1 },
    ],
  },
] as const satisfies readonly AttackMoveDefinition[];

export function getAttackMove(moveId: string): AttackMoveDefinition {
  return ATTACK_MOVE_CATALOG.find(move => move.id === moveId) ?? ATTACK_MOVE_CATALOG[0];
}

export function getAttackMoveDuration(move: AttackMoveDefinition): number {
  return move.steps.reduce((total, step) => total + Math.max(step.durationSeconds, 0), 0);
}
