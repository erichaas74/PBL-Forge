import {
  DEFAULT_DRAGON_CLASS_JOURNEY_PLAN,
  DRAGON_JOURNEY_PATHS,
  DRAGON_LESSONS,
  DRAGON_STARTER_PAIR_PRESETS,
  assertValidDragonJourneyRegistry,
  normalizeDragonClassJourneyPlan,
} from './dragon-journey.registry';

describe('Dragon journey registry', () => {
  it('defines Arena and Show as the two opening paths', () => {
    expect(DRAGON_JOURNEY_PATHS.map((path) => path.id)).toEqual([
      'dragon-arena',
      'mini-dragon-show',
    ]);
    expect(() => assertValidDragonJourneyRegistry()).not.toThrow();
  });

  it('gives each path one female and one male starter', () => {
    for (const path of DRAGON_JOURNEY_PATHS) {
      const preset = DRAGON_STARTER_PAIR_PRESETS.find(
        (candidate) => candidate.id === path.starterPairPresetId,
      );
      expect(preset?.starters.map((starter) => starter.sex)).toEqual(['female', 'male']);
    }
  });

  it('allows one workstation to support several lessons', () => {
    const showVisits = DRAGON_LESSONS.filter((lesson) => lesson.pathId === 'mini-dragon-show')
      .flatMap((lesson) => lesson.workstationVisits)
      .map((visit) => visit.activityId);
    expect(showVisits.filter((id) => id === 'companion-show').length).toBeGreaterThan(1);
  });

  it('normalizes unsafe class settings and preserves the capstone', () => {
    const normalized = normalizeDragonClassJourneyPlan({
      schemaVersion: 1,
      selectionMode: 'teacher-assigned',
      offeredPathIds: ['mini-dragon-show', 'unknown'],
      defaultPathId: 'unknown',
      pathSettings: {
        'mini-dragon-show': {
          lessonIds: ['show-write-standard', 'unknown'],
          requiredLessonIds: ['show-write-standard', 'unknown'],
          starterPairPresetId: 'classic-ember-tide',
          requirementOverrides: { 'show-standard-targets': { minimum: 3 } },
        },
      },
      sideQuestActivityIds: ['pedigree-lab', 'unknown'],
    });

    expect(normalized.offeredPathIds).toEqual(['mini-dragon-show']);
    expect(normalized.defaultPathId).toBe('mini-dragon-show');
    expect(normalized.pathSettings['mini-dragon-show'].lessonIds).toEqual([
      'show-write-standard',
      'show-capstone',
    ]);
    expect(normalized.pathSettings['mini-dragon-show'].starterPairPresetId).toBe(
      DEFAULT_DRAGON_CLASS_JOURNEY_PLAN.pathSettings['mini-dragon-show'].starterPairPresetId,
    );
    expect(normalized.sideQuestActivityIds).toEqual(['pedigree-lab']);
  });
});
