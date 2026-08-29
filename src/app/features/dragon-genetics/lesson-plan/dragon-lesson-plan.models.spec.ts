import { DEFAULT_DRAGON_LESSON_PLAN, normalizeDragonLessonPlan } from './dragon-lesson-plan.models';

describe('Dragon lesson plan document', () => {
  it('starts with two contexts and the published core lesson order', () => {
    expect(
      DEFAULT_DRAGON_LESSON_PLAN.lessons
        .filter((lesson) => !lesson.optional)
        .map((lesson) => lesson.id),
    ).toEqual([
      'meet-the-dragons',
      'breeding-and-offspring',
      'where-genes-live',
      'alleles-and-phenotypes',
      'meiosis-and-dragon-eggs',
    ]);
    expect(Object.keys(DEFAULT_DRAGON_LESSON_PLAN.paths)).toEqual(['arena', 'mini-show']);
  });

  it('keeps every pedigree lesson outside the numbered path', () => {
    const pedigreeLessons = DEFAULT_DRAGON_LESSON_PLAN.lessons.filter((lesson) =>
      lesson.id.startsWith('pedigree-'),
    );
    expect(pedigreeLessons.map((lesson) => lesson.id)).toEqual([
      'pedigree-reading',
      'pedigree-models',
      'pedigree-chromosome',
    ]);
    expect(pedigreeLessons.every((lesson) => lesson.optional)).toBe(true);
    expect(pedigreeLessons.every((lesson) => lesson.anchorLessonId === 'meiosis-and-dragon-eggs')).toBe(
      true,
    );
  });

  it('ships the advanced pedigree lesson as an extra lesson a teacher has to open', () => {
    const extra = DEFAULT_DRAGON_LESSON_PLAN.lessons.find(
      (lesson) => lesson.id === 'pedigree-chromosome',
    );
    expect(extra?.optional).toBe(true);
    expect(extra?.published).toBe(false);
    expect(extra?.anchorLessonId).toBe('meiosis-and-dragon-eggs');
  });

  it('keeps the investigation a pedigree lesson launches', () => {
    const document = normalizeDragonLessonPlan(DEFAULT_DRAGON_LESSON_PLAN);
    const lesson = document.lessons.find((candidate) => candidate.id === 'pedigree-chromosome');
    expect(lesson?.workstations[0].launchParams).toEqual({ investigation: 'duskmere-eye' });
  });

  it('drops launch parameters that are not strings', () => {
    const document = normalizeDragonLessonPlan({
      ...DEFAULT_DRAGON_LESSON_PLAN,
      lessons: [{
        id: 'pedigree',
        title: 'Pedigree',
        published: true,
        workstations: [{
          id: 'pedigree-lab',
          title: 'Pedigree Lab',
          route: '/dragon-genetics/pedigree-lab',
          launchParams: { investigation: 7 },
        }],
      }],
    });
    expect(document.lessons[0].workstations[0].launchParams).toBeUndefined();
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
