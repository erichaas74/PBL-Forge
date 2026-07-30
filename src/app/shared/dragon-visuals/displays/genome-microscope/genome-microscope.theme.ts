import { DragonGenomeLevelId } from '../../domain/dragon-visual.models';

export interface GenomeMicroscopeTheme {
  id: string;
  version: string;
  palette: {
    consoleTop: string;
    consoleBottom: string;
    panel: string;
    panelEdge: string;
    ink: string;
    mutedInk: string;
    cyan: string;
    indigo: string;
    brass: string;
    correct: string;
    incorrect: string;
  };
  levelAccents: Readonly<Record<DragonGenomeLevelId, string>>;
  motion: {
    focusMs: number;
    traceMs: number;
    revealMs: number;
  };
}

export const GENOME_MICROSCOPE_THEME: GenomeMicroscopeTheme = {
  id: 'royal-hatchery-genome-microscope',
  version: '1.0.0',
  palette: {
    consoleTop: '#17283c',
    consoleBottom: '#0c1727',
    panel: '#20364d',
    panelEdge: '#3f617d',
    ink: '#eef8ff',
    mutedInk: '#a7bfd1',
    cyan: '#67e0d1',
    indigo: '#9e9cff',
    brass: '#efc668',
    correct: '#58cba6',
    incorrect: '#f08a72',
  },
  levelAccents: {
    cell: '#66d7c4',
    chromosome: '#75bdec',
    dna: '#9b9cf3',
    gene: '#e7bb5f',
    allele: '#ef8f9f',
  },
  motion: { focusMs: 650, traceMs: 1000, revealMs: 850 },
};

export const GENOME_MICROSCOPE_TARGETS = {
  sampleRecord: 'sample-record',
  predictionControl: 'prediction-control',
  zoomPath: 'zoom-path',
  levels: {
    cell: 'cell-level',
    chromosome: 'chromosome-level',
    dna: 'dna-level',
    gene: 'gene-locus',
    allele: 'allele-level',
  },
  alleleSlotA: 'allele-slot-a',
  alleleSlotB: 'allele-slot-b',
  labelDropzone: 'level-label-dropzone',
  evidenceMark: 'evidence-mark',
} as const;

export function genomeLevelTarget(level: DragonGenomeLevelId): string {
  return GENOME_MICROSCOPE_TARGETS.levels[level];
}
