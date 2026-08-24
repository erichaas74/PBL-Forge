import { mysteryPairInvestigation } from './mystery-pair.content';

describe('Mystery Pair Lesson 1 content', () => {
  it.each(['arena', 'mini-show'] as const)(
    'provides two contrasting specimens and open comparisons for %s',
    (pathId) => {
      const investigation = mysteryPairInvestigation(pathId);
      expect(investigation.specimens).toHaveLength(2);
      expect(investigation.comparisons.length).toBeGreaterThanOrEqual(4);
      expect(
        investigation.comparisons.every(
          (comparison) => comparison.firstResult !== comparison.secondResult,
        ),
      ).toBe(true);
      expect(investigation.comparisons.some((comparison) => comparison.kind === 'behavior')).toBe(
        true,
      );
    },
  );

  it('uses the same investigation structure with path-specific specimens', () => {
    const arena = mysteryPairInvestigation('arena');
    const show = mysteryPairInvestigation('mini-show');
    expect(arena.comparisons).toHaveLength(show.comparisons.length);
    expect(arena.specimens.map((specimen) => specimen.id)).not.toEqual(
      show.specimens.map((specimen) => specimen.id),
    );
  });
});
