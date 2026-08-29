/**
 * Runtime status: ACTIVE — pure validator translating URL hints into trusted lesson launch context.
 * Inputs/signals: path/lesson query values, workstation identity/route, and lesson-plan document.
 * Data access: no persistence; reads the supplied normalized document only.
 * Connects to: lesson-aware workstation shells, mission ribbons, and safe return URLs.
 */
import {
  DragonLessonPlanDocument,
  DragonPathContextId,
  DragonSharedLesson,
  isDragonPathContextId,
} from '../lesson-plan/dragon-lesson-plan.models';

export interface DragonWorkstationLaunchContext {
  pathId: DragonPathContextId;
  lessonId: string;
  workstationId: string;
  lessonTitle: string;
  pathTitle: string;
  missionText: string;
  returnUrl: string;
}

export interface DragonWorkstationLaunchRequest {
  pathId: string | null;
  lessonId: string | null;
  workstationId: string;
  workstationRoute: string;
}

/**
 * Resolves URL hints against the authoritative lesson-plan document.
 *
 * Query parameters are never trusted as lesson context on their own. A context exists only when
 * the path is valid, the lesson is published, and that lesson explicitly links this workstation.
 * A direct open-lab launch therefore resolves to null and receives no lesson-owned UI.
 */
export function resolveDragonWorkstationLaunchContext(
  document: DragonLessonPlanDocument,
  request: DragonWorkstationLaunchRequest,
): DragonWorkstationLaunchContext | null {
  if (!isDragonPathContextId(request.pathId) || !request.lessonId) return null;
  const lesson = document.lessons.find(
    (candidate) => candidate.id === request.lessonId && candidate.published,
  );
  if (!lesson) return null;
  const workstation = linkedWorkstation(lesson, request);
  if (!workstation) return null;

  return {
    pathId: request.pathId,
    lessonId: lesson.id,
    workstationId: workstation.id,
    lessonTitle: lesson.title,
    pathTitle: document.paths[request.pathId].title,
    missionText: lesson.learningGoal,
    returnUrl: `/dragon-genetics/path/${encodeURIComponent(request.pathId)}/lesson/${encodeURIComponent(lesson.id)}`,
  };
}

function linkedWorkstation(
  lesson: DragonSharedLesson,
  request: DragonWorkstationLaunchRequest,
): DragonSharedLesson['workstations'][number] | null {
  return (
    lesson.workstations.find(
      (candidate) =>
        candidate.id === request.workstationId && candidate.route === request.workstationRoute,
    ) ?? null
  );
}
