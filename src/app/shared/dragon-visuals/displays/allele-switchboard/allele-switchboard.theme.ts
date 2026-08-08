import { BERK_INSTRUMENT } from '../../../design/berk-palette';

export interface AlleleSwitchboardTheme {
  id: string;
  version: string;
  palette: {
    consoleTop: string;
    consoleBottom: string;
    panel: string;
    panelEdge: string;
    ink: string;
    mutedInk: string;
    dominant: string;
    recessive: string;
    focus: string;
    brass: string;
    correct: string;
    incorrect: string;
  };
  motion: { moveMs: number; traceMs: number; revealMs: number };
}

export const ALLELE_SWITCHBOARD_THEME: AlleleSwitchboardTheme = {
  id: 'berk-hatchery-allele-workbench',
  version: '2.0.0',
  palette: {
    consoleTop: BERK_INSTRUMENT.consoleTop,
    consoleBottom: BERK_INSTRUMENT.consoleBottom,
    panel: BERK_INSTRUMENT.panel,
    panelEdge: BERK_INSTRUMENT.panelEdge,
    ink: BERK_INSTRUMENT.ink,
    mutedInk: BERK_INSTRUMENT.mutedInk,
    dominant: BERK_INSTRUMENT.dominant,
    recessive: BERK_INSTRUMENT.recessive,
    focus: BERK_INSTRUMENT.focus,
    brass: BERK_INSTRUMENT.brass,
    correct: BERK_INSTRUMENT.correct,
    incorrect: BERK_INSTRUMENT.incorrect,
  },
  motion: { moveMs: 420, traceMs: 1400, revealMs: 800 },
};

export const ALLELE_SWITCHBOARD_TARGETS = {
  sampleVial: 'sample-vial',
  sampleChamber: 'sample-chamber',
  sampleLock: 'sample-lock',
  geneLocator: 'gene-locator',
  chromosomeStage: 'chromosome-stage',
  targetReticle: 'target-reticle',
  fluorescentMarker: 'fluorescent-marker',
  bandingOverlay: 'banding-overlay',
  homologCompare: 'homolog-compare',
  alleleToken: 'allele-token',
  alleleSlotA: 'allele-slot-a',
  alleleSlotB: 'allele-slot-b',
  socketLockA: 'socket-lock-a',
  socketLockB: 'socket-lock-b',
  recessivePrediction: 'recessive-prediction',
  genotypeInterpretation: 'genotype-interpretation',
  recessiveInterpretation: 'recessive-interpretation',
  dominantAllele: 'dominant-allele',
  recessiveAllele: 'recessive-allele',
  expressionPath: 'expression-path',
  carrierIndicator: 'carrier-indicator',
  phenotypeReadout: 'phenotype-readout',
} as const;
