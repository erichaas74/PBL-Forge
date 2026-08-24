import { DEFAULT_DRAGON_LESSON_PLAN, normalizeDragonLessonPlan } from './dragon-lesson-plan.models';

describe('Dragon lesson plan document', () => {
  it('starts with two contexts and the first five shared lessons', () => {
    expect(DEFAULT_DRAGON_LESSON_PLAN.lessons.map((lesson) => lesson.id)).toEqual([
      'meet-the-dragons',
      'breeding-and-offspring',
      'where-genes-live',
      'alleles-and-phenotypes',
      'meiosis-and-dragon-eggs',
    ]);
    expect(Object.keys(DEFAULT_DRAGON_LESSON_PLAN.paths)).toEqual(['arena', 'mini-show']);
  });

  it('normalizes one shared lesson list without duplicating it per path', () => {
    const document = normalizeDragonLessonPlan({
      ...DEFAULT_DRAGON_LESSON_PLAN,
      lessons: [{ id: 'genes', title: 'Genes', published: true }],
    });
    expect(document.lessons.map((lesson) => lesson.id)).toEqual(['genes']);
    expect(document.paths.arena.goal).toContain('fighting dragon');
    expect(document.paths['mini-show'].goal).toContain('show dragon');
  });

  it('preserves a saved link to the real allele workbench', () => {
    const document = normalizeDragonLessonPlan({
      ...DEFAULT_DRAGON_LESSON_PLAN,
      lessons: [{
        id: 'alleles',
        title: 'Alleles',
        published: true,
        workstations: [{
          id: 'allele-workbench',
          title: 'Allele Workbench',
          route: '/dragon-genetics/allele-workbench',
        }],
      }],
    });

    expect(document.lessons[0].workstations[0].route).toBe(
      '/dragon-genetics/allele-workbench',
    );
  });
});
