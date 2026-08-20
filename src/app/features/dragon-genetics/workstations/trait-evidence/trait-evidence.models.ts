import { DragonParentProfile } from '../../simulation/domain/dragon-lab.models';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { AssemblyCombatProfile } from '../../../../shared/assembly/combat/assembly-combat.models';
import { AssemblyAbilityId } from '../../../../shared/assembly/combat/assembly-abilities';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';

export const TRAIT_EVIDENCE_SCHEMA_VERSION = 2;

export type TraitEvidenceObservationId =
  | 'wings'
  | 'horns'
  | 'scales'
  | 'tail'
  | 'fire'
  | 'fire-reflex'
  | 'guard-command'
  | 'tail-strike-command'
  | 'target-touch';

export type LearnedBehaviorId = 'guard-command' | 'tail-strike-command' | 'target-touch';
export type TrialObservationId = LearnedBehaviorId | 'fire-reflex';

export type TraitEvidenceClassification = 'inherited' | 'innate' | 'learned' | 'insufficient';

export type TraitEvidenceKind =
  | 'live-observation'
  | 'cue-trial'
  | 'reflex-trial'
  | 'hatch-record'
  | 'family-record'
  | 'training-record';

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
  observationId: TrialObservationId;
  kind: 'command' | 'reflex';
  responded: boolean;
  result: string;
  reactionTimeMs?: number;
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
  sex: DragonSex;
  profile: DragonParentProfile;
  source: SpecimenSource;
  combatProfile: AssemblyCombatProfile;
  fireBreathing: boolean;
  horned: boolean;
  trainedBehaviorIds: readonly LearnedBehaviorId[];
  reflexLatencyMs: number;
  card: TraitEvidenceDragonCard;
}

export interface TraitEvidenceDragonCardStat {
  id: 'power' | 'guard' | 'vitality' | 'versatility';
  label: string;
  value: number;
}

export interface TraitEvidenceDragonCard {
  catalogNumber: string;
  seriesLabel: string;
  arenaRating: number;
  battleRole: string;
  stats: readonly TraitEvidenceDragonCardStat[];
}

export interface TraitEvidenceObservationDefinition {
  id: TraitEvidenceObservationId;
  label: string;
  kind: 'appearance' | 'ability' | 'reflex' | 'command';
  expectedClassification: Exclude<TraitEvidenceClassification, 'insufficient'>;
  focusTraitId: string | null;
  actionLabel?: string;
  ability?: AssemblyAbilityId;
}
