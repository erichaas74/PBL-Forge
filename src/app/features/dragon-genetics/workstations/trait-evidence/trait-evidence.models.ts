import { DragonParentProfile } from '../../simulation/domain/dragon-lab.models';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';

export const TRAIT_EVIDENCE_SCHEMA_VERSION = 1;

export type TraitEvidenceObservationId =
  | 'wings'
  | 'horns'
  | 'scales'
  | 'fire'
  | 'bell-bow'
  | 'target-touch'
  | 'wait-release'
  | 'soot-mark';

export type LearnedBehaviorId = 'bell-bow' | 'target-touch' | 'wait-release';

export type TraitEvidenceClassification =
  'inherited' | 'learned' | 'environmental' | 'insufficient';

export type TraitEvidenceKind =
  | 'live-observation'
  | 'cue-trial'
  | 'hatch-record'
  | 'family-record'
  | 'training-record'
  | 'environment-record';

export interface TraitEvidenceRecord {
  id: string;
  observationId: TraitEvidenceObservationId;
  kind: TraitEvidenceKind;
  label: string;
  detail: string;
}

export interface TraitEvidenceTrial {
  id: string;
  specimenId: string;
  behaviorId: LearnedBehaviorId;
  responded: boolean;
  result: string;
  testedAtIso: string;
}

export interface TraitEvidenceClaim {
  observationId: TraitEvidenceObservationId;
  specimenId: string;
  classification: TraitEvidenceClassification;
  evidenceIds: readonly string[];
  supported: boolean;
  updatedAtIso: string;
}

export interface TraitEvidenceSnapshot {
  schemaVersion: typeof TRAIT_EVIDENCE_SCHEMA_VERSION;
  studentId: string;
  observedCharacteristicIds: readonly TraitEvidenceObservationId[];
  trials: readonly TraitEvidenceTrial[];
  claims: readonly TraitEvidenceClaim[];
  updatedAtIso: string;
}

export interface TraitEvidenceDragon {
  id: string;
  name: string;
  profile: DragonParentProfile;
  source: SpecimenSource;
  trainedBehaviorIds: readonly LearnedBehaviorId[];
  hasSootMark: boolean;
}

export interface TraitEvidenceObservationDefinition {
  id: TraitEvidenceObservationId;
  label: string;
  kind: 'appearance' | 'ability' | 'behavior' | 'environment';
  expectedClassification: Exclude<TraitEvidenceClassification, 'insufficient'>;
  focusTraitId: string | null;
  cueLabel?: string;
}
