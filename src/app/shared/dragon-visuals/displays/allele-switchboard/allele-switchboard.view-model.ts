import {
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
} from '../../domain/dragon-visual.models';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import {
  ALLELE_SWITCHBOARD_TARGETS,
  ALLELE_SWITCHBOARD_THEME,
  AlleleSwitchboardTheme,
} from './allele-switchboard.theme';

export interface AlleleLocusView {
  geneId: string;
  traitId: string;
  chromosomeModel: number | null;
  alleles: readonly [string, string];
  focus: boolean;
  position: number;
}

export interface AlleleEvidenceView {
  id: string;
  label: string;
  anchorId: string | null;
  selected: boolean;
  enabled: boolean;
}

export interface AlleleSwitchboardViewModel {
  sceneId: string;
  mode: DragonVisualMode;
  phase: DragonVisualPhase;
  sample: { id: string; label: string };
  taskId: string | null;
  focusGeneId: string;
  loci: readonly AlleleLocusView[];
  focusPosition: number;
  dominantAllele: string;
  recessiveAllele: string;
  startingAlleles: readonly [string, string];
  requestedAlleles: readonly [string, string];
  workingAlleles: readonly [string, string];
  predictedPhenotypeId: string | null;
  actualPhenotypeId: string | null;
  genotypeClassId: string | null;
  genotypeClassLabel: string;
  carrierState: boolean;
  expressionRevealed: boolean;
  tokenEnabled: boolean;
  slotEnabled: boolean;
  predictionEnabled: boolean;
  revealEnabled: boolean;
  evidence: readonly AlleleEvidenceView[];
  dominantPhenotypeLabel: string;
  recessivePhenotypeLabel: string;
  summary: string;
  targets: typeof ALLELE_SWITCHBOARD_TARGETS;
}

/** Pure scene mapping. All correctness and expression results arrive from lesson state. */
export function buildAlleleSwitchboardViewModel(
  scene: DragonVisualScene,
  copy: StationCopy = {},
  theme: AlleleSwitchboardTheme = ALLELE_SWITCHBOARD_THEME,
): AlleleSwitchboardViewModel | null {
  void theme;
  if (scene.instrument.kind !== 'allele-switchboard') return null;
  const instrument = scene.instrument;
  const sample = scene.samples.find(candidate => candidate.id === instrument.sampleId);
  if (!sample) return null;
  const focusGene = sample.genes.find(gene =>
    gene.geneId === instrument.focusGeneId || gene.traitId === instrument.focusGeneId) ?? null;
  const orderedGenes = [...sample.genes].sort((left, right) =>
    (left.chromosomeModel ?? 99) - (right.chromosomeModel ?? 99));
  const loci = orderedGenes.map((gene, index): AlleleLocusView => ({
    geneId: gene.geneId,
    traitId: gene.traitId,
    chromosomeModel: gene.chromosomeModel ?? null,
    alleles: gene === focusGene
      ? instrument.workingAlleles
      : [gene.allelePair[0].symbol, gene.allelePair[1].symbol],
    focus: gene === focusGene,
    position: index,
  }));
  const genotypeClassLabel = ({
    'homozygous-dominant': 'Homozygous dominant',
    heterozygous: 'Heterozygous',
    'homozygous-recessive': 'Homozygous recessive',
  } as Record<string, string>)[instrument.genotypeClassId ?? ''] ?? 'Awaiting expression trace';
  const evidenceEnabled = scene.phase === 'explain';
  const evidence = (instrument.evidenceMarks ?? []).map(mark => ({
    id: mark.id,
    label: resolveStationCopy(copy, mark.labelId),
    anchorId: mark.anchorId ?? null,
    selected: mark.id === instrument.evidenceMarkId,
    enabled: evidenceEnabled,
  }));
  const pair = instrument.workingAlleles.join('');
  const actual = instrument.expressionRevealed
    ? instrument.actualPhenotypeId ?? 'unresolved'
    : 'hidden';

  return {
    sceneId: scene.sceneId,
    mode: scene.mode,
    phase: scene.phase,
    sample: { id: sample.id, label: sample.label },
    taskId: instrument.taskId ?? null,
    focusGeneId: instrument.focusGeneId,
    loci,
    focusPosition: Math.max(0, loci.findIndex(locus => locus.focus)),
    dominantAllele: instrument.dominantAllele,
    recessiveAllele: instrument.recessiveAllele,
    startingAlleles: instrument.startingAlleles,
    requestedAlleles: instrument.requestedAlleles,
    workingAlleles: instrument.workingAlleles,
    predictedPhenotypeId: instrument.predictedPhenotypeId ?? null,
    actualPhenotypeId: instrument.actualPhenotypeId ?? null,
    genotypeClassId: instrument.genotypeClassId ?? null,
    genotypeClassLabel,
    carrierState: instrument.carrierState ?? false,
    expressionRevealed: instrument.expressionRevealed ?? false,
    tokenEnabled: scene.phase === 'manipulate',
    slotEnabled: scene.phase === 'manipulate',
    predictionEnabled: scene.phase === 'predict',
    revealEnabled: scene.phase === 'reveal' && !(instrument.expressionRevealed ?? false),
    evidence,
    dominantPhenotypeLabel: instrument.dominantPhenotypeId,
    recessivePhenotypeLabel: instrument.recessivePhenotypeId,
    summary: `${sample.label} sample. ${instrument.focusGeneId} working pair ${pair}. Prediction ${instrument.predictedPhenotypeId ?? 'not locked'}. Expression result ${actual}. Both alleles remain visible.`,
    targets: ALLELE_SWITCHBOARD_TARGETS,
  };
}
