import { BERK_INSTRUMENT } from '../../../../shared/design/berk-palette';
import {
  CHROMOSOME_DIAGRAM,
  ChromosomeDiagramTheme,
} from '../../../../shared/dragon-visuals/displays/shared/chromosome-diagram';

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
  id: 'berk-hatchery-incubation-bay',
  version: '2.0.0',
  palette: {
    bayTop: BERK_INSTRUMENT.consoleTop,
    bayBottom: BERK_INSTRUMENT.consoleBottom,
    panel: BERK_INSTRUMENT.panel,
    panelEdge: BERK_INSTRUMENT.panelEdge,
    ink: BERK_INSTRUMENT.ink,
    mutedInk: BERK_INSTRUMENT.mutedInk,
    brass: BERK_INSTRUMENT.brass,
    glow: BERK_INSTRUMENT.glow,
    /*
     * The shell is the one warm object in the bay. It was a cold blue-white,
     * which read as porcelain under a fluorescent tube; bone over parchment
     * reads as something laid in straw and kept warm, and it is the only thing
     * on screen the student is meant to feel protective of.
     */
    shell: '#ece3d2',
    shellEdge: '#a89074',
    speckle: '#8a7358',
    /* Status colours double as the candling light, so each stays a light source. */
    examined: BERK_INSTRUMENT.brass,
    sampled: BERK_INSTRUMENT.recessive,
    hatched: BERK_INSTRUMENT.correct,
    staged: BERK_INSTRUMENT.glow,
    locked: '#77848a',
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
