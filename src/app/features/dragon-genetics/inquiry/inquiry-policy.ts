import {
  AuthoredChoiceItem,
  ChoiceItem,
  ConceptSetting,
  CoverageMode,
  HintPolicy,
  InquiryPolicy,
  InquirySettings,
  RepeatMissStrategy,
  StudentInquiryOverride,
  isConceptId,
} from './inquiry.models';
import { dragonConcept } from './concept.registry';
import { INSTRUCTION_LEVELS, InstructionLevel, SimulationPhase } from '../adaptive/dragon-simulation.models';
import { isProbeId } from '../workstations/shared/instrument-manifest.models';

/**
 * Teacher-facing policy: every knob the class settings screen can expose, with defaults that
 * reproduce sensible behaviour for a 7th-grade class.
 */
export const DEFAULT_INQUIRY_POLICY: InquiryPolicy = {
  adaptiveLevel: true,
  adaptiveLevelUpScore: 85,
  adaptiveLevelDownScore: 45,
  adaptiveLevelMinRuns: 2,
  coverage: 'weakness-first',
  repeatMissStrategy: 'different-probe',
  masteryStreak: 2,
  itemCooldown: 6,
  prerequisiteGating: true,
  minItems: 2,
  maxItems: 6,
  hintPolicy: 'level',
  includeProbeItems: false,
  useNotebookEvidence: true,
  preferUnseenConcepts: true,
};

export const DEFAULT_INQUIRY_SETTINGS: InquirySettings = {
  schemaVersion: 1,
  policy: { ...DEFAULT_INQUIRY_POLICY },
  conceptSettings: {},
  disabledItemIds: [],
  pinnedItemIds: [],
  disabledProbeIds: [],
  authoredItems: [],
};

const COVERAGE_MODES: readonly CoverageMode[] = ['concept-first', 'weakness-first', 'balanced'];
const REPEAT_STRATEGIES: readonly RepeatMissStrategy[] = [
  'same-probe',
  'different-probe',
  'prerequisite-first',
];
const HINT_POLICIES: readonly HintPolicy[] = ['level', 'always', 'never', 'after-miss'];
const PHASES: readonly SimulationPhase[] = ['observe', 'predict', 'manipulate', 'explain'];

export function mergeInquiryPolicy(
  base: InquiryPolicy,
  patch: Partial<InquiryPolicy> | undefined,
): InquiryPolicy {
  return patch ? normalizeInquiryPolicy({ ...base, ...patch }) : base;
}

export function normalizeInquiryPolicy(value: unknown): InquiryPolicy {
  const raw = isRecord(value) ? value : {};
  const minItems = clampInt(raw['minItems'], 1, 10, DEFAULT_INQUIRY_POLICY.minItems);
  const maxItems = clampInt(raw['maxItems'], 1, 10, DEFAULT_INQUIRY_POLICY.maxItems);
  const up = clampInt(raw['adaptiveLevelUpScore'], 50, 100, DEFAULT_INQUIRY_POLICY.adaptiveLevelUpScore);
  const down = clampInt(raw['adaptiveLevelDownScore'], 0, 95, DEFAULT_INQUIRY_POLICY.adaptiveLevelDownScore);
  return {
    adaptiveLevel: boolOr(raw['adaptiveLevel'], DEFAULT_INQUIRY_POLICY.adaptiveLevel),
    // A promotion bar at or below the demotion bar would oscillate, so keep them apart.
    adaptiveLevelUpScore: Math.max(up, down + 5),
    adaptiveLevelDownScore: down,
    adaptiveLevelMinRuns: clampInt(
      raw['adaptiveLevelMinRuns'],
      1,
      20,
      DEFAULT_INQUIRY_POLICY.adaptiveLevelMinRuns,
    ),
    coverage: oneOf(raw['coverage'], COVERAGE_MODES, DEFAULT_INQUIRY_POLICY.coverage),
    repeatMissStrategy: oneOf(
      raw['repeatMissStrategy'],
      REPEAT_STRATEGIES,
      DEFAULT_INQUIRY_POLICY.repeatMissStrategy,
    ),
    masteryStreak: clampInt(raw['masteryStreak'], 1, 5, DEFAULT_INQUIRY_POLICY.masteryStreak),
    itemCooldown: clampInt(raw['itemCooldown'], 0, 40, DEFAULT_INQUIRY_POLICY.itemCooldown),
    prerequisiteGating: boolOr(
      raw['prerequisiteGating'],
      DEFAULT_INQUIRY_POLICY.prerequisiteGating,
    ),
    minItems: Math.min(minItems, maxItems),
    maxItems: Math.max(minItems, maxItems),
    hintPolicy: oneOf(raw['hintPolicy'], HINT_POLICIES, DEFAULT_INQUIRY_POLICY.hintPolicy),
    includeProbeItems: boolOr(
      raw['includeProbeItems'],
      DEFAULT_INQUIRY_POLICY.includeProbeItems,
    ),
    useNotebookEvidence: boolOr(
      raw['useNotebookEvidence'],
      DEFAULT_INQUIRY_POLICY.useNotebookEvidence,
    ),
    preferUnseenConcepts: boolOr(
      raw['preferUnseenConcepts'],
      DEFAULT_INQUIRY_POLICY.preferUnseenConcepts,
    ),
  };
}

export function normalizeInquirySettings(value: unknown): InquirySettings {
  const raw = isRecord(value) ? value : {};
  return {
    schemaVersion: 1,
    policy: normalizeInquiryPolicy(raw['policy']),
    conceptSettings: normalizeConceptSettings(raw['conceptSettings']),
    disabledItemIds: stringList(raw['disabledItemIds']),
    pinnedItemIds: stringList(raw['pinnedItemIds']),
    disabledProbeIds: stringList(raw['disabledProbeIds']).filter(isProbeId),
    authoredItems: Array.isArray(raw['authoredItems'])
      ? raw['authoredItems']
          .map((item) => normalizeAuthoredItem(item))
          .filter((item): item is AuthoredChoiceItem => !!item)
      : [],
  };
}

export function normalizeStudentInquiryOverride(value: unknown): StudentInquiryOverride {
  const raw = isRecord(value) ? value : {};
  const focus = stringList(raw['conceptFocusIds']).filter(isConceptId);
  return {
    policy: isRecord(raw['policy']) ? partialPolicy(raw['policy']) : undefined,
    conceptFocusIds: focus.length ? focus : undefined,
    waivedItemIds: optionalList(raw['waivedItemIds']),
    pinnedItemIds: optionalList(raw['pinnedItemIds']),
  };
}

function normalizeConceptSettings(value: unknown): Record<string, ConceptSetting> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, setting]) => {
      if (!isConceptId(id) || !isRecord(setting)) return [];
      const minLevel = INSTRUCTION_LEVELS.includes(setting['minLevel'] as InstructionLevel)
        ? (setting['minLevel'] as InstructionLevel)
        : undefined;
      const next: ConceptSetting = {
        enabled: typeof setting['enabled'] === 'boolean' ? setting['enabled'] : undefined,
        priority: Number.isFinite(Number(setting['priority']))
          ? clampInt(setting['priority'], -10, 10, 0)
          : undefined,
        minLevel,
      };
      const hasValue =
        next.enabled !== undefined || next.priority !== undefined || next.minLevel !== undefined;
      return hasValue ? [[id, next]] : [];
    }),
  );
}

/**
 * Validates a teacher-written item. A teacher chooses an existing concept and an existing probe
 * rather than free-typing a target, which is what keeps authored content joinable.
 */
export function normalizeAuthoredItem(value: unknown): AuthoredChoiceItem | null {
  if (!isRecord(value)) return null;
  const conceptId = String(value['conceptId'] ?? '');
  const requiresProbe = String(value['requiresProbe'] ?? '');
  const concept = dragonConcept(conceptId);
  if (!concept || !isProbeId(requiresProbe)) return null;
  if (!concept.probes.includes(requiresProbe)) return null;

  const options = Array.isArray(value['options'])
    ? value['options']
        .filter(isRecord)
        .map((option) => ({ id: String(option['id'] ?? ''), label: String(option['label'] ?? '') }))
        .filter((option) => option.id && option.label)
    : [];
  const correctOptionId = String(value['correctOptionId'] ?? '');
  const prompt = String(value['prompt'] ?? '').trim();
  if (options.length < 2 || !options.some((option) => option.id === correctOptionId)) return null;
  if (!prompt) return null;

  const gradeBands = stringList(value['gradeBands'])
    .filter((band): band is InstructionLevel =>
      INSTRUCTION_LEVELS.includes(band as InstructionLevel),
    )
    .filter((band) => concept.gradeBands.includes(band));
  if (!gradeBands.length) return null;

  const id = String(value['id'] ?? '').trim();
  return {
    id: id || `teacher:${conceptId}:${hash(prompt)}`,
    conceptId,
    requiresProbe,
    gradeBands,
    phase: oneOf(value['phase'], PHASES, 'explain'),
    prompt,
    options,
    correctOptionId,
    explanation: String(value['explanation'] ?? '').trim(),
    hint: typeof value['hint'] === 'string' ? value['hint'] : undefined,
    authoredAtIso:
      typeof value['authoredAtIso'] === 'string' ? value['authoredAtIso'] : new Date().toISOString(),
  };
}

/** Turns a validated authored record into a bank item the selector can rank alongside the rest. */
export function authoredItemToChoiceItem(item: AuthoredChoiceItem): ChoiceItem | null {
  const concept = dragonConcept(item.conceptId);
  if (!concept || !isProbeId(item.requiresProbe)) return null;
  return {
    kind: 'choice',
    id: item.id,
    conceptId: concept.id,
    requiresProbe: item.requiresProbe,
    gradeBands: item.gradeBands.filter((band): band is InstructionLevel =>
      INSTRUCTION_LEVELS.includes(band as InstructionLevel),
    ),
    phase: oneOf(item.phase, PHASES, 'explain'),
    hint: item.hint,
    source: 'teacher',
    prompt: item.prompt,
    options: item.options,
    correctOptionId: item.correctOptionId,
    explanation: item.explanation,
  };
}

function partialPolicy(raw: Record<string, unknown>): Partial<InquiryPolicy> {
  const full = normalizeInquiryPolicy(raw);
  return Object.fromEntries(
    Object.entries(full).filter(([key]) => key in raw),
  ) as Partial<InquiryPolicy>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function optionalList(value: unknown): string[] | undefined {
  const list = stringList(value);
  return list.length ? list : undefined;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}
