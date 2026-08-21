import { adaptiveLevelFor, classBank, resolveInquiry } from './inquiry.resolver';
import { DEFAULT_INQUIRY_POLICY, DEFAULT_INQUIRY_SETTINGS, normalizeInquirySettings } from './inquiry-policy';
import { DRAGON_INQUIRY_BANK } from './inquiry-bank';
import { StudentInquiryHistory, emptyStudentInquiryHistory } from './inquiry.models';

describe('inquiry resolver', () => {
  const history = emptyStudentInquiryHistory('student-1');

  function resolve(patch: Partial<Parameters<typeof resolveInquiry>[0]> = {}) {
    return resolveInquiry({
      instrumentId: 'genome-microscope',
      studentId: 'student-1',
      settings: DEFAULT_INQUIRY_SETTINGS,
      baseLevel: 'grade-7',
      baseQuestionCount: 3,
      baseHintsAllowed: true,
      history,
      seed: 'resolver-seed',
      ...patch,
    });
  }

  function scored(meanScore: number, completedRunCount: number): StudentInquiryHistory {
    return { ...history, meanScore, completedRunCount };
  }

  it('resolves a usable set for an untouched student', () => {
    const resolved = resolve();
    expect(resolved.items.length).toBeGreaterThan(0);
    expect(resolved.level).toBe('grade-7');
    expect(resolved.availableProbeIds.length).toBeGreaterThan(0);
  });

  it('raises the level from the student’s own completed work', () => {
    const resolved = resolve({ history: scored(92, 3) });
    expect(resolved.level).toBe('grade-8');
    expect(resolved.provenance.some((entry) => entry.layer === 'student-adaptation')).toBe(true);
  });

  it('lowers the level after weak completed work', () => {
    const resolved = resolve({ baseLevel: 'high-school', history: scored(30, 4) });
    expect(resolved.level).toBe('grade-8');
  });

  it('will not move the level before the minimum number of completed runs', () => {
    const resolved = resolve({ history: scored(99, 1) });
    expect(resolved.level).toBe('grade-7');
  });

  it('lets a teacher switch adaptive level off entirely', () => {
    const settings = normalizeInquirySettings({
      ...DEFAULT_INQUIRY_SETTINGS,
      policy: { ...DEFAULT_INQUIRY_POLICY, adaptiveLevel: false },
    });
    const resolved = resolve({ settings, history: scored(99, 5) });
    expect(resolved.level).toBe('grade-7');
  });

  it('applies a live teacher override last and records the reason', () => {
    const resolved = resolve({
      history: scored(92, 3),
      liveOverride: { level: 'grade-7', reason: 'reteaching with the class' },
    });
    expect(resolved.level).toBe('grade-7');
    const override = resolved.provenance.find((entry) => entry.layer === 'live-override');
    expect(override?.reason).toBe('reteaching with the class');
  });

  it('withholds probes an act briefing has not released', () => {
    const resolved = resolve({ actWithheldProbeIds: ['dna.sequence', 'dna.transcribe'] });
    expect(resolved.availableProbeIds).not.toContain('dna.sequence');
    for (const item of resolved.items) {
      expect(item.requiresProbe).not.toBe('dna.sequence');
    }
  });

  it('withholds probes a teacher has disabled for the class', () => {
    const settings = normalizeInquirySettings({
      ...DEFAULT_INQUIRY_SETTINGS,
      disabledProbeIds: ['gene.locus'],
    });
    const resolved = resolve({ settings });
    expect(resolved.availableProbeIds).not.toContain('gene.locus');
  });

  it('targets the concepts an act briefing names', () => {
    const resolved = resolve({
      actTargetConceptIds: ['hierarchy-confusion'],
      baseQuestionCount: 2,
    });
    expect(resolved.targetConceptIds).toEqual(['hierarchy-confusion']);
    for (const item of resolved.items) {
      expect(item.conceptId).toBe('hierarchy-confusion');
    }
  });

  it('honours hint policy over the level default', () => {
    const never = normalizeInquirySettings({
      ...DEFAULT_INQUIRY_SETTINGS,
      policy: { ...DEFAULT_INQUIRY_POLICY, hintPolicy: 'never' },
    });
    expect(resolve({ settings: never }).hintsAllowed).toBe(false);

    const always = normalizeInquirySettings({
      ...DEFAULT_INQUIRY_SETTINGS,
      policy: { ...DEFAULT_INQUIRY_POLICY, hintPolicy: 'always' },
    });
    expect(resolve({ settings: always, baseHintsAllowed: false }).hintsAllowed).toBe(true);
  });

  it('adds a validated teacher-authored item to the class bank', () => {
    const settings = normalizeInquirySettings({
      ...DEFAULT_INQUIRY_SETTINGS,
      authoredItems: [
        {
          id: 'teacher-hierarchy-1',
          conceptId: 'hierarchy-confusion',
          requiresProbe: 'genome.hierarchy',
          gradeBands: ['grade-7'],
          phase: 'observe',
          prompt: 'Which of these is held inside the nucleus?',
          options: [
            { id: 'a', label: 'Chromosomes' },
            { id: 'b', label: 'A whole dragon' },
          ],
          correctOptionId: 'a',
          explanation: 'The nucleus holds the chromosome set.',
          authoredAtIso: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    expect(settings.authoredItems.length).toBe(1);
    const bank = classBank(settings);
    expect(bank.length).toBe(DRAGON_INQUIRY_BANK.length + 1);
    expect(bank.some((item) => item.id === 'teacher-hierarchy-1' && item.source === 'teacher')).toBe(
      true,
    );
  });

  it('rejects an authored item that targets a probe its concept does not admit', () => {
    const settings = normalizeInquirySettings({
      ...DEFAULT_INQUIRY_SETTINGS,
      authoredItems: [
        {
          conceptId: 'hierarchy-confusion',
          requiresProbe: 'donor.compatibility',
          gradeBands: ['grade-7'],
          phase: 'observe',
          prompt: 'Nonsense pairing.',
          options: [
            { id: 'a', label: 'One' },
            { id: 'b', label: 'Two' },
          ],
          correctOptionId: 'a',
          explanation: '',
          authoredAtIso: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    expect(settings.authoredItems.length).toBe(0);
  });

  it('reports a short set instead of padding it', () => {
    const resolved = resolve({ instrumentId: 'island-diversity', baseQuestionCount: 6 });
    expect(resolved.items.length).toBeLessThanOrEqual(6);
    expect(resolved.items.length).toBeGreaterThan(0);
    if (resolved.items.length < 6) {
      expect(
        resolved.provenance.some(
          (entry) => entry.field === 'itemCount' && entry.layer === 'registry',
        ),
      ).toBe(true);
    }
  });

  it('keeps the promotion bar above the demotion bar after normalization', () => {
    const settings = normalizeInquirySettings({
      policy: { adaptiveLevelUpScore: 40, adaptiveLevelDownScore: 70 },
    });
    expect(settings.policy.adaptiveLevelUpScore).toBeGreaterThan(
      settings.policy.adaptiveLevelDownScore,
    );
  });

  it('exposes adaptive level as a pure function for teacher preview', () => {
    expect(adaptiveLevelFor('grade-7', scored(95, 5), DEFAULT_INQUIRY_POLICY)).toBe('grade-8');
    expect(adaptiveLevelFor('ap-biology', scored(95, 5), DEFAULT_INQUIRY_POLICY)).toBe('ap-biology');
    expect(adaptiveLevelFor('grade-7', scored(10, 5), DEFAULT_INQUIRY_POLICY)).toBe('grade-7');
  });
});
