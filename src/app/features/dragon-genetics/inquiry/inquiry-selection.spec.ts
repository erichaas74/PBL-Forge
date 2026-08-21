import { selectInquiryItems } from './inquiry-selection';
import { DRAGON_INQUIRY_BANK } from './inquiry-bank';
import { DEFAULT_INQUIRY_POLICY } from './inquiry-policy';
import { buildStudentInquiryHistory } from './inquiry-history';
import {
  ConceptId,
  InquiryPolicy,
  StudentInquiryHistory,
  emptyStudentInquiryHistory,
} from './inquiry.models';
import { instrumentProbes } from './instrument.registry';
import { dragonConcept } from './concept.registry';
import type { DragonSimulationRun } from '../adaptive/dragon-simulation.models';

describe('inquiry selection', () => {
  const microscopeProbes = instrumentProbes('genome-microscope');

  function policy(patch: Partial<InquiryPolicy> = {}): InquiryPolicy {
    return { ...DEFAULT_INQUIRY_POLICY, ...patch };
  }

  function select(
    overrides: Partial<Parameters<typeof selectInquiryItems>[0]> = {},
  ): ReturnType<typeof selectInquiryItems> {
    return selectInquiryItems({
      targetConceptIds: [],
      availableProbeIds: microscopeProbes,
      bank: DRAGON_INQUIRY_BANK,
      level: 'grade-7',
      history: emptyStudentInquiryHistory('student-1'),
      policy: policy(),
      conceptSettings: {},
      disabledItemIds: [],
      pinnedItemIds: [],
      conceptFocusIds: [],
      count: 3,
      seed: 'seed-1',
      ...overrides,
    });
  }

  function historyWith(
    responses: readonly { itemId: string; correct: boolean; at: string }[],
  ): StudentInquiryHistory {
    const run = {
      simulationId: 'genome-microscope',
      complete: true,
      score: 50,
      servedItemIds: responses.map((response) => response.itemId),
      responses: responses.map((response, index) => ({
        questionId: `q${index}`,
        templateId: response.itemId,
        sectionId: 'observe',
        selectedOptionId: 'a',
        correct: response.correct,
        misconceptionFlag: null,
        answeredAtIso: response.at,
      })),
    } as unknown as DragonSimulationRun;
    return buildStudentInquiryHistory('student-1', [run], null);
  }

  it('returns only items in the requested band', () => {
    for (const level of ['grade-7', 'ap-biology'] as const) {
      const { items } = select({ level, count: 6 });
      for (const item of items) {
        expect(item.gradeBands).toContain(level);
      }
    }
  });

  it('returns only items whose probe the instrument declares', () => {
    const { items } = select({ count: 6 });
    for (const item of items) {
      expect(microscopeProbes as readonly string[]).toContain(item.requiresProbe);
    }
  });

  it('covers distinct concepts before repeating one', () => {
    const { items } = select({ count: 4 });
    const conceptIds = items.map((item) => item.conceptId);
    expect(new Set(conceptIds).size).toBe(conceptIds.length);
  });

  it('returns fewer items rather than padding when the bank is thin', () => {
    const thin = DRAGON_INQUIRY_BANK.filter((item) => item.id === 'gen2-hierarchy-1');
    const { items } = select({ bank: thin, count: 5, policy: policy({ minItems: 1 }) });
    expect(items.length).toBe(1);
  });

  it('is deterministic for one seed and varies across seeds', () => {
    const first = select({ seed: 'alpha' }).items.map((item) => item.id);
    const again = select({ seed: 'alpha' }).items.map((item) => item.id);
    const other = select({ seed: 'beta' }).items.map((item) => item.id);
    expect(again).toEqual(first);
    expect(other.join()).not.toEqual(first.join());
  });

  it('leads with a concept the student has missed', () => {
    const missed = DRAGON_INQUIRY_BANK.find((item) => item.id === 'gen2-dna-1')!;
    const history = historyWith([
      { itemId: missed.id, correct: false, at: '2026-01-01T10:00:00.000Z' },
    ]);
    const { items } = select({
      history,
      count: 2,
      policy: policy({ coverage: 'weakness-first', itemCooldown: 0, preferUnseenConcepts: false }),
    });
    expect(items[0].conceptId).toBe(missed.conceptId);
  });

  it('re-asks a missed concept through a different probe', () => {
    // `hierarchy-confusion` is asked through both `genome.hierarchy` and `gene.locus` at grade-7,
    // so a follow-up can test the idea rather than re-run the same wording.
    const missed = DRAGON_INQUIRY_BANK.find((item) => item.id === 'gen2-hierarchy-1')!;
    const history = historyWith([
      { itemId: missed.id, correct: false, at: '2026-01-01T10:00:00.000Z' },
    ]);
    const { items } = select({
      history,
      count: 1,
      policy: policy({
        coverage: 'weakness-first',
        repeatMissStrategy: 'different-probe',
        preferUnseenConcepts: false,
        itemCooldown: 0,
        minItems: 1,
      }),
    });
    const followUp = items.find((item) => item.conceptId === missed.conceptId);
    expect(followUp).toBeDefined();
    expect(followUp!.requiresProbe).not.toBe(missed.requiresProbe);
  });

  it('suppresses a recently served item while a fresh alternative exists', () => {
    const recent = DRAGON_INQUIRY_BANK.find((item) => item.id === 'gen2-hierarchy-1')!;
    const history = historyWith([
      { itemId: recent.id, correct: true, at: '2026-01-01T10:00:00.000Z' },
    ]);
    const { items } = select({ history, count: 3, policy: policy({ itemCooldown: 8 }) });
    expect(items.map((item) => item.id)).not.toContain(recent.id);
  });

  it('stops drilling a concept once the mastery streak is met', () => {
    const mastered = DRAGON_INQUIRY_BANK.find((item) => item.id === 'gen2-hierarchy-1')!;
    const sibling = DRAGON_INQUIRY_BANK.find((item) => item.id === 'gen2-hierarchy-2')!;
    const history = historyWith([
      { itemId: mastered.id, correct: true, at: '2026-01-01T10:00:00.000Z' },
      { itemId: sibling.id, correct: true, at: '2026-01-02T10:00:00.000Z' },
    ]);
    const { items } = select({ history, count: 2, policy: policy({ masteryStreak: 2 }) });
    expect(items.map((item) => item.conceptId)).not.toContain(mastered.conceptId);
  });

  it('withholds a concept whose prerequisite is not yet secure', () => {
    // `allele-chromosome-swap` requires `hierarchy-confusion`, which is answered wrongly here.
    const history = historyWith([
      { itemId: 'gen2-hierarchy-1', correct: false, at: '2026-01-01T10:00:00.000Z' },
    ]);
    const { items, gatedConceptIds } = select({
      history,
      count: 6,
      targetConceptIds: ['allele-chromosome-swap'],
      policy: policy({ prerequisiteGating: true }),
    });
    expect(items.map((item) => item.conceptId)).not.toContain('allele-chromosome-swap');
    expect(gatedConceptIds).toContain('allele-chromosome-swap');
  });

  it('honours a teacher disabling an item and pinning another', () => {
    const pinned = DRAGON_INQUIRY_BANK.find((item) => item.id === 'gen6-uracil-2')!;
    const { items } = select({
      count: 2,
      disabledItemIds: ['gen2-hierarchy-1'],
      pinnedItemIds: [pinned.id],
    });
    expect(items.map((item) => item.id)).toContain(pinned.id);
    expect(items.map((item) => item.id)).not.toContain('gen2-hierarchy-1');
  });

  it('honours a teacher disabling a whole concept', () => {
    const { items } = select({
      count: 6,
      conceptSettings: { 'hierarchy-confusion': { enabled: false } },
    });
    expect(items.map((item) => item.conceptId)).not.toContain('hierarchy-confusion');
  });

  it('puts a per-student concept focus first', () => {
    const focus: ConceptId = 'rna-uses-thymine';
    const { items } = select({ count: 3, conceptFocusIds: [focus] });
    expect(items.some((item) => item.conceptId === focus)).toBe(true);
  });

  it('delivers items in authored phase order', () => {
    const order = ['observe', 'predict', 'manipulate', 'explain'];
    const { items } = select({ count: 6, level: 'ap-biology' });
    const indexes = items.map((item) => order.indexOf(item.phase));
    expect(indexes).toEqual([...indexes].sort((first, second) => first - second));
  });

  it('only offers items whose concept admits the required probe', () => {
    const { items } = select({ count: 6, level: 'high-school' });
    for (const item of items) {
      expect(dragonConcept(item.conceptId)!.probes).toContain(item.requiresProbe);
    }
  });
});
