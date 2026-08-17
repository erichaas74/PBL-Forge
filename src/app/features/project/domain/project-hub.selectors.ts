import {
  ProjectActivityDefinition,
  ProjectActivityProgressStatus,
  ProjectActivityViewModel,
  ProjectHubAssignment,
  ProjectHubDefinition,
  ProjectHubViewModel,
  ProjectNextAction,
  ProjectPathDefinition,
  ProjectPathViewModel,
  ProjectStageViewModel,
  StudentProjectState,
} from './project-hub.models';

export function buildProjectHubViewModel(
  definition: ProjectHubDefinition,
  assignment: ProjectHubAssignment,
  studentState: StudentProjectState,
): ProjectHubViewModel {
  assertCompatibleInputs(definition, assignment, studentState);

  const activityDefinitions = [...definition.activities].sort(byOrderThenTitle);
  const paths = [...(definition.paths ?? [])].sort(byOrderThenTitle);
  const pathByActivityId = pathActivityIndex(paths);
  const activities = activityDefinitions.map((activity) =>
    buildActivityViewModel(
      activity,
      assignment,
      studentState,
      pathByActivityId.get(activity.id) ?? null,
    ),
  );
  const nextAction = selectNextAction(activities, paths, studentState.selectedPathId ?? null);
  const activitiesWithNextAction = activities.map((activity) => ({
    ...activity,
    isNextAction: nextAction?.kind === 'activity' && activity.id === nextAction.activityId,
  }));
  const requiredActivities = activitiesWithNextAction.filter((activity) => activity.required);
  const completedRequiredCount = requiredActivities.filter(
    (activity) => activity.status === 'complete',
  ).length;

  return {
    projectId: definition.id,
    title: definition.title,
    mission: definition.mission,
    progressPercent: percent(completedRequiredCount, requiredActivities.length),
    completedRequiredCount,
    requiredActivityCount: requiredActivities.length,
    nextAction,
    selectedPathId: studentState.selectedPathId ?? null,
    paths: buildPathViewModels(paths, activitiesWithNextAction, studentState.selectedPathId),
    stages: buildStageViewModels(definition, activitiesWithNextAction),
  };
}

function buildActivityViewModel(
  activity: ProjectActivityDefinition,
  assignment: ProjectHubAssignment,
  studentState: StudentProjectState,
  pathId: string | null,
): ProjectActivityViewModel {
  const setting = assignment.activitySettings[activity.id];
  const progress = studentState.activityProgress[activity.id];
  const belongsToSelectedPath = !pathId || pathId === studentState.selectedPathId;

  return {
    id: activity.id,
    stageId: activity.stageId,
    title: activity.title,
    objective: activity.objective,
    route: activity.route,
    order: activity.order,
    kind: activity.kind,
    pathId,
    required: belongsToSelectedPath && (setting?.required ?? activity.required),
    status: progress?.status ?? 'not-started',
    // Release, prerequisite, mastery, and path data guide progress; they never gate entry.
    availability: 'available',
    lockReasons: [],
    evidenceCount: progress?.evidenceIds.length ?? 0,
    isNextAction: false,
  };
}

function selectNextAction(
  activities: readonly ProjectActivityViewModel[],
  paths: readonly ProjectPathDefinition[],
  selectedPathId: string | null,
): ProjectHubViewModel['nextAction'] {
  const required = activities.filter((activity) => activity.required);
  const requiredAction =
    findAction(required, 'needs-revision') ??
    findAction(required, 'in-progress') ??
    findAction(required, 'not-started');
  if (requiredAction) return requiredAction;

  const requiredComplete = required.every((activity) => activity.status === 'complete');
  if (!requiredComplete) return null;

  if (!selectedPathId && paths.length) {
    return {
      kind: 'choose-path',
      title: 'Choose final mission',
      objective: 'Select one capstone path.',
      pathIds: paths.map((path) => path.id),
    };
  }

  const extension = activities.find(
    (activity) =>
      !activity.required &&
      activity.pathId === null &&
      activity.availability === 'available' &&
      activity.status === 'not-started',
  );
  return extension ? toNextAction(extension, 'extension') : null;
}

function findAction(
  activities: readonly ProjectActivityViewModel[],
  status: ProjectActivityProgressStatus,
): ProjectNextAction | null {
  const activity = activities.find(
    (candidate) => candidate.status === status && candidate.availability === 'available',
  );
  if (!activity) return null;
  const reason =
    status === 'needs-revision' ? 'needs-revision' : status === 'in-progress' ? 'resume' : 'start';
  return toNextAction(activity, reason);
}

function toNextAction(
  activity: ProjectActivityViewModel,
  reason: ProjectNextAction['reason'],
): ProjectNextAction {
  return {
    kind: 'activity',
    activityId: activity.id,
    title: activity.title,
    objective: activity.objective,
    route: activity.route,
    reason,
  };
}

function buildPathViewModels(
  paths: readonly ProjectPathDefinition[],
  activities: readonly ProjectActivityViewModel[],
  selectedPathId: string | undefined,
): ProjectPathViewModel[] {
  return paths.map((path) => {
    const pathActivities = activities.filter((activity) => activity.pathId === path.id);
    const completed = pathActivities.filter((activity) => activity.status === 'complete').length;
    return {
      id: path.id,
      title: path.title,
      objective: path.objective,
      outcomeLabel: path.outcomeLabel,
      order: path.order,
      selected: path.id === selectedPathId,
      progressPercent: percent(completed, pathActivities.length),
    };
  });
}

function buildStageViewModels(
  definition: ProjectHubDefinition,
  activities: readonly ProjectActivityViewModel[],
): ProjectStageViewModel[] {
  return [...definition.stages].sort(byOrderThenTitle).map((stage) => {
    const stageActivities = activities.filter((activity) => activity.stageId === stage.id);
    const required = stageActivities.filter((activity) => activity.required);
    const completed = required.filter((activity) => activity.status === 'complete').length;
    return {
      ...stage,
      progressPercent: percent(completed, required.length),
      activities: stageActivities,
    };
  });
}

function assertCompatibleInputs(
  definition: ProjectHubDefinition,
  assignment: ProjectHubAssignment,
  studentState: StudentProjectState,
): void {
  if (assignment.projectId !== definition.id) {
    throw new Error(`Assignment ${assignment.id} does not belong to project ${definition.id}.`);
  }
  if (studentState.assignmentId !== assignment.id) {
    throw new Error(
      `Student ${studentState.studentId} does not belong to assignment ${assignment.id}.`,
    );
  }

  const stageIds = new Set(definition.stages.map((stage) => stage.id));
  const activityIds = new Set<string>();
  for (const activity of definition.activities) {
    if (activityIds.has(activity.id)) {
      throw new Error(`Project ${definition.id} contains duplicate activity ${activity.id}.`);
    }
    if (!stageIds.has(activity.stageId)) {
      throw new Error(`Activity ${activity.id} references unknown stage ${activity.stageId}.`);
    }
    activityIds.add(activity.id);
  }

  const pathIds = new Set<string>();
  const pathActivityIds = new Set<string>();
  for (const path of definition.paths ?? []) {
    if (pathIds.has(path.id)) {
      throw new Error(`Project ${definition.id} contains duplicate path ${path.id}.`);
    }
    pathIds.add(path.id);
    for (const activityId of path.activityIds) {
      if (!activityIds.has(activityId)) {
        throw new Error(`Path ${path.id} references unknown activity ${activityId}.`);
      }
      if (pathActivityIds.has(activityId)) {
        throw new Error(`Activity ${activityId} belongs to more than one project path.`);
      }
      pathActivityIds.add(activityId);
    }
    if (!path.activityIds.includes(path.entryActivityId)) {
      throw new Error(`Path ${path.id} entry activity is not part of the path.`);
    }
    if (!path.activityIds.includes(path.finalActivityId)) {
      throw new Error(`Path ${path.id} final activity is not part of the path.`);
    }
  }

  if (studentState.selectedPathId && !pathIds.has(studentState.selectedPathId)) {
    throw new Error(`Student selected unknown project path ${studentState.selectedPathId}.`);
  }

  for (const activity of definition.activities) {
    for (const prerequisiteId of activity.prerequisiteActivityIds ?? []) {
      if (!activityIds.has(prerequisiteId)) {
        throw new Error(
          `Activity ${activity.id} references unknown prerequisite ${prerequisiteId}.`,
        );
      }
    }
  }
}

function pathActivityIndex(paths: readonly ProjectPathDefinition[]): Map<string, string> {
  return new Map(
    paths.flatMap((path) => path.activityIds.map((activityId) => [activityId, path.id] as const)),
  );
}

function percent(completed: number, total: number): number {
  return total ? Math.round((100 * completed) / total) : 0;
}

function byOrderThenTitle<T extends { order: number; title: string }>(first: T, second: T): number {
  return first.order - second.order || first.title.localeCompare(second.title);
}
