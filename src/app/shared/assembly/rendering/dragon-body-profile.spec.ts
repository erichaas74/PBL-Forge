import {
  DEFAULT_DRAGON_BODY_STATIONS,
  dragonBodyArchetype,
  dragonBodySurfacePoint,
  sampleDragonBodyBellyDepth,
  sampleDragonBodyCenterY,
  sampleDragonBodyDepthScale,
  sampleDragonBodyHeightScale,
  sampleDragonBodyRadius,
  sampleDragonBodyStationHeight,
  sampleDragonBodyStationWidth,
} from './dragon-body-profile';

describe('dragon body profiles', () => {
  it('keeps body morphotypes measurably distinct at their structural stations', () => {
    expect(sampleDragonBodyRadius(-0.4, 'bulwark'))
      .toBeGreaterThan(sampleDragonBodyRadius(-0.4, 'courser'));
    expect(sampleDragonBodyRadius(0.26, 'courser'))
      .toBeGreaterThan(sampleDragonBodyRadius(-0.08, 'courser'));
    expect(sampleDragonBodyRadius(-0.27, 'prowler'))
      .toBeGreaterThan(sampleDragonBodyRadius(-0.08, 'prowler'));
    expect(sampleDragonBodyDepthScale(0.27, 'bulwark'))
      .toBeGreaterThan(sampleDragonBodyDepthScale(0.27, 'courser') * 1.5);
    expect(sampleDragonBodyHeightScale(0.27, 'courser'))
      .toBeGreaterThan(sampleDragonBodyHeightScale(0.27, 'prowler') * 1.6);
    expect(sampleDragonBodyRadius(0.08, 'serpent'))
      .toBeLessThan(sampleDragonBodyRadius(0.08, 'regal') * 0.7);
    expect(sampleDragonBodyRadius(0.04, 'four-wing'))
      .toBeLessThan(sampleDragonBodyRadius(-0.08, 'four-wing') * 0.75);
  });

  it('uses the same extreme height and width factors for mounted surface points', () => {
    const dimensions = { x: 5, y: 2, z: 2 };
    const station = 0.27;
    const courserSpine = dragonBodySurfacePoint(dimensions, station, Math.PI, 'courser');
    const prowlerSpine = dragonBodySurfacePoint(dimensions, station, Math.PI, 'prowler');
    const bulwarkFlank = dragonBodySurfacePoint(dimensions, station, Math.PI / 2, 'bulwark');
    const courserFlank = dragonBodySurfacePoint(dimensions, station, Math.PI / 2, 'courser');

    expect(courserSpine.y).toBeGreaterThan(prowlerSpine.y * 1.7);
    expect(bulwarkFlank.z).toBeGreaterThan(courserFlank.z * 1.5);
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

  it('layers per-body station refinements over the selected archetype', () => {
    const stations = {
      ...DEFAULT_DRAGON_BODY_STATIONS,
      neckWidth: 0.6,
      chestWidth: 1.5,
      chestHeight: 1.4,
      waistWidth: 0.7,
      bellyDepth: 1.35,
      hipWidth: 1.3,
      spineArch: 0.2,
      tailRootWidth: 0.8,
    };

    expect(sampleDragonBodyStationWidth(0.27, stations)).toBeCloseTo(1.5);
    expect(sampleDragonBodyStationWidth(-0.28, stations)).toBeCloseTo(1.3);
    expect(sampleDragonBodyStationWidth(0.5, stations)).toBeCloseTo(0.6);
    expect(sampleDragonBodyStationHeight(0.27, stations)).toBeCloseTo(1.4);
    expect(sampleDragonBodyBellyDepth(0, stations)).toBeCloseTo(1.35);
    expect(sampleDragonBodyCenterY(0, 'classic', stations)).toBeCloseTo(0.2);
  });

  it('uses station refinements for mounted surface points', () => {
    const dimensions = { x: 4, y: 1, z: 1 };
    const wide = { ...DEFAULT_DRAGON_BODY_STATIONS, chestWidth: 1.6 };
    const defaultFlank = dragonBodySurfacePoint(dimensions, 0.27, Math.PI / 2, 'regal');
    const wideFlank = dragonBodySurfacePoint(dimensions, 0.27, Math.PI / 2, 'regal', wide);

    expect(wideFlank.z).toBeCloseTo(defaultFlank.z * 1.6);
  });

  it('falls back to the classic profile for unknown imported values', () => {
    expect(dragonBodyArchetype('not-a-body')).toBe('classic');
    expect(sampleDragonBodyRadius(0.1, 'not-a-body'))
      .toBe(sampleDragonBodyRadius(0.1, 'classic'));
  });
});
