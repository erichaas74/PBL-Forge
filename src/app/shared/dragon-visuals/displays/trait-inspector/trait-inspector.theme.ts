import { BERK_INSTRUMENT } from '../../../design/berk-palette';
import {
  DragonEvidenceSourceId,
  DragonTraitCategory,
} from '../../domain/dragon-visual.models';
import { StationGlyph } from '../shared/station-glyph.component';

/**
 * Everything the Trait Evidence Analyzer draws is declared here as data: palette, glyph
 * geometry, tray textures, and motion timing. Improving the graphics means editing or
 * replacing this theme (or passing a new one through the `theme` input) — the component,
 * view model, teaching sequence, and lesson logic stay unchanged.
 *
 * Rules for a replacement theme:
 * - keep the semantic keys (`gene-record`, `training-log`, `environment-log`, and the three
 *   trait categories) so scene data still resolves;
 * - pair every colour with a distinct glyph and texture so meaning never depends on hue; and
 * - keep glyph paths inside their declared `viewBox` so any size renders cleanly.
 */
export type TraitInspectorGlyph = StationGlyph;

export type TraitInspectorTexture = 'dots' | 'stripes' | 'grid';

export interface TraitInspectorSourceStyle {
  accent: string;
  glyph: TraitInspectorGlyph;
}

export interface TraitInspectorCategoryStyle {
  accent: string;
  surface: string;
  texture: TraitInspectorTexture;
  glyph: TraitInspectorGlyph;
}

export interface TraitInspectorTheme {
  id: string;
  version: string;
  /** Console chrome. Consumed as CSS custom properties, so any valid CSS colour works. */
  palette: {
    consoleTop: string;
    consoleBottom: string;
    panel: string;
    panelEdge: string;
    ink: string;
    mutedInk: string;
    brass: string;
    glow: string;
    correct: string;
    incorrect: string;
  };
  motion: {
    /** Milliseconds for the source-to-card evidence trace. */
    tracePathMs: number;
    /** Milliseconds for the card-to-tray travel. */
    cardTravelMs: number;
    pulseMs: number;
  };
  sampleGlyph: TraitInspectorGlyph;
  sources: Readonly<Record<DragonEvidenceSourceId, TraitInspectorSourceStyle>>;
  categories: Readonly<Record<DragonTraitCategory, TraitInspectorCategoryStyle>>;
}

const HELIX: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M7 2c0 5 10 5 10 10s-10 5-10 10',
    'M17 2c0 5-10 5-10 10s10 5 10 10',
    'M8.6 6h6.8',
    'M6.9 12h10.2',
    'M8.6 18h6.8',
  ],
};

const SIGNAL_LOG: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M3 4h18v16H3z',
    'M6 13h2.2l1.6-4.4 2.4 8 1.8-5.2 1.4 3.2 1.2-1.6H18',
    'M6 17.5h12',
  ],
};

const FIELD_LOG: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M2 19.2h20',
    'M2.5 19l6.2-8.4 3.8 4.8 3.1-3.9 6.1 7.5',
    'M6.4 3.4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  ],
};

const SPECIMEN_TUBE: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M9 2.5h6',
    'M9.8 2.5v6.2L6.6 16a4.4 4.4 0 0 0 4 6.2h2.8a4.4 4.4 0 0 0 4-6.2l-3.2-7.3V2.5',
    'M7.6 15.4h8.8',
  ],
};

const EGG_MARK: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M12 2.4c4 3.6 6.2 7.6 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 10 8 6 12 2.4z',
    'M8.9 12.4c2.2 1.7 4-1.7 6.2 0',
    'M8.9 16.1c2.2 1.7 4-1.7 6.2 0',
  ],
};

const PRACTICE_LOOP: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M20.4 12a8.4 8.4 0 1 1-2.9-6.4',
    'M20.6 3.4v4.4h-4.4',
    'M12 7.6v4.8l3 1.8',
  ],
};

const WEATHER_MARK: TraitInspectorGlyph = {
  viewBox: '0 0 24 24',
  strokes: [
    'M7.4 15.2a4.1 4.1 0 0 1 .7-8.1 5.6 5.6 0 0 1 10.5 1.7 3.7 3.7 0 0 1-.7 6.4z',
    'M8.6 18.2l-1.2 3.2',
    'M12.6 18.2l-1.2 3.2',
    'M16.6 18.2l-1.2 3.2',
  ],
};

export const TRAIT_INSPECTOR_THEME: TraitInspectorTheme = {
  id: 'berk-hatchery-evidence-console',
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
    correct: BERK_INSTRUMENT.correct,
    incorrect: BERK_INSTRUMENT.incorrect,
  },
  motion: {
    tracePathMs: 1500,
    cardTravelMs: 1200,
    pulseMs: 900,
  },
  sampleGlyph: SPECIMEN_TUBE,
  /*
   * Source and category share a hue on purpose: a card drawn from the gene
   * record is the same green as the "inherited" bin it belongs in, so the
   * student can see where a card is going before reading a word of it. The
   * source is the lighter of each pair — it is the thing in hand, the bin is
   * the thing at rest. Do not break the pairing when restyling.
   */
  sources: {
    'gene-record': { accent: '#6fb8ae', glyph: HELIX },
    'training-log': { accent: BERK_INSTRUMENT.focus, glyph: SIGNAL_LOG },
    'environment-log': { accent: BERK_INSTRUMENT.recessive, glyph: FIELD_LOG },
  },
  categories: {
    inherited: {
      accent: '#5aa08f',
      surface: '#17282a',
      texture: 'dots',
      glyph: EGG_MARK,
    },
    learned: {
      accent: BERK_INSTRUMENT.brass,
      surface: '#2d2415',
      texture: 'stripes',
      glyph: PRACTICE_LOOP,
    },
    environmental: {
      accent: '#9b82b8',
      surface: '#241f2c',
      texture: 'grid',
      glyph: WEATHER_MARK,
    },
  },
};

/** Semantic targets this station exposes to teaching sequences and evidence events. */
export const TRAIT_INSPECTOR_TARGETS = {
  sampleRecord: 'sample-record',
  observationCard: 'observation-card',
  predictionControl: 'prediction-control',
  evidenceSource: 'evidence-source',
  evidenceMark: 'evidence-mark',
  trays: {
    inherited: 'inherited-tray',
    learned: 'learned-tray',
    environmental: 'environmental-tray',
  },
} as const;

export function trayTargetId(category: DragonTraitCategory): string {
  return TRAIT_INSPECTOR_TARGETS.trays[category];
}
