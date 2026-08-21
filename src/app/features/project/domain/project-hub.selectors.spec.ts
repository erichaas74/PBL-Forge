import { ProjectHubAssignment, ProjectHubDefinition, StudentProjectState, } from './project-hub.models';
import { buildProjectHubViewModel } from './project-hub.selectors';

describe('project hub selectors', () => {
    it('suggests the first required activity while keeping its dependent activity open', () => {
        const view = buildProjectHubViewModel(PROJECT, ASSIGNMENT, emptyStudentState());

        expect(view.nextAction).toEqual(expect.objectContaining({ kind: 'activity', activityId: 'observe' }));
        expect(view.stages[0].activities[0].isNextAction).toBe(true);
        expect(view.stages[0].activities[1].availability).toBe('available');
        expect(view.stages[0].activities[1].lockReasons).toEqual([]);
        expect(view.progressPercent).toBe(0);
    });

    it('prioritizes required revision work over another activity in progress', () => {
        const state = emptyStudentState({
            observe: progress('observe', 'needs-revision'),
            explain: progress('explain', 'in-progress'),
        });

        const view = buildProjectHubViewModel(PROJECT, ASSIGNMENT, state);

        expect(view.nextAction).toEqual(expect.objectContaining({ activityId: 'observe', reason: 'needs-revision' }));
        expect(view.stages.flatMap((stage) => stage.activities).filter((item) => item.isNextAction), 'only one activity should receive primary emphasis').toHaveLength(1);
    });

    it('keeps optional work out of required progress and offers it after required work', () => {
        const state = emptyStudentState({
            observe: progress('observe', 'complete'),
            explain: progress('explain', 'complete'),
        });

        const view = buildProjectHubViewModel(PROJECT, ASSIGNMENT, state);

        expect(view.progressPercent).toBe(100);
        expect(view.completedRequiredCount).toBe(2);
        expect(view.requiredActivityCount).toBe(2);
        expect(view.nextAction).toEqual(expect.objectContaining({ activityId: 'extension', reason: 'extension' }));
    });

    it('keeps release and mastery settings from gating workstation access', () => {
        const assignment: ProjectHubAssignment = {
            ...ASSIGNMENT,
            activitySettings: { explain: { released: false } },
        };
        const state = emptyStudentState({ observe: progress('observe', 'complete') });

        const view = buildProjectHubViewModel(PROJECT, assignment, state);
        const explain = view.stages[0].activities.find((activity) => activity.id === 'explain');

        expect(explain?.status).toBe('not-started');
        expect(explain?.availability).toBe('available');
        expect(explain?.lockReasons).toEqual([]);
        expect(view.progressPercent).toBe(50);
    });

    it('rejects a project definition with an unknown prerequisite', () => {
        const invalid: ProjectHubDefinition = {
            ...PROJECT,
            activities: [
                {
                    ...PROJECT.activities[0],
                    prerequisiteActivityIds: ['missing'],
                },
            ],
        };

        expect(() => buildProjectHubViewModel(invalid, ASSIGNMENT, emptyStudentState())).toThrowError(/unknown prerequisite missing/);
    });

    it('offers one path choice after core work and counts only the selected path', () => {
        const project: ProjectHubDefinition = {
            ...PROJECT,
            activities: PROJECT.activities.map((activity) => activity.id === 'extension' ? { ...activity, required: true } : activity),
            paths: [
                {
                    id: 'arena',
                    title: 'Dragon Arena',
                    objective: 'Breed and test a fighting dragon.',
                    outcomeLabel: 'Arena trial record',
                    order: 1,
                    activityIds: ['extension'],
                    entryActivityId: 'extension',
                    finalActivityId: 'extension',
                },
            ],
        };
        const coreComplete = emptyStudentState({
            observe: progress('observe', 'complete'),
            explain: progress('explain', 'complete'),
        });

        const choiceView = buildProjectHubViewModel(project, ASSIGNMENT, coreComplete);
        expect(choiceView.nextAction).toEqual(expect.objectContaining({ kind: 'choose-path', pathIds: ['arena'] }));
        expect(choiceView.requiredActivityCount).toBe(2);
        expect(choiceView.stages[0].activities.find((activity) => activity.id === 'extension')).toEqual(expect.objectContaining({ availability: 'available', lockReasons: [] }));

        const selectedView = buildProjectHubViewModel(project, ASSIGNMENT, {
            ...coreComplete,
            selectedPathId: 'arena',
        });
        expect(selectedView.requiredActivityCount).toBe(3);
        expect(selectedView.nextAction).toEqual(expect.objectContaining({ kind: 'activity', activityId: 'extension', reason: 'start' }));
        expect(selectedView.paths[0].selected).toBe(true);
    });
});

const PROJECT: ProjectHubDefinition = {
    schemaVersion: 1,
    id: 'test-project',
    title: 'Test project',
    mission: 'Use evidence.',
    subject: 'Science',
    gradeBand: '7',
    theme: {
        id: 'test-theme',
        template: 'laboratory-world',
        accentStyle: 'test',
    },
    stages: [{ id: 'stage-1', title: 'Investigation', order: 1 }],
    activities: [
        {
            id: 'observe',
            stageId: 'stage-1',
            title: 'Observe',
            objective: 'Collect evidence.',
            route: '/observe',
            order: 1,
            kind: 'workstation',
            required: true,
        },
        {
            id: 'explain',
            stageId: 'stage-1',
            title: 'Explain',
            objective: 'Defend a conclusion.',
            route: '/explain',
            order: 2,
            kind: 'assessment',
            required: true,
            prerequisiteActivityIds: ['observe'],
            masteryRequirements: [{ skillId: 'skill-1', minimumLevel: 3 }],
        },
        {
            id: 'extension',
            stageId: 'stage-1',
            title: 'Extension',
            objective: 'Try a new case.',
            route: '/extension',
            order: 3,
            kind: 'extension',
            required: false,
        },
    ],
    masterySkills: [{ id: 'skill-1', title: 'Evidence', order: 1 }],
};

const ASSIGNMENT: ProjectHubAssignment = {
    id: 'assignment-1',
    projectId: PROJECT.id,
    classId: 'science-7',
    activitySettings: {},
};

function emptyStudentState(activityProgress: StudentProjectState['activityProgress'] = {}): StudentProjectState {
    return {
        studentId: 'student-1',
        assignmentId: ASSIGNMENT.id,
        activityProgress,
        mastery: {},
    };
}

function progress(activityId: string, status: 'in-progress' | 'submitted' | 'needs-revision' | 'complete') {
    return {
        activityId,
        status,
        evidenceIds: [],
        updatedAtIso: '2026-08-14T00:00:00.000Z',
    } as const;
}
