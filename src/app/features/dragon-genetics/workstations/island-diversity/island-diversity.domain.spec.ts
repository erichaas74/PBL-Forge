import { advanceIslandGeneration, createInitialWorld, isBreedingAdult, isMoonfadeAffected, isMoonfadeCarrier, metricsForIsland, placeProtectedParent, relocateDragon, scanDragon, } from './island-diversity.domain';
import { ISLAND_IDS } from './island-diversity.models';

describe('Island Diversity population domain', () => {
    it('releases seven distinct populations including the twelve-survivor bottleneck', () => {
        const world = createInitialWorld('student-a');

        expect(Object.keys(world.islands)).toEqual(ISLAND_IDS as unknown as string[]);
        expect(world.islands.stormbreak.dragons.length).toBe(12);
        expect(world.islands.sanctuary.dragons.length).toBe(10);
        expect(world.islands.stormbreak.timeline[0].event).toContain('bottleneck');
    });

    it('calculates allele frequencies, diversity, relatedness, and affected counts from population records', () => {
        const world = createInitialWorld('student-a');
        const moonmist = world.islands.moonmist;
        const metrics = metricsForIsland(moonmist);

        expect(metrics.alleleFrequencies.length).toBe(3);
        for (const frequency of metrics.alleleFrequencies) {
            expect(frequency.upperFrequency + frequency.lowerFrequency).toBeCloseTo(1, 8);
        }
        expect(metrics.diversityPercent).toBeGreaterThan(0);
        expect(metrics.affectedDragons).toBe(moonmist.dragons.filter(isMoonfadeAffected).length);
    });

    it('uses a scan without changing the concealed dragon genome', () => {
        const world = createInitialWorld('student-a');
        const dragon = world.islands.moonmist.dragons[0];
        const next = scanDragon(world, dragon.id);

        expect(next.researchCredits).toBe(world.researchCredits - 1);
        expect(next.scannedDragonIds).toContain(dragon.id);
        expect(next.islands.moonmist.dragons[0].genome).toEqual(dragon.genome);
        expect(scanDragon(next, dragon.id)).toBe(next);
    });

    it('moves one individual and recalculates source and destination populations', () => {
        const world = createInitialWorld('student-a');
        const dragon = world.islands['twin-horn-west'].dragons[0];
        const next = relocateDragon(world, dragon.id, 'twin-horn-east');

        expect(next.islands['twin-horn-west'].dragons.length).toBe(15);
        expect(next.islands['twin-horn-east'].dragons.length).toBe(17);
        expect(next.islands['twin-horn-east'].dragons.at(-1)).toEqual(dragon);
        expect(next.relocations[0].dragonId).toBe(dragon.id);
    });

    it('lets a protected pair contribute offspring while wild matings continue', () => {
        let world = createInitialWorld('student-a');
        const adults = world.islands.sanctuary.dragons.filter((dragon) => isBreedingAdult(dragon) && dragon.ageGenerations <= 3 && !isMoonfadeAffected(dragon));
        const female = adults.find((dragon) => dragon.sex === 'female')!;
        const male = adults.find((dragon) => dragon.sex === 'male')!;
        world = placeProtectedParent(world, 'sanctuary', female.id, 0);
        world = placeProtectedParent(world, 'sanctuary', male.id, 1);

        const next = advanceIslandGeneration(world, 'sanctuary');
        const offspring = next.islands.sanctuary.dragons.filter((dragon) => dragon.ageGenerations === 0);

        expect(next.islands.sanctuary.generation).toBe(1);
        expect(next.islands.sanctuary.timeline.length).toBe(2);
        expect(offspring.length).toBeGreaterThan(2);
        expect(offspring.slice(0, 2).every((dragon) => dragon.parents.includes(female.id))).toBe(true);
        expect(offspring.slice(0, 2).every((dragon) => dragon.parents.includes(male.id))).toBe(true);
        expect(offspring.some((dragon) => !dragon.parents.includes(female.id))).toBe(true);
    });

    it('reconstructs generation outcomes deterministically from a student seed', () => {
        const first = advanceIslandGeneration(createInitialWorld('student-a'), 'ash-island');
        const second = advanceIslandGeneration(createInitialWorld('student-a'), 'ash-island');

        expect(first.islands['ash-island'].dragons).toEqual(second.islands['ash-island'].dragons);
        expect(first.islands['ash-island'].timeline.at(-1)?.event).toBe(second.islands['ash-island'].timeline.at(-1)?.event);
    });

    it('distinguishes healthy carriers from affected recessive dragons', () => {
        const world = createInitialWorld('student-a');
        const dragons = Object.values(world.islands).flatMap((population) => population.dragons);

        expect(dragons.some(isMoonfadeCarrier)).toBe(true);
        expect(dragons.some(isMoonfadeAffected)).toBe(true);
        expect(dragons.every((dragon) => !(isMoonfadeCarrier(dragon) && isMoonfadeAffected(dragon)))).toBe(true);
    });
});
