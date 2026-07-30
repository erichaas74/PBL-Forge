import { DragonTraitId } from './dragon-lab.models';

export type GenotypeScannerMode = 'learn' | 'practice' | 'official' | 'reteach';
export type GenotypeScannerSetId = 'learn' | 'practice' | 'official' | 'reteach';
export type GenotypeScanDirection = 'phenotype-first' | 'genotype-first';

export type GenotypeScannerMisconception =
  /** Expects a dominant phenotype to require two dominant alleles. */
  | 'dominant-requires-two'
  /** Expects a homozygous recessive genotype to be able to show the dominant phenotype. */
  | 'recessive-shows-dominant'
  /** Expects a recessive phenotype to be able to hide a dominant allele. */
  | 'recessive-hides-dominant'
  /** Treats equal phenotypes as proof of equal genotypes. */
  | 'phenotype-equals-genotype'
  /** Expects a heterozygote to show a blended or partial phenotype. */
  | 'heterozygous-blend'
  /** Reasons from value or usefulness instead of the expression rule. */
  | 'dominant-means-better';

export interface GenotypeScannerEvidence {
  id: string;
  text: string;
  /** Semantic target the mark points at, such as `allele-slot-a`. */
  anchorId?: string;
  /** Absent on the mark that actually supports the claim. */
  misconception?: GenotypeScannerMisconception;
}

export interface GenotypeScannerTask {
  id: string;
  direction: GenotypeScanDirection;
  sampleId: string;
  comparisonSampleId?: string;
  traitId: DragonTraitId;
  prompt: string;
  /** Option IDs the evidence supports; everything else is unsupported. */
  supportedOptionIds: readonly string[];
  /** Flag raised when an option is wrongly selected or wrongly left out. */
  optionMisconceptions: Readonly<Record<string, GenotypeScannerMisconception>>;
  /** Named at reveal so feedback explains the rule instead of only marking an answer. */
  rule: string;
  evidence: readonly GenotypeScannerEvidence[];
  correctEvidenceId: string;
  sets: readonly GenotypeScannerSetId[];
  /** Links the task to the Module 3 phenotype question it grades. */
  questionId?: string;
}

/** Compact assessment evidence for one completed scan. */
export interface GenotypeScanRecord {
  sceneId: string;
  seed: string;
  sampleId: string;
  taskId: string;
  mode: GenotypeScannerMode;
  geneId: string;
  direction: GenotypeScanDirection;
  selectedOptionIds: readonly string[];
  supportedOptionIds: readonly string[];
  selectionCorrect: boolean;
  revealedGenotype: string;
  evidenceMarkId: string | null;
  evidenceCorrect: boolean;
  attempts: number;
  misconception: GenotypeScannerMisconception | null;
  elapsedMs: number;
  createdAtIso: string;
}

export interface GenotypeScannerSetResult {
  mode: GenotypeScannerMode;
  correct: number;
  total: number;
  misconceptions: readonly GenotypeScannerMisconception[];
}

export interface GenotypeScanAnswer {
  taskId: string;
  questionId: string;
  correct: boolean;
}
