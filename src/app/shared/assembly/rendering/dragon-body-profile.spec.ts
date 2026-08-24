import {
  dragonBodyArchetype,
  dragonBodySurfacePoint,
  sampleDragonBodyCenterY,
  sampleDragonBodyRadius,
} from './dragon-body-profile';

describe('dragon body profiles', () => {
  it('keeps body morphotypes measurably distinct at their structural stations', () => {
    expect(sampleDragonBodyRadius(-0.4, 'bulwark'))
      .toBeGreaterThan(sampleDragonBodyRadius(-0.4, 'courser'));
    expect(sampleDragonBodyRadius(0.26, 'courser'))
      .toBeGreaterThan(sampleDragonBodyRadius(-0.08, 'courser'));
    expect(sampleDragonBodyRadius(-0.27, 'prowler'))
      .toBeGreaterThan(sampleDragonBodyRadius(-0.08, 'prowler'));
  });

  it('uses the serpent centerline for the mesh and for mounted surface points', () => {
    const dimensions = { x: 5.1, y: 0.74, z: 1.02 };
    const axialFraction = -0.36;
    const seat = dragonBodySurfacePoint(
      dimensions,
      axialFraction,
      Math.PI / 2,
      'serpent',
    );

    expect(sampleDragonBodyCenterY(axialFraction, 'serpent')).toBeGreaterThan(0);
    expect(seat.y).toBeCloseTo(
      sampleDragonBodyCenterY(axialFraction, 'serpent') * dimensions.y,
      6,
    );
  });

  it('falls back to the classic profile for unknown imported values', () => {
    expect(dragonBodyArchetype('not-a-body')).toBe('classic');
    expect(sampleDragonBodyRadius(0.1, 'not-a-body'))
      .toBe(sampleDragonBodyRadius(0.1, 'classic'));
  });
});
