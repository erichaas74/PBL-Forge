import { evaluateSimulationAnswer, generateSimulationQuestions } from './dragon-question.generator';
import { InstructionLevel, ResolvedSimulationSettings } from './dragon-simulation.models';
import { DRAGON_SIMULATIONS, LEVEL_PROFILES } from './dragon-simulation.registry';

describe('adaptive Dragon Genetics question generation', () => {
  function settings(level: InstructionLevel): ResolvedSimulationSettings {
    return {
      assignmentId: 'test-assignment',
      assignmentVersion: 3,
      ownerId: 'teacher-1',
      level,
      enabled: true,
      questionCount: LEVEL_PROFILES[level].questionCount,
      hintsAllowed: LEVEL_PROFILES[level].hintsAllowed,
    };
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
    const definition = DRAGON_SIMULATIONS.find(({ id }) => id === 'incubator-sampler')!;
    const first = generateSimulationQuestions(
      definition,
      settings('high-school'),
      'student-7:fixed',
    );
    const second = generateSimulationQuestions(
      definition,
      settings('high-school'),
      'student-7:fixed',
    );
    expect(second).toEqual(first);
  });

  it('builds a valid level-specific run for every simulation and all four levels', () => {
    for (const definition of DRAGON_SIMULATIONS) {
      for (const level of Object.keys(LEVEL_PROFILES) as InstructionLevel[]) {
        const profile = LEVEL_PROFILES[level];
        const questions = generateSimulationQuestions(
          definition,
          settings(level),
          `${definition.id}:${level}`,
        );
        expect(questions.length).toBe(profile.questionCount);
        expect(questions.some((question) => question.level === level)).toBeTrue();
        for (const question of questions) {
          expect(
            question.options.some((option) => option.id === question.correctOptionId),
          ).toBeTrue();
          expect(question.prompt.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('varies question order or option order for different student seeds', () => {
    const definition = DRAGON_SIMULATIONS.find(({ id }) => id === 'dragon-hatchery')!;
    const first = generateSimulationQuestions(definition, settings('ap-biology'), 'student-a');
    const second = generateSimulationQuestions(definition, settings('ap-biology'), 'student-b');
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it('evaluates correctness without storing answer logic in the visual renderer', () => {
    const question = generateSimulationQuestions(
      DRAGON_SIMULATIONS[0],
      settings('grade-7'),
      'evaluation',
    )[0];
    const correct = evaluateSimulationAnswer(question, question.correctOptionId);
    const incorrectOption = question.options.find(
      (option) => option.id !== question.correctOptionId,
    );
    expect(correct).toEqual({ correct: true, misconceptionFlag: null });
    expect(evaluateSimulationAnswer(question, incorrectOption?.id ?? 'wrong').correct).toBeFalse();
  });
});
