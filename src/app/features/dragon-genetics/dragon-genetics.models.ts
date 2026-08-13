import { DragonLabGenome, DragonTraitId } from './simulation/domain/dragon-lab.models';

export type GeneticsSkill =
  'GEN-1' | 'GEN-2' | 'GEN-3' | 'GEN-4' | 'GEN-5' | 'GEN-6' | 'GEN-7' | 'GEN-8';

export interface StudentDragonRecord {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  genome: DragonLabGenome;
  parentIds: [string, string];
  generation: number;
}

export interface BatchObservation {
  size: number;
  run: number;
  dominantCounts: Record<DragonTraitId, number>;
  sample: StudentDragonRecord[];
}

export interface DragonBattleResult {
  won: boolean;
  winnerName: string;
  elapsedSeconds: number;
  remainingHealthPercent: number;
}
