import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonEvidenceClue,
  DragonEvidenceMark,
  DragonGenomeLabelPlacement,
  DragonGenomeLevelId,
  DragonScannerOption,
  DragonScannerOptionKind,
  DragonScannerOptionStatus,
  DragonTraitCategory,
  DragonTraitObservation,
  DragonTraitPlacement,
  DragonVisualAlleleState,
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
  actualPhenotypeId?: string | null;
  genotypeClassId?: 'homozygous-dominant' | 'heterozygous' | 'homozygous-recessive' | null;
  carrierState?: boolean;
  expressionRevealed?: boolean;
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
      actualPhenotypeId: input.actualPhenotypeId ?? null,
      genotypeClassId: input.genotypeClassId ?? null,
      carrierState: input.carrierState ?? false,
      expressionRevealed: input.expressionRevealed ?? false,
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
    sampleType: role === 'offspring' ? 'offspring' : 'dragon',
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
