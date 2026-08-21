import {
  evaluateSimulationAnswer,
  planSimulationQuestions,
  questionsForRun,
} from './dragon-question.generator';
import {
  DragonSimulationRun,
  InstructionLevel,
  ResolvedSimulationSettings,
} from './dragon-simulation.models';
import { DRAGON_SIMULATIONS, LEVEL_PROFILES } from './dragon-simulation.registry';
import { emptyStudentInquiryHistory } from '../inquiry/inquiry.models';
import { DEFAULT_INQUIRY_SETTINGS } from '../inquiry/inquiry-policy';
import { instrumentProbes } from '../inquiry/instrument.registry';
import { dragonConcept } from '../inquiry/concept.registry';

describe('adaptive Dragon Genetics question generation', () => {
  function settings(level: InstructionLevel): ResolvedSimulationSettings {
    return {
      assignmentId: 'test-assignment',
      assignmentVersion: 5,
      ownerId: 'teacher-1',
      level,
      enabled: true,
      questionCount: LEVEL_PROFILES[level].questionCount,
      hintsAllowed: LEVEL_PROFILES[level].hintsAllowed,
    };
  }

  function plan(simulationId: string, level: InstructionLevel, seed: string) {
    const definition = DRAGON_SIMULATIONS.find(({ id }) => id === simulationId)!;
    return planSimulationQuestions({
      definition,
      settings: settings(level),
      seed,
      studentId: 'student-7',
      history: emptyStudentInquiryHistory('student-7'),
      inquirySettings: DEFAULT_INQUIRY_SETTINGS,
    });
  }

  it('contains only the active simulation registry', () => {
    const activeIds = DRAGON_SIMULATIONS.map((definition) => definition.id as string);
    expect(activeIds).toEqual([
      'trait-evidence',
      'genome-microscope',
      'allele-workbench',
      'punnett-composer',
      'incubator-sampler',
      'dna-process-lab',
      'dragon-hatchery',
      'dragon-arena',
    ]);
  });

  it('reconstructs exactly the same question set from a fixed seed', () => {
    const first = plan('incubator-sampler', 'high-school', 'student-7:fixed');
    const second = plan('incubator-sampler', 'high-school', 'student-7:fixed');
    expect(second.questions).toEqual(first.questions);
  });

  it('builds a valid run for every simulation and all four levels', () => {
    for (const definition of DRAGON_SIMULATIONS) {
      for (const level of Object.keys(LEVEL_PROFILES) as InstructionLevel[]) {
        const { questions } = plan(definition.id, level, `${definition.id}:${level}`);
        expect(questions.length).toBeGreaterThan(0);
        for (const question of questions) {
          expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(
            true,
          );
          expect(question.prompt.length).toBeGreaterThan(10);
          expect(question.level).toBe(level);
        }
      }
    }
  });

  it('never asks a question from outside the resolved level band', () => {
    // The previous generator accumulated every level below the target, so an AP student was shown
    // grade-7 questions. Bands are now a membership test.
    for (const definition of DRAGON_SIMULATIONS) {
      const { questions } = plan(definition.id, 'ap-biology', `${definition.id}:ap`);
      for (const question of questions) {
        const item = dragonConcept(question.conceptId);
        expect(item, question.conceptId).not.toBeNull();
        expect(item!.gradeBands).toContain('ap-biology');
      }
    }
  });

  it('only asks questions whose probe the hosting instrument declares', () => {
    for (const definition of DRAGON_SIMULATIONS) {
      const probes = instrumentProbes(definition.id) as readonly string[];
      const { questions } = plan(definition.id, 'grade-8', `${definition.id}:probe`);
      for (const question of questions) {
        expect(probes).toContain(question.requiresProbe);
      }
    }
  });

  it('never synthesizes filler to reach the requested count', () => {
    // Every question must trace to an authored bank item, so a short bank yields a short run
    // rather than generated "locate the labelled part" padding.
    for (const definition of DRAGON_SIMULATIONS) {
      const { questions, resolved } = plan(definition.id, 'grade-7', `${definition.id}:filler`);
      expect(questions.length).toBeLessThanOrEqual(resolved.itemCount);
      for (const question of questions) {
        expect(question.templateId).toBeTruthy();
        expect(question.conceptId).toBeTruthy();
        expect(question.itemSource).toBe('registry');
      }
    }
  });

  it('anchors a hint to a real element of the instrument rather than a diagram symbol', () => {
    const { questions } = plan('genome-microscope', 'grade-7', 'anchor-seed');
    const anchored = questions.filter((question) => question.anchorId);
    expect(anchored.length).toBeGreaterThan(0);
    for (const question of anchored) {
      expect(instrumentProbes('genome-microscope') as readonly string[]).toContain(
        question.requiresProbe,
      );
    }
  });

  it('varies question or option order for different student seeds', () => {
    const first = plan('dragon-hatchery', 'ap-biology', 'student-a');
    const second = plan('dragon-hatchery', 'ap-biology', 'student-b');
    expect(JSON.stringify(second.questions)).not.toBe(JSON.stringify(first.questions));
  });

  it('rebuilds a run from its frozen item ids without re-running selection', () => {
    const definition = DRAGON_SIMULATIONS.find(({ id }) => id === 'punnett-composer')!;
    const { questions } = plan('punnett-composer', 'grade-8', 'frozen-seed');
    const run = {
      seed: 'frozen-seed',
      level: 'grade-8',
      hintsAllowed: true,
      servedItemIds: questions.map((question) => question.templateId),
    } as unknown as DragonSimulationRun;
    const rebuilt = questionsForRun(definition, run, DEFAULT_INQUIRY_SETTINGS);
    expect(rebuilt.map((question) => question.id)).toEqual(
      questions.map((question) => question.id),
    );
  });

  it('evaluates correctness and reports the concept behind a miss', () => {
    const question = plan('trait-evidence', 'grade-7', 'evaluation').questions[0];
    const correct = evaluateSimulationAnswer(question, question.correctOptionId);
    expect(correct.correct).toBe(true);
    expect(correct.misconceptionFlag).toBeNull();
    expect(correct.conceptId).toBe(question.conceptId);

    const wrong = question.options.find((option) => option.id !== question.correctOptionId);
    const missed = evaluateSimulationAnswer(question, wrong?.id ?? 'wrong');
    expect(missed.correct).toBe(false);
    expect(missed.misconceptionFlag).toBe(question.conceptId);
  });
});
