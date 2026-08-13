import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';

export type IncubatorInheritanceModel = 'balanced-punnett-v2';

export interface IncubatorOffspringObservation {
  id: string;
  phenotypeId: string;
  phenotypeLabel: string;
}

export interface IncubatorPhenotypeResult {
  id: string;
  label: string;
  count: number;
  percentage: number;
  offspringIds: readonly string[];
}

export interface IncubatorBatchRecord {
  id: string;
  generation: number;
  runNumber: number;
  parentIds: readonly [string, string];
  /** All contributing parents, ordered for deterministic, balanced pairing. */
  breedingPoolIds: readonly string[];
  /** Internal model version only; never presented on the phenotype-only surface. */
  inheritanceModel: IncubatorInheritanceModel;
  traitId: DragonTraitId;
  size: number;
  offspring: readonly IncubatorOffspringObservation[];
  results: readonly IncubatorPhenotypeResult[];
  selectedForLaterBreedingIds: readonly string[];
  createdAtIso: string;
}

export interface IncubatorSamplerSnapshot {
  schemaVersion: 2;
  studentId: string;
  originalParentIds: readonly [string | null, string | null];
  activeParentIds: readonly [string | null, string | null];
  activeBreedingPoolIds: readonly string[];
  selectedTraitId: DragonTraitId;
  sampleSize: number;
  nextRunNumber: number;
  batches: readonly IncubatorBatchRecord[];
}
