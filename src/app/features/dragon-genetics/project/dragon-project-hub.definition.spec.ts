import { ProjectHubAssignment, StudentProjectState } from '../../project/domain/project-hub.models';
import { buildProjectHubViewModel } from '../../project/domain/project-hub.selectors';
import { DRAGON_PROJECT_HUB_DEFINITION } from './dragon-project-hub.definition';

describe('Dragon project hub definition', () => {
  const assignment: ProjectHubAssignment = {
    id: 'assignment-1',
    projectId: DRAGON_PROJECT_HUB_DEFINITION.id,
    classId: 'science-7',
    activitySettings: {},
  };

  it('starts with one shared-foundation action', () => {
    const view = buildProjectHubViewModel(
      DRAGON_PROJECT_HUB_DEFINITION,
      assignment,
      studentState(),
    );

    expect(view.requiredActivityCount).toBe(6);
    expect(view.nextAction).toEqual(
      jasmine.objectContaining({ kind: 'activity', activityId: 'trait-evidence' }),
    );
    expect(view.paths.map((path) => path.id)).toEqual([
      'dragon-arena',
      'mini-dragon-show',
      'island-diversity',
    ]);
  });

  it('offers one final-path choice after shared work is complete', () => {
    const progress = Object.fromEntries(
      DRAGON_PROJECT_HUB_DEFINITION.activities
        .filter((activity) => activity.required)
        .filter((activity) => !DRAGON_PROJECT_HUB_DEFINITION.paths?.some(
          (path) => path.activityIds.includes(activity.id),
        ))
        .map((activity) => [
          activity.id,
          {
            activityId: activity.id,
            status: 'complete' as const,
            evidenceIds: [],
            updatedAtIso: '2026-08-14T00:00:00.000Z',
          },
        ]),
    );
    const view = buildProjectHubViewModel(
      DRAGON_PROJECT_HUB_DEFINITION,
      assignment,
      studentState(progress),
    );

    expect(view.progressPercent).toBe(100);
    expect(view.nextAction).toEqual(
      jasmine.objectContaining({ kind: 'choose-path' }),
    );
  });
});

function studentState(
  activityProgress: StudentProjectState['activityProgress'] = {},
): StudentProjectState {
  return {
    studentId: 'student-1',
    assignmentId: 'assignment-1',
    activityProgress,
    mastery: {},
  };
}

