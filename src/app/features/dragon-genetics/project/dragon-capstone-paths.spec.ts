import { DRAGON_CAPSTONE_PATHS } from './dragon-capstone-paths';

describe('Dragon Genetics capstone paths', () => {
  it('registers Arena and Show as the two final project outcomes', () => {
    expect(DRAGON_CAPSTONE_PATHS.map((path) => path.id)).toEqual([
      'dragon-arena',
      'mini-dragon-show',
    ]);
    expect(new Set(DRAGON_CAPSTONE_PATHS.flatMap((path) => path.activityIds)).size).toBe(3);
  });

  it('starts the arena path in the Hatchery and finishes in the Arena', () => {
    const arena = DRAGON_CAPSTONE_PATHS.find((path) => path.id === 'dragon-arena');

    expect(arena?.entryActivityId).toBe('dragon-hatchery');
    expect(arena?.finalActivityId).toBe('dragon-arena');
    expect(arena?.outcomeLabel).toBe('Arena trial record');
  });
});
