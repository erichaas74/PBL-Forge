import { BERK_INSTRUMENT } from '../../../design/berk-palette';
import { CHROMOSOME_DIAGRAM, ChromosomeDiagramTheme } from '../shared/chromosome-diagram';

/**
 * Genotype Scanner console styling. Allele and genotype artwork comes from the shared
 * chromosome diagram, so restyling chromosomes here restyles every station that shows them.
 */
export interface GenotypeScannerTheme {
  id: string;
  version: string;
  palette: {
    consoleTop: string;
    consoleBottom: string;
    panel: string;
    panelEdge: string;
    ink: string;
    mutedInk: string;
    brass: string;
    glow: string;
    dominant: string;
    recessive: string;
    correct: string;
    incorrect: string;
    missed: string;
  };
  chromosome: ChromosomeDiagramTheme;
  motion: {
    scanMs: number;
    revealMs: number;
    pulseMs: number;
  };
}

export const GENOTYPE_SCANNER_THEME: GenotypeScannerTheme = {
  id: 'berk-hatchery-genotype-scanner',
  version: '2.0.0',
  palette: {
    consoleTop: BERK_INSTRUMENT.consoleTop,
    consoleBottom: BERK_INSTRUMENT.consoleBottom,
    panel: BERK_INSTRUMENT.panel,
    panelEdge: BERK_INSTRUMENT.panelEdge,
    ink: BERK_INSTRUMENT.ink,
    mutedInk: BERK_INSTRUMENT.mutedInk,
    brass: BERK_INSTRUMENT.brass,
    glow: BERK_INSTRUMENT.glow,
    dominant: BERK_INSTRUMENT.dominant,
    recessive: BERK_INSTRUMENT.recessive,
    correct: BERK_INSTRUMENT.correct,
    incorrect: BERK_INSTRUMENT.incorrect,
    missed: BERK_INSTRUMENT.missed,
  },
  chromosome: CHROMOSOME_DIAGRAM,
  motion: { scanMs: 1200, revealMs: 900, pulseMs: 800 },
};

/** Semantic targets this station exposes to teaching sequences and evidence events. */
export const GENOTYPE_SCANNER_TARGETS = {
  sampleRecord: 'sample-record',
  phenotypeReadout: 'phenotype-readout',
  concealedAllelePair: 'concealed-allele-pair',
  genotypeOption: 'genotype-option',
  scanControl: 'scan-control',
  alleleSlotA: 'allele-slot-a',
  alleleSlotB: 'allele-slot-b',
  comparisonRecord: 'comparison-record',
  evidenceMark: 'evidence-mark',
} as const;
