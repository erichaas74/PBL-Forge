import { DragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';

export type DragonCaseId = 'dragon-in-the-ash' | 'food-that-steals-fire';

export interface DragonCaseDefinition {
  id: DragonCaseId;
  anchorLessonId: string;
  pathIds: readonly DragonPathContextId[];
  title: string;
  subtitle: string;
  clientName: string;
  clientRole: string;
  problem: string;
  constraint: string;
  acceptance: string;
  missionText: string;
  workstation: {
    id: 'blood-type-lab' | 'protein-rescue';
    title: string;
    route: '/dragon-genetics/blood-type-lab' | '/dragon-genetics/protein-rescue';
  };
}

export type DragonCaseRuntimeState =
  | 'offered'
  | 'investigating'
  | 'revision-needed'
  | 'resolved';

export interface DragonCasePlan {
  id: string;
  caseId: DragonCaseId;
  patientEvidenceId?: string;
  donorEvidenceId?: string;
  rescueEvidenceId?: string;
  citedEvidenceIds: readonly string[];
  diagnosis: string;
  recommendation: string;
  claimReview?: 'supported' | 'contradicted' | 'insufficient';
  lockedAtIso: string;
}

export interface DragonCaseOutcome {
  id: string;
  caseId: DragonCaseId;
  planId: string;
  reasoning: 'supported' | 'unsupported';
  patientOutcome: 'stable' | 'treatment-paused' | 'recovering' | 'diet-paused';
  compatible: boolean;
  explanation: string;
  resolvedAtIso: string;
}

export interface DragonCaseProgress {
  schemaVersion: 1;
  studentId: string;
  pathId: DragonPathContextId;
  caseId: DragonCaseId;
  runtimeState: DragonCaseRuntimeState;
  acceptedAtIso: string | null;
  plans: readonly DragonCasePlan[];
  latestOutcome: DragonCaseOutcome | null;
  earnedRewardIds: readonly string[];
  updatedAtIso: string;
}
