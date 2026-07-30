import {
  DragonGenomeLabelPlacement,
  DragonGenomeLevelId,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
} from '../../domain/dragon-visual.models';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import {
  GENOME_MICROSCOPE_TARGETS,
  GENOME_MICROSCOPE_THEME,
  GenomeMicroscopeTheme,
  genomeLevelTarget,
} from './genome-microscope.theme';

export const GENOME_LEVEL_ORDER: readonly DragonGenomeLevelId[] = [
  'cell',
  'chromosome',
  'dna',
  'gene',
  'allele',
];

export interface GenomeLevelView {
  id: DragonGenomeLevelId;
  position: number;
  targetId: string;
  title: string;
  caption: string;
  identityVisible: boolean;
  accent: string;
  active: boolean;
  revealed: boolean;
  placement: DragonGenomeLabelPlacement | null;
  placedLabel: string;
  dropEnabled: boolean;
  evidenceSelected: boolean;
  evidenceEnabled: boolean;
}

export interface GenomeLabelView {
  id: DragonGenomeLevelId;
  label: string;
  placed: boolean;
  enabled: boolean;
}

export interface GenomeMicroscopeViewModel {
  sceneId: string;
  seed: string;
  mode: DragonVisualMode;
  phase: DragonVisualPhase;
  sample: { id: string; label: string; caption: string };
  taskId: string | null;
  taskPrompt: string;
  requestedLevel: DragonGenomeLevelId | null;
  lockedPrediction: DragonGenomeLevelId | null;
  predictionEnabled: boolean;
  focusLevel: DragonGenomeLevelId;
  gene: {
    id: string;
    traitId: string;
    chromosomeModel: number | null;
    allelePair: readonly [string, string];
    phenotype: string;
  } | null;
  levels: readonly GenomeLevelView[];
  labels: readonly GenomeLabelView[];
  labelsComplete: boolean;
  evidenceLevelId: DragonGenomeLevelId | null;
  revealEnabled: boolean;
  summary: string;
  targets: typeof GENOME_MICROSCOPE_TARGETS;
}

/** Pure scene-to-display mapping; correctness remains entirely lesson-owned. */
export function buildGenomeMicroscopeViewModel(
  scene: DragonVisualScene,
  copy: StationCopy = {},
  theme: GenomeMicroscopeTheme = GENOME_MICROSCOPE_THEME,
): GenomeMicroscopeViewModel | null {
  if (scene.instrument.kind !== 'genome-microscope') return null;
  const instrument = scene.instrument;
  const sample = scene.samples.find(candidate => candidate.id === instrument.sampleId);
  if (!sample) return null;
  const gene = sample.genes.find(candidate =>
    candidate.geneId === instrument.focusGeneId || candidate.traitId === instrument.focusGeneId)
    ?? sample.genes[0]
    ?? null;
  const placements = new Map(
    (instrument.labelPlacements ?? []).map(placement => [placement.levelId, placement]),
  );
  const placedLabelIds = new Set(
    (instrument.labelPlacements ?? []).map(placement => placement.labelId),
  );
  const revealedIds = new Set(instrument.revealedLevelIds ?? []);
  const labelsEnabled = scene.phase === 'manipulate';
  const evidenceEnabled = scene.phase === 'explain';
  const showLevelHints = instrument.showLevelHints ?? false;

  const levels = GENOME_LEVEL_ORDER.map((level, index): GenomeLevelView => {
    const placement = placements.get(level) ?? null;
    return {
      id: level,
      position: index + 1,
      targetId: genomeLevelTarget(level),
      title: resolveStationCopy(copy, `level.${level}.title`),
      caption: resolveStationCopy(copy, `level.${level}.caption`),
      identityVisible: revealedIds.has(level) || showLevelHints,
      accent: theme.levelAccents[level],
      active: instrument.focusLevel === level,
      revealed: revealedIds.has(level),
      placement,
      placedLabel: placement
        ? resolveStationCopy(copy, `level.${placement.labelId}.title`)
        : '',
      dropEnabled: labelsEnabled && !placement,
      evidenceSelected: instrument.evidenceLevelId === level,
      evidenceEnabled,
    };
  });

  const labels = GENOME_LEVEL_ORDER.map(level => ({
    id: level,
    label: resolveStationCopy(copy, `level.${level}.title`),
    placed: placedLabelIds.has(level),
    enabled: labelsEnabled && !placedLabelIds.has(level),
  }));
  const labelsComplete = labels.every(label => label.placed);
  const visibleAlleles = revealedIds.has('allele') && gene
    ? gene.allelePair.map(allele => allele.symbol).join(' and ')
    : 'hidden';

  return {
    sceneId: scene.sceneId,
    seed: scene.seed,
    mode: scene.mode,
    phase: scene.phase,
    sample: {
      id: sample.id,
      label: sample.label,
      caption: resolveStationCopy(copy, `sample.${sample.sampleType}.caption`),
    },
    taskId: instrument.taskId ?? null,
    taskPrompt: resolveStationCopy(copy, instrument.taskId ? `task.${instrument.taskId}.prompt` : null),
    requestedLevel: instrument.requestedLevel ?? null,
    lockedPrediction: instrument.lockedPrediction ?? null,
    predictionEnabled: scene.phase === 'predict',
    focusLevel: instrument.focusLevel,
    gene: gene ? {
      id: gene.geneId,
      traitId: gene.traitId,
      chromosomeModel: gene.chromosomeModel ?? null,
      allelePair: [gene.allelePair[0].symbol, gene.allelePair[1].symbol],
      phenotype: gene.phenotypeId,
    } : null,
    levels,
    labels,
    labelsComplete,
    evidenceLevelId: instrument.evidenceLevelId ?? null,
    revealEnabled: scene.phase === 'reveal' || scene.phase === 'explain' || scene.phase === 'review',
    summary: `${sample.label} sample. Focus is ${instrument.focusLevel}. ${placements.size} of 5 hierarchy labels placed. Alleles ${visibleAlleles}. Current step: ${scene.phase}.`,
    targets: GENOME_MICROSCOPE_TARGETS,
  };
}
