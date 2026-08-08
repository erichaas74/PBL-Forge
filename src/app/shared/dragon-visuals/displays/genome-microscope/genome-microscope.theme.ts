import { BERK_INSTRUMENT } from '../../../design/berk-palette';
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
  id: 'berk-hatchery-genome-microscope',
  version: '2.0.0',
  palette: {
    consoleTop: BERK_INSTRUMENT.consoleTop,
    consoleBottom: BERK_INSTRUMENT.consoleBottom,
    panel: BERK_INSTRUMENT.panel,
    panelEdge: BERK_INSTRUMENT.panelEdge,
    ink: BERK_INSTRUMENT.ink,
    mutedInk: BERK_INSTRUMENT.mutedInk,
    cyan: BERK_INSTRUMENT.glow,
    indigo: BERK_INSTRUMENT.violet,
    brass: BERK_INSTRUMENT.brass,
    correct: BERK_INSTRUMENT.correct,
    incorrect: BERK_INSTRUMENT.incorrect,
  },
  /*
   * One accent per containment level, walking cool-to-warm as the zoom goes
   * deeper. The order is the teaching point — the student should feel the
   * descent from cell to allele — so these are a deliberate ramp rather than
   * five picks off the token list.
   */
  levelAccents: {
    cell: '#6fb8ae',
    chromosome: BERK_INSTRUMENT.glow,
    dna: BERK_INSTRUMENT.violet,
    gene: BERK_INSTRUMENT.brass,
    allele: '#dd8a68',
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
