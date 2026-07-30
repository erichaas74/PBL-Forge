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

export interface DragonTraitObservation {
  id: string;
  labelId: string;
  category: 'inherited' | 'learned' | 'environmental';
}

export interface TraitInspectorInstrument {
  kind: 'trait-inspector';
  sampleId: string;
  observations: readonly DragonTraitObservation[];
}

export interface GenomeMicroscopeInstrument {
  kind: 'genome-microscope';
  sampleId: string;
  focusLevel: 'cell' | 'chromosome' | 'dna' | 'gene' | 'allele';
  focusGeneId?: string;
}

export interface GenotypeScannerInstrument {
  kind: 'genotype-scanner';
  sampleId: string;
  focusGeneId: string;
  genotypeRevealed: boolean;
}

export interface AlleleSwitchboardInstrument {
  kind: 'allele-switchboard';
  sampleId: string;
  focusGeneId: string;
  workingAlleles: readonly [string, string];
  predictedPhenotypeId?: string;
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
