import { DragonArenaMissionRepository } from './dragon-arena-mission.repository';

describe('DragonArenaMissionRepository', () => {
    const studentId = 'arena-repository-spec';
    const storageKey = `pbl-forge.dragon-genetics.arena-mission.v1.${studentId}`;
    const repository = new DragonArenaMissionRepository();

    beforeEach(() => localStorage.removeItem(storageKey));
    afterEach(() => localStorage.removeItem(storageKey));

    it('persists the selected bred champion and trial evidence', () => {
        repository.save({
            schemaVersion: 2,
            studentId,
            selectedChampionId: 'hatchling-3',
            trials: [
                {
                    id: 'trial-1',
                    championId: 'hatchling-3',
                    won: true,
                    winnerName: 'Hatchling 3',
                    elapsedSeconds: 42,
                    remainingHealthPercent: 64,
                    score: 82,
                    scoreBreakdown: {
                        outcomePoints: 50,
                        conditionPoints: 22,
                        pacePoints: 10,
                        total: 82,
                    },
                    traitEvidence: [],
                    completedAtIso: '2026-08-14T00:00:00.000Z',
                },
            ],
        });

        const restored = repository.load(studentId);

        expect(restored.selectedChampionId).toBe('hatchling-3');
        expect(restored.trials).toEqual([
            expect.objectContaining({ championId: 'hatchling-3', won: true, score: 82 }),
        ]);
    });

    it('migrates a version 1 trial into a scored version 2 record', () => {
        localStorage.setItem(storageKey, JSON.stringify({
            schemaVersion: 1,
            studentId,
            selectedChampionId: 'hatchling-3',
            trials: [
                {
                    id: 'legacy-trial',
                    championId: 'hatchling-3',
                    won: true,
                    winnerName: 'Hatchling 3',
                    elapsedSeconds: 42,
                    remainingHealthPercent: 64,
                    completedAtIso: '2026-08-14T00:00:00.000Z',
                },
            ],
        }));

        const restored = repository.load(studentId);

        expect(restored.schemaVersion).toBe(2);
        expect(restored.trials[0]).toEqual(expect.objectContaining({ score: 82, traitEvidence: [] }));
    });
});
