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
  id: 'royal-hatchery-genotype-scanner',
  version: '1.0.0',
  palette: {
    consoleTop: '#16273a',
    consoleBottom: '#0e1b2b',
    panel: '#1f3348',
    panelEdge: '#3c5c79',
    ink: '#eef7ff',
    mutedInk: '#a4bcd0',
    brass: '#e6b849',
    glow: '#67e8f9',
    dominant: '#5fd0b4',
    recessive: '#b49cf2',
    correct: '#58cba6',
    incorrect: '#f08a72',
    missed: '#efc668',
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
