import {
  DRAGON_PARENTS,
  analyzePairDiversity,
  breedLabClutch,
  buildPunnettCells,
  dominantPhenotypeProbability,
  genotypeLabel,
  showsDominantPhenotype,
} from './dragon-inheritance';

describe('dragon classroom inheritance model', () => {
  const ember = DRAGON_PARENTS.find(parent => parent.id === 'ember')!;
  const tide = DRAGON_PARENTS.find(parent => parent.id === 'tide')!;

  it('builds the expected sample space for a heterozygous by recessive cross', () => {
    const cells = buildPunnettCells(ember, tide, 'wings');
    expect(cells.map(cell => genotypeLabel(cell.genotype))).toEqual(['Ww', 'Ww', 'ww', 'ww']);
    expect(dominantPhenotypeProbability(ember, tide, 'wings')).toBe(50);
  });

  it('uses phenotype dominance without treating a heterozygote as homozygous', () => {
    expect(showsDominantPhenotype(['W', 'w'], 'wings')).toBeTrue();
    expect(showsDominantPhenotype(['w', 'w'], 'wings')).toBeFalse();
  });

  it('hatches a deterministic clutch using only parental alleles', () => {
    const first = breedLabClutch(ember, tide, 2, 8);
    const second = breedLabClutch(ember, tide, 2, 8);
    expect(first.map(dragon => dragon.genome)).toEqual(second.map(dragon => dragon.genome));
    for (const dragon of first) {
      expect(ember.genome.wings).toContain(dragon.genome.wings[0]);
      expect(tide.genome.wings).toContain(dragon.genome.wings[1]);
    }
  });

  it('reports bounded, explainable population-diversity indicators', () => {
    const analysis = analyzePairDiversity(ember, tide);
    expect(analysis.alleleRichnessPercent).toBeGreaterThanOrEqual(0);
    expect(analysis.alleleRichnessPercent).toBeLessThanOrEqual(100);
    expect(analysis.expectedHeterozygosityPercent).toBeGreaterThanOrEqual(0);
    expect(analysis.expectedHeterozygosityPercent).toBeLessThanOrEqual(100);
    expect(analysis.score).toBe(Math.round(
      analysis.alleleRichnessPercent * 0.6 + analysis.expectedHeterozygosityPercent * 0.4,
    ));
  });
});
