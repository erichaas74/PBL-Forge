export type ProjectActivityKind =
  | 'workstation'
  | 'checkpoint'
  | 'assessment'
  | 'final-challenge'
  | 'extension';

export type ProjectActivityProgressStatus =
  | 'not-started'
  | 'in-progress'
  | 'submitted'
  | 'needs-revision'
  | 'complete';

export type ProjectActivityAvailability = 'available' | 'locked';

export type ProjectMasteryLevel = 1 | 2 | 3 | 4;

export interface ProjectThemeDefinition {
  id: string;
  template: string;
  accentStyle: string;
  mapLayout?: string;
  backgroundAsset?: string;
}

export interface ProjectStageDefinition {
  id: string;
  title: string;
  order: number;
}

export interface ProjectPathDefinition {
  id: string;
  title: string;
  objective: string;
  outcomeLabel: string;
  order: number;
  activityIds: readonly string[];
  entryActivityId: string;
  finalActivityId: string;
}

export interface ProjectMasterySkillDefinition {
  id: string;
  title: string;
  order: number;
}

export interface ProjectMasteryRequirement {
  skillId: string;
  minimumLevel: ProjectMasteryLevel;
}

export interface ProjectMapPosition {
  xPercent: number;
  yPercent: number;
}

export interface ProjectActivityDefinition {
  id: string;
  stageId: string;
  title: string;
  objective: string;
  route: string;
  order: number;
  kind: ProjectActivityKind;
  required: boolean;
  prerequisiteActivityIds?: readonly string[];
  masteryRequirements?: readonly ProjectMasteryRequirement[];
  masterySkillIds?: readonly string[];
  estimatedMinutes?: number;
  mapPosition?: ProjectMapPosition;
}

export interface ProjectHubDefinition {
  schemaVersion: 1;
  id: string;
  title: string;
  mission: string;
  subject: string;
  gradeBand: string;
  theme: ProjectThemeDefinition;
  stages: readonly ProjectStageDefinition[];
  paths?: readonly ProjectPathDefinition[];
  activities: readonly ProjectActivityDefinition[];
  masterySkills: readonly ProjectMasterySkillDefinition[];
}

export interface ProjectActivityAssignmentSetting {
  released?: boolean;
  required?: boolean;
  dueAtIso?: string;
}

export interface ProjectHubAssignment {
  id: string;
  projectId: string;
  classId: string;
  activitySettings: Readonly<Record<string, ProjectActivityAssignmentSetting | undefined>>;
}

export interface ProjectActivityProgressRecord {
  activityId: string;
  status: Exclude<ProjectActivityProgressStatus, 'not-started'>;
  evidenceIds: readonly string[];
  startedAtIso?: string;
  updatedAtIso: string;
}

export interface ProjectMasteryRecord {
  skillId: string;
  level: ProjectMasteryLevel;
  evidenceIds: readonly string[];
  updatedAtIso: string;
}

export interface StudentProjectState {
  studentId: string;
  assignmentId: string;
  activityProgress: Readonly<Record<string, ProjectActivityProgressRecord | undefined>>;
  mastery: Readonly<Record<string, ProjectMasteryRecord | undefined>>;
  selectedPathId?: string;
  teamId?: string;
}

export type ProjectActivityLockReason =
  | { kind: 'not-released' }
  | { kind: 'path-not-selected'; pathId: string }
  | { kind: 'prerequisite'; activityId: string }
  | {
      kind: 'mastery';
      skillId: string;
      requiredLevel: ProjectMasteryLevel;
      currentLevel: ProjectMasteryLevel | 0;
    };

export interface ProjectActivityViewModel {
  id: string;
  stageId: string;
  title: string;
  objective: string;
  route: string;
  order: number;
  kind: ProjectActivityKind;
  pathId: string | null;
  required: boolean;
  status: ProjectActivityProgressStatus;
  availability: ProjectActivityAvailability;
  lockReasons: readonly ProjectActivityLockReason[];
  evidenceCount: number;
  isNextAction: boolean;
}

export interface ProjectStageViewModel {
  id: string;
  title: string;
  order: number;
  progressPercent: number;
  activities: readonly ProjectActivityViewModel[];
}

export interface ProjectNextAction {
  kind: 'activity';
  activityId: string;
  title: string;
  objective: string;
  route: string;
  reason: 'needs-revision' | 'resume' | 'start' | 'extension';
}

export interface ProjectPathChoiceAction {
  kind: 'choose-path';
  title: string;
  objective: string;
  pathIds: readonly string[];
}

export interface ProjectPathViewModel {
  id: string;
  title: string;
  objective: string;
  outcomeLabel: string;
  order: number;
  selected: boolean;
  progressPercent: number;
}

export interface ProjectHubViewModel {
  projectId: string;
  title: string;
  mission: string;
  progressPercent: number;
  completedRequiredCount: number;
  requiredActivityCount: number;
  nextAction: ProjectNextAction | ProjectPathChoiceAction | null;
  selectedPathId: string | null;
  paths: readonly ProjectPathViewModel[];
  stages: readonly ProjectStageViewModel[];
}
