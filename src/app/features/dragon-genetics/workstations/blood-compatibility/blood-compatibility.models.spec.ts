import {
  BloodGenotype,
  BloodPhenotypeId,
  antiserumReaction,
  clinicDonors,
  markersForGenotype,
  phenotypeForGenotype,
  transfusionCompatibility,
} from './blood-compatibility.models';

describe('dragon blood compatibility model', () => {
  it('maps all six genotypes to the four multiple-allele phenotypes', () => {
    const expected: Readonly<Record<BloodGenotype, BloodPhenotypeId>> = {
      FF: 'flame',
      Fo: 'flame',
      TT: 'tide',
      To: 'tide',
      FT: 'dual',
      oo: 'clear',
    };

    for (const [genotype, phenotype] of Object.entries(expected)) {
      expect(phenotypeForGenotype(genotype as BloodGenotype).id).toBe(phenotype);
    }
  });

  it('expresses F and T codominantly and o without a surface marker', () => {
    const dual = specimen('FT');
    const flameCarrier = specimen('Fo');
    const clear = specimen('oo');

    expect(markersForGenotype(dual.genotype)).toEqual(['flame', 'tide']);
    expect(antiserumReaction(dual, 'flame')).toBeTrue();
    expect(antiserumReaction(dual, 'tide')).toBeTrue();
    expect(antiserumReaction(flameCarrier, 'flame')).toBeTrue();
    expect(antiserumReaction(flameCarrier, 'tide')).toBeFalse();
    expect(markersForGenotype(clear.genotype)).toEqual([]);
  });

  it('accepts donor cells only when every donor marker is present on the recipient', () => {
    const clear = specimen('oo');
    const flame = specimen('FF');
    const tide = specimen('TT');
    const dual = specimen('FT');

    for (const recipient of [clear, flame, tide, dual]) {
      expect(transfusionCompatibility(clear, recipient).compatible).toBeTrue();
    }
    expect(transfusionCompatibility(flame, flame).compatible).toBeTrue();
    expect(transfusionCompatibility(flame, dual).compatible).toBeTrue();
    expect(transfusionCompatibility(flame, tide)).toEqual({
      compatible: false,
      unfamiliarMarkers: ['flame'],
    });
    expect(transfusionCompatibility(tide, tide).compatible).toBeTrue();
    expect(transfusionCompatibility(tide, dual).compatible).toBeTrue();
    expect(transfusionCompatibility(tide, flame)).toEqual({
      compatible: false,
      unfamiliarMarkers: ['tide'],
    });
    expect(transfusionCompatibility(dual, dual).compatible).toBeTrue();
    expect(transfusionCompatibility(dual, flame).compatible).toBeFalse();
    expect(transfusionCompatibility(dual, tide).compatible).toBeFalse();
    expect(transfusionCompatibility(dual, clear).compatible).toBeFalse();
  });

  it('provides one neutral-coded clinic donor for every marker phenotype', () => {
    const donors = clinicDonors('standard');
    const phenotypes = donors.map((donor) => phenotypeForGenotype(donor.genotype).id);

    expect(new Set(phenotypes)).toEqual(new Set(['clear', 'flame', 'tide', 'dual']));
    expect(donors.map((donor) => donor.sampleCode)).toEqual(['DN-01', 'DN-02', 'DN-03', 'DN-04']);
  });

  it('keeps at least one compatible donor available for every challenge patient phenotype', () => {
    const available = clinicDonors('challenge').filter(
      (donor) => donor.available && (donor.units ?? 0) > 0,
    );

    for (const genotype of ['FF', 'Fo', 'TT', 'To', 'FT', 'oo'] as const) {
      expect(
        available.some((donor) => transfusionCompatibility(donor, specimen(genotype)).compatible),
      )
        .withContext(`no challenge donor for ${genotype}`)
        .toBeTrue();
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
