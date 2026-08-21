import { DragonSimulationRun } from '../adaptive/dragon-simulation.models';
import { createEmptyGeneticsNotebook } from '../workstations/shared/genetics-notebook.models';
import { emptyCompanionShowSnapshot } from '../workstations/companion-show/companion-show.repository';
import { advanceIslandGeneration, createInitialWorld, } from '../workstations/island-diversity/island-diversity.domain';
import { ISLAND_IDS } from '../workstations/island-diversity/island-diversity.models';
import { createEmptySnapshot } from '../workstations/pedigree-lab/pedigree-lab.repository';
import { buildDragonStudentProjectState, DragonProjectStateSources, } from './dragon-project-hub.adapter';
import { emptyTraitEvidenceSnapshot } from '../workstations/trait-evidence/trait-evidence.repository';
import { emptyDragonTestingProgress } from './dragon-testing-progress.repository';

describe('Dragon project hub adapter', () => {
    it('maps adaptive shared work but ignores the legacy adaptive arena result', () => {
        const sources = emptySources();
        sources.runs = [run('trait-evidence', false), run('dragon-arena', true)];

        const state = buildDragonStudentProjectState(sources);

        expect(state.activityProgress['trait-evidence']?.status).toBe('in-progress');
        expect(state.activityProgress['dragon-arena']).toBeUndefined();
    });

    it('uses the dedicated arena trial as final-path completion evidence', () => {
        const sources = emptySources();
        sources.selectedPathId = 'dragon-arena';
        sources.arena = {
            schemaVersion: 2,
            studentId: sources.studentId,
            selectedChampionId: 'hatchling-1',
            trials: [
                {
                    id: 'trial-1',
                    championId: 'hatchling-1',
                    won: false,
                    winnerName: 'Arena Warden',
                    elapsedSeconds: 31,
                    remainingHealthPercent: 0,
                    score: 4,
                    scoreBreakdown: {
                        outcomePoints: 0,
                        conditionPoints: 0,
                        pacePoints: 4,
                        total: 4,
                    },
                    traitEvidence: [],
                    completedAtIso: '2026-08-14T00:00:00.000Z',
                },
            ],
        };

        const state = buildDragonStudentProjectState(sources);

        expect(state.selectedPathId).toBe('dragon-arena');
        expect(state.activityProgress['dragon-arena']?.status).toBe('complete');
        expect(state.activityProgress['dragon-arena']?.evidenceIds).toEqual(['trial-1']);
    });

    it('links mini dragon training and show runs into in-progress hub evidence', () => {
        const sources = emptySources();
        sources.companionShow = {
            ...sources.companionShow,
            showDivisionId: 'sky-circuit',
            trainingSessions: [
                {
                    id: 'practice-1',
                    dragonId: 'mini-biscuit',
                    skillId: 'course-cue',
                    practicedAtIso: '2026-08-14T00:00:00.000Z',
                },
            ],
        };

        const state = buildDragonStudentProjectState(sources);

        expect(state.activityProgress['companion-show']).toEqual(expect.objectContaining({
            status: 'in-progress',
            evidenceIds: ['practice-1'],
        }));
    });

    it('links a rare-trait pedigree candidate into project evidence', () => {
        const sources = emptySources();
        sources.companionShow = {
            ...sources.companionShow,
            rareTraitGeneId: 'coat',
            rareCandidateIds: ['pup-1'],
        };

        const state = buildDragonStudentProjectState(sources);

        expect(state.activityProgress['companion-show']).toEqual(expect.objectContaining({
            status: 'in-progress',
            evidenceIds: ['rare:coat:pup-1'],
        }));
    });

    it('completes the island path after every population has been managed', () => {
        const sources = emptySources();
        for (const islandId of ISLAND_IDS) {
            sources.islandDiversity = advanceIslandGeneration(sources.islandDiversity, islandId);
        }

        const state = buildDragonStudentProjectState(sources);

        expect(state.activityProgress['island-diversity']?.status).toBe('complete');
    });

    it('uses a testing completion without fabricating evidence', () => {
        const sources = emptySources();
        sources.testingProgress = {
            ...sources.testingProgress,
            completedAtByActivityId: {
                'genome-microscope': '2026-08-14T00:00:00.000Z',
            },
        };

        const state = buildDragonStudentProjectState(sources);

        expect(state.activityProgress['genome-microscope']).toEqual({
            activityId: 'genome-microscope',
            status: 'complete',
            evidenceIds: [],
            updatedAtIso: '2026-08-14T00:00:00.000Z',
            startedAtIso: undefined,
        });
    });
});

function emptySources(): DragonProjectStateSources {
    const studentId = 'student-1';
    return {
        studentId,
        assignmentId: 'assignment-1',
        selectedPathId: null,
        traitEvidence: emptyTraitEvidenceSnapshot(studentId),
        runs: [],
        notebook: createEmptyGeneticsNotebook(studentId, 'assignment-1'),
        hatchery: {
            schemaVersion: 1,
            studentId,
            eggParentId: null,
            spermParentId: null,
            targetTraitId: 'scales',
            pendingEggSelection: null,
            pendingSpermSelection: null,
            fertilizations: [],
        },
        arena: {
            schemaVersion: 2,
            studentId,
            selectedChampionId: null,
            trials: [],
        },
        companionShow: emptyCompanionShowSnapshot(studentId),
        islandDiversity: createInitialWorld(studentId),
        pedigree: createEmptySnapshot(studentId),
        proteinCases: [],
        bloodCases: [],
        testingProgress: emptyDragonTestingProgress(studentId, 'assignment-1'),
    };
}

function run(simulationId: DragonSimulationRun['simulationId'], complete: boolean): DragonSimulationRun {
    return {
        schemaVersion: 1,
        simulationId,
        studentId: 'student-1',
        assignmentId: 'assignment-1',
        assignmentVersion: 1,
        contentVersion: 1,
        level: 'grade-7',
        hintsAllowed: true,
        seed: `seed:${simulationId}`,
        attemptNumber: 1,
        currentQuestionIndex: 0,
        questionIds: ['question-1'],
        responses: [],
        complete,
        score: complete ? 100 : 0,
        startedAtIso: '2026-08-14T00:00:00.000Z',
        updatedAtIso: '2026-08-14T00:00:00.000Z',
    };
}
