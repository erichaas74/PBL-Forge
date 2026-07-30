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
  id: 'royal-hatchery-allele-workbench',
  version: '1.0.0',
  palette: {
    consoleTop: '#192b38',
    consoleBottom: '#0b1721',
    panel: '#203845',
    panelEdge: '#456575',
    ink: '#effbff',
    mutedInk: '#aac3cd',
    dominant: '#67e0d1',
    recessive: '#d2a7ff',
    focus: '#f3c86a',
    brass: '#e9b95c',
    correct: '#5ad0a6',
    incorrect: '#f18a75',
  },
  motion: { moveMs: 420, traceMs: 1400, revealMs: 800 },
};

export const ALLELE_SWITCHBOARD_TARGETS = {
  alleleToken: 'allele-token',
  alleleSlotA: 'allele-slot-a',
  alleleSlotB: 'allele-slot-b',
  dominantAllele: 'dominant-allele',
  recessiveAllele: 'recessive-allele',
  expressionPath: 'expression-path',
  carrierIndicator: 'carrier-indicator',
  phenotypeReadout: 'phenotype-readout',
} as const;
