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
  centered: boolean;
  targetVisible: boolean;
  locked: boolean;
  position: number;
}

export interface AlleleSampleVialView {
  code: string;
  label: string;
  selected: boolean;
  loaded: boolean;
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
  sample: { id: string; code: string; label: string };
  sampleVials: readonly AlleleSampleVialView[];
  hasSelectedVial: boolean;
  hasLoadedVial: boolean;
  observeStep: 'select-sample' | 'load-sample' | 'secure-chamber' | 'locate-gene';
  chamberLocked: boolean;
  sampleMismatch: boolean;
  taskId: string | null;
  chromosomeNumber: number | null;
  focusGeneId: string;
  centeredGeneId: string | null;
  geneLocationLocked: boolean;
  locatorHintVisible: boolean;
  bandingEnabled: boolean;
  fluorescenceEnabled: boolean;
  homologComparisonEnabled: boolean;
  loci: readonly AlleleLocusView[];
  locusSummary: string;
  focusPosition: number;
  dominantAllele: string;
  recessiveAllele: string;
  startingAlleles: readonly [string, string];
  requestedAlleles: readonly [string, string];
  workingAlleles: readonly [string, string];
  socketsSecured: readonly [boolean, boolean];
  predictedPhenotypeId: string | null;
  predictedRecessiveRetained: boolean | null;
  requiresRecessivePrediction: boolean;
  actualPhenotypeId: string | null;
  dominantSignalPresent: boolean;
  recessiveSignalPresent: boolean;
  genotypeClassId: string | null;
  genotypeClassLabel: string;
  interpretationGenotypeClassId: string | null;
  interpretationGenotypeClassLabel: string;
  interpretedRecessiveRetained: boolean | null;
  interpretationLocked: boolean;
  carrierState: boolean;
  expressionRevealed: boolean;
  tokenEnabled: boolean;
  slotEnabled: boolean;
  predictionEnabled: boolean;
  revealEnabled: boolean;
  interpretationEnabled: boolean;
  evidence: readonly AlleleEvidenceView[];
  dominantPhenotypeLabel: string;
  recessivePhenotypeLabel: string;
  machineStatus: string;
  officialHidden: boolean;
  showHints: boolean;
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
  const orderedSampleGenes = [...sample.genes].sort((left, right) =>
    (left.chromosomeModel ?? 99) - (right.chromosomeModel ?? 99));
  const geneIds = instrument.nearbyGeneIds?.length
    ? instrument.nearbyGeneIds
    : orderedSampleGenes.map(gene => gene.geneId);
  const loci = geneIds.map((geneId, index): AlleleLocusView => {
    const gene = sample.genes.find(item => item.geneId === geneId || item.traitId === geneId);
    const isTarget = geneId === instrument.focusGeneId;
    return {
      geneId,
      traitId: gene?.traitId ?? geneId,
      chromosomeModel: instrument.chromosomeNumber ?? gene?.chromosomeModel ?? null,
      alleles: isTarget
        ? instrument.workingAlleles
        : gene
          ? [gene.allelePair[0].symbol, gene.allelePair[1].symbol]
          : ['—', '—'],
      focus: isTarget,
      centered: geneId === instrument.centeredGeneId,
      targetVisible: isTarget
        && ((instrument.geneLocationLocked ?? false) || (instrument.locatorHintVisible ?? false)),
      locked: isTarget && (instrument.geneLocationLocked ?? false),
      position: index,
    };
  });
  const genotypeClassLabel = classLabel(instrument.genotypeClassId);
  const interpretationGenotypeClassLabel = classLabel(instrument.interpretationGenotypeClassId);
  const interpretationLocked = instrument.interpretationLocked ?? false;
  const evidenceEnabled = scene.phase === 'explain' && interpretationLocked;
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
  const chamber = instrument.chamberLocked ? 'locked' : instrument.sampleMismatch ? 'mismatch' : 'open';
  const centered = instrument.centeredGeneId ?? 'none';

  return {
    sceneId: scene.sceneId,
    mode: scene.mode,
    phase: scene.phase,
    sample: {
      id: sample.id,
      code: instrument.sampleCode ?? sample.id.toUpperCase(),
      label: instrument.sampleLabel ?? sample.label,
    },
    sampleVials: instrument.sampleVials ?? [],
    hasSelectedVial: instrument.sampleVials?.some(vial => vial.selected) ?? false,
    hasLoadedVial: instrument.sampleVials?.some(vial => vial.loaded) ?? false,
    observeStep: instrument.observeStep ?? 'select-sample',
    chamberLocked: instrument.chamberLocked ?? false,
    sampleMismatch: instrument.sampleMismatch ?? false,
    taskId: instrument.taskId ?? null,
    chromosomeNumber: instrument.chromosomeNumber ?? null,
    focusGeneId: instrument.focusGeneId,
    centeredGeneId: instrument.centeredGeneId ?? null,
    geneLocationLocked: instrument.geneLocationLocked ?? false,
    locatorHintVisible: instrument.locatorHintVisible ?? false,
    bandingEnabled: instrument.bandingEnabled ?? false,
    fluorescenceEnabled: instrument.fluorescenceEnabled ?? false,
    homologComparisonEnabled: instrument.homologComparisonEnabled ?? true,
    loci,
    locusSummary: loci.map(locus => locus.geneId).join(', '),
    focusPosition: Math.max(0, loci.findIndex(locus => locus.focus)),
    dominantAllele: instrument.dominantAllele,
    recessiveAllele: instrument.recessiveAllele,
    startingAlleles: instrument.startingAlleles,
    requestedAlleles: instrument.requestedAlleles,
    workingAlleles: instrument.workingAlleles,
    socketsSecured: instrument.socketsSecured ?? [false, false],
    predictedPhenotypeId: instrument.predictedPhenotypeId ?? null,
    predictedRecessiveRetained: instrument.predictedRecessiveRetained ?? null,
    requiresRecessivePrediction: instrument.requiresRecessivePrediction ?? false,
    actualPhenotypeId: instrument.actualPhenotypeId ?? null,
    dominantSignalPresent: instrument.dominantSignalPresent ?? false,
    recessiveSignalPresent: instrument.recessiveSignalPresent ?? false,
    genotypeClassId: instrument.genotypeClassId ?? null,
    genotypeClassLabel,
    interpretationGenotypeClassId: instrument.interpretationGenotypeClassId ?? null,
    interpretationGenotypeClassLabel,
    interpretedRecessiveRetained: instrument.interpretedRecessiveRetained ?? null,
    interpretationLocked,
    carrierState: instrument.carrierState ?? false,
    expressionRevealed: instrument.expressionRevealed ?? false,
    tokenEnabled: scene.phase === 'manipulate' && (instrument.geneLocationLocked ?? false),
    slotEnabled: scene.phase === 'manipulate' && (instrument.geneLocationLocked ?? false),
    predictionEnabled: scene.phase === 'predict',
    revealEnabled: scene.phase === 'reveal' && !(instrument.expressionRevealed ?? false),
    interpretationEnabled: scene.phase === 'explain'
      && (instrument.expressionRevealed ?? false)
      && !interpretationLocked,
    evidence,
    dominantPhenotypeLabel: instrument.dominantPhenotypeId,
    recessivePhenotypeLabel: instrument.recessivePhenotypeId,
    machineStatus: instrument.machineStatus ?? 'Instrument ready.',
    officialHidden: scene.mode === 'official',
    showHints: instrument.showHints ?? false,
    summary: `${instrument.sampleLabel ?? sample.label}, sample ${instrument.sampleCode ?? sample.id}. Chamber ${chamber}. Reticle at ${centered}. Gene ${instrument.focusGeneId} ${instrument.geneLocationLocked ? 'locked' : 'not locked'}. Working pair ${pair}. Prediction ${instrument.predictedPhenotypeId ?? 'not locked'}. Expression result ${actual}. Both alleles remain visible.`,
    targets: ALLELE_SWITCHBOARD_TARGETS,
  };
}

function classLabel(value: string | null | undefined): string {
  return ({
    'homozygous-dominant': 'Homozygous dominant',
    heterozygous: 'Heterozygous',
    'homozygous-recessive': 'Homozygous recessive',
  } as Record<string, string>)[value ?? ''] ?? 'Unresolved';
}
