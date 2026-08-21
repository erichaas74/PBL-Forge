import { BloodGenotype, BloodPhenotypeId, antiserumReaction, clinicDonors, markersForGenotype, phenotypeForGenotype, transfusionCompatibility, } from './blood-compatibility.models';

describe('dragon blood compatibility model', () => {
    it('maps all six genotypes to the four multiple-allele phenotypes', () => {
        const expected: Readonly<Record<BloodGenotype, BloodPhenotypeId>> = {
            AA: 'a-positive',
            AO: 'a-positive',
            BB: 'b-positive',
            BO: 'b-positive',
            AB: 'ab-positive',
            OO: 'o-positive',
        };

        for (const [genotype, phenotype] of Object.entries(expected)) {
            expect(phenotypeForGenotype(genotype as BloodGenotype).id).toBe(phenotype);
        }
    });

    it('expresses A and B codominantly and O without an A or B antigen', () => {
        const dual = specimen('AB');
        const aCarrier = specimen('AO');
        const oType = specimen('OO');

        expect(markersForGenotype(dual.genotype)).toEqual(['a', 'b']);
        expect(antiserumReaction(dual, 'a')).toBe(true);
        expect(antiserumReaction(dual, 'b')).toBe(true);
        expect(antiserumReaction(aCarrier, 'a')).toBe(true);
        expect(antiserumReaction(aCarrier, 'b')).toBe(false);
        expect(markersForGenotype(oType.genotype)).toEqual([]);
    });

    it('accepts donor cells only when every donor marker is present on the recipient', () => {
        const oType = specimen('OO');
        const aType = specimen('AA');
        const bType = specimen('BB');
        const abType = specimen('AB');

        for (const recipient of [oType, aType, bType, abType]) {
            expect(transfusionCompatibility(oType, recipient).compatible).toBe(true);
        }
        expect(transfusionCompatibility(aType, aType).compatible).toBe(true);
        expect(transfusionCompatibility(aType, abType).compatible).toBe(true);
        expect(transfusionCompatibility(aType, bType)).toEqual({
            compatible: false,
            unfamiliarMarkers: ['a'],
        });
        expect(transfusionCompatibility(bType, bType).compatible).toBe(true);
        expect(transfusionCompatibility(bType, abType).compatible).toBe(true);
        expect(transfusionCompatibility(bType, aType)).toEqual({
            compatible: false,
            unfamiliarMarkers: ['b'],
        });
        expect(transfusionCompatibility(abType, abType).compatible).toBe(true);
        expect(transfusionCompatibility(abType, aType).compatible).toBe(false);
        expect(transfusionCompatibility(abType, bType).compatible).toBe(false);
        expect(transfusionCompatibility(abType, oType).compatible).toBe(false);
    });

    it('provides one neutral-coded clinic donor for every marker phenotype', () => {
        const donors = clinicDonors('standard');
        const phenotypes = donors.map((donor) => phenotypeForGenotype(donor.genotype).id);

        expect(new Set(phenotypes)).toEqual(new Set(['o-positive', 'a-positive', 'b-positive', 'ab-positive']));
        expect(donors.map((donor) => donor.sampleCode)).toEqual(['DN-01', 'DN-02', 'DN-03', 'DN-04']);
    });

    it('keeps at least one compatible donor available for every challenge patient phenotype', () => {
        const available = clinicDonors('challenge').filter((donor) => donor.available && (donor.units ?? 0) > 0);

        for (const genotype of ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'] as const) {
            expect(available.some((donor) => transfusionCompatibility(donor, specimen(genotype)).compatible), `no challenge donor for ${genotype}`).toBe(true);
        }
    });
});

function specimen(genotype: BloodGenotype) {
    return {
        id: genotype,
        sampleCode: genotype,
        dragonId: genotype,
        dragonName: genotype,
        dragonTitle: 'test specimen',
        color: '#000000',
        accentColor: '#ffffff',
        genotype,
    };
}
