import { dragonHeadSection, dragonHeadStations } from './dragon-head-sections';
import { HEAD_SHAPES, headShapeFor } from './dragon-head-shape';
import { SNOUT, headEnvelope as envelope } from './dragon-head-profile.spec-helpers';

describe('dragon head silhouette', () => {
  /**
   * The repo's standing rule for every procedural part: collision stays on the
   * primitive, and the mesh hugs that volume. Shape parameters stack — a
   * brute's brow rides a bulged cranium — so without a fit pass the armoured
   * skull renders a third larger than the box it collides with.
   */
  it('keeps every variant inside the physics volume', () => {
    for (const shape of Object.values(HEAD_SHAPES)) {
      const { height, width } = envelope(shape);

      expect(height).toBeLessThanOrEqual(1.0001);
      expect(width).toBeLessThanOrEqual(1.0001);
    }
  });

  it('keeps trait-adjusted skulls inside it too, at both extremes', () => {
    for (const dims of [
      { x: 3, y: 0.4, z: 0.4 },
      { x: 0.3, y: 1, z: 0.6 },
    ]) {
      for (const base of Object.values(HEAD_SHAPES)) {
        const { height, width } = envelope(headShapeFor(dims, base));

        expect(height).toBeLessThanOrEqual(1.0001);
        expect(width).toBeLessThanOrEqual(1.0001);
      }
    }
  });

  it('pinches at the orbit, so the skull is not a plain cone', () => {
    const stations = dragonHeadStations();
    const brow = stations.find((station) => station.at === -0.14)!;
    const orbit = stations.find((station) => station.at === 0.04)!;

    expect(orbit.height).toBeLessThan(brow.height);
  });

  it('drops the muzzle below the cranium axis', () => {
    const cranium = dragonHeadSection(SNOUT, -0.3);
    const nose = dragonHeadSection(SNOUT, 0.5);

    expect(nose.centerY).toBeLessThan(cranium.centerY);
  });

  it('varies its cross-section aspect ratio, which a lathe could not', () => {
    const braincase = dragonHeadSection(SNOUT, -0.32);
    const muzzle = dragonHeadSection(SNOUT, 0.42);

    const braincaseRatio = braincase.halfHeight / braincase.halfWidth;
    const muzzleRatio = muzzle.halfHeight / muzzle.halfWidth;
    expect(Math.abs(braincaseRatio - muzzleRatio)).toBeGreaterThan(0.05);
  });

  it('interpolates smoothly, so the loft does not crease at a station', () => {
    let previous = dragonHeadSection(SNOUT, -0.5).halfHeight;
    let maxStep = 0;
    for (let index = 1; index <= 100; index += 1) {
      const height = dragonHeadSection(SNOUT, -0.5 + index / 100).halfHeight;
      maxStep = Math.max(maxStep, Math.abs(height - previous));
      previous = height;
    }

    expect(maxStep).toBeLessThan(SNOUT.y * 0.05);
  });

  it('clamps outside the axial range instead of extrapolating', () => {
    expect(dragonHeadSection(SNOUT, -2).halfHeight).toBeCloseTo(
      dragonHeadSection(SNOUT, -0.5).halfHeight,
      6,
    );
    expect(dragonHeadSection(SNOUT, 2).halfHeight).toBeCloseTo(
      dragonHeadSection(SNOUT, 0.5).halfHeight,
      6,
    );
  });
});
