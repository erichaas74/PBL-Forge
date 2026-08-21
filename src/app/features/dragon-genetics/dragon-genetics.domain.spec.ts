import { DRAGON_PARENTS } from './simulation/domain/dragon-inheritance';
import { materializeDragon, runDragonBatch } from './dragon-genetics.domain';
import { StudentDragonRecord } from './dragon-genetics.models';

describe('Dragon Genetics breeding domain', () => {
    it('runs deterministic batches for the same parents and run number', () => {
        const first = runDragonBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 40, 8);
        const second = runDragonBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 40, 8);
        expect(first.dominantCounts).toEqual(second.dominantCounts);
        expect(first.sample.map((dragon) => dragon.genome)).toEqual(second.sample.map((dragon) => dragon.genome));
    });

    it('removes wing assembly parts from a wingless genotype', () => {
        const record: StudentDragonRecord = {
            id: 'wingless-test',
            name: 'Wingless Test',
            title: 'Test dragon',
            color: '#586f5f',
            accentColor: '#b8ca9d',
            parentIds: ['test-a', 'test-b'],
            generation: 1,
            genome: {
                wings: ['w', 'w'],
                fire: ['f', 'f'],
                scales: ['s', 's'],
                horns: ['h', 'h'],
            },
        };
        const dragon = materializeDragon(record);
        expect(dragon.assembly.parts.some((part) => part.roles?.includes('wing'))).toBe(false);
    });
});
