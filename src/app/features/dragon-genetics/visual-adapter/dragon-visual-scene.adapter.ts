import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonEggRecord,
  DragonEvidenceClue,
  DragonEvidenceMark,
  DragonGenomeLabelPlacement,
  DragonGenomeLevelId,
  DragonHatcheryToolId,
  DragonScannerOption,
  DragonScannerOptionKind,
  DragonScannerOptionStatus,
  DragonTraitCategory,
  DragonTraitObservation,
  DragonTraitPlacement,
  DragonVisualAlleleState,
  DragonVisualMetric,
  DragonVisualParentSource,
  DragonVisualScene,
  DragonVisualSelection,
  DragonVisualGeneState,
} from '../../../shared/dragon-visuals';
import {
  DRAGON_TRAITS,
  showsDominantPhenotype,
} from '../simulation/domain/dragon-inheritance';
import { DragonParentProfile } from '../simulation/domain/dragon-lab.models';
import { TraitEvidenceObservation } from '../simulation/domain/trait-evidence.models';

/** Lesson-owned state the Trait Evidence Analyzer needs in order to draw a scene. */
export interface TraitInspectorSceneInput {
  observations?: readonly DragonTraitObservation[];
  clues?: readonly DragonEvidenceClue[];
  placements?: readonly DragonTraitPlacement[];
  activeObservationId?: string | null;
  lockedPrediction?: DragonTraitCategory | null;
  showSourceHints?: boolean;
  seed?: string;
  selection?: Partial<DragonVisualSelection>;
}

/** Lesson-owned state the Genome Microscope needs in order to draw a scene. */
export interface GenomeMicroscopeSceneInput {
  focusLevel?: DragonGenomeLevelId;
  focusGeneId?: string;
  taskId?: string;
  requestedLevel?: DragonGenomeLevelId;
  lockedPrediction?: DragonGenomeLevelId | null;
  labelPlacements?: readonly DragonGenomeLabelPlacement[];
  revealedLevelIds?: readonly DragonGenomeLevelId[];
  evidenceLevelId?: DragonGenomeLevelId | null;
  showLevelHints?: boolean;
  seed?: string;
  selection?: Partial<DragonVisualSelection>;
}

/** Lesson-owned state the Allele Workbench needs in order to draw a scene. */
export interface AlleleSwitchboardSceneInput {
  sampleCode?: string;
  sampleLabel?: string;
  sampleVials?: readonly {
    code: string;
    label: string;
    selected: boolean;
    loaded: boolean;
  }[];
  observeStep?: 'select-sample' | 'load-sample' | 'secure-chamber' | 'locate-gene';
  chamberLocked?: boolean;
  sampleMismatch?: boolean;
  chromosomeNumber?: number;
  nearbyGeneIds?: readonly string[];
  centeredGeneId?: string | null;
  geneLocationLocked?: boolean;
  locatorHintVisible?: boolean;
  bandingEnabled?: boolean;
  fluorescenceEnabled?: boolean;
  homologComparisonEnabled?: boolean;
  focusGeneId: string;
  taskId?: string;
  dominantAllele: string;
  recessiveAllele: string;
  startingAlleles: readonly [string, string];
  requestedAlleles: readonly [string, string];
  workingAlleles: readonly [string, string];
  dominantPhenotypeId: string;
  recessivePhenotypeId: string;
  predictedPhenotypeId?: string | null;
  predictedRecessiveRetained?: boolean | null;
  requiresRecessivePrediction?: boolean;
  actualPhenotypeId?: string | null;
  dominantSignalPresent?: boolean;
  recessiveSignalPresent?: boolean;
  genotypeClassId?: 'homozygous-dominant' | 'heterozygous' | 'homozygous-recessive' | null;
  interpretationGenotypeClassId?: 'homozygous-dominant' | 'heterozygous' | 'homozygous-recessive' | null;
  interpretedRecessiveRetained?: boolean | null;
  interpretationLocked?: boolean;
  carrierState?: boolean;
  socketsSecured?: readonly [boolean, boolean];
  expressionRevealed?: boolean;
  machineStatus?: string;
  evidenceMarks?: readonly DragonEvidenceMark[];
  evidenceMarkId?: string | null;
  showHints?: boolean;
  seed?: string;
  selection?: Partial<DragonVisualSelection>;
}

export function createTraitInspectorScene(
  profile: DragonParentProfile,
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
  input: TraitInspectorSceneInput = {},
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'trait-detective',
    kind: 'trait-inspector',
    mode,
    phase,
    seed: input.seed ?? `${sceneId}:${profile.id}`,
    samples: [toDragonAnalysisSample(profile, 'specimen')],
    instrument: {
      kind: 'trait-inspector',
      sampleId: profile.id,
      observations: input.observations ?? [],
      clues: input.clues ?? [],
      placements: input.placements ?? [],
      activeObservationId: input.activeObservationId ?? null,
      lockedPrediction: input.lockedPrediction ?? null,
      showSourceHints: input.showSourceHints ?? false,
    },
    metrics: [],
    selection: {
      selectedIds: input.selection?.selectedIds ?? [],
      highlightedIds: input.selection?.highlightedIds ?? [],
      disabledIds: input.selection?.disabledIds ?? [],
    },
  };
}

export function createGenomeMicroscopeScene(
  profile: DragonParentProfile,
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
  input: GenomeMicroscopeSceneInput = {},
): DragonVisualScene {
  const focusGeneId = input.focusGeneId ?? DRAGON_TRAITS[0].geneSymbol;
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'genome-decoder',
    kind: 'genome-microscope',
    mode,
    phase,
    seed: input.seed ?? `${sceneId}:${profile.id}:${focusGeneId}`,
    samples: [toDragonAnalysisSample(profile, 'specimen')],
    instrument: {
      kind: 'genome-microscope',
      sampleId: profile.id,
      focusLevel: input.focusLevel ?? 'cell',
      focusGeneId,
      taskId: input.taskId,
      requestedLevel: input.requestedLevel,
      lockedPrediction: input.lockedPrediction ?? null,
      labelPlacements: input.labelPlacements ?? [],
      revealedLevelIds: input.revealedLevelIds ?? [],
      evidenceLevelId: input.evidenceLevelId ?? null,
      showLevelHints: input.showLevelHints ?? false,
    },
    metrics: [],
    selection: {
      selectedIds: input.selection?.selectedIds ?? [],
      highlightedIds: input.selection?.highlightedIds ?? [],
      disabledIds: input.selection?.disabledIds ?? [],
    },
    focusGeneId,
  };
}

export function createAlleleSwitchboardScene(
  profile: DragonParentProfile,
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
  input: AlleleSwitchboardSceneInput,
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'allele-workbench',
    kind: 'allele-switchboard',
    mode,
    phase,
    seed: input.seed ?? `${sceneId}:${profile.id}:${input.focusGeneId}`,
    samples: [toDragonAnalysisSample(profile, 'specimen')],
    instrument: {
      kind: 'allele-switchboard',
      sampleId: profile.id,
      sampleCode: input.sampleCode,
      sampleLabel: input.sampleLabel,
      sampleVials: input.sampleVials ?? [],
      observeStep: input.observeStep ?? 'select-sample',
      chamberLocked: input.chamberLocked ?? false,
      sampleMismatch: input.sampleMismatch ?? false,
      chromosomeNumber: input.chromosomeNumber,
      nearbyGeneIds: input.nearbyGeneIds ?? [],
      centeredGeneId: input.centeredGeneId ?? null,
      geneLocationLocked: input.geneLocationLocked ?? false,
      locatorHintVisible: input.locatorHintVisible ?? false,
      bandingEnabled: input.bandingEnabled ?? false,
      fluorescenceEnabled: input.fluorescenceEnabled ?? false,
      homologComparisonEnabled: input.homologComparisonEnabled ?? true,
      focusGeneId: input.focusGeneId,
      taskId: input.taskId,
      dominantAllele: input.dominantAllele,
      recessiveAllele: input.recessiveAllele,
      startingAlleles: input.startingAlleles,
      requestedAlleles: input.requestedAlleles,
      workingAlleles: input.workingAlleles,
      dominantPhenotypeId: input.dominantPhenotypeId,
      recessivePhenotypeId: input.recessivePhenotypeId,
      predictedPhenotypeId: input.predictedPhenotypeId ?? null,
      predictedRecessiveRetained: input.predictedRecessiveRetained ?? null,
      requiresRecessivePrediction: input.requiresRecessivePrediction ?? false,
      actualPhenotypeId: input.actualPhenotypeId ?? null,
      dominantSignalPresent: input.dominantSignalPresent ?? false,
      recessiveSignalPresent: input.recessiveSignalPresent ?? false,
      genotypeClassId: input.genotypeClassId ?? null,
      interpretationGenotypeClassId: input.interpretationGenotypeClassId ?? null,
      interpretedRecessiveRetained: input.interpretedRecessiveRetained ?? null,
      interpretationLocked: input.interpretationLocked ?? false,
      carrierState: input.carrierState ?? false,
      socketsSecured: input.socketsSecured ?? [false, false],
      expressionRevealed: input.expressionRevealed ?? false,
      machineStatus: input.machineStatus,
      evidenceMarks: input.evidenceMarks ?? [],
      evidenceMarkId: input.evidenceMarkId ?? null,
      showHints: input.showHints ?? false,
    },
    metrics: [],
    selection: {
      selectedIds: input.selection?.selectedIds ?? [],
      highlightedIds: input.selection?.highlightedIds ?? [],
      disabledIds: input.selection?.disabledIds ?? [],
    },
    focusGeneId: input.focusGeneId,
  };
}

/** Lesson-owned state the Genotype Scanner needs in order to draw a scene. */
export interface GenotypeScannerSceneInput {
  focusGeneId: string;
  genotypeRevealed?: boolean;
  concealed?: DragonScannerOptionKind;
  optionKind?: DragonScannerOptionKind;
  options?: readonly DragonScannerOption[];
  selectedOptionIds?: readonly string[];
  optionStatuses?: readonly DragonScannerOptionStatus[];
  selectionLocked?: boolean;
  comparisonProfile?: DragonParentProfile | null;
  evidenceMarks?: readonly DragonEvidenceMark[];
  evidenceMarkId?: string | null;
  showHints?: boolean;
  seed?: string;
  selection?: Partial<DragonVisualSelection>;
}

export function createGenotypeScannerScene(
  profile: DragonParentProfile,
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
  input: GenotypeScannerSceneInput,
): DragonVisualScene {
  const comparison = input.comparisonProfile ?? null;
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'genotype-reveal',
    kind: 'genotype-scanner',
    mode,
    phase,
    seed: input.seed ?? `${sceneId}:${profile.id}:${input.focusGeneId}`,
    samples: [
      toDragonAnalysisSample(profile, 'specimen'),
      ...(comparison ? [toDragonAnalysisSample(comparison, 'specimen')] : []),
    ],
    instrument: {
      kind: 'genotype-scanner',
      sampleId: profile.id,
      focusGeneId: input.focusGeneId,
      genotypeRevealed: input.genotypeRevealed ?? false,
      concealed: input.concealed ?? 'genotype',
      optionKind: input.optionKind ?? 'genotype',
      options: input.options ?? [],
      selectedOptionIds: input.selectedOptionIds ?? [],
      optionStatuses: input.optionStatuses ?? [],
      selectionLocked: input.selectionLocked ?? false,
      comparisonSampleId: comparison?.id ?? null,
      evidenceMarks: input.evidenceMarks ?? [],
      evidenceMarkId: input.evidenceMarkId ?? null,
      showHints: input.showHints ?? false,
    },
    metrics: [],
    selection: {
      selectedIds: input.selection?.selectedIds ?? [],
      highlightedIds: input.selection?.highlightedIds ?? [],
      disabledIds: input.selection?.disabledIds ?? [],
    },
    focusGeneId: input.focusGeneId,
  };
}

/** An egg profile plus the lesson-owned flags describing how far a student has taken it. */
export type DragonHatcheryEggProfile =
  DragonParentProfile & { generation?: number; parentIds?: readonly [string, string] };

/** Lesson-owned state the Dragon Hatchery needs in order to draw a clutch. */
export interface DragonHatcherySceneInput {
  clutchId: string;
  eggs: readonly DragonHatcheryEggProfile[];
  parents?: readonly [DragonParentProfile, DragonParentProfile] | null;
  /** Egg IDs whose traits the student has read. */
  examinedEggIds?: readonly string[];
  /** Egg IDs whose allele pairs the student has sampled. */
  sampledEggIds?: readonly string[];
  hatchedEggIds?: readonly string[];
  lockedEggIds?: readonly string[];
  focusGeneId?: string;
  activeEggId?: string | null;
  selectedEggIds?: readonly string[];
  activeToolId?: DragonHatcheryToolId;
  availableToolIds?: readonly DragonHatcheryToolId[];
  examinesRemaining?: number | null;
  samplesRemaining?: number | null;
  hatchLimit?: number | null;
  hatchCommitted?: boolean;
  metrics?: readonly DragonVisualMetric[];
  evidenceMarks?: readonly DragonEvidenceMark[];
  evidenceMarkId?: string | null;
  showHints?: boolean;
  seed?: string;
  selection?: Partial<DragonVisualSelection>;
}

/**
 * Builds a clutch scene for the shared hatchery instrument.
 *
 * Every egg becomes an analysis sample carrying its full genome; what a student may read is
 * decided by the `examined`, `sampled`, and `hatched` flags, and the display honours them.
 */
export function createDragonHatcheryScene(
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
  input: DragonHatcherySceneInput,
): DragonVisualScene {
  const examined = new Set(input.examinedEggIds ?? []);
  const sampled = new Set(input.sampledEggIds ?? []);
  const hatched = new Set(input.hatchedEggIds ?? []);
  const locked = new Set(input.lockedEggIds ?? []);
  const parents = input.parents ?? null;

  const eggs: readonly DragonEggRecord[] = input.eggs.map((egg, index) => ({
    eggId: egg.id,
    sampleId: egg.id,
    position: index + 1,
    examined: examined.has(egg.id),
    sampled: sampled.has(egg.id),
    hatched: hatched.has(egg.id),
    locked: locked.has(egg.id),
  }));

  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'dragon-hatchery',
    kind: 'dragon-hatchery',
    mode,
    phase,
    seed: input.seed ?? `${sceneId}:${input.clutchId}`,
    samples: [
      ...(parents
        ? [
          toDragonAnalysisSample(parents[0], 'parent-a'),
          toDragonAnalysisSample(parents[1], 'parent-b'),
        ]
        : []),
      ...input.eggs.map(egg => toDragonAnalysisSample(egg, 'offspring', 'egg')),
    ],
    instrument: {
      kind: 'dragon-hatchery',
      clutchId: input.clutchId,
      parentSampleIds: parents ? [parents[0].id, parents[1].id] : undefined,
      focusGeneId: input.focusGeneId,
      eggs,
      activeEggId: input.activeEggId ?? null,
      selectedEggIds: input.selectedEggIds ?? [],
      activeToolId: input.activeToolId,
      availableToolIds: input.availableToolIds,
      examinesRemaining: input.examinesRemaining ?? null,
      samplesRemaining: input.samplesRemaining ?? null,
      hatchLimit: input.hatchLimit ?? null,
      hatchCommitted: input.hatchCommitted ?? false,
      evidenceMarks: input.evidenceMarks ?? [],
      evidenceMarkId: input.evidenceMarkId ?? null,
      showHints: input.showHints ?? false,
    },
    metrics: input.metrics ?? [],
    selection: {
      selectedIds: input.selection?.selectedIds ?? [],
      highlightedIds: input.selection?.highlightedIds ?? [],
      disabledIds: input.selection?.disabledIds ?? [],
    },
    focusGeneId: input.focusGeneId,
  };
}

/** Converts curriculum observations into the semantic records the display consumes. */
export function toVisualObservations(
  observations: readonly TraitEvidenceObservation[],
): readonly DragonTraitObservation[] {
  return observations.map(observation => ({
    id: observation.id,
    labelId: `observation.${observation.id}.label`,
    detailLabelId: `observation.${observation.id}.detail`,
    category: observation.category,
    sourceId: observation.sourceId,
    clueIds: observation.clues.map(clue => clue.id),
  }));
}

export function toVisualClues(
  observations: readonly TraitEvidenceObservation[],
): readonly DragonEvidenceClue[] {
  return observations.flatMap(observation => observation.clues.map(clue => ({
    id: clue.id,
    labelId: `clue.${clue.id}`,
    sourceId: clue.sourceId,
  })));
}

export function toDragonAnalysisSample(
  profile: DragonParentProfile & { generation?: number; parentIds?: readonly [string, string] },
  role: DragonAnalysisSample['role'],
  /** Overrides the type inferred from the role, so an unhatched offspring can be an egg. */
  sampleType?: DragonAnalysisSample['sampleType'],
): DragonAnalysisSample {
  const parentSource = sourceForRole(role);
  const traits = DRAGON_TRAITS.map(trait => {
    const genotype = profile.genome[trait.id];
    const dominant = showsDominantPhenotype(genotype, trait.id);
    const allele = (symbol: string, index: number): DragonVisualAlleleState => ({
      id: `${profile.id}:${trait.id}:${index}`,
      geneId: trait.geneSymbol,
      symbol,
      parentSource,
      expression: symbol === trait.dominantAllele ? 'dominant' : 'recessive',
    });
    const allelePair: DragonVisualGeneState['allelePair'] = [
      allele(genotype[0], 0),
      allele(genotype[1], 1),
    ];
    return {
      traitId: trait.id,
      geneId: trait.geneSymbol,
      chromosomeModel: trait.chromosomeModel,
      allelePair,
      phenotypeId: dominant ? trait.dominantPhenotype : trait.recessivePhenotype,
    };
  });

  return {
    id: profile.id,
    sampleType: sampleType ?? (role === 'offspring' ? 'offspring' : 'dragon'),
    role,
    label: profile.name,
    generation: profile.generation ?? 0,
    genes: traits,
    parentIds: profile.parentIds,
  };
}

function sourceForRole(role: DragonAnalysisSample['role']): DragonVisualParentSource {
  if (role === 'parent-a') return 'parent-a';
  if (role === 'parent-b') return 'parent-b';
  return 'none';
}
