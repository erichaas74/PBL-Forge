import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';

export type DragonHatcheryMode = 'learn' | 'practice' | 'official' | 'reteach';

export type HatcheryMisconception =
  /** Believes a hatched dragon reveals the alleles it carries. */
  | 'hatching-shows-genotype'
  /** Believes two eggs that show the same trait must carry the same alleles. */
  | 'same-phenotype-same-genotype'
  /** Believes the dominant trait must appear in most of a clutch. */
  | 'dominant-means-common'
  /** Treats the few eggs examined as if they described the whole clutch. */
  | 'sample-equals-clutch';

export interface HatcheryEvidenceOption {
  id: string;
  text: string;
  /** Semantic target the mark points at, such as `allele-slot-a`. */
  anchorId?: string;
  /** Absent on the mark that actually supports the claim. */
  misconception?: HatcheryMisconception;
}

/** What one egg turned out to be, saved whether or not the student opened it. */
export interface HatcheryEggOutcome {
  eggId: string;
  position: number;
  examined: boolean;
  sampled: boolean;
  hatched: boolean;
  /** Focus-gene genotype, or the whole genome when no gene is in focus. */
  genotype: string;
  phenotype: string;
}

/** Compact assessment evidence for one visit to the hatchery. */
export interface HatcheryRunRecord {
  sceneId: string;
  seed: string;
  moduleId: string;
  clutchId: string;
  mode: DragonHatcheryMode;
  focusTraitId: DragonTraitId | null;
  focusGeneId: string | null;
  clutchSize: number;
  examinedEggIds: readonly string[];
  sampledEggIds: readonly string[];
  hatchedEggIds: readonly string[];
  /** Predicted number of eggs in the clutch showing the dominant phenotype. */
  predictedDominantCount: number | null;
  actualDominantCount: number | null;
  hatchedDominantCount: number | null;
  predictionCorrect: boolean | null;
  evidenceMarkId: string | null;
  evidenceCorrect: boolean | null;
  misconception: HatcheryMisconception | null;
  eggs: readonly HatcheryEggOutcome[];
  attempts: number;
  elapsedMs: number;
  createdAtIso: string;
}
