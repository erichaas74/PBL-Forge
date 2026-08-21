import {
  DragonSimulationDefinition,
  DragonSimulationRun,
  GeneratedSimulationQuestion,
  InstructionLevel,
  ResolvedSimulationSettings,
} from './dragon-simulation.models';
import { LEVEL_PROFILES } from './dragon-simulation.registry';
import {
  ChoiceItem,
  InquiryItem,
  InquirySettings,
  ResolvedInquiry,
  StudentInquiryHistory,
  StudentInquiryOverride,
  isChoiceItem,
} from '../inquiry/inquiry.models';
import { classBank, resolveInquiry } from '../inquiry/inquiry.resolver';
import { inquiryItem } from '../inquiry/inquiry-bank';
import { dragonConcept } from '../inquiry/concept.registry';
import { instrumentAnchor, instrumentManifest } from '../inquiry/instrument.registry';
import { DEFAULT_INQUIRY_SETTINGS } from '../inquiry/inquiry-policy';
import { hashSeed, shuffleDeterministic } from '../inquiry/inquiry-random';

/**
 * Turns resolved inquiry into the question shape the adaptive runtime renders.
 *
 * Selection now happens **once**, when a run is created, and the chosen item ids are stored on the
 * run as `servedItemIds`. Rebuilding a run's questions reads those ids back rather than re-running
 * selection, because selection depends on the student's history and that history changes with every
 * answer. Freezing the set is what keeps a run stable while a student works through it.
 *
 * Nothing here pads a short set. If the bank has fewer eligible items than the requested count, the
 * run is shorter and `ResolvedInquiry.uncoveredConceptIds` reports the gap.
 */

export interface SimulationQuestionRequest {
  definition: DragonSimulationDefinition;
  settings: ResolvedSimulationSettings;
  seed: string;
  studentId: string;
  history: StudentInquiryHistory;
  inquirySettings?: InquirySettings;
  studentOverride?: StudentInquiryOverride;
}

export interface SimulationQuestionPlan {
  questions: GeneratedSimulationQuestion[];
  resolved: ResolvedInquiry;
}

export function planSimulationQuestions(
  request: SimulationQuestionRequest,
): SimulationQuestionPlan {
  const { definition, settings, seed } = request;
  const resolved = resolveInquiry({
    instrumentId: definition.id,
    studentId: request.studentId,
    settings: request.inquirySettings ?? DEFAULT_INQUIRY_SETTINGS,
    studentOverride: request.studentOverride,
    baseLevel: settings.level,
    baseQuestionCount: settings.questionCount,
    baseHintsAllowed: settings.hintsAllowed,
    history: request.history,
    seed,
  });

  return {
    resolved,
    questions: resolved.items
      .filter(isChoiceItem)
      .map((item, index) =>
        toQuestion(item, definition, resolved.level, resolved.hintsAllowed, seed, index),
      ),
  };
}

/**
 * Rebuilds a run's questions from the item ids frozen onto it. Deterministic and history-free, so
 * repeated renders during a run always produce the same questions in the same order.
 */
export function questionsForRun(
  definition: DragonSimulationDefinition,
  run: DragonSimulationRun,
  inquirySettings?: InquirySettings,
): GeneratedSimulationQuestion[] {
  const bank = inquirySettings ? classBank(inquirySettings) : null;
  const lookup = (id: string): InquiryItem | null =>
    bank?.find((item) => item.id === id) ?? inquiryItem(id);

  return (run.servedItemIds ?? [])
    .map((id) => lookup(id))
    .filter((item): item is InquiryItem => !!item)
    .filter(isChoiceItem)
    .map((item, index) =>
      toQuestion(item, definition, run.level, run.hintsAllowed, run.seed, index),
    );
}

function toQuestion(
  item: ChoiceItem,
  definition: DragonSimulationDefinition,
  level: InstructionLevel,
  hintsAllowed: boolean,
  seed: string,
  index: number,
): GeneratedSimulationQuestion {
  const section =
    definition.sections.find((candidate) => candidate.phase === item.phase) ??
    definition.sections[index % definition.sections.length];
  const anchorId = instrumentAnchor(definition.id, item.requiresProbe);
  const options = shuffleDeterministic(item.options, `${seed}:${item.id}:options`);
  const concept = dragonConcept(item.conceptId);

  return {
    id: `${item.id}:${hashSeed(`${seed}:${item.id}`)}`,
    // The bank item id, so a response can be mapped straight back to its concept.
    templateId: item.id,
    simulationId: definition.id,
    sectionId: section.id,
    phase: item.phase,
    level,
    skill: concept?.skillId ?? definition.skill,
    prompt: item.prompt,
    options: options.map((option) => ({
      ...option,
      // Correct options point at the real instrument element, not a generic diagram node.
      nodeId: option.id === item.correctOptionId ? (anchorId ?? undefined) : undefined,
    })),
    correctOptionId: item.correctOptionId,
    explanation: item.explanation,
    misconceptionFlag: item.conceptId,
    conceptId: item.conceptId,
    requiresProbe: item.requiresProbe,
    anchorId,
    itemSource: item.source,
    interaction: item.phase === 'explain' ? 'evidence-select' : 'visual-choice',
    hint: hintsAllowed ? (item.hint ?? defaultHint(item, definition.id, anchorId)) : null,
  };
}

/**
 * A fallback hint that names a real place in the instrument. The previous generator pointed at a
 * symbol on the generic visual model, which does not exist in a dedicated workstation.
 */
function defaultHint(
  item: ChoiceItem,
  instrumentId: string,
  anchorId: string | null,
): string | null {
  const manifest = instrumentManifest(instrumentId);
  if (!manifest || !anchorId) return null;
  const readable = anchorId.replace(/-/g, ' ');
  return `Open the ${readable} in the ${manifest.title} and compare what it shows with the claim.`;
}

export function evaluateSimulationAnswer(
  question: GeneratedSimulationQuestion,
  selectedOptionId: string,
): { correct: boolean; misconceptionFlag: string | null; conceptId: string } {
  const correct = selectedOptionId === question.correctOptionId;
  return {
    correct,
    misconceptionFlag: correct ? null : question.misconceptionFlag,
    conceptId: question.conceptId,
  };
}

export function defaultQuestionCount(level: InstructionLevel): number {
  return LEVEL_PROFILES[level].questionCount;
}

export { hashSeed };
