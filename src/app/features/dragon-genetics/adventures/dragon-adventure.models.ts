/**
 * Runtime status: ACTIVE — shared serializable contract for optional multi-page adventures.
 * Inputs/signals: authored chapter/checkpoint definitions and student adventure progress.
 * Data access: persisted by DragonAdventureProgressRepository; scientific records stay in labs.
 * Connects to: adventure registry, shell, case outcomes, and pedigree checkpoint adapter.
 */
import { DragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';

export type DragonAdventureId =
  | 'pedigree-reading'
  | 'pedigree-models'
  | 'dragon-in-the-ash'
  | 'food-that-steals-fire';

export type DragonAdventureKind = 'extra-lesson' | 'commission';
export type DragonAdventureChapterKind =
  | 'offer'
  | 'briefing'
  | 'investigation'
  | 'decision'
  | 'outcome';
export type DragonAdventureRuntimeState =
  | 'offered'
  | 'investigating'
  | 'revision-needed'
  | 'resolved';

export interface DragonAdventureCheckpointDefinition {
  id: string;
  label: string;
}

export interface DragonAdventurePanel {
  title: string;
  text: string;
  speaker?: string;
}

export interface DragonAdventureChapterDefinition {
  id: string;
  kind: DragonAdventureChapterKind;
  kicker: string;
  title: string;
  summary: string;
  panels?: readonly DragonAdventurePanel[];
}

export interface DragonAdventureDefinition {
  id: DragonAdventureId;
  kind: DragonAdventureKind;
  lessonId: string;
  title: string;
  subtitle: string;
  clientName: string;
  clientRole: string;
  storyQuestion: string;
  rewardId: string;
  rewardLabel: string;
  theme: 'frost' | 'stone' | 'ash' | 'fire';
  illustration: {
    src: string;
    alt: string;
    storyCaption: string;
    choiceCaption: string;
    objectPosition?: string;
  };
  workstation: {
    route: string;
    title: string;
    investigationId?: 'frost-scale' | 'stonewake-tail';
  };
  checkpoints: readonly DragonAdventureCheckpointDefinition[];
  chapters: readonly DragonAdventureChapterDefinition[];
}

export interface DragonAdventureProgress {
  schemaVersion: 1;
  studentId: string;
  pathId: DragonPathContextId;
  adventureId: DragonAdventureId;
  runtimeState: DragonAdventureRuntimeState;
  currentChapterId: string;
  completedCheckpointIds: readonly string[];
  citedEvidenceIds: readonly string[];
  decisions: Readonly<Record<string, string>>;
  outcomeMessage: string;
  acceptedAtIso: string | null;
  completedAtIso: string | null;
  earnedRewardIds: readonly string[];
  updatedAtIso: string;
}
