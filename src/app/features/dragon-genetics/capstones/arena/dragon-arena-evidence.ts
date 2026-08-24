import { DragonBattleResult, StudentDragonRecord } from '../../dragon-genetics.models';
import {
  ARENA_BUILD_TRAITS,
  arenaGenotype,
  genotypeLabel,
  showsArenaDominant,
} from '../../simulation/domain/dragon-inheritance';
import { ArenaBuildTraitId } from '../../simulation/domain/dragon-lab.models';
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

/** Records every available inherited build trait and what it changes in this arena model. */
export function buildDragonArenaTraitEvidence(
  champion: StudentDragonRecord,
): DragonArenaTraitEvidence[] {
  return ARENA_BUILD_TRAITS
    .filter((trait) => arenaGenotype(champion.genome, trait.id) !== undefined)
    .map((trait) => traitEvidence(champion, trait.id));
}

function traitEvidence(
  champion: StudentDragonRecord,
  traitId: ArenaBuildTraitId,
): DragonArenaTraitEvidence {
  const trait = ARENA_BUILD_TRAITS.find((candidate) => candidate.id === traitId)!;
  const genotype = arenaGenotype(champion.genome, traitId)!;
  const dominant = showsArenaDominant(champion.genome, traitId);
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
    case 'armor':
    case 'temperament':
      return {
        ...shared,
        kind: 'defense',
        arenaEffect: dominant
          ? 'Higher armor, mass, or damage expression in the Arena build.'
          : 'Lighter defensive or combat expression in the Arena build.',
      };
    case 'scales':
    case 'legs':
    case 'claws':
    case 'crest':
    case 'spikes':
    case 'tail':
    case 'body-color':
    case 'glow':
    case 'fangs':
    case 'eye-color':
    case 'body-type':
    case 'secondary-wings':
    case 'wing-shape':
    case 'wing-camber':
    case 'body-size':
    case 'tail-length':
    case 'head-size':
    case 'snout':
    case 'ear-frill':
      return {
        ...shared,
        kind: 'appearance',
        arenaEffect: traitId === 'secondary-wings' && dominant
          ? 'Adds a second jointed wing pair: 26 physical parts instead of 24.'
          : ['scales', 'legs', 'claws', 'crest', 'spikes'].includes(traitId)
            ? 'Visible pattern only; no arena modifier.'
            : 'Visible anatomy carried by the champion build.',
      };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
