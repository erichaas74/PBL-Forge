import { GeneticsSkill } from '../dragon-genetics.models';
import { DragonTraitId } from '../simulation/domain/dragon-lab.models';

export type WiseDragonMode = 'practice-defense';

export type WiseDragonEmotion = 'neutral' | 'inquisitive' | 'skeptical' | 'pleased' | 'warning';

export type WiseDragonAnimation =
  'idle' | 'thinking' | 'speaking' | 'inquisitive' | 'skeptical' | 'pleased' | 'warning';

/**
 * Renderer-safe commands supported by Prototype 1.
 *
 * This is intentionally smaller than the model-facing ideas in the prototype brief. A provider
 * never receives Three.js vectors, mesh names, material names, or arbitrary animation clips.
 */
export type WiseDragonSpecimenAction =
  { type: 'focus-trait'; traitId: DragonTraitId } | { type: 'reset-view' };

export interface WiseDragonDefenseBrief {
  schemaVersion: 1;
  claim: string;
  evidenceTraitIds: readonly DragonTraitId[];
  reasoning: string;
}

export interface WiseDragonTraitContext {
  traitId: DragonTraitId;
  traitName: string;
  genotype: string;
  phenotype: string;
  arenaEffect: string;
}

export interface WiseDragonTrialContext {
  trialId: string;
  won: boolean;
  elapsedSeconds: number;
  remainingHealthPercent: number;
  score: number;
}

/** Minimal, non-identifying project context approved for one practice session. */
export interface WiseDragonConversationContext {
  schemaVersion: 1;
  projectId: 'dragon-genetics-lab';
  activityId: 'dragon-arena';
  mode: WiseDragonMode;
  champion: {
    id: string;
    name: string;
    generation: number;
    traits: readonly WiseDragonTraitContext[];
  };
  trial: WiseDragonTrialContext;
  brief: WiseDragonDefenseBrief;
  masterySkillIds: readonly GeneticsSkill[];
}

export interface WiseDragonConversationTurn {
  id: string;
  role: 'student' | 'wise-dragon';
  message: string;
}

export type WiseDragonEvidenceStatus =
  'not-connected' | 'needs-more-evidence' | 'developing' | 'supported';

export interface WiseDragonSummaryCriterion {
  criterionId: 'claim' | 'trait-evidence' | 'genotype-phenotype' | 'arena-consequence';
  label: string;
  status: WiseDragonEvidenceStatus;
  evidenceSummary: string;
  supportingTurnIds: readonly string[];
}

/** Advisory practice record. It is never a grade or canonical project mastery record. */
export interface WiseDragonPracticeSummary {
  schemaVersion: 1;
  title: string;
  overview: string;
  criteria: readonly WiseDragonSummaryCriterion[];
  reviewStatus: 'provisional';
}

export interface WiseDragonReply {
  schemaVersion: 1;
  message: string;
  emotion: WiseDragonEmotion;
  animation: WiseDragonAnimation;
  specimenAction?: WiseDragonSpecimenAction;
  continueDefense: boolean;
  summary?: WiseDragonPracticeSummary;
}

export interface StartWiseDragonSessionRequest {
  schemaVersion: 1;
  sessionId: string;
  context: WiseDragonConversationContext;
}

export interface ContinueWiseDragonSessionRequest {
  schemaVersion: 1;
  sessionId: string;
  expectedRevision: number;
  context: WiseDragonConversationContext;
  history: readonly WiseDragonConversationTurn[];
}
