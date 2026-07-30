import { DragonTraitId } from './dragon-lab.models';

export type AlleleWorkbenchMode = 'learn' | 'practice' | 'official' | 'reteach';
export type AllelePhenotypePrediction = 'dominant' | 'recessive';
export type AlleleGenotypeClass =
  | 'homozygous-dominant'
  | 'heterozygous'
  | 'homozygous-recessive';
export type AlleleRuleEvidenceId =
  | 'at-least-one-dominant'
  | 'two-recessive-required'
  | 'recessive-remains-present';
export type AlleleWorkbenchMisconception =
  | 'dominant-means-stronger'
  | 'heterozygous-loses-recessive'
  | 'one-recessive-is-enough';

export interface AlleleWorkbenchTask {
  id: string;
  traitId: DragonTraitId;
  prompt: string;
  startingAlleles: readonly [string, string];
  requestedAlleles: readonly [string, string];
  correctPrediction: AllelePhenotypePrediction;
  evidenceId: AlleleRuleEvidenceId;
  explanation: string;
  misconception: AlleleWorkbenchMisconception;
}

export interface AlleleWorkbenchRecord {
  sceneId: string;
  seed: string;
  sampleId: string;
  taskId: string;
  mode: AlleleWorkbenchMode;
  traitId: DragonTraitId;
  focusGeneId: string;
  startingAlleles: readonly [string, string];
  workingAlleles: readonly [string, string];
  requestedAlleles: readonly [string, string];
  constructionCorrect: boolean;
  predictedPhenotypeId: AllelePhenotypePrediction;
  actualPhenotypeId: AllelePhenotypePrediction;
  predictionCorrect: boolean;
  genotypeClassId: AlleleGenotypeClass;
  carrierState: boolean;
  evidenceId: AlleleRuleEvidenceId;
  evidenceCorrect: boolean;
  misconception: AlleleWorkbenchMisconception | null;
  moveCount: number;
  elapsedMs: number;
  createdAtIso: string;
}

export interface AlleleWorkbenchSetResult {
  mode: AlleleWorkbenchMode;
  correct: number;
  total: number;
  misconceptions: readonly AlleleWorkbenchMisconception[];
}
