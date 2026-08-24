import { AccountDragonRecord } from '../shared/account-genetics-library.models';
import { DRAGON_FOODS, STOP_DRACASE_CODING_DNA, WORKING_DRACASE_CODING_DNA, proteinRescuePatientFor, runDigestionTrial, translateMessengerRna, } from './protein-rescue.models';

describe('protein rescue scientific model', () => {
    it('maps the working coding strand through mRNA to a full Dracase teaching model', () => {
        const patient = proteinRescuePatientFor(dragon('moss'));
        const sample = patient.samples[0];
        const translation = translateMessengerRna(sample.mrna);

        expect(sample.codingDna).toBe(WORKING_DRACASE_CODING_DNA);
        expect(sample.templateDna).toBe('TACAAACCGTTTGGA');
        expect(sample.mrna).toBe('AUGUUUGGCAAACCU');
        expect(translation.aminoAcids).toEqual([
            'Methionine',
            'Phenylalanine',
            'Glycine',
            'Lysine',
            'Proline',
        ]);
        expect(translation.enzymeWorks).toBe(true);
    });

    it('stops translation at UAG and produces a truncated nonworking protein', () => {
        const patient = proteinRescuePatientFor(dragon('tide'));
        const sample = patient.samples[0];
        const translation = translateMessengerRna(sample.mrna);

        expect(sample.codingDna).toBe(STOP_DRACASE_CODING_DNA);
        expect(sample.mrna).toBe('AUGUUUUAGAAACCU');
        expect(translation.steps.map((step) => step.shortName)).toEqual(['Met', 'Phe', 'STOP']);
        expect(translation.aminoAcids).toEqual(['Methionine', 'Phenylalanine']);
        expect(translation.stoppedEarly).toBe(true);
        expect(translation.enzymeWorks).toBe(false);
    });

    it('models a carrier with one full-length and one premature-stop copy', () => {
        const patient = proteinRescuePatientFor(dragon('ember'));
        const outcomes = patient.samples.map((sample) => translateMessengerRna(sample.mrna).enzymeWorks);

        expect(outcomes).toContain(true);
        expect(outcomes).toContain(false);
    });

    it('separates genetic digestion from diet management', () => {
        const affected = proteinRescuePatientFor(dragon('tide'));
        const moonmilk = DRAGON_FOODS.find((food) => food.id === 'moonmilk')!;
        const fermented = DRAGON_FOODS.find((food) => food.id === 'fermented-moonmilk')!;
        const highDracose = runDigestionTrial(affected, moonmilk, '2026-08-13T00:00:00.000Z');
        const managed = runDigestionTrial(affected, fermented, '2026-08-13T00:01:00.000Z');

        expect(highDracose.result).toBe('undigested');
        expect(highDracose.energy).toBe('reduced');
        expect(managed.result).toBe('managed');
        expect(managed.energy).toBe('steady');
        expect(managed.explanation).toContain('does not change the gene');
    });
});

function dragon(id: string): AccountDragonRecord {
    return {
        kind: 'dragon',
        sex: 'female',
        source: 'foundation',
        storedAtIso: '2026-01-01T00:00:00.000Z',
        id,
        name: id[0].toUpperCase() + id.slice(1),
        title: 'Test dragon',
        color: '#345678',
        accentColor: '#abcdef',
        genome: {
            wings: ['W', 'w'],
            fire: ['F', 'f'],
            scales: ['S', 's'],
            horns: ['H', 'h'],
            legs: ['L', 'l'], claws: ['C', 'c'], crest: ['R', 'r'], spikes: ['P', 'p'],
        },
    };
}
