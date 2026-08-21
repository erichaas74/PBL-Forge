import {
  dragonHeadEyeSocket,
  dragonHeadHornMount,
  dragonHeadJawMount,
  dragonHeadJawMountFor,
  dragonHeadNostril,
} from './dragon-head-landmarks';
import { dragonHeadSection, dragonHeadSurfacePoint } from './dragon-head-sections';
import { headShapeFor } from './dragon-head-shape';
import { HORNED, SNOUT } from './dragon-head-profile.spec-helpers';

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
    const mount = dragonHeadJawMountFor(
      'dragon-head-horned',
      { x: 0.42, y: 0.42, z: 0.42 },
      'sphere',
    );

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
      expect(mount.x, `${side}`).toBeLessThan(eye.x);
      expect(mount.x, `${side}`).toBeGreaterThan(-HORNED.x * 0.18);
      // On the roof of the skull, not out on the cheek.
      expect(mount.y, `${side}`).toBeGreaterThan(0);
      expect(Math.abs(mount.z), `${side}`).toBeLessThan(HORNED.z / 2);
      expect(Math.sign(mount.z), `${side}`).toBe(side);
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
    const anchors = [dragonHeadNostril(SNOUT, 1, shape), dragonHeadHornMount(SNOUT, 1, shape)];
    for (const anchor of anchors) {
      const section = dragonHeadSection(SNOUT, anchor.x / SNOUT.x, shape);
      const offsetY = (anchor.y - section.centerY) / section.halfHeight;
      const offsetZ = anchor.z / section.halfWidth;

      expect(Math.hypot(offsetY, offsetZ)).toBeCloseTo(1, 5);
    }
  });
});
