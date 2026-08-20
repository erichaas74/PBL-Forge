export const GENOME_MICROSCOPE_LEVELS = [
  'dragon',
  'cell',
  'nucleus',
  'chromosome-set',
  'chromosome',
  'chromatin',
  'gene',
  'dna',
  'allele',
  'rna',
  'base-chemistry',
  'protein',
  'enzyme',
  'expression',
] as const;

export type GenomeMicroscopeLevel = (typeof GENOME_MICROSCOPE_LEVELS)[number];
export type GenomeMicroscopeSex = 'female' | 'male';

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
  enzymeId?: string;
  productId?: string;
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
    explanation: 'A body cell has homologous chromosome pairs: one copy from each parent.',
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
    id: 'chromatin',
    label: 'Chromosome unpacking',
    shortLabel: 'Unpack',
    scale: 'molecular',
    explanation:
      'A chromosome is one continuous DNA molecule repeatedly folded around proteins and compressed into chromatin.',
    relationship:
      'Unpack the selected chromosome through chromatin fibers and nucleosomes until its thin DNA double helix is exposed.',
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
    id: 'rna',
    label: 'Messenger RNA',
    shortLabel: 'RNA',
    scale: 'molecular',
    explanation:
      'A cell can transcribe the coding information in DNA into a temporary messenger RNA copy.',
    relationship:
      "The selected allele's base order is preserved in mRNA, with uracil replacing thymine.",
  },
  {
    id: 'base-chemistry',
    label: 'Base molecules',
    shortLabel: 'Base atoms',
    scale: 'atomic',
    explanation:
      'Each DNA or RNA base is a molecule made from carbon, nitrogen, oxygen, and hydrogen atoms joined by covalent bonds.',
    relationship:
      'DNA uses A, T, C, and G; RNA uses A, U, C, and G. Their ring shapes and bonding sites allow complementary pairing.',
  },
  {
    id: 'protein',
    label: 'Protein product',
    shortLabel: 'Protein',
    scale: 'molecular',
    explanation:
      'A ribosome reads messenger RNA three bases at a time while tRNA delivers matching amino acids.',
    relationship:
      "The allele's DNA sequence can influence the protein product and, through cell activity, the organism.",
  },
  {
    id: 'enzyme',
    label: 'Enzyme reactions',
    shortLabel: 'Enzymes',
    scale: 'molecular',
    explanation:
      'Some proteins act as enzymes. Their active-site shapes bind particular substrates and help chemical reactions occur without using up the enzyme.',
    relationship:
      'Compare fictional dragon-cell enzymes, activate their catalysts, and observe which molecular products they build.',
  },
  {
    id: 'expression',
    label: 'Trait expression',
    shortLabel: 'Expression',
    scale: 'cell to organism',
    explanation:
      'A protein can interact with a shape-specific cellular target and change cell activity. Those cellular effects can contribute to an observable trait.',
    relationship:
      'Test protein shapes against cell receptors and observe how a molecular interaction changes the rendered dragon.',
  },
];
