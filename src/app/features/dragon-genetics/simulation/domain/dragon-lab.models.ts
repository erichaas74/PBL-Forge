import { AssemblyBlueprint } from '../../../../shared/assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../../../shared/assembly/combat/assembly-combat.models';
import { DragonGenome } from './dragon-genetics.models';

export type DragonLabStage =
  'mission' | 'traits' | 'inheritance' | 'hatchery' | 'evidence' | 'board';

export type DragonTraitId =
  | 'wings'
  | 'fire'
  | 'scales'
  | 'horns'
  | 'legs'
  | 'claws'
  | 'crest'
  | 'spikes';

/**
 * The Arena animal carries 23 modeled loci, while the eight long-running lesson loci above remain
 * the required compatibility core for older saves.
 */
export type ArenaBuildTraitId =
  | DragonTraitId
  | 'tail'
  | 'body-color'
  | 'fangs'
  | 'eye-color'
  | 'body-type'
  | 'secondary-wings'
  | 'wing-shape'
  | 'wing-camber'
  | 'body-size'
  | 'tail-length'
  | 'head-size'
  | 'snout'
  | 'armor'
  | 'ear-frill'
  | 'temperament';
export type TraitSortCategory = 'inherited' | 'learned-environmental';

export interface DragonTraitDefinition<TId extends ArenaBuildTraitId = DragonTraitId> {
  id: TId;
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
export type DragonLabGenome = Record<DragonTraitId, DragonTraitGenotype>
  & Partial<Record<Exclude<ArenaBuildTraitId, DragonTraitId>, DragonTraitGenotype>>;
/** The one allele for each modeled autosomal trait carried by a single gamete. */
export type DragonGameteGenome = Record<DragonTraitId, string>;

export interface DragonParentProfile {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  genome: DragonLabGenome;
}

/** Lightweight bred specimen used by population instruments before a 3D build is needed. */
export interface DragonBredProfile extends DragonParentProfile {
  parentIds: [string, string];
  generation: number;
}

export interface DragonOffspring extends DragonBredProfile {
  engineGenome: DragonGenome;
  assembly: AssemblyBlueprint;
  /** Genome-derived health/armor/damage numbers consumed by the battle arena. */
  combatProfile: AssemblyCombatProfile;
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
  claim: string;
  evidence: string;
  reasoning: string;
  recommendedPairId: string | null;
  recommendation: string;
  recommendationSubmitted: boolean;
}
