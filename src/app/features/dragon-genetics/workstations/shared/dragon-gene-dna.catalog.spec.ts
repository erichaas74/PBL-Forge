import { EXPRESSIVE_DRAGON_TRAITS } from '../../simulation/domain/dragon-expressive-genome';
import {
  DRAGON_DNA_BASE_COLORS,
  DRAGON_GENE_DNA_CATALOG,
  DragonDnaBase,
  geneAlleleMarking,
  geneDnaRecord,
  geneMutationTypeForComparison,
} from './dragon-gene-dna.catalog';

describe('dragon gene DNA catalog', () => {
  it('defines molecular and visual truth for every identified gene', () => {
    expect(DRAGON_GENE_DNA_CATALOG.map((record) => record.geneId).sort()).toEqual(
      EXPRESSIVE_DRAGON_TRAITS.map((trait) => trait.id).sort(),
    );
    expect(new Set(DRAGON_GENE_DNA_CATALOG.map((record) => record.alleleASequence)).size).toBe(
      DRAGON_GENE_DNA_CATALOG.length,
    );
  });

  it('keeps sequence, mutation, barcode bases, and base colors aligned', () => {
    const complements: Readonly<Record<DragonDnaBase, DragonDnaBase>> = {
      A: 'T', T: 'A', C: 'G', G: 'C',
    };

    for (const record of DRAGON_GENE_DNA_CATALOG) {
      expect(record.alleles[0].sequence).toBe(record.alleleASequence);
      expect(record.alleles[1].sequence).toBe(record.alleleBSequence);
      expect(record.alleles[0].mutationType).toBe('reference');
      expect(record.alleles[1].mutationType).toBe(record.mutation.type);
      expect(record.alleles[0].barcode.length).toBe(6);
      expect(record.alleles[1].barcode.length).toBe(
        record.mutation.type === 'deletion' ? 5 : record.mutation.type === 'insertion' ? 7 : 6,
      );

      for (const pair of [...record.alleles[0].barcode, ...record.alleles[1].barcode]) {
        expect(pair.bottomBase).toBe(complements[pair.topBase]);
        expect(pair.topColor).toBe(DRAGON_DNA_BASE_COLORS[pair.topBase]);
        expect(pair.bottomColor).toBe(DRAGON_DNA_BASE_COLORS[pair.bottomBase]);
      }
    }
  });

  it('contains substitution, deletion, and insertion genes', () => {
    expect(new Set(DRAGON_GENE_DNA_CATALOG.map((record) => record.mutation.type))).toEqual(
      new Set(['substitution', 'deletion', 'insertion']),
    );
  });

  it('provides allele markings and reverses length-changing comparisons', () => {
    expect(geneAlleleMarking('wings', 1)).toBe(geneDnaRecord('wings').alleles[1]);
    expect(geneMutationTypeForComparison('legs', 0, 1)).toBe('insertion');
    expect(geneMutationTypeForComparison('legs', 1, 0)).toBe('deletion');
    expect(geneMutationTypeForComparison('tail', 1, 0)).toBe('insertion');
  });
});
