import { ChromosomeSvgModel } from './chromosome-svg.component';

export interface DragonChromosomeVisualData {
  length: number;
  centromere: number;
  locusPositions: readonly number[];
  bands: ChromosomeSvgModel['bands'];
}

export const DRAGON_AUTOSOME_LABELS = ['Chr 1', 'Chr 2', 'Chr 3', 'Chr 4'] as const;
export type DragonAutosomeLabel = (typeof DRAGON_AUTOSOME_LABELS)[number];
export type DragonSexChromosomeLabel = 'Chr X' | 'Chr Y';

/** Shared chromosome geometry used by every genetics workstation. */
export const DRAGON_CHROMOSOME_VISUALS: Readonly<Record<string, DragonChromosomeVisualData>> = {
  'Chr 1': {
    length: 1,
    centromere: 0.4,
    locusPositions: [0.18, 0.58, 0.83],
    bands: [
      { start: 0, end: 0.1, color: '#b9dbc7' },
      { start: 0.1, end: 0.25, color: '#efaab2' },
      { start: 0.25, end: 0.4, color: '#aeb9d8' },
      { start: 0.4, end: 0.45, color: '#ecc6a4', pattern: 'hatch' },
      { start: 0.45, end: 0.7, color: '#f8e78c' },
      { start: 0.7, end: 1, color: '#aeb9d8' },
    ],
  },
  'Chr 2': {
    length: 0.94,
    centromere: 0.47,
    locusPositions: [0.14, 0.61, 0.88],
    bands: [
      { start: 0, end: 0.14, color: '#a9d2be' },
      { start: 0.14, end: 0.31, color: '#f2c1c7' },
      { start: 0.31, end: 0.47, color: '#bcc6e2' },
      { start: 0.47, end: 0.52, color: '#e8b98e', pattern: 'hatch' },
      { start: 0.52, end: 0.76, color: '#f5e18a' },
      { start: 0.76, end: 1, color: '#9fafd3' },
    ],
  },
  'Chr 3': {
    length: 0.87,
    centromere: 0.35,
    locusPositions: [0.24, 0.55, 0.79],
    bands: [
      { start: 0, end: 0.17, color: '#b5dac8' },
      { start: 0.17, end: 0.35, color: '#f0abb5' },
      { start: 0.35, end: 0.41, color: '#e9c39e', pattern: 'hatch' },
      { start: 0.41, end: 0.63, color: '#aeb9d8' },
      { start: 0.63, end: 0.82, color: '#f7e58e' },
      { start: 0.82, end: 1, color: '#b5c0df', pattern: 'hatch' },
    ],
  },
  'Chr 4': {
    length: 0.8,
    centromere: 0.56,
    locusPositions: [0.12, 0.48, 0.74],
    bands: [
      { start: 0, end: 0.13, color: '#add4c0' },
      { start: 0.13, end: 0.29, color: '#b2bddb' },
      { start: 0.29, end: 0.43, color: '#f4e48d' },
      { start: 0.43, end: 0.56, color: '#ecaab2' },
      { start: 0.56, end: 0.62, color: '#edc49f', pattern: 'hatch' },
      { start: 0.62, end: 1, color: '#aab7d8' },
    ],
  },
  'Chr X': {
    length: 0.74,
    centromere: 0.46,
    locusPositions: [0.28],
    bands: [
      { start: 0, end: 0.16, color: '#efaab2' },
      { start: 0.16, end: 0.31, color: '#aeb9d8' },
      { start: 0.31, end: 0.46, color: '#b9dbc7' },
      { start: 0.46, end: 0.53, color: '#ecc6a4', pattern: 'hatch' },
      { start: 0.53, end: 0.76, color: '#f8e78c' },
      { start: 0.76, end: 1, color: '#aeb9d8' },
    ],
  },
  'Chr Y': {
    length: 0.48,
    centromere: 0.58,
    locusPositions: [],
    bands: [
      { start: 0, end: 0.2, color: '#aeb9d8' },
      { start: 0.2, end: 0.38, color: '#efaab2' },
      { start: 0.38, end: 0.58, color: '#b9dbc7' },
      { start: 0.58, end: 0.67, color: '#ecc6a4', pattern: 'hatch' },
      { start: 0.67, end: 0.84, color: '#f8e78c' },
      { start: 0.84, end: 1, color: '#aeb9d8' },
    ],
  },
};

export const DRAGON_LOCUS_COLORS = ['#ff6d68', '#49a8ff', '#67d790'] as const;

export function chromosomeVisual(chromosome: string): DragonChromosomeVisualData {
  return DRAGON_CHROMOSOME_VISUALS[chromosome] ?? DRAGON_CHROMOSOME_VISUALS['Chr 1'];
}
