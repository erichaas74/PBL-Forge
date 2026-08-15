import { Vector3Data } from '../domain/assembly.models';
import {
  DEFAULT_HEAD_SHAPE,
  HEAD_SHAPES,
  HEAD_SHAPE_BY_PROFILE,
  dragonHeadExtent,
  dragonHeadEyeSocket,
  dragonHeadJawMount,
  dragonHeadHornMount,
  dragonHeadJawMountFor,
  dragonHeadNostril,
  dragonHeadSection,
  dragonHeadStations,
  dragonHeadSurfacePoint,
  headShapeFor,
  headShapeForProfile,
} from './dragon-head-profile';

const HORNED: Vector3Data = { x: 0.84, y: 0.84, z: 0.84 };
const SNOUT: Vector3Data = { x: 0.68, y: 0.38, z: 0.34 };

/** Widest and tallest the silhouette gets, as fractions of the half extents. */
function envelope(shape = DEFAULT_HEAD_SHAPE): { height: number; width: number } {
  let height = 0;
  let width = 0;
  for (const station of dragonHeadStations(shape)) {
    height = Math.max(height, Math.abs(station.drop) + station.height);
    width = Math.max(width, station.width);
  }
  return { height, width };
}

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
    for (const dims of [{ x: 3, y: 0.4, z: 0.4 }, { x: 0.3, y: 1, z: 0.6 }]) {
      for (const base of Object.values(HEAD_SHAPES)) {
        const { height, width } = envelope(headShapeFor(dims, base));

        expect(height).toBeLessThanOrEqual(1.0001);
        expect(width).toBeLessThanOrEqual(1.0001);
      }
    }
  });

  it('pinches at the orbit, so the skull is not a plain cone', () => {
    const stations = dragonHeadStations();
    const brow = stations.find(station => station.at === -0.14)!;
    const orbit = stations.find(station => station.at === 0.04)!;

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
    expect(dragonHeadSection(SNOUT, -2).halfHeight).toBeCloseTo(dragonHeadSection(SNOUT, -0.5).halfHeight, 6);
    expect(dragonHeadSection(SNOUT, 2).halfHeight).toBeCloseTo(dragonHeadSection(SNOUT, 0.5).halfHeight, 6);
  });
});

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
    for (const dims of [{ x: 50, y: 0.1, z: 0.1 }, { x: 0.01, y: 5, z: 5 }]) {
      const shape = headShapeFor(dims);

      expect(shape.muzzleDepth).toBeGreaterThan(0);
      expect(shape.muzzleWidth).toBeGreaterThan(0);
      expect(shape.cranium).toBeGreaterThan(0);
    }
  });

  it('never sends a station negative, which would turn the loft inside out', () => {
    for (const dims of [{ x: 50, y: 0.1, z: 0.1 }, { x: 0.01, y: 5, z: 5 }]) {
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
    expect(dragonHeadExtent({ x: 0.42, y: 0.42, z: 0.42 }, 'sphere'))
      .toEqual({ x: 0.84, y: 0.84, z: 0.84 });
  });

  it('passes a box head through unchanged', () => {
    expect(dragonHeadExtent(SNOUT, 'box')).toEqual(SNOUT);
  });

  it('keeps a non-uniform genome visible on a sphere head', () => {
    const stretched = dragonHeadExtent({ x: 0.6, y: 0.42, z: 0.42 }, 'sphere');

    expect(stretched.x).toBeGreaterThan(stretched.y);
  });
});

describe('head anchors', () => {
  /**
   * The reason this module exists, and the same failure the body and wing
   * profiles were written to fix. The jaw socket used to be a flat
   * `{ x, -0.08, 0 }` authored against the bounding box; on a head whose muzzle
   * drops it sat above the skull, and the jaw hung in mid-air.
   */
  it('puts the jaw hinge on the muzzle top, not on the bounding box', () => {
    const shape = headShapeFor(SNOUT);
    const mount = dragonHeadJawMount(SNOUT, shape);
    const section = dragonHeadSection(SNOUT, 0.34, shape);

    // Exactly the top of the muzzle at the meeting station: the jaw seats its
    // own top-back edge here, so the two surfaces finish level. Read from the
    // profile, so it still sits below the bounding box on a drooping muzzle.
    expect(mount.y).toBeCloseTo(section.centerY + section.halfHeight, 10);
    expect(Math.abs(mount.y)).toBeLessThanOrEqual(SNOUT.y / 2);
  });

  it('carries the jaw forward when a genome lengthens the skull', () => {
    const short = dragonHeadJawMountFor('dragon-head-horned', { x: 0.5, y: 0.38, z: 0.34 }, 'box');
    const long = dragonHeadJawMountFor('dragon-head-horned', { x: 0.9, y: 0.38, z: 0.34 }, 'box');

    expect(long.x).toBeGreaterThan(short.x);
  });

  it('resolves the sphere convention for the horned head', () => {
    const mount = dragonHeadJawMountFor('dragon-head-horned', { x: 0.42, y: 0.42, z: 0.42 }, 'sphere');

    // Inside the sphere's ±0.42 extent, and forward of centre.
    expect(mount.x).toBeGreaterThan(0);
    expect(mount.x).toBeLessThan(0.42);
    expect(Math.abs(mount.y)).toBeLessThan(0.42);
  });

  it('sets the eyes into the skull rather than gluing them to the surface', () => {
    for (const side of [-1, 1] as const) {
      const shape = headShapeFor(HORNED);
      const eye = dragonHeadEyeSocket(HORNED, side, shape);
      const surface = dragonHeadSurfacePoint(HORNED, shape.eyeAxial, side * 1.15, shape);

      expect(Math.abs(eye.z)).toBeLessThan(Math.abs(surface.z));
      expect(Math.sign(eye.z)).toBe(side);
    }
  });

  it('roots the horns above the ear, between the eye and the braincase', () => {
    const shape = headShapeFor(HORNED);
    const eye = dragonHeadEyeSocket(HORNED, 1, shape);

    for (const side of [-1, 1] as const) {
      const mount = dragonHeadHornMount(HORNED, side, shape);

      // Behind the eye, which is where an ear opening sits, and well forward of
      // the occiput at -0.5 — the old -0.22 mount grew them off the back of the
      // skull, where a horn can only sweep away from the animal.
      expect(mount.x).withContext(`${side}`).toBeLessThan(eye.x);
      expect(mount.x).withContext(`${side}`).toBeGreaterThan(-HORNED.x * 0.18);
      // On the roof of the skull, not out on the cheek.
      expect(mount.y).withContext(`${side}`).toBeGreaterThan(0);
      expect(Math.abs(mount.z)).withContext(`${side}`).toBeLessThan(HORNED.z / 2);
      expect(Math.sign(mount.z)).withContext(`${side}`).toBe(side);
    }
  });

  it('mirrors every anchor across the centre line', () => {
    const shape = headShapeFor(SNOUT);
    const left = dragonHeadNostril(SNOUT, -1, shape);
    const right = dragonHeadNostril(SNOUT, 1, shape);

    expect(left.x).toBeCloseTo(right.x, 6);
    expect(left.y).toBeCloseTo(right.y, 6);
    expect(left.z).toBeCloseTo(-right.z, 6);
  });

  it('keeps anchors on the skull surface', () => {
    const shape = headShapeFor(SNOUT);
    const anchors = [
      dragonHeadNostril(SNOUT, 1, shape),
      dragonHeadHornMount(SNOUT, 1, shape),
    ];
    for (const anchor of anchors) {
      const section = dragonHeadSection(SNOUT, anchor.x / SNOUT.x, shape);
      const offsetY = (anchor.y - section.centerY) / section.halfHeight;
      const offsetZ = anchor.z / section.halfWidth;

      expect(Math.hypot(offsetY, offsetZ)).toBeCloseTo(1, 5);
    }
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
    expect(headShapeForProfile('nonsense', { x: 1.4, y: 1, z: 1 }).browRidge)
      .toBeCloseTo(DEFAULT_HEAD_SHAPE.browRidge, 6);
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
      profileId => dragonHeadSection(dims, 0.42, headShapeForProfile(profileId, dims)).halfHeight,
    );

    expect(new Set(depths.map(depth => depth.toFixed(4))).size).toBe(profileIds.length);
  });
});
