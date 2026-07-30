import { DragonEvidenceSourceId, DragonTraitCategory } from '../../../../shared/dragon-visuals';

export type TraitEvidenceCategory = DragonTraitCategory;
export type TraitEvidenceSetId = 'learn' | 'practice' | 'official' | 'reteach';
export type TraitEvidenceMode = 'learn' | 'practice' | 'official' | 'reteach';

export type TraitEvidenceMisconception =
  | 'acquired-marked-inherited'
  | 'inherited-marked-acquired'
  | 'learned-environment-swap'
  | 'usefulness-reasoning'
  | 'body-feature-bias';

export interface TraitEvidenceClueDefinition {
  id: string;
  text: string;
  sourceId: DragonEvidenceSourceId;
  /** Absent on the clue that actually supports the classification. */
  misconception?: TraitEvidenceMisconception;
}

export interface TraitEvidenceObservation {
  id: string;
  label: string;
  detail: string;
  category: TraitEvidenceCategory;
  sourceId: DragonEvidenceSourceId;
  /** Named at reveal so feedback explains the rule instead of only marking an answer. */
  rule: string;
  clues: readonly TraitEvidenceClueDefinition[];
  correctClueId: string;
  sets: readonly TraitEvidenceSetId[];
  /** Links the observation to the Module 1 trait-sort card it grades. */
  sortCardId?: string;
}

/** Compact assessment evidence for one completed observation. */
export interface TraitEvidenceRecord {
  sceneId: string;
  seed: string;
  sampleId: string;
  observationId: string;
  mode: TraitEvidenceMode;
  predictedCategory: TraitEvidenceCategory | null;
  placedCategory: TraitEvidenceCategory;
  actualCategory: TraitEvidenceCategory;
  correct: boolean;
  pinnedClueId: string | null;
  clueCorrect: boolean;
  attempts: number;
  misconception: TraitEvidenceMisconception | null;
  elapsedMs: number;
  createdAtIso: string;
}

export interface TraitEvidenceSetResult {
  mode: TraitEvidenceMode;
  correct: number;
  total: number;
  misconceptions: readonly TraitEvidenceMisconception[];
}

export interface TraitEvidenceClassification {
  observationId: string;
  sortCardId: string;
  category: TraitEvidenceCategory;
}
