import { GeneticsSkill } from '../dragon-genetics.models';
import { DragonClassJourneyPlan } from '../journey/domain/dragon-journey.models';
// Type-only on both sides, so the inquiry layer and this module have no runtime cycle.
import type { InquirySettings, StudentInquiryOverride } from '../inquiry/inquiry.models';

export const INSTRUCTION_LEVELS = ['grade-7', 'grade-8', 'high-school', 'ap-biology'] as const;

export type InstructionLevel = (typeof INSTRUCTION_LEVELS)[number];

export const INSTRUCTION_LEVEL_LABELS: Record<InstructionLevel, string> = {
  'grade-7': 'Grade 7',
  'grade-8': 'Grade 8',
  'high-school': 'High school biology',
  'ap-biology': 'AP Biology',
};

export type DragonSimulationId =
  | 'trait-evidence'
  | 'genome-microscope'
  | 'allele-workbench'
  | 'punnett-composer'
  | 'incubator-sampler'
  | 'dna-process-lab'
  | 'diversity-manager'
  | 'dragon-hatchery'
  | 'dragon-arena';

export type SimulationPhase = 'observe' | 'predict' | 'manipulate' | 'explain';

export interface InstructionLevelProfile {
  id: InstructionLevel;
  label: string;
  shortLabel: string;
  questionCount: number;
  scaffold: 'high' | 'medium' | 'low' | 'none';
  hintsAllowed: boolean;
  reasoningLabel: string;
}

export interface SimulationVisualNode {
  id: string;
  label: string;
  detail: string;
  symbol: string;
}

export interface SimulationSectionDefinition {
  id: string;
  phase: SimulationPhase;
  title: string;
  cue: string;
}

export interface LevelChallenge {
  prompt: string;
  options: readonly { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
  misconceptionFlag: string;
  focusNodeId?: string;
}

export interface DragonSimulationDefinition {
  id: DragonSimulationId;
  module: number;
  title: string;
  shortTitle: string;
  skill: GeneticsSkill;
  goal: string;
  visualKind:
    | 'evidence'
    | 'microscope'
    | 'chromosome'
    | 'punnett'
    | 'sampler'
    | 'dna-process'
    | 'pedigree'
    | 'population'
    | 'timeline'
    | 'hatchery'
    | 'arena';
  accent: string;
  sections: readonly SimulationSectionDefinition[];
  nodes: readonly SimulationVisualNode[];
  levelChallenges: Record<InstructionLevel, LevelChallenge>;
}

export type SimulationQuestionInteraction = 'visual-choice' | 'evidence-select';

export interface GeneratedSimulationQuestion {
  id: string;
  templateId: string;
  simulationId: DragonSimulationId;
  sectionId: string;
  phase: SimulationPhase;
  level: InstructionLevel;
  skill: GeneticsSkill;
  prompt: string;
  options: readonly { id: string; label: string; nodeId?: string }[];
  correctOptionId: string;
  explanation: string;
  misconceptionFlag: string;
  /** The concept the item targets, and the unit the mastery report is keyed by. */
  conceptId: string;
  /** The probe the item requires, which is why it could be asked in this instrument. */
  requiresProbe: string;
  /** A real element inside the real instrument, when the hosting instrument declares one. */
  anchorId: string | null;
  /** `teacher` marks an item this class authored rather than one from the registry. */
  itemSource: 'registry' | 'teacher';
  interaction: SimulationQuestionInteraction;
  hint: string | null;
}

export interface DragonSimulationSetting {
  enabled: boolean;
  level?: InstructionLevel;
  questionCount?: number;
  hintsAllowed?: boolean;
}

export interface DragonStudentOverride {
  defaultLevel?: InstructionLevel;
  simulationLevels?: Partial<Record<DragonSimulationId, InstructionLevel>>;
  /** Concept focus, waived or pinned items, and policy tweaks for one student. */
  inquiry?: StudentInquiryOverride;
}

export interface AlleleCatalogSetting {
  /** Gene records the teacher has released to this assignment. */
  availableGeneIds: string[];
}

export interface DragonAssignment {
  id: string;
  ownerId: string;
  classId: string;
  title: string;
  defaultLevel: InstructionLevel;
  alleleCatalog: AlleleCatalogSetting;
  simulationSettings: Partial<Record<DragonSimulationId, DragonSimulationSetting>>;
  /** Code-validated lesson order, requirements, starter pair, and path choices for this class. */
  journeyPlan: DragonClassJourneyPlan;
  /** Question policy, concept settings, opt-outs, and teacher-authored items for this class. */
  inquirySettings: InquirySettings;
  studentOverrides: Record<string, DragonStudentOverride>;
  assignmentVersion: number;
  updatedAtIso: string;
}

export interface ResolvedSimulationSettings {
  assignmentId: string;
  assignmentVersion: number;
  ownerId: string;
  level: InstructionLevel;
  enabled: boolean;
  questionCount: number;
  hintsAllowed: boolean;
}

export interface SimulationResponseRecord {
  questionId: string;
  /** The inquiry bank item id. Legacy records carry `simulationId:level` instead. */
  templateId: string;
  sectionId: string;
  selectedOptionId: string;
  correct: boolean;
  /** Retained for legacy records; new records also carry `conceptId`. */
  misconceptionFlag: string | null;
  /** The concept this response is evidence about, written for every new record. */
  conceptId?: string;
  answeredAtIso: string;
}

export interface DragonSimulationRun {
  schemaVersion: 1;
  simulationId: DragonSimulationId;
  studentId: string;
  assignmentId: string;
  assignmentVersion: number;
  contentVersion: number;
  level: InstructionLevel;
  hintsAllowed: boolean;
  seed: string;
  attemptNumber: number;
  currentQuestionIndex: number;
  questionIds: string[];
  /** Bank item ids served in this run, so the cooldown counts items shown but not answered. */
  servedItemIds?: string[];
  responses: SimulationResponseRecord[];
  complete: boolean;
  score: number;
  startedAtIso: string;
  updatedAtIso: string;
}

export interface DragonProgressSummaryV4 {
  schemaVersion: 4;
  studentId: string;
  projectId: 'dragon-genetics-lab';
  assignmentId: string;
  teacherId: string;
  completedSimulationIds: DragonSimulationId[];
  activeSimulationId: DragonSimulationId | null;
  simulationLevels: Partial<Record<DragonSimulationId, InstructionLevel>>;
  simulationScores: Partial<Record<DragonSimulationId, number>>;
  updatedAtIso: string;
}
