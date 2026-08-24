import { StudentDragonRecord } from '../../dragon-genetics.models';
import { buildDragonArenaTraitEvidence, scoreDragonArenaTrial, } from './dragon-arena-evidence';

describe('Dragon Arena evidence', () => {
    it('scores a win from outcome, condition, and finishing pace', () => {
        expect(scoreDragonArenaTrial({
            won: true,
            winnerName: 'Champion',
            elapsedSeconds: 30,
            remainingHealthPercent: 80,
        })).toEqual({ outcomePoints: 50, conditionPoints: 28, pacePoints: 11, total: 89 });
    });

    it('rewards survival time on a loss without treating it as a win', () => {
        const earlyLoss = scoreDragonArenaTrial({
            won: false,
            winnerName: 'Warden',
            elapsedSeconds: 20,
            remainingHealthPercent: 0,
        });
        const laterLoss = scoreDragonArenaTrial({
            won: false,
            winnerName: 'Warden',
            elapsedSeconds: 100,
            remainingHealthPercent: 0,
        });

        expect(laterLoss.total).toBeGreaterThan(earlyLoss.total);
        expect(laterLoss.outcomePoints).toBe(0);
    });

    it('describes modeled combat effects and keeps scale pattern neutral', () => {
        const evidence = buildDragonArenaTraitEvidence(champion());

        expect(evidence.find((record) => record.traitId === 'wings')).toEqual(expect.objectContaining({ genotype: 'Ww', kind: 'ability' }));
        expect(evidence.find((record) => record.traitId === 'fire')?.arenaEffect).toBe('Fire breath unavailable.');
        expect(evidence.find((record) => record.traitId === 'scales')).toEqual(expect.objectContaining({
            kind: 'appearance',
            arenaEffect: 'Visible pattern only; no arena modifier.',
        }));
    });
});

function champion(): StudentDragonRecord {
    return {
        id: 'champion-1',
        name: 'Champion',
        title: 'Arena dragon',
        color: '#000000',
        accentColor: '#ffffff',
        genome: {
            wings: ['W', 'w'],
            fire: ['f', 'f'],
            scales: ['S', 's'],
            horns: ['H', 'h'],
            legs: ['L', 'l'], claws: ['C', 'c'], crest: ['R', 'r'], spikes: ['P', 'p'],
        },
        parentIds: ['parent-a', 'parent-b'],
        generation: 1,
    };
}
