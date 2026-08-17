import { GeneticsSkill } from '../../dragon-genetics.models';

export type DragonLearningPathId = 'dragon-arena' | 'mini-dragon-show';
export type DragonLineage = 'classic' | 'mini';
export type DragonJourneySex = 'female' | 'male';

export type DragonLessonId =
  | 'arena-meet-pair'
  | 'arena-map-genome'
  | 'arena-test-alleles'
  | 'arena-predict-cross'
  | 'arena-breed-generation-one'
  | 'arena-study-offspring'
  | 'arena-refine-line'
  | 'arena-capstone'
  | 'show-meet-pair'
  | 'show-write-standard'
  | 'show-plan-cross'
  | 'show-breed-generation-one'
  | 'show-read-pedigree'
  | 'show-refine-line'
  | 'show-capstone';

export type DragonJourneyMetric =
  | 'roster.starter-dragons'
  | 'roster.bred-dragons'
  | 'trait.claims'
  | 'notebook.experiments'
  | 'hatchery.fertilizations'
  | 'companion.standard-targets'
  | 'companion.selected-parents'
  | 'companion.litters'
  | 'companion.kept-dragons'
  | 'companion.training-sessions'
  | 'companion.show-runs'
  | 'companion.registry-entries'
  | 'arena.trials';

export type DragonLessonRequirement =
  | {
      id: string;
      kind: 'activity-complete';
      activityId: string;
      label: string;
    }
  | {
      id: string;
      kind: 'metric';
      metric: DragonJourneyMetric;
      minimum: number;
      label: string;
      teacherAdjustable?: boolean;
    };

export interface DragonLessonDefinition {
  id: DragonLessonId;
  pathId: DragonLearningPathId;
  title: string;
  story: string;
  learningGoal: string;
  masterySkillIds: readonly GeneticsSkill[];
  workstationVisits: readonly {
    activityId: string;
    route: string;
    title: string;
    supportsLineage: DragonLineage;
    launchHint: string;
  }[];
  requirements: readonly DragonLessonRequirement[];
}

export interface DragonLearningPathDefinition {
  id: DragonLearningPathId;
  title: string;
  shortTitle: string;
  description: string;
  lineage: DragonLineage;
  starterPairPresetId: string;
  lessonIds: readonly DragonLessonId[];
  capstoneLessonId: DragonLessonId;
  capstoneActivityId: 'dragon-arena' | 'companion-show';
  sideQuestActivityIds: readonly string[];
  freePlayActivityIds: readonly string[];
}

export interface DragonStarterPairPreset {
  id: string;
  pathId: DragonLearningPathId;
  lineage: DragonLineage;
  label: string;
  starters: readonly [
    { dragonId: string; sex: 'female'; label: string },
    { dragonId: string; sex: 'male'; label: string },
  ];
}

export interface DragonRequirementOverride {
  minimum?: number;
}

export interface DragonClassPathSetting {
  lessonIds: readonly DragonLessonId[];
  requiredLessonIds: readonly DragonLessonId[];
  starterPairPresetId: string;
  requirementOverrides: Readonly<Record<string, DragonRequirementOverride | undefined>>;
}

export interface DragonClassJourneyPlan {
  schemaVersion: 1;
  selectionMode: 'student-choice' | 'teacher-assigned';
  offeredPathIds: readonly DragonLearningPathId[];
  defaultPathId: DragonLearningPathId;
  pathSettings: Readonly<Record<DragonLearningPathId, DragonClassPathSetting>>;
  sideQuestActivityIds: readonly string[];
}

export interface DragonJourneyRosterSnapshot {
  schemaVersion: 1;
  studentId: string;
  assignmentId: string;
  pathId: DragonLearningPathId;
  starterPairPresetId: string;
  starters: readonly [
    { dragonId: string; sex: 'female'; label: string },
    { dragonId: string; sex: 'male'; label: string },
  ];
  createdAtIso: string;
}

export interface DragonJourneyProgressSnapshot {
  schemaVersion: 1;
  studentId: string;
  assignmentId: string;
  selectedPathId: DragonLearningPathId | null;
  lastLessonId: DragonLessonId | null;
  visitedLessonIds: readonly DragonLessonId[];
  updatedAtIso: string;
}

export interface DragonRequirementResult {
  requirement: DragonLessonRequirement;
  current: number;
  required: number;
  met: boolean;
}

export interface DragonLessonViewModel {
  definition: DragonLessonDefinition;
  order: number;
  required: boolean;
  complete: boolean;
  active: boolean;
  requirements: readonly DragonRequirementResult[];
}

export interface DragonRosterViewModel {
  lineage: DragonLineage;
  starters: DragonJourneyRosterSnapshot['starters'];
  bredCount: number;
  availableCount: number;
}
