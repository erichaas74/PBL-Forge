import type { GeneticsSkill } from '../dragon-genetics.models';
import type { InstructionLevel, SimulationPhase } from '../adaptive/dragon-simulation.models';
import type { ProbeId } from '../workstations/shared/instrument-manifest.models';

/**
 * The inquiry layer: what a workstation asks, and how that is adjusted.
 *
 * Three registries join here. Instruments declare probes (workstation layer), concepts name the
 * science and the misconception that displaces it, and bank items bind a concept to a probe. An
 * item therefore runs in *any* instrument declaring its probe, rather than in one hard-coded
 * simulation.
 *
 * Cross-imports with `adaptive/` are `import type` on both sides, so there is no runtime cycle.
 */

/**
 * The concept vocabulary. Most of these ids were already in use as loose `misconceptionFlag`
 * strings, which is why legacy responses map onto them without a translation table.
 */
export const CONCEPT_IDS = [
  // GEN-1 — inherited traits
  'learned-is-genetic',
  'reflex-is-trained',
  'appearance-as-proof',
  'outcome-as-cause',
  'correlation-as-causation',
  // GEN-2 — genome organization
  'hierarchy-confusion',
  'allele-chromosome-swap',
  'chromatin-is-separate',
  'dna-structure-confusion',
  // GEN-3 — alleles and phenotype
  'allele-definition',
  'dominant-means-two',
  'recessive-disappears',
  'genotype-equals-phenotype',
  // GEN-4 — inheritance patterns
  'two-from-one-parent',
  'identical-gametes',
  'gamete-stays-diploid',
  'genotype-phenotype-ratio',
  'punnett-count-error',
  'grid-equals-family',
  'probability-guarantee',
  'sample-size-irrelevant',
  // GEN-5 — pedigree evidence
  'carrier-shows-trait',
  'skipped-generation-impossible',
  'pedigree-symbol-confusion',
  'sequencing-replaces-reasoning',
  // GEN-6 — DNA and proteins
  'one-gene-one-trait',
  'rna-uses-thymine',
  'replication-destroys-template',
  'transcription-equals-translation',
  'mutation-types-confused',
  'mutation-always-harmful',
  'repair-guarantees-no-mutations',
  'percent-difference-error',
  'protein-shape-irrelevant',
  // GEN-7 — multiple alleles
  'two-alleles-max',
  'codominance-vs-incomplete',
  'universal-donor-confusion',
  // GEN-8 — population diversity
  'phenotype-equals-diversity',
  'phenotype-frequency-equals-allele',
  'wrong-diversity-metric',
  'best-with-best',
  'battle-equals-mastery',
  'single-trial-causation',
  'no-statistical-test',
  'confounded-comparison',
  'unfair-comparison',
  'model-is-universal',
] as const;

export type ConceptId = (typeof CONCEPT_IDS)[number];

export interface Concept {
  id: ConceptId;
  skillId: GeneticsSkill;
  /** The correct idea, in student language. */
  statement: string;
  /** The wrong idea this concept displaces. */
  misconception: string;
  /** Probes that can evidence it. An item for this concept must require one of these. */
  probes: readonly ProbeId[];
  prerequisites: readonly ConceptId[];
  /** Bands where this concept is worth asking about. A set, never a ladder. */
  gradeBands: readonly InstructionLevel[];
}

// ---------------------------------------------------------------------------
// Bank items
// ---------------------------------------------------------------------------

export type InquiryItemKind = 'choice' | 'probe' | 'construct';
export type InquiryItemSource = 'registry' | 'teacher';

export interface InquiryItemBase {
  id: string;
  conceptId: ConceptId;
  /** The join. Any instrument declaring this probe can host the item. */
  requiresProbe: ProbeId;
  /** Membership test, not a prefix slice: an AP student never sees a grade-7 item. */
  gradeBands: readonly InstructionLevel[];
  /** Authored, never computed from array position. */
  phase: SimulationPhase;
  hint?: string;
  source: InquiryItemSource;
}

/** Answered by choosing. The kind the adaptive runtime renders today. */
export interface ChoiceItem extends InquiryItemBase {
  kind: 'choice';
  prompt: string;
  options: readonly { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
}

export type RecordPredicateKind = 'matches-catalog' | 'precedes' | 'threshold';

export interface RecordPredicate {
  kind: RecordPredicateKind;
  /** Record type emitted by an instrument, e.g. `punnett.records`. */
  recordType: string;
  /** For `precedes`: the record that must have been saved afterwards. */
  afterRecordType?: string;
  /** For `threshold`: the minimum measured value. */
  minimum?: number;
  field?: string;
}

/** Answered by operating the instrument. Evaluated against records the lab already saves. */
export interface ProbeItem extends InquiryItemBase {
  kind: 'probe';
  task: string;
  predicate: RecordPredicate;
}

/** Answered by building a record — a claim, a chart row, a cross. */
export interface ConstructItem extends InquiryItemBase {
  kind: 'construct';
  task: string;
  recordType: string;
  rubricId: string;
}

export type InquiryItem = ChoiceItem | ProbeItem | ConstructItem;

export function isChoiceItem(item: InquiryItem): item is ChoiceItem {
  return item.kind === 'choice';
}

// ---------------------------------------------------------------------------
// Teacher-adjustable policy
// ---------------------------------------------------------------------------

export type CoverageMode = 'concept-first' | 'weakness-first' | 'balanced';
export type RepeatMissStrategy = 'same-probe' | 'different-probe' | 'prerequisite-first';
export type HintPolicy = 'level' | 'always' | 'never' | 'after-miss';

/**
 * Every field here is something a teacher can change for a class, and most can be overridden for
 * one student. Defaults live in `DEFAULT_INQUIRY_POLICY`.
 */
export interface InquiryPolicy {
  /** Raise or lower a student's level from their own past scores. */
  adaptiveLevel: boolean;
  /** Mean score at or above which the level is raised one band. */
  adaptiveLevelUpScore: number;
  /** Mean score at or below which the level is lowered one band. */
  adaptiveLevelDownScore: number;
  /** Completed runs required before adaptive level may move at all. */
  adaptiveLevelMinRuns: number;
  coverage: CoverageMode;
  /** What to do when a student has already missed a concept. */
  repeatMissStrategy: RepeatMissStrategy;
  /** Consecutive correct answers after which a concept counts as secure. */
  masteryStreak: number;
  /** How many recently seen items are suppressed before an item may repeat. */
  itemCooldown: number;
  /** Withhold a concept until its prerequisites are secure. */
  prerequisiteGating: boolean;
  minItems: number;
  maxItems: number;
  hintPolicy: HintPolicy;
  /** Include probe items, which are answered by operating the lab rather than by choosing. */
  includeProbeItems: boolean;
  /** Skip concepts a student has already proven in the genetics notebook. */
  useNotebookEvidence: boolean;
  /** Prefer concepts the student has never been asked about before repeating any. */
  preferUnseenConcepts: boolean;
}

export interface ConceptSetting {
  enabled?: boolean;
  /** Higher sorts earlier. Default 0. */
  priority?: number;
  /** Withhold this concept below the given band. */
  minLevel?: InstructionLevel;
}

/** A teacher-written choice item. Validated on save against the same schema as registry items. */
export interface AuthoredChoiceItem {
  id: string;
  conceptId: string;
  requiresProbe: string;
  gradeBands: string[];
  phase: string;
  prompt: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
  hint?: string;
  authoredAtIso: string;
}

export interface InquirySettings {
  schemaVersion: 1;
  policy: InquiryPolicy;
  conceptSettings: Record<string, ConceptSetting>;
  /** Registry items the teacher has switched off for this class. */
  disabledItemIds: string[];
  /** Items the teacher always wants asked, ahead of selection. */
  pinnedItemIds: string[];
  /** Probes the teacher has withdrawn, e.g. a lab the class has not reached. */
  disabledProbeIds: string[];
  authoredItems: AuthoredChoiceItem[];
}

/** Per-student adjustments layered over the class settings. */
export interface StudentInquiryOverride {
  policy?: Partial<InquiryPolicy>;
  /** Concepts to concentrate on for this student, ahead of ordinary coverage. */
  conceptFocusIds?: string[];
  waivedItemIds?: string[];
  pinnedItemIds?: string[];
}

// ---------------------------------------------------------------------------
// Student history, derived from work already persisted in the app
// ---------------------------------------------------------------------------

export interface ConceptHistoryEntry {
  conceptId: ConceptId;
  asked: number;
  correct: number;
  incorrect: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  lastAskedIso: string | null;
  lastCorrectIso: string | null;
}

export interface StudentInquiryHistory {
  studentId: string;
  byConcept: Readonly<Partial<Record<ConceptId, ConceptHistoryEntry>>>;
  /** Times each item has been served, by item id. */
  timesSeenByItemId: Readonly<Record<string, number>>;
  /** Most recently served item ids, newest first. Drives the cooldown. */
  recentItemIds: readonly string[];
  /** Genes proven in the genetics notebook. */
  solvedGeneIds: readonly string[];
  experimentCount: number;
  completedInstrumentIds: readonly string[];
  completedRunCount: number;
  /** Mean score across completed runs, or null when nothing has been completed. */
  meanScore: number | null;
}

export function emptyStudentInquiryHistory(studentId: string): StudentInquiryHistory {
  return {
    studentId,
    byConcept: {},
    timesSeenByItemId: {},
    recentItemIds: [],
    solvedGeneIds: [],
    experimentCount: 0,
    completedInstrumentIds: [],
    completedRunCount: 0,
    meanScore: null,
  };
}

// ---------------------------------------------------------------------------
// Resolver output
// ---------------------------------------------------------------------------

export type InquiryLayer =
  | 'registry'
  | 'class-assignment'
  | 'act-briefing'
  | 'student-adaptation'
  | 'live-override';

export interface LayerTrace {
  layer: InquiryLayer;
  field: string;
  value: string;
  reason?: string;
}

export interface ResolvedInquiry {
  instrumentId: string;
  studentId: string;
  level: InstructionLevel;
  hintsAllowed: boolean;
  itemCount: number;
  targetConceptIds: readonly ConceptId[];
  availableProbeIds: readonly ProbeId[];
  items: readonly InquiryItem[];
  /** Why each resolved field holds its value, so the teacher screen can explain a student's set. */
  provenance: readonly LayerTrace[];
  /** Concepts with no eligible item, surfaced as a content gap instead of padded with filler. */
  uncoveredConceptIds: readonly ConceptId[];
}

export function isConceptId(value: string): value is ConceptId {
  return (CONCEPT_IDS as readonly string[]).includes(value);
}
