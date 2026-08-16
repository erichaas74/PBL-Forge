import { ChromosomeSvgModel } from '../shared/chromosome-svg.component';

export const GENOME_MICROSCOPE_LEVELS = [
  'dragon',
  'cell',
  'nucleus',
  'chromosome-set',
  'chromosome',
  'gene',
  'dna',
  'allele',
  'protein',
] as const;

export type GenomeMicroscopeLevel = (typeof GENOME_MICROSCOPE_LEVELS)[number];
export type GenomeMicroscopeSex = 'female' | 'male';

export interface GenomeMicroscopeChromosomePair {
  id: string;
  label: string;
  kind: 'autosome' | 'sex';
  maternal: ChromosomeSvgModel;
  paternal: ChromosomeSvgModel;
}

export interface GenomeMicroscopeLevelDefinition {
  id: GenomeMicroscopeLevel;
  label: string;
  shortLabel: string;
  scale: string;
  explanation: string;
  relationship: string;
}

export interface GenomeMicroscopeEvidence {
  level: GenomeMicroscopeLevel;
  dragonId: string | null;
  chromosome: string;
  geneId: string | null;
  alleleCopy: 0 | 1;
}

export const GENOME_MICROSCOPE_LEVEL_DEFINITIONS: readonly GenomeMicroscopeLevelDefinition[] = [
  {
    id: 'dragon',
    label: 'Whole dragon',
    shortLabel: 'Dragon',
    scale: 'organism',
    explanation: 'A dragon is a whole organism made of many specialized cells.',
    relationship:
      'The visible dragon is the result; its inherited information is stored inside its cells.',
  },
  {
    id: 'cell',
    label: 'Dragon cell',
    shortLabel: 'Cell',
    scale: 'cellular',
    explanation:
      'A cell is a living unit surrounded by a membrane. Most body cells contain a nucleus.',
    relationship:
      "This cell belongs to the loaded dragon and carries copies of that dragon's genome.",
  },
  {
    id: 'nucleus',
    label: 'Nucleus',
    shortLabel: 'Nucleus',
    scale: 'cellular',
    explanation: 'The nucleus is a membrane-bound compartment that protects the chromosomes.',
    relationship: 'Inside the cell, the nucleus keeps the chromosome set together.',
  },
  {
    id: 'chromosome-set',
    label: 'Chromosome pairs',
    shortLabel: 'Pairs',
    scale: 'genome',
    explanation:
      'A body cell has homologous chromosome pairs: one copy from each parent.',
    relationship:
      'Each pair carries the same genes at matching loci, but the two copies may carry different alleles.',
  },
  {
    id: 'chromosome',
    label: 'One chromosome pair',
    shortLabel: 'Chromosome',
    scale: 'genome',
    explanation: 'A chromosome is one long DNA molecule packaged with proteins.',
    relationship: 'The selected chromosome contains many genes arranged along its DNA.',
  },
  {
    id: 'gene',
    label: 'Gene region',
    shortLabel: 'Gene',
    scale: 'molecular',
    explanation:
      'A gene is a defined region of DNA that can contribute instructions for a functional product.',
    relationship: 'The highlighted locus is one gene inside the selected chromosome.',
  },
  {
    id: 'dna',
    label: 'DNA sequence',
    shortLabel: 'DNA',
    scale: 'molecular',
    explanation:
      'DNA stores information in the order of A, T, C, and G bases on two complementary strands.',
    relationship: 'This sequence is the molecular material that makes up the selected gene copy.',
  },
  {
    id: 'allele',
    label: 'Allele copy',
    shortLabel: 'Allele',
    scale: 'molecular',
    explanation:
      'An allele is one version of a gene. A dragon can inherit two matching or different versions.',
    relationship:
      'Selecting either homolog reveals the allele sequence carried by that chromosome copy.',
  },
  {
    id: 'protein',
    label: 'Protein product',
    shortLabel: 'Protein',
    scale: 'molecular',
    explanation:
      'Cells can transcribe gene information into RNA and read RNA codons to assemble a protein chain.',
    relationship:
      "The allele's DNA sequence can influence the protein product and, through cell activity, the organism.",
  },
];
