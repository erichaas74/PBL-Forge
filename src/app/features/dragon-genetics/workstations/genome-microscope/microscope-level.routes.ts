import type { GenomeMicroscopeLevel } from './genome-microscope.models';

/** Lightweight route metadata. Full workstation content stays in the lazy microscope bundle. */
export const MICROSCOPE_LEVEL_ROUTES = [
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
].map((level) => ({
  level: level as GenomeMicroscopeLevel,
  path: `dragon-genetics/microscope/${level}`,
})) as readonly { level: GenomeMicroscopeLevel; path: string }[];
