import { ExpressiveDragonTraitId } from '../../simulation/domain/dragon-expressive-genome';

export type DragonDnaBase = 'A' | 'T' | 'C' | 'G';
export type DragonGeneMutationType = 'substitution' | 'deletion' | 'insertion';
export type DragonGeneBarcodeMutationType = 'reference' | DragonGeneMutationType;

/** Canonical colors used anywhere a DNA base is drawn. */
export const DRAGON_DNA_BASE_COLORS: Readonly<Record<DragonDnaBase, string>> = {
  A: '#48a43b',
  T: '#e34c45',
  C: '#2877e8',
  G: '#e2a11a',
};

export type DragonGeneMutation =
  | {
      type: 'substitution';
      /** Zero-based position in the reference allele. */
      index: number;
      referenceBase: DragonDnaBase;
      variantBase: DragonDnaBase;
    }
  | {
      type: 'deletion';
      /** Zero-based position in the reference allele. */
      index: number;
      referenceBase: DragonDnaBase;
    }
  | {
      type: 'insertion';
      /** Zero-based insertion point in the reference allele. */
      index: number;
      variantBase: DragonDnaBase;
    };

export interface DragonGeneBarcodePair {
  topBase: DragonDnaBase;
  bottomBase: DragonDnaBase;
  topColor: string;
  bottomColor: string;
}

export interface DragonGeneAlleleMarking {
  role: 'reference' | 'variant';
  sequence: string;
  mutationType: DragonGeneBarcodeMutationType;
  barcode: readonly DragonGeneBarcodePair[];
}

export interface DragonGeneDnaRecord {
  geneId: ExpressiveDragonTraitId;
  /** The stable color for this gene's chromosome locus. */
  locusColor: string;
  /** DNA carried by the gene's first allele sample. */
  alleleASequence: string;
  /** DNA carried by the gene's second allele sample. */
  alleleBSequence: string;
  /** The explicit change that produces allele B from allele A. */
  mutation: DragonGeneMutation;
  /** Render-ready markings in the same order as the gene's two allele samples. */
  alleles: readonly [DragonGeneAlleleMarking, DragonGeneAlleleMarking];
}

const COMPLEMENT: Readonly<Record<DragonDnaBase, DragonDnaBase>> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

const BARCODE_BASE_COUNT = 6;

/**
 * Canonical molecular identity and visual marking for every identified dragon gene.
 *
 * Allele A is the reference strand. Allele B is generated from the declared mutation,
 * so the sequence, mutation label, barcode bases, and barcode colors cannot drift apart.
 * Chromosome location and student-facing sample codes remain owned by the gene catalog.
 */
export const DRAGON_GENE_DNA_CATALOG: readonly DragonGeneDnaRecord[] = [
  defineGene('wings', '#ff6d68', 'ATGCCGTACCGAGCTACCGGATCA', {
    type: 'substitution',
    index: 4,
    referenceBase: 'C',
    variantBase: 'T',
  }),
  defineGene('tail', '#49a8ff', 'TGCATACGGTCAGACCTTGGACCA', {
    type: 'deletion',
    index: 3,
    referenceBase: 'A',
  }),
  defineGene('legs', '#67d790', 'GCATGGCCTTGGACTGGCCAAGTT', {
    type: 'insertion',
    index: 5,
    variantBase: 'C',
  }),
  defineGene('fire', '#ff6d68', 'CATGACTGGCATGGATTCCAGACT', {
    type: 'insertion',
    index: 2,
    variantBase: 'T',
  }),
  defineGene('horns', '#49a8ff', 'AGTCGATCCGTAAACGGCTCTCCA', {
    type: 'substitution',
    index: 1,
    referenceBase: 'G',
    variantBase: 'A',
  }),
  defineGene('claws', '#67d790', 'TCGAGTACCTGGCCTGAAGGCACT', {
    type: 'deletion',
    index: 4,
    referenceBase: 'G',
  }),
  defineGene('scales', '#ff6d68', 'GCTACGATTCGAGTTCCAGACGGC', {
    type: 'deletion',
    index: 2,
    referenceBase: 'T',
  }),
  defineGene('body-color', '#49a8ff', 'CAGTGCATAGCTAACTGCCCTGGA', {
    type: 'substitution',
    index: 3,
    referenceBase: 'T',
    variantBase: 'C',
  }),
  defineGene('crest', '#67d790', 'ATCGGATCTGCAGGAACTCCAGTT', {
    type: 'insertion',
    index: 4,
    variantBase: 'A',
  }),
  defineGene('glow', '#ff6d68', 'TCACCTGAGCTACCTGACGGATTC', {
    type: 'substitution',
    index: 2,
    referenceBase: 'A',
    variantBase: 'G',
  }),
  defineGene('fangs', '#49a8ff', 'GACTGCTACCGTACTGGCCCAGAA', {
    type: 'insertion',
    index: 3,
    variantBase: 'T',
  }),
  defineGene('spikes', '#67d790', 'CTGACGTATCGAGACCCTTTCGGA', {
    type: 'deletion',
    index: 5,
    referenceBase: 'G',
  }),
  defineGene('eye-color', '#b996d6', 'ACGTTCGAGTCAGGCACTCAACCT', {
    type: 'substitution',
    index: 4,
    referenceBase: 'T',
    variantBase: 'C',
  }),
];

export function geneDnaRecord(geneId: ExpressiveDragonTraitId): DragonGeneDnaRecord {
  const record = DRAGON_GENE_DNA_CATALOG.find((candidate) => candidate.geneId === geneId);
  if (!record) throw new Error(`DNA record for dragon gene ${geneId} is not registered.`);
  return record;
}

export function geneAlleleMarking(
  geneId: ExpressiveDragonTraitId,
  alleleIndex: 0 | 1,
): DragonGeneAlleleMarking {
  return geneDnaRecord(geneId).alleles[alleleIndex];
}

export function geneMutationTypeForComparison(
  geneId: ExpressiveDragonTraitId,
  referenceAlleleIndex: 0 | 1,
  comparisonAlleleIndex: 0 | 1,
): DragonGeneMutationType {
  const mutationType = geneDnaRecord(geneId).mutation.type;
  if (referenceAlleleIndex === comparisonAlleleIndex || referenceAlleleIndex === 0) {
    return mutationType;
  }
  if (mutationType === 'insertion') return 'deletion';
  if (mutationType === 'deletion') return 'insertion';
  return mutationType;
}

function defineGene(
  geneId: ExpressiveDragonTraitId,
  locusColor: string,
  referenceSequence: string,
  mutation: DragonGeneMutation,
): DragonGeneDnaRecord {
  assertDnaSequence(referenceSequence, geneId);
  assertMutationMatchesReference(referenceSequence, mutation, geneId);

  const variantSequence = applyMutation(referenceSequence, mutation);
  const referenceBarcode = referenceSequence.slice(0, BARCODE_BASE_COUNT);
  const variantBarcode = applyMutation(referenceBarcode, mutation);

  return {
    geneId,
    locusColor,
    alleleASequence: referenceSequence,
    alleleBSequence: variantSequence,
    mutation,
    alleles: [
      {
        role: 'reference',
        sequence: referenceSequence,
        mutationType: 'reference',
        barcode: barcodeFor(referenceBarcode),
      },
      {
        role: 'variant',
        sequence: variantSequence,
        mutationType: mutation.type,
        barcode: barcodeFor(variantBarcode),
      },
    ],
  };
}

function applyMutation(sequence: string, mutation: DragonGeneMutation): string {
  if (mutation.type === 'substitution') {
    return `${sequence.slice(0, mutation.index)}${mutation.variantBase}${sequence.slice(mutation.index + 1)}`;
  }
  if (mutation.type === 'deletion') {
    return `${sequence.slice(0, mutation.index)}${sequence.slice(mutation.index + 1)}`;
  }
  return `${sequence.slice(0, mutation.index)}${mutation.variantBase}${sequence.slice(mutation.index)}`;
}

function barcodeFor(sequence: string): readonly DragonGeneBarcodePair[] {
  return [...sequence].map((base) => {
    const topBase = base as DragonDnaBase;
    const bottomBase = COMPLEMENT[topBase];
    return {
      topBase,
      bottomBase,
      topColor: DRAGON_DNA_BASE_COLORS[topBase],
      bottomColor: DRAGON_DNA_BASE_COLORS[bottomBase],
    };
  });
}

function assertDnaSequence(sequence: string, geneId: ExpressiveDragonTraitId): void {
  if (!/^[ATCG]+$/.test(sequence)) {
    throw new Error(`DNA record for dragon gene ${geneId} contains an invalid base.`);
  }
}

function assertMutationMatchesReference(
  sequence: string,
  mutation: DragonGeneMutation,
  geneId: ExpressiveDragonTraitId,
): void {
  if (mutation.index < 0 || mutation.index >= BARCODE_BASE_COUNT) {
    throw new Error(
      `Mutation for dragon gene ${geneId} must be visible in its chromosome barcode.`,
    );
  }
  if ('referenceBase' in mutation && sequence[mutation.index] !== mutation.referenceBase) {
    throw new Error(`Mutation for dragon gene ${geneId} does not match its reference sequence.`);
  }
}
