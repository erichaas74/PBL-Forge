import { CHROMOSOME_DIAGRAM, ChromosomeDiagramTheme } from '../shared/chromosome-diagram';

/**
 * Royal hatchery incubation bay styling. Allele and genotype artwork comes from the shared
 * chromosome diagram, so restyling chromosomes restyles every station that shows them.
 *
 * Shell geometry lives here rather than in the glyph component: a visual pack can replace the
 * egg outline without touching interaction code.
 */
export interface DragonHatcheryTheme {
  id: string;
  version: string;
  palette: {
    bayTop: string;
    bayBottom: string;
    panel: string;
    panelEdge: string;
    ink: string;
    mutedInk: string;
    brass: string;
    glow: string;
    shell: string;
    shellEdge: string;
    speckle: string;
    examined: string;
    sampled: string;
    hatched: string;
    staged: string;
    locked: string;
  };
  /** Egg outline in glyph user units. Replaceable without changing any station code. */
  shell: {
    viewBoxWidth: number;
    viewBoxHeight: number;
    path: string;
    /** Deterministic shell speckles, laid out inside the outline. */
    speckleCount: number;
  };
  chromosome: ChromosomeDiagramTheme;
  motion: {
    candleMs: number;
    sampleMs: number;
    hatchMs: number;
    pulseMs: number;
  };
}

export const DRAGON_HATCHERY_THEME: DragonHatcheryTheme = {
  id: 'royal-hatchery-incubation-bay',
  version: '1.0.0',
  palette: {
    bayTop: '#16273a',
    bayBottom: '#0e1b2b',
    panel: '#1f3348',
    panelEdge: '#3c5c79',
    ink: '#eef7ff',
    mutedInk: '#a4bcd0',
    brass: '#e6b849',
    glow: '#67e8f9',
    shell: '#e6ecf5',
    shellEdge: '#8fa7bf',
    speckle: '#7d93ac',
    examined: '#efc668',
    sampled: '#b49cf2',
    hatched: '#58cba6',
    staged: '#67e8f9',
    locked: '#6d8098',
  },
  shell: {
    viewBoxWidth: 64,
    viewBoxHeight: 84,
    path: 'M32 5c14 0 26 21 26 43 0 20-12 31-26 31S6 68 6 48C6 26 18 5 32 5Z',
    speckleCount: 7,
  },
  chromosome: CHROMOSOME_DIAGRAM,
  motion: { candleMs: 900, sampleMs: 1100, hatchMs: 1400, pulseMs: 800 },
};

/** Semantic targets this station exposes to teaching sequences and evidence events. */
export const DRAGON_HATCHERY_TARGETS = {
  clutchRecord: 'clutch-record',
  eggTray: 'egg-tray',
  eggSample: 'egg-sample',
  examineControl: 'examine-control',
  sampleControl: 'sample-control',
  phenotypeReadout: 'phenotype-readout',
  alleleSlotA: 'allele-slot-a',
  alleleSlotB: 'allele-slot-b',
  hatchTray: 'hatch-tray',
  hatchControl: 'hatch-control',
  evidenceMark: 'evidence-mark',
} as const;
