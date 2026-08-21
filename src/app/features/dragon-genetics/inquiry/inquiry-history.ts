import {
  ConceptHistoryEntry,
  ConceptId,
  StudentInquiryHistory,
  emptyStudentInquiryHistory,
  isConceptId,
} from './inquiry.models';
import { dragonConcept } from './concept.registry';
import { inquiryItem } from './inquiry-bank';
import type {
  DragonSimulationRun,
  SimulationResponseRecord,
} from '../adaptive/dragon-simulation.models';
import type { GeneticsNotebookSnapshot } from '../workstations/shared/genetics-notebook.models';

/**
 * Everything the selector knows about a student, derived from work the app already persists —
 * simulation runs and the genetics notebook. Nothing new has to be recorded for adaptation to work
 * on a student's existing history.
 *
 * Legacy note: before the inquiry bank existed, `templateId` was `simulationId:level` and
 * `misconceptionFlag` was only written on an incorrect answer. Those responses therefore contribute
 * their misses (which is what adaptation needs most) but cannot contribute their correct answers to
 * a concept streak. Runs recorded after the migration carry the item id and are complete.
 */
export function buildStudentInquiryHistory(
  studentId: string,
  runs: readonly DragonSimulationRun[],
  notebook: GeneticsNotebookSnapshot | null,
): StudentInquiryHistory {
  const base = emptyStudentInquiryHistory(studentId);
  const responses = runs
    .flatMap((run) => run.responses ?? [])
    .filter((response): response is SimulationResponseRecord => !!response)
    .slice()
    .sort((first, second) => first.answeredAtIso.localeCompare(second.answeredAtIso));

  const byConcept: Partial<Record<ConceptId, ConceptHistoryEntry>> = {};
  const timesSeenByItemId: Record<string, number> = {};
  const answeredOrder: { itemId: string; at: string }[] = [];

  for (const response of responses) {
    const itemId = response.templateId;
    if (itemId) {
      timesSeenByItemId[itemId] = (timesSeenByItemId[itemId] ?? 0) + 1;
      answeredOrder.push({ itemId, at: response.answeredAtIso });
    }
    const conceptId = conceptForResponse(response);
    if (!conceptId) continue;
    const entry = byConcept[conceptId] ?? blankEntry(conceptId);
    byConcept[conceptId] = applyResponse(entry, response);
  }

  // Items served but not yet answered still count against the cooldown.
  for (const run of runs) {
    for (const itemId of run.servedItemIds ?? []) {
      if (!(itemId in timesSeenByItemId)) timesSeenByItemId[itemId] = 0;
    }
  }

  const completed = runs.filter((run) => run.complete);
  const meanScore = completed.length
    ? Math.round(completed.reduce((sum, run) => sum + (run.score ?? 0), 0) / completed.length)
    : null;

  return {
    ...base,
    byConcept,
    timesSeenByItemId,
    recentItemIds: answeredOrder
      .sort((first, second) => second.at.localeCompare(first.at))
      .map((entry) => entry.itemId),
    solvedGeneIds: notebook ? Object.keys(notebook.discoveries ?? {}) : [],
    experimentCount: notebook?.experiments?.length ?? 0,
    completedInstrumentIds: completed.map((run) => run.simulationId),
    completedRunCount: completed.length,
    meanScore,
  };
}

/** Resolves a response to a concept, preferring the item id and falling back to a legacy flag. */
function conceptForResponse(response: SimulationResponseRecord): ConceptId | null {
  const item = inquiryItem(response.templateId);
  if (item) return item.conceptId;
  const flag = response.misconceptionFlag;
  return flag && isConceptId(flag) ? flag : null;
}

function blankEntry(conceptId: ConceptId): ConceptHistoryEntry {
  return {
    conceptId,
    asked: 0,
    correct: 0,
    incorrect: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    lastAskedIso: null,
    lastCorrectIso: null,
  };
}

function applyResponse(
  entry: ConceptHistoryEntry,
  response: SimulationResponseRecord,
): ConceptHistoryEntry {
  return {
    ...entry,
    asked: entry.asked + 1,
    correct: entry.correct + (response.correct ? 1 : 0),
    incorrect: entry.incorrect + (response.correct ? 0 : 1),
    consecutiveCorrect: response.correct ? entry.consecutiveCorrect + 1 : 0,
    consecutiveIncorrect: response.correct ? 0 : entry.consecutiveIncorrect + 1,
    lastAskedIso: response.answeredAtIso,
    lastCorrectIso: response.correct ? response.answeredAtIso : entry.lastCorrectIso,
  };
}

/** A concept the student has answered correctly enough times in a row to stop drilling. */
export function isConceptSecure(
  history: StudentInquiryHistory,
  conceptId: ConceptId,
  masteryStreak: number,
): boolean {
  const entry = history.byConcept[conceptId];
  return !!entry && entry.consecutiveCorrect >= masteryStreak;
}

/** A concept the student has missed and not yet recovered. */
export function isConceptWeak(history: StudentInquiryHistory, conceptId: ConceptId): boolean {
  const entry = history.byConcept[conceptId];
  return !!entry && entry.consecutiveIncorrect > 0;
}

export function hasSeenConcept(history: StudentInquiryHistory, conceptId: ConceptId): boolean {
  return !!history.byConcept[conceptId];
}

/**
 * Whether every prerequisite of a concept is secure. Used by `prerequisiteGating` so a student is
 * not asked about ratios before they can say where an allele comes from.
 */
export function prerequisitesSecure(
  history: StudentInquiryHistory,
  conceptId: ConceptId,
  masteryStreak: number,
): boolean {
  const concept = dragonConcept(conceptId);
  if (!concept) return true;
  return concept.prerequisites.every(
    (prerequisite) =>
      isConceptSecure(history, prerequisite, masteryStreak) ||
      !hasSeenConcept(history, prerequisite),
  );
}

/**
 * Concepts ranked by how much attention they need: unresolved misses first, then never-seen, then
 * everything else, with secure concepts last.
 */
export function conceptNeedScore(
  history: StudentInquiryHistory,
  conceptId: ConceptId,
  masteryStreak: number,
): number {
  const entry = history.byConcept[conceptId];
  if (!entry) return 60;
  if (entry.consecutiveIncorrect >= 2) return 100;
  if (entry.consecutiveIncorrect === 1) return 85;
  if (entry.consecutiveCorrect >= masteryStreak) return 5;
  if (entry.correct > 0) return 30;
  return 50;
}
