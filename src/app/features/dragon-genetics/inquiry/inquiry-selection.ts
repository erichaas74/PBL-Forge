import {
  ConceptId,
  ConceptSetting,
  InquiryItem,
  InquiryPolicy,
  StudentInquiryHistory,
} from './inquiry.models';
import { dragonConcept } from './concept.registry';
import {
  conceptNeedScore,
  isConceptSecure,
  hasSeenConcept,
  prerequisitesSecure,
} from './inquiry-history';
import { inquiryItem } from './inquiry-bank';
import { shuffleDeterministic } from './inquiry-random';
import { INSTRUCTION_LEVELS, InstructionLevel, SimulationPhase } from '../adaptive/dragon-simulation.models';
import { ProbeId } from '../workstations/shared/instrument-manifest.models';

/** Concepts a solved notebook gene already demonstrates, so drilling them adds little. */
const NOTEBOOK_EVIDENCED_CONCEPTS: readonly ConceptId[] = [
  'allele-definition',
  'dominant-means-two',
  'genotype-equals-phenotype',
];

const PHASE_ORDER: readonly SimulationPhase[] = ['observe', 'predict', 'manipulate', 'explain'];

export interface InquirySelectionInput {
  /** Concepts this session is aiming at. Empty means "anything this instrument can evidence". */
  targetConceptIds: readonly ConceptId[];
  availableProbeIds: readonly ProbeId[];
  bank: readonly InquiryItem[];
  level: InstructionLevel;
  history: StudentInquiryHistory;
  policy: InquiryPolicy;
  conceptSettings: Readonly<Record<string, ConceptSetting>>;
  disabledItemIds: readonly string[];
  pinnedItemIds: readonly string[];
  conceptFocusIds: readonly ConceptId[];
  count: number;
  seed: string;
}

export interface InquirySelectionResult {
  items: readonly InquiryItem[];
  /** Target concepts with no eligible item. Reported, never padded over. */
  uncoveredConceptIds: readonly ConceptId[];
  /** Concepts skipped because a prerequisite is not yet secure. */
  gatedConceptIds: readonly ConceptId[];
}

/**
 * Chooses the items a student sees.
 *
 * The rules run in a fixed order: band membership, probe availability, teacher opt-outs,
 * prerequisite gating, concept coverage, weakness weighting, cooldown, then a deterministic
 * tie-break. If the bank cannot fill `count`, the result is short — filler is never synthesized,
 * because a thin bank is a content gap that should be visible rather than hidden.
 */
export function selectInquiryItems(input: InquirySelectionInput): InquirySelectionResult {
  const {
    availableProbeIds,
    bank,
    level,
    history,
    policy,
    conceptSettings,
    disabledItemIds,
    pinnedItemIds,
    conceptFocusIds,
    seed,
  } = input;

  const probes = new Set(availableProbeIds);
  const disabled = new Set(disabledItemIds);
  const pinned = new Set(pinnedItemIds);
  const gated: ConceptId[] = [];

  // 1–5: hard eligibility.
  const eligible = bank.filter((item) => {
    if (disabled.has(item.id)) return false;
    if (!item.gradeBands.includes(level)) return false;
    if (!probes.has(item.requiresProbe)) return false;
    if (item.kind !== 'choice' && !policy.includeProbeItems) return false;
    const concept = dragonConcept(item.conceptId);
    if (!concept) return false;
    if (!concept.gradeBands.includes(level)) return false;
    const setting = conceptSettings[concept.id];
    if (setting?.enabled === false) return false;
    if (setting?.minLevel && levelIndex(level) < levelIndex(setting.minLevel)) return false;
    return true;
  });

  // 6: prerequisite gating, applied per concept so the reason can be reported.
  const gateFiltered = eligible.filter((item) => {
    if (!policy.prerequisiteGating) return true;
    if (prerequisitesSecure(history, item.conceptId, policy.masteryStreak)) return true;
    if (!gated.includes(item.conceptId)) gated.push(item.conceptId);
    return false;
  });

  const targets = input.targetConceptIds.length
    ? input.targetConceptIds
    : uniqueConcepts(gateFiltered);

  // Pinned items bypass ranking entirely; a teacher asked for them by name.
  const pinnedItems = gateFiltered.filter((item) => pinned.has(item.id));
  const pool = gateFiltered.filter((item) => !pinned.has(item.id));

  // 7–11: rank concepts, then rank items inside each concept.
  const cooldown = new Set(history.recentItemIds.slice(0, policy.itemCooldown));
  const rankedConcepts = rankConcepts(targets, {
    history,
    policy,
    conceptSettings,
    conceptFocusIds,
    seed,
  });

  const byConcept = new Map<ConceptId, InquiryItem[]>();
  for (const item of pool) {
    const list = byConcept.get(item.conceptId) ?? [];
    list.push(item);
    byConcept.set(item.conceptId, list);
  }
  for (const [conceptId, items] of byConcept) {
    byConcept.set(conceptId, rankItems(items, { conceptId, history, policy, cooldown, seed }));
  }

  // Coverage: one item per concept in ranked order, then a second pass, and so on.
  const selected: InquiryItem[] = [...pinnedItems];
  const taken = new Set(selected.map((item) => item.id));
  const limit = Math.max(policy.minItems, Math.min(policy.maxItems, input.count));
  let round = 0;
  let addedThisRound = true;
  while (selected.length < limit && addedThisRound) {
    addedThisRound = false;
    for (const conceptId of rankedConcepts) {
      if (selected.length >= limit) break;
      const next = (byConcept.get(conceptId) ?? []).filter((item) => !taken.has(item.id))[0];
      if (!next) continue;
      // On the first pass, respect the cooldown; later passes may reuse a recent item rather
      // than return short.
      if (round === 0 && cooldown.has(next.id) && hasFreshAlternative(byConcept, taken, cooldown)) {
        continue;
      }
      selected.push(next);
      taken.add(next.id);
      addedThisRound = true;
    }
    round += 1;
  }

  const uncovered = targets.filter(
    (conceptId) => !(byConcept.get(conceptId) ?? []).length && !pinnedItems.some((item) => item.conceptId === conceptId),
  );

  return {
    items: orderForDelivery(selected, seed),
    uncoveredConceptIds: uncovered,
    gatedConceptIds: gated,
  };
}

interface ConceptRankContext {
  history: StudentInquiryHistory;
  policy: InquiryPolicy;
  conceptSettings: Readonly<Record<string, ConceptSetting>>;
  conceptFocusIds: readonly ConceptId[];
  seed: string;
}

function rankConcepts(
  conceptIds: readonly ConceptId[],
  context: ConceptRankContext,
): readonly ConceptId[] {
  const { history, policy, conceptSettings, conceptFocusIds } = context;
  const focus = new Set(conceptFocusIds);
  const scored = conceptIds.map((conceptId) => {
    let score = 0;
    // A teacher naming a concept for this student outranks everything else.
    if (focus.has(conceptId)) score += 1000;
    score += (conceptSettings[conceptId]?.priority ?? 0) * 50;

    const need = conceptNeedScore(history, conceptId, policy.masteryStreak);
    if (policy.coverage === 'weakness-first') score += need * 2;
    else if (policy.coverage === 'balanced') score += need;
    else score += need / 4;

    if (policy.preferUnseenConcepts && !hasSeenConcept(history, conceptId)) score += 40;
    if (isConceptSecure(history, conceptId, policy.masteryStreak)) score -= 120;
    if (
      policy.useNotebookEvidence &&
      history.solvedGeneIds.length >= 2 &&
      NOTEBOOK_EVIDENCED_CONCEPTS.includes(conceptId)
    ) {
      // Already demonstrated at the bench; keep it available but stop leading with it.
      score -= 60;
    }
    return { conceptId, score };
  });

  // Deterministic tie-break so equal scores do not depend on registry order.
  return shuffleDeterministic(scored, `${context.seed}:concepts`)
    .sort((first, second) => second.score - first.score)
    .map((entry) => entry.conceptId);
}

interface ItemRankContext {
  conceptId: ConceptId;
  history: StudentInquiryHistory;
  policy: InquiryPolicy;
  cooldown: ReadonlySet<string>;
  seed: string;
}

function rankItems(items: readonly InquiryItem[], context: ItemRankContext): InquiryItem[] {
  const { history, policy, cooldown, conceptId } = context;
  const lastMissedProbe = mostRecentProbeForConcept(history, conceptId);
  const scored = items.map((item) => {
    let score = 0;
    const timesSeen = history.timesSeenByItemId[item.id] ?? 0;
    score -= timesSeen * 30;
    if (cooldown.has(item.id)) score -= 100;
    // Re-asking a missed concept through a different probe tests the idea rather than the wording.
    if (lastMissedProbe) {
      if (policy.repeatMissStrategy === 'different-probe' && item.requiresProbe !== lastMissedProbe) {
        score += 60;
      }
      if (policy.repeatMissStrategy === 'same-probe' && item.requiresProbe === lastMissedProbe) {
        score += 60;
      }
    }
    // A teacher-written item is a deliberate choice for this class; prefer it on a tie.
    if (item.source === 'teacher') score += 25;
    return { item, score };
  });
  return shuffleDeterministic(scored, `${context.seed}:${conceptId}:items`)
    .sort((first, second) => second.score - first.score)
    .map((entry) => entry.item);
}

/** The probe of the most recently answered item for a concept, used by the repeat-miss strategy. */
function mostRecentProbeForConcept(
  history: StudentInquiryHistory,
  conceptId: ConceptId,
): ProbeId | null {
  for (const itemId of history.recentItemIds) {
    const item = inquiryItem(itemId);
    if (item?.conceptId === conceptId) return item.requiresProbe;
  }
  return null;
}

function hasFreshAlternative(
  byConcept: ReadonlyMap<ConceptId, InquiryItem[]>,
  taken: ReadonlySet<string>,
  cooldown: ReadonlySet<string>,
): boolean {
  for (const items of byConcept.values()) {
    if (items.some((item) => !taken.has(item.id) && !cooldown.has(item.id))) return true;
  }
  return false;
}

/** Authored phase now means something, so deliver observe → predict → manipulate → explain. */
function orderForDelivery(items: readonly InquiryItem[], seed: string): readonly InquiryItem[] {
  return shuffleDeterministic(items, `${seed}:delivery`).sort(
    (first, second) => PHASE_ORDER.indexOf(first.phase) - PHASE_ORDER.indexOf(second.phase),
  );
}

function uniqueConcepts(items: readonly InquiryItem[]): readonly ConceptId[] {
  return [...new Set(items.map((item) => item.conceptId))];
}

function levelIndex(level: InstructionLevel): number {
  return INSTRUCTION_LEVELS.indexOf(level);
}
