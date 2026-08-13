import { ChromosomeSvgModel } from '../shared/chromosome-svg.component';

export const GENOME_MICROSCOPE_LEVELS = [
  'cell',
  'nucleus',
  'chromosome-set',
  'chromosome',
  'dna',
  'gene',
  'allele',
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
}

export const GENOME_MICROSCOPE_LEVEL_DEFINITIONS: readonly GenomeMicroscopeLevelDefinition[] = [
  { id: 'cell', label: 'Dragon cell', shortLabel: 'Cell' },
  { id: 'nucleus', label: 'Nucleus', shortLabel: 'Nucleus' },
  { id: 'chromosome-set', label: 'Chromosome pairs', shortLabel: 'Pairs' },
  { id: 'chromosome', label: 'One chromosome', shortLabel: 'Chromosome' },
  { id: 'dna', label: 'DNA molecule', shortLabel: 'DNA' },
  { id: 'gene', label: 'Gene region', shortLabel: 'Gene' },
  { id: 'allele', label: 'Allele comparison', shortLabel: 'Alleles' },
];
