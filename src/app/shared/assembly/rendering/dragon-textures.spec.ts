import { dragonPartSeed } from './dragon-textures';

describe('dragon part seed', () => {
  it('is stable for an id and differs between ids', () => {
    expect(dragonPartSeed('left-wing')).toBe(dragonPartSeed('left-wing'));
    expect(dragonPartSeed('left-wing')).not.toBe(dragonPartSeed('right-wing'));
  });

  it('stays inside the unit range, so it can be used directly as a UV offset', () => {
    for (const id of ['body', 'dragon-leg', 'tail-club', '', 'x']) {
      expect(dragonPartSeed(id)).toBeGreaterThanOrEqual(0);
      expect(dragonPartSeed(id)).toBeLessThan(1);
    }
  });
});
