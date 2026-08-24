import { DragonBattleResult } from '../../dragon-genetics.models';
import { ArenaBuildTraitId } from '../../simulation/domain/dragon-lab.models';

export interface DragonArenaScoreBreakdown {
  outcomePoints: number;
  conditionPoints: number;
  pacePoints: number;
  total: number;
}

export interface DragonArenaTraitEvidence {
  traitId: ArenaBuildTraitId;
  traitName: string;
  genotype: string;
  phenotype: string;
  arenaEffect: string;
  kind: 'ability' | 'defense' | 'appearance';
}

export interface DragonArenaTrialRecord extends DragonBattleResult {
  id: string;
  championId: string;
  score: number;
  scoreBreakdown: DragonArenaScoreBreakdown;
  traitEvidence: readonly DragonArenaTraitEvidence[];
  completedAtIso: string;
}

export interface DragonArenaMissionSnapshot {
  schemaVersion: 2;
  studentId: string;
  selectedChampionId: string | null;
  trials: readonly DragonArenaTrialRecord[];
}
