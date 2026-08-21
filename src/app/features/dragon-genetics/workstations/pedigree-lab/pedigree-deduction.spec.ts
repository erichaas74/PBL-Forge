import { PedigreeDeduction, deducePedigree } from './pedigree-deduction';
import { BloodlineInvestigation, InheritanceModel, PedigreeDnaTestRecord, } from './pedigree-lab.models';
import { BLOODLINE_INVESTIGATIONS, PEDIGREE_ARCHIVE, archiveDragon, investigationById, } from './pedigree-population';

function run(investigation: BloodlineInvestigation, model: InheritanceModel, dnaTests: readonly PedigreeDnaTestRecord[] = []): PedigreeDeduction {
    return deducePedigree({ population: PEDIGREE_ARCHIVE, investigation, model, dnaTests });
}

const FROST = investigationById('frost-scale');
const DUSKMERE = investigationById('duskmere-eye');
const STONEWAKE = investigationById('stonewake-tail');

describe('pedigree deduction', () => {
    it('reads the legendary ancestor as showing the trait and his children as forced carriers', () => {
        const deduction = run(FROST, 'autosomal-recessive');

        expect(deduction.states.get('vyrak')?.status).toBe('shows-trait');
        for (const childId of (archiveDragon('vyrak')?.offspringIds ?? [])) {
            const state = deduction.states.get(childId);
            expect(state?.status, childId).toBe('confirmed-carrier');
            expect(state?.possibleGenotypes).toEqual(['Ss']);
            expect(state?.evidence).toBe('pedigree-deduction');
        }
    });

    it('proves a carrier from a parent alone, generations after the trait was last seen', () => {
        const deduction = run(FROST, 'autosomal-recessive');

        // Hesper's father Ivrid was the last dragon recorded without banding, so she
        // must hold one copy even though nothing about her appearance shows it.
        expect(deduction.states.get('ivrid')?.status).toBe('shows-trait');
        expect(deduction.states.get('hesper')?.status).toBe('confirmed-carrier');
        // Her sons are one generation further out and cannot be settled by pedigree.
        expect(deduction.states.get('arkon')?.status).toBe('possible-carrier');
        expect(deduction.states.get('arkon')?.possibleGenotypes).toEqual(['SS', 'Ss']);
    });

    it('reports the records an autosomal dominant reading cannot explain', () => {
        const recessive = run(FROST, 'autosomal-recessive');
        const dominant = run(FROST, 'autosomal-dominant');

        expect(recessive.contradictions.length).toBe(0);
        expect(dominant.contradictions.length).toBeGreaterThan(0);
        // Two banded parents produced the unbanded Ivrid, which a dominant model
        // forbids — so the conflict the console names is Ivrid's own family.
        expect(dominant.contradictions.some((conflict) => conflict.dragonId === 'ivrid' || conflict.reason.includes('Ivrid'))).toBe(true);
    });

    it('flips allele notation with the student model instead of the answer key', () => {
        expect(run(FROST, 'autosomal-recessive').symbols).toEqual({ traced: 's', alternate: 'S' });
        expect(run(FROST, 'autosomal-dominant').symbols).toEqual({ traced: 'S', alternate: 's' });
    });

    it('keeps an X-linked reading clean for the Duskmere eye and reports its sex split', () => {
        const xLinked = run(DUSKMERE, 'x-linked-recessive');

        expect(xLinked.contradictions.length).toBe(0);
        expect(xLinked.states.get('ilira')?.status).toBe('shows-trait');
        // An affected mother gives every son the allele and every daughter one copy.
        expect(xLinked.states.get('vandel')?.possibleGenotypes).toEqual(['eY']);
        expect(xLinked.states.get('nyra')?.possibleGenotypes).toEqual(['Ee']);
        // Vandel's daughters are carriers because a father hands his single X to each.
        expect(xLinked.states.get('alvi')?.status).toBe('confirmed-carrier');
        expect(xLinked.affectedMales).toBeGreaterThan(xLinked.affectedFemales);
    });

    it('rejects a two-phenotype model for a locus whose records show three appearances', () => {
        const recessive = run(STONEWAKE, 'autosomal-recessive');
        const incomplete = run(STONEWAKE, 'incomplete-dominance');

        expect(recessive.unexplainedPhenotypes.length).toBeGreaterThan(0);
        expect(incomplete.unexplainedPhenotypes.length).toBe(0);
        expect(incomplete.contradictions.length).toBe(0);
        // Heterozygotes are visible here, so the register names its carriers outright.
        expect(incomplete.states.get('hakon')?.status).toBe('confirmed-carrier');
        expect(incomplete.states.get('hakon')?.evidence).toBe('phenotype-record');
    });

    it('settles a possible carrier when a sequencing run is spent on it', () => {
        const before = run(FROST, 'autosomal-recessive');
        expect(before.states.get('arkon')?.possibleGenotypes.length).toBe(2);

        const arkon = archiveDragon('arkon');
        const after = run(FROST, 'autosomal-recessive', [
            {
                dragonId: 'arkon',
                geneId: 'scales',
                alleles: arkon!.genome.scales,
                testedAtIso: '2026-01-01T00:00:00.000Z',
            },
        ]);

        const state = after.states.get('arkon');
        expect(state?.sequenced).toBe(true);
        expect(state?.possibleGenotypes).toEqual(['Ss']);
        expect(state?.evidence).toBe('dna-test');
        expect(state?.status).toBe('confirmed-carrier');
    });

    it('turns a sequencer result into evidence against the wrong chromosome model', () => {
        const vandel = archiveDragon('vandel');
        const test: PedigreeDnaTestRecord = {
            dragonId: 'vandel',
            geneId: 'eye-color',
            alleles: vandel!.genome['eye-color'],
            testedAtIso: '2026-01-01T00:00:00.000Z',
        };

        const autosomal = run(DUSKMERE, 'autosomal-recessive', [test]);
        const xLinked = run(DUSKMERE, 'x-linked-recessive', [test]);

        expect(autosomal.contradictions.some((conflict) => conflict.dragonId === 'vandel')).toBe(true);
        expect(xLinked.contradictions.length).toBe(0);
    });

    it('never narrows a dragon whose record is lost past what its family forces', () => {
        const deduction = run(BLOODLINE_INVESTIGATIONS[3], 'incomplete-dominance');
        const brandt = deduction.states.get('brandt');

        expect(brandt?.observedPhenotype).toBeNull();
        expect(brandt?.possibleGenotypes.length).toBeGreaterThan(0);
        expect(brandt?.evidence).not.toBe('phenotype-record');
    });
});
