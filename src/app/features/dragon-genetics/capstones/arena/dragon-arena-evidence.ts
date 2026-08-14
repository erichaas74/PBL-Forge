import { DragonBattleResult, StudentDragonRecord } from '../../dragon-genetics.models';
import {
  DRAGON_TRAITS,
  genotypeLabel,
  showsDominantPhenotype,
} from '../../simulation/domain/dragon-inheritance';
import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import {
  DragonArenaScoreBreakdown,
  DragonArenaTraitEvidence,
} from './dragon-arena-mission.models';

const PACE_WINDOW_SECONDS = 120;

/** Performance score for one fair trial. This is deliberately not a genetics mastery score. */
export function scoreDragonArenaTrial(result: DragonBattleResult): DragonArenaScoreBreakdown {
  const elapsedRatio = clamp(result.elapsedSeconds / PACE_WINDOW_SECONDS, 0, 1);
  const outcomePoints = result.won ? 50 : 0;
  const conditionPoints = Math.round(clamp(result.remainingHealthPercent, 0, 100) * 0.35);
  const pacePoints = Math.round(15 * (result.won ? 1 - elapsedRatio : elapsedRatio));
  return {
    outcomePoints,
    conditionPoints,
    pacePoints,
    total: outcomePoints + conditionPoints + pacePoints,
  };
}

/** Records what the champion's four inherited traits actually change in this arena model. */
export function buildDragonArenaTraitEvidence(
  champion: StudentDragonRecord,
): DragonArenaTraitEvidence[] {
  return DRAGON_TRAITS.map((trait) => traitEvidence(champion, trait.id));
}

function traitEvidence(
  champion: StudentDragonRecord,
  traitId: DragonTraitId,
): DragonArenaTraitEvidence {
  const trait = DRAGON_TRAITS.find((candidate) => candidate.id === traitId)!;
  const genotype = champion.genome[traitId];
  const dominant = showsDominantPhenotype(genotype, traitId);
  const shared = {
    traitId,
    traitName: trait.name,
    genotype: genotypeLabel(genotype),
    phenotype: dominant ? trait.dominantPhenotype : trait.recessivePhenotype,
  };

  switch (traitId) {
    case 'wings':
      return {
        ...shared,
        kind: 'ability',
        arenaEffect: dominant
          ? 'Lift and wing buffet available; wings can take damage.'
          : 'No lift or wing buffet; fewer damageable parts.',
      };
    case 'fire':
      return {
        ...shared,
        kind: 'ability',
        arenaEffect: dominant ? 'Fire breath available.' : 'Fire breath unavailable.',
      };
    case 'horns':
      return {
        ...shared,
        kind: 'defense',
        arenaEffect: dominant
          ? 'Higher armor-density profile.'
          : 'Lower armor-density profile.',
      };
    case 'scales':
      return {
        ...shared,
        kind: 'appearance',
        arenaEffect: 'Visible pattern only; no arena modifier.',
      };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
