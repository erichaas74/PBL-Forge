import { deducePedigree, truePhenotype } from './pedigree-deduction';
import {
  assessRelatedness,
  bloodlineStats,
  breedClutch,
  descendantIds,
  kinshipCoefficient,
  lineToAncestor,
  mergeHatchlings,
} from './pedigree-lab.domain';
import { ARCHIVE_YEAR, PEDIGREE_GENE_IDS } from './pedigree-lab.models';
import {
  PEDIGREE_ARCHIVE,
  archiveDragon,
  investigationById,
  transmissibleAlleles,
} from './pedigree-population';

const FROST = investigationById('frost-scale');

describe('pedigree relatedness', () => {
  it('gives full siblings and a parent–offspring pair the same quarter kinship', () => {
    expect(kinshipCoefficient(PEDIGREE_ARCHIVE, 'arkon', 'signe')).toBeCloseTo(0.25, 5);
    expect(kinshipCoefficient(PEDIGREE_ARCHIVE, 'hesper', 'arkon')).toBeCloseTo(0.25, 5);
  });

  it('finds no kinship between two unrelated founding lines', () => {
    expect(kinshipCoefficient(PEDIGREE_ARCHIVE, 'vyrak', 'korrak')).toBe(0);
    expect(assessRelatedness(PEDIGREE_ARCHIVE, 'vyrak', 'korrak').level).toBe('unrelated');
  });

  it('warns hardest about the pairing that looks most tempting', () => {
    // Both of Hesper's hatchlings are likely carriers, which is exactly why
    // breeding them together has to be flagged rather than quietly allowed.
    const siblings = assessRelatedness(PEDIGREE_ARCHIVE, 'arkon', 'signe');
    const distant = assessRelatedness(PEDIGREE_ARCHIVE, 'arkon', 'sylva');

    expect(siblings.level).toBe('very-close');
    expect(distant.coefficient).toBeLessThan(siblings.coefficient);
  });
});

describe('bloodline statistics', () => {
  it('reports when the hunted appearance was last written down', () => {
    const stats = bloodlineStats(PEDIGREE_ARCHIVE, FROST, null);

    expect(stats.lastObservedDragonId).toBe('ivrid');
    expect(stats.lastObservedYear).toBe(301);
    expect(stats.yearsSinceObserved).toBe(ARCHIVE_YEAR - 301);
    expect(stats.livingDescendants).toBeGreaterThan(0);
  });

  it('counts carriers only once a model has been chosen', () => {
    const withoutModel = bloodlineStats(PEDIGREE_ARCHIVE, FROST, null);
    const withModel = bloodlineStats(
      PEDIGREE_ARCHIVE,
      FROST,
      deducePedigree({
        population: PEDIGREE_ARCHIVE,
        investigation: FROST,
        model: 'autosomal-recessive',
        dnaTests: [],
      }),
    );

    expect(withoutModel.confirmedCarriers).toBe(0);
    expect(withModel.confirmedCarriers).toBeGreaterThan(0);
  });
});

describe('pedigree walks', () => {
  it('returns a line of descent from the legend down to a living dragon', () => {
    const line = lineToAncestor(PEDIGREE_ARCHIVE, 'arkon', 'vyrak');

    expect(line[0]).toBe('vyrak');
    expect(line[line.length - 1]).toBe('arkon');
    expect(line).toContain('hesper');
    expect(line).toContain('ivrid');
  });

  it('counts descendants without counting the ancestor', () => {
    const descendants = descendantIds(PEDIGREE_ARCHIVE, 'vyrak');

    expect(descendants.has('vyrak')).toBeFalse();
    expect(descendants.has('kaenor')).toBeTrue();
    expect(descendants.has('arkon')).toBeTrue();
    expect(descendants.has('korrak')).toBeFalse();
  });
});

describe('breeding a clutch', () => {
  const mother = archiveDragon('sylva')!;
  const father = archiveDragon('arkon')!;

  function hatch(attempt: number) {
    return breedClutch({
      investigationId: FROST.id,
      investigation: FROST,
      population: PEDIGREE_ARCHIVE,
      mother,
      father,
      attempt,
      clutchSize: 6,
      predictedPercent: 25,
    });
  }

  it('gives every hatchling one allele from each parent', () => {
    for (const hatchling of hatch(1).hatchlings) {
      for (const geneId of PEDIGREE_GENE_IDS) {
        const maternal = transmissibleAlleles(geneId, mother, hatchling.sex, 'mother');
        const paternal = transmissibleAlleles(geneId, father, hatchling.sex, 'father');
        const pair = hatchling.genome[geneId];
        expect(maternal.some((allele) => pair.includes(allele)))
          .withContext(`${hatchling.id} at ${geneId}`)
          .toBeTrue();
        expect(paternal.some((allele) => pair.includes(allele)))
          .withContext(`${hatchling.id} at ${geneId}`)
          .toBeTrue();
      }
    }
  });

  it('draws the two parental alleles independently, so the lost form can actually return', () => {
    // Arkon and Sylva are both heterozygous, so a quarter of eggs should be
    // homozygous for the traced allele. This is the ratchet on the seeded
    // sampler: an earlier hash made the two draws perfectly anti-correlated and
    // every hatchling came out heterozygous, which would have made the whole
    // investigation unwinnable without ever failing loudly.
    const clutches = 40;
    let recovered = 0;
    for (let attempt = 1; attempt <= clutches; attempt += 1) {
      recovered += hatch(attempt).record.recoveredCount;
    }
    const rate = recovered / (clutches * 6);
    expect(rate).toBeGreaterThan(0.12);
    expect(rate).toBeLessThan(0.4);
  });

  it('samples each egg independently rather than dealing out the expected ratio', () => {
    const first = hatch(1);
    const second = hatch(2);

    expect(first.hatchlings.map((h) => h.genome.scales.join(''))).toEqual(
      hatch(1).hatchlings.map((h) => h.genome.scales.join('')),
    );
    expect(first.record.observedPercent).not.toBe(-1);
    expect(second.hatchlings.map((h) => h.id)).not.toEqual(first.hatchlings.map((h) => h.id));
  });

  it('records the clutch against the prediction it was authorised on', () => {
    const outcome = hatch(1);
    const recovered = outcome.hatchlings.filter(
      (hatchling) =>
        truePhenotype(FROST.geneId, hatchling.genome[FROST.geneId]) === FROST.lostPhenotype,
    );

    expect(outcome.record.predictedPercent).toBe(25);
    expect(outcome.record.recoveredCount).toBe(recovered.length);
    expect(outcome.record.inbreedingCoefficient).toBeCloseTo(
      kinshipCoefficient(PEDIGREE_ARCHIVE, mother.id, father.id),
      6,
    );
  });

  it('links hatchlings into the pedigree so they descend from the legend', () => {
    const outcome = hatch(1);
    const merged = mergeHatchlings(PEDIGREE_ARCHIVE, outcome.hatchlings);
    const hatchling = outcome.hatchlings[0];

    expect(merged.find((dragon) => dragon.id === father.id)?.offspringIds).toContain(hatchling.id);
    expect(descendantIds(merged, 'vyrak').has(hatchling.id)).toBeTrue();
    expect(lineToAncestor(merged, hatchling.id, 'vyrak').length).toBeGreaterThan(2);
  });
});
