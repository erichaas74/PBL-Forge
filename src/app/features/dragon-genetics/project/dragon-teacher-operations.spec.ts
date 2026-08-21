import { DragonAssignment, DragonSimulationDefinition, DragonSimulationId, } from '../adaptive/dragon-simulation.models';
import { DEFAULT_DRAGON_CLASS_JOURNEY_PLAN } from '../journey/config/dragon-journey.registry';
import { DEFAULT_INQUIRY_SETTINGS } from '../inquiry/inquiry-policy';
import { buildDragonTeacherOperations, DragonStudentProgressDocument, } from './dragon-teacher-operations';

describe('Dragon teacher operations', () => {
    it('summarizes only assigned simulations', () => {
        const result = buildDragonTeacherOperations([
            student('a', ['trait-evidence', 'genome-microscope'], {
                'trait-evidence': 80,
                'genome-microscope': 100,
            }),
            student('b', ['genome-microscope'], { 'genome-microscope': 60 }),
        ], assignment({ 'trait-evidence': false }), simulations());

        expect(result.assignedSimulationIds).toEqual(['genome-microscope']);
        expect(result.completedRunCount).toBe(2);
        expect(result.completionPercent).toBe(100);
        expect(result.averageScore).toBe(80);
    });

    it('creates at most one prioritized alert per student', () => {
        const result = buildDragonTeacherOperations([
            student('low-score', [], { 'genome-microscope': 50 }),
            student('not-started'),
            student('ahead', ['trait-evidence', 'genome-microscope']),
            student('behind', []),
        ], assignment(), simulations());

        expect(result.attention).toEqual([
            { studentId: 'low-score', kind: 'reteach', reason: '50% evidence score' },
            {
                studentId: 'behind',
                kind: 'not-started',
                reason: 'No completed investigations',
            },
            {
                studentId: 'not-started',
                kind: 'not-started',
                reason: 'No completed investigations',
            },
        ]);
        expect(result.onTrackCount).toBe(1);
    });

    it('reports activity completion and active work', () => {
        const first = student('a', ['trait-evidence']);
        first.activeSimulationId = 'genome-microscope';
        const result = buildDragonTeacherOperations([first, student('b')], assignment(), simulations());

        expect(result.activities[0]).toEqual({
            id: 'trait-evidence',
            module: 1,
            title: 'Trait evidence',
            completeCount: 1,
            activeCount: 0,
            completionPercent: 50,
        });
        expect(result.activities[1].activeCount).toBe(1);
    });

    it('counts dedicated workstation progress without requiring a generated quiz run', () => {
        const candidate = student('observer');
        candidate.activityProgress = { 'trait-evidence': { status: 'complete' } };
        candidate.simulationScores = { 'trait-evidence': 25 };

        const result = buildDragonTeacherOperations([candidate], assignment(), simulations());

        expect(result.activities[0].completeCount).toBe(1);
        expect(result.studentRows[0].completedCount).toBe(1);
        expect(result.attention).toEqual([]);
        expect(result.studentRows[0].averageScore).toBe(0);
    });

    it('adds the selected final path and its synced outcome to the student row', () => {
        const candidate = student('arena-student');
        candidate.capstoneProgress = {
            schemaVersion: 1,
            selectedPathId: 'dragon-arena',
            arena: {
                status: 'complete',
                selectedChampionId: 'champion-1',
                trialCount: 3,
                winCount: 2,
                bestScore: 84,
                bestRemainingHealthPercent: 54,
                latestAtIso: '2026-08-14T00:00:00.000Z',
            },
        };

        const result = buildDragonTeacherOperations([candidate], assignment(), simulations());

        expect(result.studentRows[0]).toEqual(expect.objectContaining({
            capstonePath: 'Dragon Arena',
            capstoneStatus: 'complete',
            capstoneResult: 'Best 84 · 2/3 wins',
        }));
    });
});

function student(studentId: string, completedSimulationIds: DragonSimulationId[] = [], simulationScores: Partial<Record<DragonSimulationId, number>> = {}): DragonStudentProgressDocument {
    return { id: studentId, studentId, completedSimulationIds, simulationScores };
}

function assignment(enabled: Partial<Record<DragonSimulationId, boolean>> = {}): DragonAssignment {
    return {
        id: 'assignment',
        ownerId: 'teacher',
        classId: 'class',
        title: 'Dragon Genetics',
        defaultLevel: 'grade-7',
        alleleCatalog: { availableGeneIds: [] },
        inquirySettings: DEFAULT_INQUIRY_SETTINGS,
        simulationSettings: Object.fromEntries(Object.entries(enabled).map(([simulationId, isEnabled]) => [
            simulationId,
            { enabled: isEnabled },
        ])),
        journeyPlan: DEFAULT_DRAGON_CLASS_JOURNEY_PLAN,
        studentOverrides: {},
        assignmentVersion: 1,
        updatedAtIso: '2026-08-14T00:00:00.000Z',
    };
}

function simulations(): DragonSimulationDefinition[] {
    return [definition('trait-evidence', 1), definition('genome-microscope', 2)];
}

function definition(id: DragonSimulationId, module: number): DragonSimulationDefinition {
    return {
        id,
        module,
        title: id,
        shortTitle: id === 'trait-evidence' ? 'Trait evidence' : 'Genome microscope',
        skill: id === 'trait-evidence' ? 'GEN-1' : 'GEN-2',
        goal: '',
        visualKind: id === 'trait-evidence' ? 'evidence' : 'microscope',
        accent: '#000000',
        sections: [],
        nodes: [],
        levelChallenges: {} as DragonSimulationDefinition['levelChallenges'],
    };
}
