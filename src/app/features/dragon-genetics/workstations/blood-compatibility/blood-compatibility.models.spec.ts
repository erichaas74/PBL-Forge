import {
    BloodGenotype,
    BloodPhenotypeId,
    antiserumReaction,
    bloodTypeForReactions,
    clinicDonors,
    markersForGenotype,
    phenotypeForGenotype,
    transfusionCompatibility,
} from './blood-compatibility.models';

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

    it('uses Anti-D agglutination to distinguish Rh-positive and Rh-negative blood', () => {
        const positive = specimen('AO', true);
        const negative = specimen('AO', false);

        expect(antiserumReaction(positive, 'd')).toBe(true);
        expect(antiserumReaction(negative, 'd')).toBe(false);
        expect(bloodTypeForReactions(true, false, true)?.id).toBe('a-positive');
        expect(bloodTypeForReactions(true, false, false)?.id).toBe('a-negative');
        expect(bloodTypeForReactions(true, false, null)).toBeNull();
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
        const phenotypes = donors.map((donor) =>
            phenotypeForGenotype(donor.genotype, donor.rhPositive).name.slice(0, -1),
        );

        expect(new Set(phenotypes)).toEqual(new Set(['O', 'A', 'B', 'AB']));
        expect(donors.map((donor) => donor.sampleCode)).toEqual(['DN-01', 'DN-02', 'DN-03', 'DN-04']);
        expect(phenotypeForGenotype(donors[0].genotype, donors[0].rhPositive).id).toBe('o-negative');
    });

    it('keeps at least one compatible donor available for every challenge patient phenotype', () => {
        const available = clinicDonors('challenge').filter((donor) => donor.available && (donor.units ?? 0) > 0);

        for (const genotype of ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'] as const) {
            for (const rhPositive of [true, false]) {
                expect(available.some((donor) => transfusionCompatibility(donor, specimen(genotype, rhPositive)).compatible), `no challenge donor for ${genotype}${rhPositive ? '+' : '-'}`).toBe(true);
            }
        }
    });

    it('allows Rh-negative cells for either Rh status but blocks D-positive cells for Rh-negative recipients', () => {
        const oNegative = specimen('OO', false);
        const oPositive = specimen('OO', true);

        expect(transfusionCompatibility(oNegative, oPositive).compatible).toBe(true);
        expect(transfusionCompatibility(oNegative, oNegative).compatible).toBe(true);
        expect(transfusionCompatibility(oPositive, oNegative)).toEqual({
            compatible: false,
            unfamiliarMarkers: ['d'],
        });
    });
});

function specimen(genotype: BloodGenotype, rhPositive = true) {
    return {
        id: genotype,
        sampleCode: genotype,
        dragonId: genotype,
        dragonName: genotype,
        dragonTitle: 'test specimen',
        color: '#000000',
        accentColor: '#ffffff',
        genotype,
        rhPositive,
    };
}
