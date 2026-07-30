import { DragonGenomeLevelId } from '../../../../shared/dragon-visuals';
import { DragonTraitId } from './dragon-lab.models';

export type GenomeMicroscopeMode = 'learn' | 'practice' | 'official' | 'reteach';
export type GenomeMicroscopeMisconception =
  | 'hierarchy-confusion'
  | 'chromosome-is-gene'
  | 'gene-is-allele'
  | 'base-pair-is-allele';

export interface GenomeMicroscopeTask {
  id: string;
  prompt: string;
  targetLevel: DragonGenomeLevelId;
  evidenceLevel: DragonGenomeLevelId;
  focusTraitId: DragonTraitId;
  explanation: string;
  misconception: GenomeMicroscopeMisconception;
}

export interface GenomeMicroscopeRecord {
  sceneId: string;
  seed: string;
  sampleId: string;
  taskId: string;
  mode: GenomeMicroscopeMode;
  focusGeneId: string;
  predictedLevel: DragonGenomeLevelId;
  requestedLevel: DragonGenomeLevelId;
  predictionCorrect: boolean;
  hierarchyCorrect: boolean;
  hierarchyAttempts: number;
  evidenceLevelId: DragonGenomeLevelId;
  evidenceCorrect: boolean;
  misconception: GenomeMicroscopeMisconception | null;
  elapsedMs: number;
  createdAtIso: string;
}

export interface GenomeMicroscopeSetResult {
  mode: GenomeMicroscopeMode;
  correct: number;
  total: number;
  misconceptions: readonly GenomeMicroscopeMisconception[];
}
