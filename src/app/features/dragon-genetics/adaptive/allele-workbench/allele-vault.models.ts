export type AlleleDominance = 'dominant' | 'recessive';

export interface AlleleVaultGene {
  id: string;
  name: string;
  symbol: string;
  chromosome: string;
  locus: string;
  icon: string;
  dominantPhenotype: string;
  recessivePhenotype: string;
  alleleIds: readonly string[];
}

export interface AlleleVaultAllele {
  id: string;
  geneId: string;
  symbol: string;
  name: string;
  dominance: AlleleDominance;
  phenotype: string;
  modelSequence: readonly string[];
}

export interface AlleleWorkbenchQuestionInput {
  id: string;
  focusGeneId?: string;
  startingPairIds?: readonly [string, string];
  requestedPairIds?: readonly [string, string];
  comparisonAlleleIds?: readonly [string, string];
  allowedAlleleIds?: readonly string[];
  highlight?: 'vault' | 'comparison' | 'pair' | 'expression';
}

export type AlleleWorkbenchInteractionType =
  | 'gene-selected'
  | 'allele-selected'
  | 'comparison-swapped'
  | 'allele-installed'
  | 'expression-run';

export interface AlleleWorkbenchInteraction {
  type: AlleleWorkbenchInteractionType;
  geneId: string;
  alleleId?: string;
  pairIds?: readonly [string, string];
  semanticTargetId?: 'slot-a' | 'slot-b' | 'carrier' | 'expression';
}

export const ALLELE_VAULT_GENES: readonly AlleleVaultGene[] = [
  {
    id: 'wings',
    name: 'Wings',
    symbol: 'W/w',
    chromosome: 'Chr 1',
    locus: 'WNG-04',
    icon: 'W',
    dominantPhenotype: 'Winged',
    recessivePhenotype: 'Wingless',
    alleleIds: ['wings-W', 'wings-w'],
  },
  {
    id: 'fire',
    name: 'Fire',
    symbol: 'F/f',
    chromosome: 'Chr 2',
    locus: 'FIR-11',
    icon: 'F',
    dominantPhenotype: 'Fire breath',
    recessivePhenotype: 'No fire',
    alleleIds: ['fire-F', 'fire-f'],
  },
  {
    id: 'horns',
    name: 'Horns',
    symbol: 'H/h',
    chromosome: 'Chr 3',
    locus: 'HRN-08',
    icon: 'H',
    dominantPhenotype: 'Horned',
    recessivePhenotype: 'Hornless',
    alleleIds: ['horns-H', 'horns-h'],
  },
  {
    id: 'scales',
    name: 'Scales',
    symbol: 'S/s',
    chromosome: 'Chr 4',
    locus: 'SCL-17',
    icon: 'S',
    dominantPhenotype: 'Spotted',
    recessivePhenotype: 'Solid',
    alleleIds: ['scales-S', 'scales-s'],
  },
];

export const ALLELE_VAULT_ALLELES: readonly AlleleVaultAllele[] = [
  {
    id: 'wings-W',
    geneId: 'wings',
    symbol: 'W',
    name: 'Wing allele',
    dominance: 'dominant',
    phenotype: 'Winged',
    modelSequence: ['A', 'T', 'G', 'C', 'C', 'A', 'T', 'G', 'A', 'C', 'T', 'G'],
  },
  {
    id: 'wings-w',
    geneId: 'wings',
    symbol: 'w',
    name: 'Wingless allele',
    dominance: 'recessive',
    phenotype: 'Wingless',
    modelSequence: ['A', 'T', 'G', 'T', 'C', 'A', 'T', 'G', 'A', 'A', 'T', 'G'],
  },
  {
    id: 'fire-F',
    geneId: 'fire',
    symbol: 'F',
    name: 'Fire allele',
    dominance: 'dominant',
    phenotype: 'Fire breath',
    modelSequence: ['C', 'G', 'A', 'A', 'T', 'C', 'G', 'T', 'C', 'A', 'G', 'A'],
  },
  {
    id: 'fire-f',
    geneId: 'fire',
    symbol: 'f',
    name: 'No-fire allele',
    dominance: 'recessive',
    phenotype: 'No fire',
    modelSequence: ['C', 'G', 'A', 'A', 'T', 'T', 'G', 'T', 'C', 'A', 'A', 'A'],
  },
  {
    id: 'horns-H',
    geneId: 'horns',
    symbol: 'H',
    name: 'Horn allele',
    dominance: 'dominant',
    phenotype: 'Horned',
    modelSequence: ['T', 'A', 'C', 'G', 'A', 'G', 'C', 'C', 'T', 'A', 'G', 'C'],
  },
  {
    id: 'horns-h',
    geneId: 'horns',
    symbol: 'h',
    name: 'Hornless allele',
    dominance: 'recessive',
    phenotype: 'Hornless',
    modelSequence: ['T', 'A', 'C', 'G', 'T', 'G', 'C', 'C', 'T', 'T', 'G', 'C'],
  },
  {
    id: 'scales-S',
    geneId: 'scales',
    symbol: 'S',
    name: 'Spotted allele',
    dominance: 'dominant',
    phenotype: 'Spotted',
    modelSequence: ['G', 'C', 'T', 'T', 'A', 'C', 'G', 'A', 'A', 'T', 'C', 'G'],
  },
  {
    id: 'scales-s',
    geneId: 'scales',
    symbol: 's',
    name: 'Solid allele',
    dominance: 'recessive',
    phenotype: 'Solid',
    modelSequence: ['G', 'C', 'T', 'C', 'A', 'C', 'G', 'A', 'G', 'T', 'C', 'G'],
  },
];
