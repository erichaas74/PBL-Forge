import { dragonHeadSection, dragonHeadStations } from './dragon-head-sections';
import {
  DEFAULT_HEAD_SHAPE,
  HEAD_SHAPES,
  HEAD_SHAPE_BY_PROFILE,
  dragonHeadExtent,
  headShapeFor,
  headShapeForProfile,
} from './dragon-head-shape';
import { SNOUT } from './dragon-head-profile.spec-helpers';

describe('head shape from traits', () => {
  /**
   * The point of the module. The phenotype builder scales a head's dimensions
   * per locus and hands the factory nothing else, so the aspect ratio *is* the
   * genome's message. A longer skull has to become a different animal, not a
   * stretched copy of the same one.
   */
  it('turns an elongated head serpentine and a compressed one brutish', () => {
    const long = headShapeFor({ x: 1.2, y: 0.4, z: 0.4 });
    const short = headShapeFor({ x: 0.4, y: 0.5, z: 0.4 });

    expect(long.muzzleDepth).toBeLessThan(short.muzzleDepth);
    expect(long.muzzleWidth).toBeLessThan(short.muzzleWidth);
    expect(long.muzzleDrop).toBeGreaterThan(short.muzzleDrop);
    expect(long.browRidge).toBeLessThan(short.browRidge);
  });

  it('leaves a head at the drawn proportions alone', () => {
    const neutral = headShapeFor({ x: 1.4, y: 1, z: 1 });

    expect(neutral.muzzleDepth).toBeCloseTo(DEFAULT_HEAD_SHAPE.muzzleDepth, 6);
    expect(neutral.browRidge).toBeCloseTo(DEFAULT_HEAD_SHAPE.browRidge, 6);
  });

  it('produces a visibly different silhouette, not just different numbers', () => {
    const dims = { x: 0.6, y: 0.4, z: 0.4 };
    const stretched = { x: 1.2, y: 0.4, z: 0.4 };

    const compact = dragonHeadSection(dims, 0.42, headShapeFor(dims));
    const long = dragonHeadSection(stretched, 0.42, headShapeFor(stretched));

    // Same part height, so the muzzle depths are directly comparable.
    expect(long.halfHeight).toBeLessThan(compact.halfHeight * 0.85);
  });

  it('clamps an extreme genome rather than inverting the skull', () => {
    for (const dims of [
      { x: 50, y: 0.1, z: 0.1 },
      { x: 0.01, y: 5, z: 5 },
    ]) {
      const shape = headShapeFor(dims);

      expect(shape.muzzleDepth).toBeGreaterThan(0);
      expect(shape.muzzleWidth).toBeGreaterThan(0);
      expect(shape.cranium).toBeGreaterThan(0);
    }
  });

  it('never sends a station negative, which would turn the loft inside out', () => {
    for (const dims of [
      { x: 50, y: 0.1, z: 0.1 },
      { x: 0.01, y: 5, z: 5 },
    ]) {
      for (const base of Object.values(HEAD_SHAPES)) {
        for (const station of dragonHeadStations(headShapeFor(dims, base))) {
          expect(station.height).toBeGreaterThan(0);
          expect(station.width).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('head part extent', () => {
  /**
   * `dimensions` means different things per shape. The horned head is a sphere,
   * so its `x` is a radius — read as a box width it would loft a skull at half
   * size, with every socket on it landing inside the bone.
   */
  it('doubles a sphere head, since its dimensions are radii', () => {
    expect(dragonHeadExtent({ x: 0.42, y: 0.42, z: 0.42 }, 'sphere')).toEqual({
      x: 0.84,
      y: 0.84,
      z: 0.84,
    });
  });

  it('passes a box head through unchanged', () => {
    expect(dragonHeadExtent(SNOUT, 'box')).toEqual(SNOUT);
  });

  it('keeps a non-uniform genome visible on a sphere head', () => {
    const stretched = dragonHeadExtent({ x: 0.6, y: 0.42, z: 0.42 }, 'sphere');

    expect(stretched.x).toBeGreaterThan(stretched.y);
  });
});

describe('head variant table', () => {
  /**
   * The mesh factory and the part definitions both resolve a head's character
   * here. Split in two they drift, and a drifted hinge is precisely the bug
   * this module removes.
   */
  it('covers every head profile the factory builds', () => {
    expect(Object.keys(HEAD_SHAPE_BY_PROFILE).sort()).toEqual(['dragon-head-horned']);
  });

  it('falls back to the default for an unknown profile', () => {
    expect(headShapeForProfile('nonsense', { x: 1.4, y: 1, z: 1 }).browRidge).toBeCloseTo(
      DEFAULT_HEAD_SHAPE.browRidge,
      6,
    );
  });

  /**
   * One variant is left; the serpentine and brute skulls went with their
   * profiles. This keeps the table honest as new phenotypes are added back:
   * every profile in it has to loft a skull of its own.
   */
  it('gives every variant in the table a skull of its own', () => {
    const dims = { x: 0.7, y: 0.5, z: 0.45 };
    const profileIds = Object.keys(HEAD_SHAPE_BY_PROFILE);
    const depths = profileIds.map(
      (profileId) => dragonHeadSection(dims, 0.42, headShapeForProfile(profileId, dims)).halfHeight,
    );

    expect(new Set(depths.map((depth) => depth.toFixed(4))).size).toBe(profileIds.length);
  });
});
