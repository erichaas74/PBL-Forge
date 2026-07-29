export type DragonLabStage =
  | 'mission'
  | 'traits'
  | 'inheritance'
  | 'hatchery'
  | 'evidence'
  | 'board';

export type DragonTraitId = 'wings' | 'fire' | 'scales' | 'horns';
export type TraitSortCategory = 'inherited' | 'learned-environmental';

export interface DragonTraitDefinition {
  id: DragonTraitId;
  name: string;
  geneSymbol: string;
  chromosomeModel: number;
  dominantAllele: string;
  recessiveAllele: string;
  dominantPhenotype: string;
  recessivePhenotype: string;
  description: string;
}

export type DragonTraitGenotype = [string, string];
export type DragonLabGenome = Record<DragonTraitId, DragonTraitGenotype>;

export interface DragonParentProfile {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  genome: DragonLabGenome;
}

export interface DragonOffspring extends DragonParentProfile {
  parentIds: [string, string];
  generation: number;
}

export interface PunnettCell {
  rowAllele: string;
  columnAllele: string;
  genotype: DragonTraitGenotype;
  showsDominantPhenotype: boolean;
}

export interface PairDiversityAnalysis {
  pairId: string;
  parentIds: [string, string];
  alleleRichnessPercent: number;
  expectedHeterozygosityPercent: number;
  score: number;
  summary: string;
}

export interface TraitSortCard {
  id: string;
  label: string;
  detail: string;
  category: TraitSortCategory;
}

export interface DragonMiniLesson {
  id: string;
  number: number;
  title: string;
  summary: string;
  modelNote: string;
  vocabulary: string[];
}

export interface DragonLabSnapshot {
  schemaVersion: 1;
  stage: DragonLabStage;
  completedLessonIds: string[];
  sortAnswers: Partial<Record<string, TraitSortCategory>>;
  sortChecked: boolean;
  parentAId: string;
  parentBId: string;
  predictions: Partial<Record<DragonTraitId, number>>;
  predictionChecked: boolean;
  hatchRun: number;
  clutch: DragonOffspring[];
  selectedOffspringId: string | null;
  comparisonTraitId: DragonTraitId;
  reproductionAnswer: 'sexual' | 'asexual' | null;
  claim: string;
  evidence: string;
  reasoning: string;
  recommendedPairId: string | null;
  recommendation: string;
  recommendationSubmitted: boolean;
}
