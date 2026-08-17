import { founderToCompanion } from './companion-show.domain';
import {
  MINI_SHOW_DIVISIONS,
  MINI_TRAINING_LEVEL_MAX,
  MINI_TRAINING_SKILLS,
  judgeMiniDragon,
  miniTrainingLevels,
  showRunFromJudgement,
} from './mini-dragon.show';
import { MINI_DRAGON_GENES, isMiniPhenotypeFormId } from './mini-dragon.genetics';

describe('mini dragon 50/50 show judging', () => {
  const dragon = founderToCompanion('mini-pepper')!;
  const division = MINI_SHOW_DIVISIONS[0]!;

  it('publishes valid phenotype combinations from the genetics catalog', () => {
    for (const showDivision of MINI_SHOW_DIVISIONS) {
      expect(showDivision.targets.length).toBe(4);
      for (const target of showDivision.targets) {
        expect(MINI_DRAGON_GENES.some((gene) => gene.id === target.geneId)).toBe(true);
        expect(isMiniPhenotypeFormId(target.geneId, target.formId)).toBe(true);
      }
    }
  });

  it('caps inherited evidence at 50 points and untrained skill at zero', () => {
    const judgement = judgeMiniDragon(dragon.genome, division, miniTrainingLevels(dragon.id, []));

    expect(judgement.geneticScore).toBeGreaterThanOrEqual(0);
    expect(judgement.geneticScore).toBeLessThanOrEqual(50);
    expect(judgement.trainingScore).toBe(0);
    expect(judgement.combinedScore).toBe(judgement.geneticScore);
  });

  it('derives exactly 50 trained points from four ring-ready skills', () => {
    const sessions = MINI_TRAINING_SKILLS.flatMap((skill) =>
      Array.from({ length: MINI_TRAINING_LEVEL_MAX }, (_, index) => ({
        id: `${dragon.id}:${skill.id}:${index + 1}`,
        dragonId: dragon.id,
        skillId: skill.id,
        practicedAtIso: `2026-08-16T00:00:0${index}.000Z`,
      })),
    );
    const levels = miniTrainingLevels(dragon.id, sessions);
    const judgement = judgeMiniDragon(dragon.genome, division, levels);

    expect(judgement.trainingScore).toBe(50);
    expect(judgement.combinedScore).toBe(judgement.geneticScore + 50);
  });

  it('freezes both halves of a judged run without storing a second genome', () => {
    const judgement = judgeMiniDragon(dragon.genome, division, miniTrainingLevels(dragon.id, []));
    const run = showRunFromJudgement('show-1', dragon.id, judgement, '2026-08-16T01:00:00.000Z');

    expect(run.geneticScore).toBe(judgement.geneticScore);
    expect(run.trainingScore).toBe(judgement.trainingScore);
    expect(JSON.stringify(run)).not.toContain('genome');
  });
});
