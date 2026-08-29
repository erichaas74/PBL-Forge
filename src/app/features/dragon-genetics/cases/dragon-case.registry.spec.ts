import { DEFAULT_DRAGON_LESSON_PLAN } from '../lesson-plan/dragon-lesson-plan.models';
import { DRAGON_CASE_BY_ID } from './dragon-case.registry';
import { DragonCaseSettingsRepository } from './dragon-case-settings.repository';

describe('Dragon case registry', () => {
  beforeEach(() => localStorage.clear());

  it('attaches Rockfall to an existing lesson without adding it to lesson order', () => {
    const definition = DRAGON_CASE_BY_ID['dragon-in-the-ash'];

    expect(
      DEFAULT_DRAGON_LESSON_PLAN.lessons.some(
        (lesson) => lesson.id === definition.anchorLessonId,
      ),
    ).toBe(true);
    expect(
      DEFAULT_DRAGON_LESSON_PLAN.lessons.some((lesson) => lesson.id === definition.id),
    ).toBe(false);
  });

  it('attaches the Wasting Clutch after Rockfall in the same optional branch area', () => {
    const definition = DRAGON_CASE_BY_ID['food-that-steals-fire'];

    expect(definition.anchorLessonId).toBe('alleles-and-phenotypes');
    expect(definition.workstation.id).toBe('protein-rescue');
    expect(
      DEFAULT_DRAGON_LESSON_PLAN.lessons.some((lesson) => lesson.id === definition.id),
    ).toBe(false);
  });

  it('lets the teacher disable and restore the optional branch independently', () => {
    const settings = new DragonCaseSettingsRepository();

    expect(settings.isEnabled('dragon-in-the-ash')).toBe(true);
    settings.setEnabled('dragon-in-the-ash', false);
    expect(new DragonCaseSettingsRepository().isEnabled('dragon-in-the-ash')).toBe(false);
    settings.setEnabled('dragon-in-the-ash', true);
    expect(new DragonCaseSettingsRepository().isEnabled('dragon-in-the-ash')).toBe(true);
    expect(new DragonCaseSettingsRepository().isEnabled('food-that-steals-fire')).toBe(true);
  });

  it('persists a teacher decision for the second branch', () => {
    const settings = new DragonCaseSettingsRepository();

    settings.setEnabled('food-that-steals-fire', false);
    expect(new DragonCaseSettingsRepository().isEnabled('food-that-steals-fire')).toBe(false);
  });
});
