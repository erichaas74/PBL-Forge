import {
  DragonLabGenome,
  DragonTraitId,
  TraitSortCategory,
} from './simulation/domain/dragon-lab.models';
import { TraitEvidenceRecord } from './simulation/domain/trait-evidence.models';
import { GenomeMicroscopeRecord } from './simulation/domain/genome-microscope.models';
import { GenotypeScanRecord } from './simulation/domain/genotype-scanner.models';
import { AlleleWorkbenchRecord } from './simulation/domain/allele-workbench.models';

export type DragonModuleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type DragonLabMode = 'learn' | 'practice' | 'official';
export type GeneticsSkill =
  | 'GEN-1'
  | 'GEN-2'
  | 'GEN-3'
  | 'GEN-4'
  | 'GEN-5'
  | 'GEN-6'
  | 'GEN-7'
  | 'GEN-8';

export interface DragonModuleDefinition {
  number: DragonModuleNumber;
  week: 1 | 2 | 3;
  title: string;
  shortTitle: string;
  learningTarget: string;
  evidence: string;
  skills: GeneticsSkill[];
}

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

export interface MasteryRecord {
  level: 1 | 2 | 3 | 4;
  correct: number;
  total: number;
  attempts: number;
  misconceptionFlags: string[];
}

export interface OfficialBreedingAttempt {
  id: string;
  parentIds: [string, string];
  predictions: Record<DragonTraitId, number>;
  genotypePredictions: Record<DragonTraitId, string>;
  predictionAccuracy: number;
  diversityScore: number;
  offspring: StudentDragonRecord[];
  createdAtIso: string;
}

export interface DragonBattleResult {
  won: boolean;
  winnerName: string;
  elapsedSeconds: number;
  remainingHealthPercent: number;
}

export interface DragonLabEvent {
  type: string;
  module: DragonModuleNumber;
  mode: DragonLabMode;
  detail: string;
  createdAtIso: string;
}

export interface DragonGeneticsSnapshot {
  schemaVersion: 3;
  activeModule: DragonModuleNumber;
  activeMode: DragonLabMode;
  completedModules: DragonModuleNumber[];
  mastery: Partial<Record<GeneticsSkill, MasteryRecord>>;
  diagnosticAnswers: Record<string, string>;
  correctedMisconception: string;
  teamRole: string;
  sortAnswers: Partial<Record<string, TraitSortCategory>>;
  /** Trait Evidence Analyzer results: one compact record per completed observation. */
  traitEvidenceRecords: TraitEvidenceRecord[];
  /** Genome Microscope prediction, hierarchy, and evidence records. */
  genomeMicroscopeRecords: GenomeMicroscopeRecord[];
  /** Genotype Scanner selection, scan, and evidence records. */
  genotypeScanRecords: GenotypeScanRecord[];
  /** Allele Workbench construction, prediction, expression, and evidence records. */
  alleleWorkbenchRecords: AlleleWorkbenchRecord[];
  genomePath: string[];
  genomeQuickAnswers: Record<string, string>;
  phenotypeAnswers: Record<string, string>;
  ruleAnswers: Record<string, string>;
  parentAId: string;
  parentBId: string;
  predictions: Partial<Record<DragonTraitId, number>>;
  genotypePredictions: Partial<Record<DragonTraitId, string>>;
  predictionsChecked: boolean;
  predictionAccuracy: number;
  smallBatch: BatchObservation | null;
  largeBatch: BatchObservation | null;
  reproductionAnswer: 'sexual' | 'asexual' | null;
  siblingIds: string[];
  siblingExplanation: string;
  recommendedPairId: string | null;
  diversityRecommendation: string;
  diversityStrategy: 'narrow' | 'balanced' | null;
  peerReview: string;
  week1Answers: Record<string, string>;
  week1Score: number | null;
  week1Passed: boolean;
  week2Answers: Record<string, string>;
  week2Score: number | null;
  week2Passed: boolean;
  licenseQuestionOrder: string[];
  licenseAnswers: Record<string, string>;
  licenseScore: number | null;
  licensePassed: boolean;
  officialPredictions: Partial<Record<DragonTraitId, number>>;
  officialGenotypePredictions: Partial<Record<DragonTraitId, string>>;
  officialAttempts: OfficialBreedingAttempt[];
  officialPool: StudentDragonRecord[];
  championId: string | null;
  finalEvidence: string;
  defenseAnswers: string[];
  reflectionAnswers: string[];
  battleResult: DragonBattleResult | null;
  finalSubmitted: boolean;
  events: DragonLabEvent[];
  updatedAtIso: string;
}

export interface LicenseQuestion {
  id: string;
  skill: GeneticsSkill;
  prompt: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
  misconceptionFlag?: string;
}

export interface TraitRuleChallenge {
  id: string;
  traitId: DragonTraitId;
  genotype: [string, string];
  prompt: string;
  correctAnswer: 'dominant' | 'recessive';
}
