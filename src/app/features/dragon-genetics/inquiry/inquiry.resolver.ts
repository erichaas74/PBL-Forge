import {
  ConceptId,
  InquiryItem,
  InquiryPolicy,
  InquirySettings,
  LayerTrace,
  ResolvedInquiry,
  StudentInquiryHistory,
  StudentInquiryOverride,
  isConceptId,
} from './inquiry.models';
import { DRAGON_INQUIRY_BANK, inquiryItem } from './inquiry-bank';
import { conceptsForProbes } from './concept.registry';
import {
  DEFAULT_INQUIRY_SETTINGS,
  authoredItemToChoiceItem,
  mergeInquiryPolicy,
} from './inquiry-policy';
import { selectInquiryItems } from './inquiry-selection';
import { instrumentManifest, instrumentProbes, supportsGuidedMode } from './instrument.registry';
import { INSTRUCTION_LEVELS, InstructionLevel } from '../adaptive/dragon-simulation.models';
import { ProbeId } from '../workstations/shared/instrument-manifest.models';

/**
 * The five-layer resolver.
 *
 * Each layer emits a patch rather than a whole object, and later layers win:
 *
 *   L0 registry default → L1 class assignment → L2 act briefing
 *      → L3 student adaptation → L4 live teacher override
 *
 * The result is deterministic for a given seed and pure over plain data, so a teacher screen can
 * reproduce exactly what a student saw and `provenance` can say which layer decided each field.
 */
export interface InquiryResolutionRequest {
  instrumentId: string;
  studentId: string;
  /** L1 — class settings from the assignment. */
  settings?: InquirySettings;
  /** L1/L3 — per-student adjustments a teacher made. */
  studentOverride?: StudentInquiryOverride;
  /** Level already resolved by the assignment resolver, before adaptation. */
  baseLevel: InstructionLevel;
  baseQuestionCount: number;
  baseHintsAllowed: boolean;
  /** L2 — concepts this curriculum step is aiming at. Empty means the instrument's own range. */
  actTargetConceptIds?: readonly ConceptId[];
  /** L2 — probes withheld because the briefing did not release the relevant records. */
  actWithheldProbeIds?: readonly ProbeId[];
  /** L3 — derived from work already persisted for this student. */
  history: StudentInquiryHistory;
  /** L4 — in-session teacher override, applied last and always traced. */
  liveOverride?: {
    level?: InstructionLevel;
    itemCount?: number;
    hintsAllowed?: boolean;
    reason?: string;
  };
  seed: string;
}

export function resolveInquiry(request: InquiryResolutionRequest): ResolvedInquiry {
  const provenance: LayerTrace[] = [];
  const settings = request.settings ?? DEFAULT_INQUIRY_SETTINGS;
  const manifest = instrumentManifest(request.instrumentId);

  // L0/L1 — policy from the registry defaults, patched by the class, then by the student.
  let policy: InquiryPolicy = settings.policy;
  provenance.push(trace('class-assignment', 'policy.coverage', policy.coverage));
  if (request.studentOverride?.policy) {
    policy = mergeInquiryPolicy(policy, request.studentOverride.policy);
    provenance.push(
      trace('student-adaptation', 'policy', 'per-student override', 'teacher set this student'),
    );
  }

  // L1/L2 — which probes exist for this session.
  const declared = instrumentProbes(request.instrumentId);
  const withheldByAct = new Set(request.actWithheldProbeIds ?? []);
  const disabledByTeacher = new Set(settings.disabledProbeIds);
  const availableProbeIds = declared.filter(
    (probe) => !withheldByAct.has(probe) && !disabledByTeacher.has(probe),
  );
  if (disabledByTeacher.size) {
    provenance.push(
      trace('class-assignment', 'probes.disabled', [...disabledByTeacher].join(', ')),
    );
  }
  if (withheldByAct.size) {
    provenance.push(trace('act-briefing', 'probes.withheld', [...withheldByAct].join(', ')));
  }

  // L3 — adaptive level from the student's own completed work.
  let level = request.baseLevel;
  provenance.push(trace('class-assignment', 'level', level));
  const adapted = adaptiveLevelFor(request.baseLevel, request.history, policy);
  if (adapted !== level) {
    provenance.push(
      trace(
        'student-adaptation',
        'level',
        adapted,
        `mean score ${request.history.meanScore}% across ${request.history.completedRunCount} completed runs`,
      ),
    );
    level = adapted;
  }

  let itemCount = request.baseQuestionCount;
  let hintsAllowed = resolveHints(policy, request.baseHintsAllowed, request.history, level);

  // L4 — live override wins over everything and is always recorded.
  if (request.liveOverride?.level) {
    level = request.liveOverride.level;
    provenance.push(
      trace('live-override', 'level', level, request.liveOverride.reason ?? 'teacher override'),
    );
  }
  if (typeof request.liveOverride?.itemCount === 'number') {
    itemCount = request.liveOverride.itemCount;
    provenance.push(
      trace('live-override', 'itemCount', String(itemCount), request.liveOverride.reason),
    );
  }
  if (typeof request.liveOverride?.hintsAllowed === 'boolean') {
    hintsAllowed = request.liveOverride.hintsAllowed;
    provenance.push(
      trace('live-override', 'hintsAllowed', String(hintsAllowed), request.liveOverride.reason),
    );
  }

  // The bank the class actually draws from: registry items plus validated teacher-written ones.
  const bank = classBank(settings);

  // L2 — target concepts, defaulting to whatever this instrument can evidence.
  const targetConceptIds = (request.actTargetConceptIds ?? [])
    .filter(isConceptId)
    .filter((conceptId) => conceptsForProbes(availableProbeIds).some((c) => c.id === conceptId));
  if (request.actTargetConceptIds?.length) {
    provenance.push(trace('act-briefing', 'targetConcepts', targetConceptIds.join(', ')));
  }

  const selection = selectInquiryItems({
    targetConceptIds,
    availableProbeIds,
    bank,
    level,
    history: request.history,
    policy,
    conceptSettings: settings.conceptSettings,
    disabledItemIds: [
      ...settings.disabledItemIds,
      ...(request.studentOverride?.waivedItemIds ?? []),
    ],
    pinnedItemIds: [
      ...settings.pinnedItemIds,
      ...(request.studentOverride?.pinnedItemIds ?? []),
    ],
    conceptFocusIds: (request.studentOverride?.conceptFocusIds ?? []).filter(isConceptId),
    count: itemCount,
    seed: request.seed,
  });

  if (selection.items.length < itemCount) {
    provenance.push(
      trace(
        'registry',
        'itemCount',
        String(selection.items.length),
        `bank has ${selection.items.length} eligible items at ${level}; filler is never generated`,
      ),
    );
  }
  if (selection.gatedConceptIds.length) {
    provenance.push(
      trace(
        'student-adaptation',
        'concepts.gated',
        selection.gatedConceptIds.join(', '),
        'prerequisites not yet secure',
      ),
    );
  }

  return {
    instrumentId: manifest?.id ?? request.instrumentId,
    studentId: request.studentId,
    level,
    hintsAllowed,
    itemCount: selection.items.length,
    targetConceptIds: targetConceptIds.length
      ? targetConceptIds
      : [...new Set(selection.items.map((item) => item.conceptId))],
    availableProbeIds,
    items: selection.items,
    provenance,
    uncoveredConceptIds: selection.uncoveredConceptIds,
  };
}

/** Registry items plus this class's validated teacher-authored items. */
export function classBank(settings: InquirySettings): readonly InquiryItem[] {
  const authored = settings.authoredItems
    .map((item) => authoredItemToChoiceItem(item))
    .filter((item): item is NonNullable<typeof item> => !!item);
  return [...DRAGON_INQUIRY_BANK, ...authored];
}

/**
 * Moves a student one band from their own completed-run history. Requires a minimum number of
 * completed runs so a single lucky or unlucky run cannot reassign a student.
 */
export function adaptiveLevelFor(
  baseLevel: InstructionLevel,
  history: StudentInquiryHistory,
  policy: InquiryPolicy,
): InstructionLevel {
  if (!policy.adaptiveLevel) return baseLevel;
  if (history.completedRunCount < policy.adaptiveLevelMinRuns) return baseLevel;
  if (history.meanScore === null) return baseLevel;
  const index = INSTRUCTION_LEVELS.indexOf(baseLevel);
  if (history.meanScore >= policy.adaptiveLevelUpScore) {
    return INSTRUCTION_LEVELS[Math.min(INSTRUCTION_LEVELS.length - 1, index + 1)];
  }
  if (history.meanScore <= policy.adaptiveLevelDownScore) {
    return INSTRUCTION_LEVELS[Math.max(0, index - 1)];
  }
  return baseLevel;
}

function resolveHints(
  policy: InquiryPolicy,
  levelDefault: boolean,
  history: StudentInquiryHistory,
  level: InstructionLevel,
): boolean {
  switch (policy.hintPolicy) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'after-miss':
      // Opened only once the student has an unresolved miss on record.
      return Object.values(history.byConcept).some(
        (entry) => (entry?.consecutiveIncorrect ?? 0) > 0,
      );
    case 'level':
    default:
      return levelDefault && INSTRUCTION_LEVELS.includes(level);
  }
}

/** Whether this instrument may render inquiry UI inside itself, or only outside it. */
export function inquirySessionMode(instrumentId: string): 'investigation' | 'guided' {
  return supportsGuidedMode(instrumentId) ? 'guided' : 'investigation';
}

export { inquiryItem };

function trace(
  layer: LayerTrace['layer'],
  field: string,
  value: string,
  reason?: string,
): LayerTrace {
  return { layer, field, value, reason };
}
