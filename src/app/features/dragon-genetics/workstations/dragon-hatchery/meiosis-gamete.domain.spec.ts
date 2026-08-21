import { DRAGON_PARENTS, DRAGON_TRAITS, fertilizeLabGametes, genotypeLabel, } from '../../simulation/domain/dragon-inheritance';
import { dragonParentExpressiveProfile } from '../../simulation/domain/dragon-specimen.profile';
import { ExpressiveDragonTraitId } from '../../simulation/domain/dragon-expressive-genome';
import { coreGameteGenome, generateMeiosisRun } from './meiosis-gamete.domain';
import { MeiosisRun } from './meiosis-gamete.models';

describe('meiosis gamete domain', () => {
    const parent = DRAGON_PARENTS[0];

    it('models five pairs, physical crossovers, and four distinct haploid products', () => {
        const run = generateMeiosisRun(parent, 'female', 'meiosis:ember:1', 'scales');

        expect(run.chromosomePairs.map((pair) => pair.chromosome)).toEqual([
            'Chr 1', 'Chr 2', 'Chr 3', 'Chr 4', 'Chr X',
        ]);
        expect(run.chromosomePairs.map((pair) => pair.length)).toEqual([100, 94, 87, 80, 74]);
        expect(run.chromosomePairs.filter((pair) => pair.crossoverPosition !== null).length).toBe(3);
        expect(run.gametes.length).toBe(4);
        expect(run.gametes.every((gamete) => gamete.chromosomes.length === 5)).toBe(true);

        const signatures = run.gametes.map((gamete) => Object.entries(gamete.alleleByTrait).sort().map(([trait, allele]) => `${trait}:${allele}`).join('|'));
        expect(new Set(signatures).size).toBe(4);
    });

    it('keeps homologs together through Meiosis I before separating sisters in Meiosis II', () => {
        const run = generateMeiosisRun(parent, 'female', 'meiosis:division-order', 'scales');

        for (const pair of run.chromosomePairs) {
            const origins = run.gametes.map((gamete) => {
                const product = gamete.chromosomes.find((chromosome) => chromosome.chromosome === pair.chromosome)!;
                return pair.chromatids.find((chromatid) => chromatid.id === product.sourceChromatidId)!.origin;
            });
            expect(origins[0]).toBe(origins[1]);
            expect(origins[2]).toBe(origins[3]);
            expect(origins[0]).not.toBe(origins[2]);
        }
    });

    it('moves the allele-bearing suffix between non-sister chromatids at a crossover', () => {
        const run = generateMeiosisRun(parent, 'female', 'meiosis:segments', 'wings');

        for (const pair of run.chromosomePairs.filter((candidate) => candidate.crossoverAfterLocusIndex !== null)) {
            const split = pair.crossoverAfterLocusIndex!;
            const aRecombinant = pair.chromatids[1];
            const bRecombinant = pair.chromatids[2];
            expect(aRecombinant.loci.slice(0, split).every((locus) => locus.origin === 'homolog-a')).toBe(true);
            expect(aRecombinant.loci.slice(split).every((locus) => locus.origin === 'homolog-b')).toBe(true);
            expect(bRecombinant.loci.slice(0, split).every((locus) => locus.origin === 'homolog-b')).toBe(true);
            expect(bRecombinant.loci.slice(split).every((locus) => locus.origin === 'homolog-a')).toBe(true);
        }
    });

    it('never invents an allele that is absent from the selected parent genome', () => {
        const run = generateMeiosisRun(parent, 'female', 'meiosis:alleles', 'horns');
        const profile = dragonParentExpressiveProfile(parent, 'female');

        for (const gamete of run.gametes) {
            for (const [traitId, allele] of Object.entries(gamete.alleleByTrait)) {
                expect(profile.genome[traitId as ExpressiveDragonTraitId]).toContain(allele);
            }
        }
    });

    it('is repeatable for one run seed and changes when the run seed changes', () => {
        const first = stripTime(generateMeiosisRun(parent, 'female', 'meiosis:repeatable', 'fire'));
        const repeated = stripTime(generateMeiosisRun(parent, 'female', 'meiosis:repeatable', 'fire'));
        const rerun = stripTime(generateMeiosisRun(parent, 'female', 'meiosis:new-run', 'fire'));

        expect(repeated).toEqual(first);
        expect(rerun).not.toEqual(first);
    });

    it('produces two X-bearing and two Y-bearing products for a male parent', () => {
        const run = generateMeiosisRun(DRAGON_PARENTS[1], 'male', 'meiosis:xy', 'scales');
        const sexChromosomes = run.gametes.map((gamete) => gamete.chromosomes.find((chromosome) => chromosome.chromosome === 'Chr X')?.sexChromosome);

        expect(sexChromosomes.filter((chromosome) => chromosome === 'X').length).toBe(2);
        expect(sexChromosomes.filter((chromosome) => chromosome === 'Y').length).toBe(2);
    });

    it('fertilizes the exact two selected core gametes through the shared offspring builder', () => {
        const eggRun = generateMeiosisRun(DRAGON_PARENTS[0], 'female', 'egg:chosen', 'scales');
        const spermRun = generateMeiosisRun(DRAGON_PARENTS[1], 'male', 'sperm:chosen', 'scales');
        const egg = coreGameteGenome(eggRun.gametes[1]);
        const sperm = coreGameteGenome(spermRun.gametes[2]);
        const offspring = fertilizeLabGametes(DRAGON_PARENTS[0], DRAGON_PARENTS[1], egg, sperm, 'student-selected-egg', 1);

        for (const trait of DRAGON_TRAITS) {
            expect(genotypeLabel(offspring.genome[trait.id]))
                .toBe(genotypeLabel([egg[trait.id], sperm[trait.id]]));
        }
        expect(offspring.parentIds).toEqual([DRAGON_PARENTS[0].id, DRAGON_PARENTS[1].id]);
        expect(offspring.assembly.parts.length).toBeGreaterThan(0);
    });
});

function stripTime(run: MeiosisRun): Omit<MeiosisRun, 'createdAtIso'> {
    const stable = { ...run } as Partial<MeiosisRun>;
    delete stable.createdAtIso;
    return stable as Omit<MeiosisRun, 'createdAtIso'>;
}
