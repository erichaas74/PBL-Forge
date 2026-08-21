import {
  buildStudentInquiryHistory,
  conceptNeedScore,
  isConceptSecure,
  isConceptWeak,
  prerequisitesSecure,
} from './inquiry-history';
import type { DragonSimulationRun } from '../adaptive/dragon-simulation.models';
import type { GeneticsNotebookSnapshot } from '../workstations/shared/genetics-notebook.models';

describe('student inquiry history', () => {
  function run(
    responses: readonly { templateId: string; correct: boolean; at: string; flag?: string }[],
    patch: Partial<DragonSimulationRun> = {},
  ): DragonSimulationRun {
    return {
      simulationId: 'genome-microscope',
      complete: true,
      score: 60,
      servedItemIds: responses.map((response) => response.templateId),
      responses: responses.map((response, index) => ({
        questionId: `q${index}`,
        templateId: response.templateId,
        sectionId: 'observe',
        selectedOptionId: 'a',
        correct: response.correct,
        misconceptionFlag: response.correct ? null : (response.flag ?? null),
        answeredAtIso: response.at,
      })),
      ...patch,
    } as unknown as DragonSimulationRun;
  }

  it('derives concept history from runs already persisted', () => {
    const history = buildStudentInquiryHistory(
      'student-1',
      [
        run([
          { templateId: 'gen2-hierarchy-1', correct: false, at: '2026-01-01T10:00:00.000Z' },
          { templateId: 'gen2-hierarchy-2', correct: true, at: '2026-01-01T10:05:00.000Z' },
        ]),
      ],
      null,
    );
    const entry = history.byConcept['hierarchy-confusion'];
    expect(entry?.asked).toBe(2);
    expect(entry?.correct).toBe(1);
    expect(entry?.incorrect).toBe(1);
    expect(entry?.consecutiveCorrect).toBe(1);
  });

  it('orders responses by time so streaks are correct across runs', () => {
    const history = buildStudentInquiryHistory(
      'student-1',
      [
        run([{ templateId: 'gen2-hierarchy-2', correct: true, at: '2026-01-02T10:00:00.000Z' }]),
        run([{ templateId: 'gen2-hierarchy-1', correct: false, at: '2026-01-01T10:00:00.000Z' }]),
      ],
      null,
    );
    // The miss came first chronologically, so the streak ends at one correct.
    expect(history.byConcept['hierarchy-confusion']?.consecutiveCorrect).toBe(1);
    expect(history.byConcept['hierarchy-confusion']?.consecutiveIncorrect).toBe(0);
  });

  it('reads a legacy response through its misconception flag', () => {
    // Pre-migration records used `simulationId:level` as the template id and only wrote the flag
    // on a miss. The miss must still register, because that is what adaptation needs most.
    const history = buildStudentInquiryHistory(
      'student-1',
      [
        run([
          {
            templateId: 'genome-microscope:grade-7',
            correct: false,
            at: '2026-01-01T10:00:00.000Z',
            flag: 'hierarchy-confusion',
          },
        ]),
      ],
      null,
    );
    expect(history.byConcept['hierarchy-confusion']?.incorrect).toBe(1);
  });

  it('ignores a legacy flag that is not a known concept', () => {
    const history = buildStudentInquiryHistory(
      'student-1',
      [
        run([
          {
            templateId: 'legacy:thing',
            correct: false,
            at: '2026-01-01T10:00:00.000Z',
            flag: 'visual-model-location',
          },
        ]),
      ],
      null,
    );
    expect(Object.keys(history.byConcept).length).toBe(0);
  });

  it('counts notebook evidence and completed runs', () => {
    const notebook = {
      experiments: [{}, {}, {}],
      discoveries: { wings: {}, fire: {} },
    } as unknown as GeneticsNotebookSnapshot;
    const history = buildStudentInquiryHistory(
      'student-1',
      [
        run([{ templateId: 'gen2-hierarchy-1', correct: true, at: '2026-01-01T10:00:00.000Z' }], {
          score: 80,
        }),
        run([{ templateId: 'gen2-dna-1', correct: true, at: '2026-01-02T10:00:00.000Z' }], {
          score: 100,
        }),
      ],
      notebook,
    );
    expect(history.solvedGeneIds).toEqual(['wings', 'fire']);
    expect(history.experimentCount).toBe(3);
    expect(history.completedRunCount).toBe(2);
    expect(history.meanScore).toBe(90);
  });

  it('lists recent items newest first for the cooldown', () => {
    const history = buildStudentInquiryHistory(
      'student-1',
      [
        run([
          { templateId: 'gen2-hierarchy-1', correct: true, at: '2026-01-01T10:00:00.000Z' },
          { templateId: 'gen2-dna-1', correct: true, at: '2026-01-03T10:00:00.000Z' },
          { templateId: 'gen2-hierarchy-2', correct: true, at: '2026-01-02T10:00:00.000Z' },
        ]),
      ],
      null,
    );
    expect(history.recentItemIds[0]).toBe('gen2-dna-1');
  });

  it('reports mastery, weakness, and prerequisite readiness', () => {
    const mastered = buildStudentInquiryHistory(
      'student-1',
      [
        run([
          { templateId: 'gen2-hierarchy-1', correct: true, at: '2026-01-01T10:00:00.000Z' },
          { templateId: 'gen2-hierarchy-2', correct: true, at: '2026-01-02T10:00:00.000Z' },
        ]),
      ],
      null,
    );
    expect(isConceptSecure(mastered, 'hierarchy-confusion', 2)).toBe(true);
    expect(isConceptWeak(mastered, 'hierarchy-confusion')).toBe(false);
    expect(prerequisitesSecure(mastered, 'allele-chromosome-swap', 2)).toBe(true);
    expect(conceptNeedScore(mastered, 'hierarchy-confusion', 2)).toBeLessThan(10);

    const missed = buildStudentInquiryHistory(
      'student-1',
      [run([{ templateId: 'gen2-hierarchy-1', correct: false, at: '2026-01-01T10:00:00.000Z' }])],
      null,
    );
    expect(isConceptWeak(missed, 'hierarchy-confusion')).toBe(true);
    expect(prerequisitesSecure(missed, 'allele-chromosome-swap', 2)).toBe(false);
    expect(conceptNeedScore(missed, 'hierarchy-confusion', 2)).toBeGreaterThan(80);
  });

  it('treats a never-seen prerequisite as not blocking', () => {
    const history = buildStudentInquiryHistory('student-1', [], null);
    expect(prerequisitesSecure(history, 'allele-chromosome-swap', 2)).toBe(true);
  });
});
