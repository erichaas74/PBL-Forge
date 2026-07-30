export const DRAGON_VISUAL_CONTRACT_VERSION = 1 as const;

export type DragonVisualContractVersion = typeof DRAGON_VISUAL_CONTRACT_VERSION;
export type DragonVisualMode = 'learn' | 'practice' | 'official';
export type DragonVisualPhase =
  | 'observe'
  | 'predict'
  | 'manipulate'
  | 'reveal'
  | 'explain'
  | 'review';
export type DragonVisualSceneKind =
  | 'trait-inspector'
  | 'genome-microscope'
  | 'genotype-scanner'
  | 'allele-switchboard'
  | 'punnett-composer'
  | 'incubator-sampler'
  | 'reproduction-comparison'
  | 'sibling-tracer'
  | 'diversity-manager'
  | 'evidence-replay';
export type DragonVisualParentSource = 'parent-a' | 'parent-b' | 'single-parent' | 'none';
export type DragonGenomeLevelId = 'cell' | 'chromosome' | 'dna' | 'gene' | 'allele';

export interface DragonVisualAlleleState {
  id: string;
  geneId: string;
  symbol: string;
  parentSource: DragonVisualParentSource;
  expression: 'dominant' | 'recessive';
}

export interface DragonVisualGeneState {
  traitId: string;
  geneId: string;
  chromosomeModel?: number;
  allelePair: readonly [DragonVisualAlleleState, DragonVisualAlleleState];
  phenotypeId: string;
}

export interface DragonAnalysisSample {
  id: string;
  sampleType: 'dragon' | 'egg' | 'offspring' | 'population-member';
  role: 'parent-a' | 'parent-b' | 'offspring' | 'specimen' | 'population-member';
  label: string;
  generation: number;
  genes: readonly DragonVisualGeneState[];
  parentIds?: readonly [string, string];
}

export interface DragonVisualMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  referenceValue?: number;
}

export interface DragonVisualSelection {
  selectedIds: readonly string[];
  highlightedIds: readonly string[];
  disabledIds: readonly string[];
}

export type DragonTraitCategory = 'inherited' | 'learned' | 'environmental';
export type DragonEvidenceSourceId = 'gene-record' | 'training-log' | 'environment-log';
export type DragonTraitPlacementStatus = 'pending' | 'correct' | 'incorrect';

/** One clue a student can pin as the evidence supporting a classification. */
export interface DragonEvidenceClue {
  id: string;
  labelId: string;
  sourceId: DragonEvidenceSourceId;
}

export interface DragonTraitObservation {
  id: string;
  labelId: string;
  category: DragonTraitCategory;
  detailLabelId?: string;
  /** Source path revealed after placement. Renderers must not show it earlier. */
  sourceId?: DragonEvidenceSourceId;
  clueIds?: readonly string[];
}

/**
 * Lesson-owned placement record. The renderer draws `status` and `revealed`;
 * it never derives correctness from `DragonTraitObservation.category` itself.
 */
export interface DragonTraitPlacement {
  observationId: string;
  tray: DragonTraitCategory;
  status: DragonTraitPlacementStatus;
  revealed: boolean;
  pinnedClueId?: string;
  clueStatus?: DragonTraitPlacementStatus;
}

export interface TraitInspectorInstrument {
  kind: 'trait-inspector';
  sampleId: string;
  observations: readonly DragonTraitObservation[];
  clues?: readonly DragonEvidenceClue[];
  placements?: readonly DragonTraitPlacement[];
  activeObservationId?: string | null;
  lockedPrediction?: DragonTraitCategory | null;
  /** Learn mode may show which instrument recorded an observation before placement. */
  showSourceHints?: boolean;
}

export interface GenomeMicroscopeInstrument {
  kind: 'genome-microscope';
  sampleId: string;
  focusLevel: DragonGenomeLevelId;
  focusGeneId?: string;
  taskId?: string;
  requestedLevel?: DragonGenomeLevelId;
  lockedPrediction?: DragonGenomeLevelId | null;
  labelPlacements?: readonly DragonGenomeLabelPlacement[];
  revealedLevelIds?: readonly DragonGenomeLevelId[];
  evidenceLevelId?: DragonGenomeLevelId | null;
  showLevelHints?: boolean;
}

/** Lesson-owned label result. The display draws status but never grades hierarchy order. */
export interface DragonGenomeLabelPlacement {
  labelId: DragonGenomeLevelId;
  levelId: DragonGenomeLevelId;
  status: 'pending' | 'correct' | 'incorrect';
  revealed: boolean;
}

export type DragonScannerOptionKind = 'genotype' | 'phenotype';
export type DragonScannerOptionStatusId = 'pending' | 'correct' | 'incorrect' | 'missed';

/** One selectable record in a scanner multi-select. */
export interface DragonScannerOption {
  id: string;
  kind: DragonScannerOptionKind;
  /** Allele pair drawn on the chromosome graphic for genotype options. */
  alleles?: readonly [string, string];
  /** Curriculum label for phenotype options. */
  labelId?: string;
}

/** Lesson-owned verdict. `missed` marks a supported record the student did not select. */
export interface DragonScannerOptionStatus {
  optionId: string;
  status: DragonScannerOptionStatusId;
}

/** A pinnable proof anchored to a semantic target in the display. */
export interface DragonEvidenceMark {
  id: string;
  labelId: string;
  anchorId?: string;
}

export interface GenotypeScannerInstrument {
  kind: 'genotype-scanner';
  sampleId: string;
  focusGeneId: string;
  genotypeRevealed: boolean;
  /** What the shield covers until the scan runs. */
  concealed?: DragonScannerOptionKind;
  optionKind?: DragonScannerOptionKind;
  options?: readonly DragonScannerOption[];
  selectedOptionIds?: readonly string[];
  optionStatuses?: readonly DragonScannerOptionStatus[];
  selectionLocked?: boolean;
  /** Second sample shown beside the first so equal phenotypes can be compared. */
  comparisonSampleId?: string | null;
  evidenceMarks?: readonly DragonEvidenceMark[];
  evidenceMarkId?: string | null;
  showHints?: boolean;
}

export interface AlleleSwitchboardInstrument {
  kind: 'allele-switchboard';
  sampleId: string;
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
}

export interface PunnettComposerInstrument {
  kind: 'punnett-composer';
  parentSampleIds: readonly [string, string];
  focusGeneId: string;
  offspringCells: readonly (readonly [string, string])[];
}

export interface IncubatorSamplerInstrument {
  kind: 'incubator-sampler';
  parentSampleIds: readonly [string, string];
  focusGeneId: string;
  eggSampleIds: readonly string[];
  expectedPercent: number;
  observedPercent: number | null;
}

export interface ReproductionComparisonInstrument {
  kind: 'reproduction-comparison';
  sourceSampleIds: readonly string[];
  sexualOffspringSampleIds: readonly string[];
  asexualOffspringSampleIds: readonly string[];
}

export interface SiblingTracerInstrument {
  kind: 'sibling-tracer';
  parentSampleIds: readonly [string, string];
  siblingSampleIds: readonly string[];
  focusGeneId?: string;
}

export interface DiversityManagerInstrument {
  kind: 'diversity-manager';
  populationSampleIds: readonly string[];
  strategyId: string | null;
}

export interface EvidenceReplayInstrument {
  kind: 'evidence-replay';
  trialIds: readonly string[];
  activeTrialId: string | null;
}

export type DragonInstrumentState =
  | TraitInspectorInstrument
  | GenomeMicroscopeInstrument
  | GenotypeScannerInstrument
  | AlleleSwitchboardInstrument
  | PunnettComposerInstrument
  | IncubatorSamplerInstrument
  | ReproductionComparisonInstrument
  | SiblingTracerInstrument
  | DiversityManagerInstrument
  | EvidenceReplayInstrument;

export interface DragonVisualScene {
  contractVersion: DragonVisualContractVersion;
  sceneId: string;
  stationId: string;
  kind: DragonVisualSceneKind;
  mode: DragonVisualMode;
  phase: DragonVisualPhase;
  seed: string;
  samples: readonly DragonAnalysisSample[];
  instrument: DragonInstrumentState;
  metrics: readonly DragonVisualMetric[];
  selection: DragonVisualSelection;
  focusTraitId?: string;
  focusGeneId?: string;
  activeLayerId?: string;
  comparisonIds?: readonly [string, string];
}

export type DragonVisualEventType =
  | 'hotspot-selected'
  | 'label-placed'
  | 'allele-selected'
  | 'allele-moved'
  | 'specimen-selected'
  | 'evidence-pinned'
  | 'prediction-locked'
  | 'reveal-requested'
  | 'sequence-checkpoint-completed';

export interface DragonVisualStageEvent {
  sceneId: string;
  type: DragonVisualEventType;
  targetId: string;
  value?: string | number | boolean;
  occurredAtIso: string;
}
