import { AttackMoveStep } from '../../shared/assembly-arena/models/attack-move.models';

/**
 * Move cards for the turn-based dragon duel. Each card is a short scripted
 * sequence played through the physics engine by the attack-move step runner, so
 * turn results still emerge from real collisions. Cards can be genotype-gated:
 * a wingless dragon cannot play Wing buffet, mirroring the real-time rule.
 */
export interface DragonMoveCard {
  id: string;
  name: string;
  detail: string;
  steps: AttackMoveStep[];
  requiresWings?: boolean;
  requiresFire?: boolean;
  requiresHorns?: boolean;
}

export const DRAGON_MOVE_CARDS: readonly DragonMoveCard[] = [
  {
    id: 'advance',
    name: 'Advance',
    detail: 'Stride toward the opponent.',
    steps: [{ action: 'chase', durationSeconds: 1.5, amount: 1 }],
  },
  {
    id: 'charge',
    name: 'Charge',
    detail: 'Boosted ram — big impact, but risky up close.',
    steps: [{ action: 'ram', durationSeconds: 1.3, amount: 1 }],
  },
  {
    id: 'retreat',
    name: 'Retreat',
    detail: 'Back away to open distance.',
    steps: [{ action: 'back-up', durationSeconds: 1.2, amount: 0.9 }],
  },
  {
    id: 'bite',
    name: 'Bite lunge',
    detail: 'Aim first, then snap the jaws shut.',
    steps: [
      { action: 'aim', durationSeconds: 0.35, amount: 1 },
      { action: 'bite', durationSeconds: 1.25, amount: 1 },
    ],
  },
  {
    id: 'claw',
    name: 'Claw rake',
    detail: 'A quick swipe. Cheap enough to fit two other moves around it.',
    steps: [{ action: 'claw-rake', durationSeconds: 0.6, amount: 1 }],
  },
  {
    id: 'horn',
    name: 'Horn charge',
    detail: 'Run them down. Heaviest hit in the duel, and it knocks them flat.',
    requiresHorns: true,
    steps: [
      { action: 'aim', durationSeconds: 0.3, amount: 1 },
      { action: 'horn-charge', durationSeconds: 1.5, amount: 1 },
    ],
  },
  {
    id: 'guard',
    name: 'Brace',
    detail: 'Plant behind the horns: most incoming damage is absorbed.',
    requiresHorns: true,
    steps: [{ action: 'guard', durationSeconds: 1.4, amount: 1 }],
  },
  {
    id: 'roll',
    name: 'Evasive roll',
    detail: 'Dive aside. Untouchable through the middle of the roll.',
    requiresWings: true,
    steps: [{ action: 'dodge', durationSeconds: 0.6, amount: 1 }],
  },
  {
    id: 'wing',
    name: 'Wing buffet',
    detail: 'Wing slam that knocks the opponent back.',
    requiresWings: true,
    steps: [{ action: 'wing-buffet', durationSeconds: 1.2, amount: 1 }],
  },
  {
    id: 'tail',
    name: 'Tail sweep',
    detail: 'Whip the tail across the arena.',
    steps: [{ action: 'tail-sweep', durationSeconds: 1.2, amount: 1 }],
  },
  {
    id: 'fire',
    name: 'Fire breath',
    detail: 'Aim, then scorch a cone in front of you.',
    requiresFire: true,
    steps: [
      { action: 'aim', durationSeconds: 0.3, amount: 1 },
      { action: 'fire-breath', durationSeconds: 1.3, amount: 1 },
    ],
  },
  {
    id: 'brace',
    name: 'Hold position',
    detail: 'Stand still and give up the turn. Costs nothing, absorbs nothing.',
    steps: [{ action: 'stop', durationSeconds: 1.2, amount: 1 }],
  },
];

export function findDragonMoveCards(ids: readonly string[]): DragonMoveCard[] {
  return ids
    .map(id => DRAGON_MOVE_CARDS.find(card => card.id === id))
    .filter((card): card is DragonMoveCard => !!card);
}
