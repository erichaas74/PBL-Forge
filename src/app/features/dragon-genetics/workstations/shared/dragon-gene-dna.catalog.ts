import { ExpressiveDragonTraitId } from '../../simulation/domain/dragon-expressive-genome';

export interface DragonGeneDnaRecord {
  geneId: ExpressiveDragonTraitId;
  /** DNA carried by the gene's first allele sample. */
  alleleASequence: string;
  /** DNA carried by the gene's second allele sample. */
  alleleBSequence: string;
}

/**
 * Canonical DNA records for the allele investigation.
 *
 * Chromosome location and student-facing gene codes remain owned by the gene
 * catalog. This table owns only the DNA carried by each allele, joined through
 * the stable gene ID. Update a sequence here and every workstation receives it.
 */
export const DRAGON_GENE_DNA_CATALOG: readonly DragonGeneDnaRecord[] = [
  { geneId: 'wings', alleleASequence: 'ATGCATGCATGC', alleleBSequence: 'ATGAATGCAGGC' },
  { geneId: 'tail', alleleASequence: 'TGCATGCATGCA', alleleBSequence: 'TGCTTGCATCCA' },
  { geneId: 'legs', alleleASequence: 'GCATGCATGCAT', alleleBSequence: 'GCAGGCATGAAT' },
  { geneId: 'fire', alleleASequence: 'CATGCATGCATG', alleleBSequence: 'CATCCATGCTTG' },
  { geneId: 'horns', alleleASequence: 'ATGCATGCATGC', alleleBSequence: 'ATGAATGCAGGC' },
  { geneId: 'claws', alleleASequence: 'TGCATGCATGCA', alleleBSequence: 'TGCTTGCATCCA' },
  { geneId: 'scales', alleleASequence: 'GCATGCATGCAT', alleleBSequence: 'GCAGGCATGAAT' },
  {
    geneId: 'body-color',
    alleleASequence: 'CATGCATGCATG',
    alleleBSequence: 'CATCCATGCTTG',
  },
  { geneId: 'crest', alleleASequence: 'ATGCATGCATGC', alleleBSequence: 'ATGAATGCAGGC' },
  { geneId: 'ears', alleleASequence: 'TGCATGCATGCA', alleleBSequence: 'TGCTTGCATCCA' },
  { geneId: 'fangs', alleleASequence: 'GCATGCATGCAT', alleleBSequence: 'GCAGGCATGAAT' },
  { geneId: 'spikes', alleleASequence: 'CATGCATGCATG', alleleBSequence: 'CATCCATGCTTG' },
];

export function geneDnaRecord(geneId: ExpressiveDragonTraitId): DragonGeneDnaRecord {
  const record = DRAGON_GENE_DNA_CATALOG.find((candidate) => candidate.geneId === geneId);
  if (!record) throw new Error(`DNA record for dragon gene ${geneId} is not registered.`);
  return record;
}
