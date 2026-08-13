import { EXPRESSIVE_DRAGON_TRAITS } from '../../simulation/domain/dragon-expressive-genome';
import { observedPhenotypeOf } from './pedigree-deduction';
import {
  PEDIGREE_GENE_IDS,
  PedigreeDragon,
  pedigreeGene,
  tracedAllele,
} from './pedigree-lab.models';
import {
  BLOODLINE_INVESTIGATIONS,
  PEDIGREE_ARCHIVE,
  PEDIGREE_UNIONS,
  archiveDragon,
  normalizePair,
  parseGenotypeCode,
  transmissibleAlleles,
} from './pedigree-population';

describe('pedigree archive', () => {
  const byId = new Map(PEDIGREE_ARCHIVE.map((dragon) => [dragon.id, dragon]));

  it('draws every gene from the shared expressive trait catalog', () => {
    for (const geneId of PEDIGREE_GENE_IDS) {
      expect(EXPRESSIVE_DRAGON_TRAITS.some((trait) => trait.id === geneId)).toBeTrue();
      expect(pedigreeGene(geneId)).toBe(
        EXPRESSIVE_DRAGON_TRAITS.find((trait) => trait.id === geneId)!,
      );
    }
  });

  it('gives every dragon a genotype its recorded parents could actually transmit', () => {
    for (const dragon of PEDIGREE_ARCHIVE) {
      if (!dragon.motherId || !dragon.fatherId) continue;
      const mother = byId.get(dragon.motherId);
      const father = byId.get(dragon.fatherId);
      expect(mother).withContext(`mother of ${dragon.id}`).toBeDefined();
      expect(father).withContext(`father of ${dragon.id}`).toBeDefined();
      if (!mother || !father) continue;

      for (const geneId of PEDIGREE_GENE_IDS) {
        const maternal = transmissibleAlleles(geneId, mother, dragon.sex, 'mother');
        const paternal = transmissibleAlleles(geneId, father, dragon.sex, 'father');
        const reachable = maternal.flatMap((fromMother) =>
          paternal.map((fromFather) => normalizePair(geneId, [fromMother, fromFather]).join('')),
        );
        expect(reachable)
          .withContext(`${dragon.id} at ${geneId}`)
          .toContain(dragon.genome[geneId].join(''));
      }
    }
  });

  it('honours every genotype the written history pins', () => {
    for (const union of PEDIGREE_UNIONS) {
      for (const child of union.children) {
        if (!child.require) continue;
        const dragon = byId.get(child.id);
        expect(dragon).withContext(child.id).toBeDefined();
        if (!dragon) continue;
        for (const [geneId, code] of Object.entries(child.require)) {
          const expected = parseGenotypeCode(
            geneId as (typeof PEDIGREE_GENE_IDS)[number],
            code as string,
            dragon.sex,
          );
          expect(dragon.genome[geneId as (typeof PEDIGREE_GENE_IDS)[number]].join(''))
            .withContext(`${child.id} pinned at ${geneId}`)
            .toBe(expected.join(''));
        }
      }
    }
  });

  it('places every dragon after both of its parents', () => {
    for (const dragon of PEDIGREE_ARCHIVE) {
      for (const parentId of [dragon.motherId, dragon.fatherId]) {
        const parent = parentId ? byId.get(parentId) : null;
        if (!parent) continue;
        expect(parent.generation).toBeLessThan(dragon.generation);
        expect(parent.birthYear).toBeLessThan(dragon.birthYear);
        expect(parent.offspringIds).toContain(dragon.id);
      }
    }
  });

  it('holds a register large enough to need pedigree reasoning', () => {
    const living = PEDIGREE_ARCHIVE.filter((dragon) => dragon.alive);
    expect(PEDIGREE_ARCHIVE.length).toBeGreaterThanOrEqual(60);
    expect(PEDIGREE_ARCHIVE.length - living.length).toBeGreaterThanOrEqual(20);
    expect(living.length).toBeGreaterThanOrEqual(20);
  });

  it('leaves every hunted appearance absent from the living register', () => {
    for (const investigation of BLOODLINE_INVESTIGATIONS) {
      const livingWithTrait = PEDIGREE_ARCHIVE.filter(
        (dragon) =>
          dragon.alive &&
          observedPhenotypeOf(dragon, investigation.geneId) === investigation.lostPhenotype,
      );
      const legend = archiveDragon(investigation.ancestorId) as PedigreeDragon;
      expect(observedPhenotypeOf(legend, investigation.geneId))
        .withContext(investigation.id)
        .toBe(investigation.lostPhenotype);
      expect(livingWithTrait.map((dragon) => dragon.id))
        .withContext(`${investigation.id} should be lost among the living`)
        .toEqual([]);
    }
  });

  it('keeps the frost line traceable: Vyrak passes his allele to every child', () => {
    const traced = tracedAllele(BLOODLINE_INVESTIGATIONS[0]);
    const vyrak = archiveDragon('vyrak') as PedigreeDragon;
    expect(vyrak.genome.scales).toEqual([traced, traced]);

    for (const childId of vyrak.offspringIds) {
      const child = byId.get(childId) as PedigreeDragon;
      expect(child.genome.scales).toContain(traced);
      expect(observedPhenotypeOf(child, 'scales')).not.toBe(
        BLOODLINE_INVESTIGATIONS[0].lostPhenotype,
      );
    }
  });

  it('keeps one record incomplete so pedigree gaps have to be reasoned around', () => {
    const brandt = archiveDragon('brandt') as PedigreeDragon;
    expect(brandt.dnaAvailable).toBeFalse();
    expect(brandt.recordedGeneIds).not.toContain('tail');
    expect(observedPhenotypeOf(brandt, 'tail')).toBeNull();
  });
});
