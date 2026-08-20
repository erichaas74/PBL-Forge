import { GENERIC_HETEROZYGOUS_XY_DRAGON } from '../../simulation/domain/dragon-expressive-genome';
import { ALLELE_VAULT_ALLELES, ALLELE_VAULT_GENES } from '../allele-workbench/allele-vault.models';
import { DRAGON_AUTOSOME_LABELS } from './dragon-chromosome.catalog';
import { buildDragonChromosomePairs, chromosomePairViewportItems } from './dragon-chromosome-pairs';

describe('shared dragon chromosome pairs', () => {
  const pairs = buildDragonChromosomePairs({
    genes: ALLELE_VAULT_GENES,
    alleles: ALLELE_VAULT_ALLELES,
    chromosomes: [...DRAGON_AUTOSOME_LABELS, 'Chr X'],
    sex: GENERIC_HETEROZYGOUS_XY_DRAGON.sex,
    genotypeForGene: (geneId) => GENERIC_HETEROZYGOUS_XY_DRAGON.genome[geneId],
  });

  it('builds one reusable five-pair XY genome', () => {
    expect(pairs.length).toBe(5);
    expect(pairs.filter((pair) => pair.kind === 'autosome').length).toBe(4);
    const sexPair = pairs.find((pair) => pair.kind === 'sex');
    expect(sexPair?.id).toBe('Chr X');
    expect(sexPair?.label).toBe('XY sex chromosomes');
    expect(sexPair?.maternal.leftLabel).toBe('Xp');
    expect(sexPair?.paternal.leftLabel).toBe('Yp');
    expect(sexPair?.maternal.loci[0].symbol).toBe('E');
    expect(sexPair?.paternal.loci.length).toBe(0);
  });

  it('places a different allele and colored barcode on every autosomal homolog', () => {
    for (const pair of pairs.filter((candidate) => candidate.kind === 'autosome')) {
      expect(pair.maternal.loci.length).toBe(pair.paternal.loci.length);
      pair.maternal.loci.forEach((maternalLocus, index) => {
        const paternalLocus = pair.paternal.loci[index];
        expect(maternalLocus.symbol).not.toBe(paternalLocus.symbol);
        expect(maternalLocus.color).toBeTruthy();
        expect(paternalLocus.color).toBe(maternalLocus.color);
        expect(maternalLocus.marking?.role).toBe('reference');
        expect(paternalLocus.marking?.role).toBe('variant');
      });
    }
  });

  it('adapts every pair to the same homologous-pair cell render', () => {
    const items = chromosomePairViewportItems(pairs);
    expect(
      items.every((item) => item.pairedModel && item.pairRelationship === 'homologous-pair'),
    ).toBeTrue();
    expect(items.at(-1)?.shortLabel).toBe('XY');
  });
});
