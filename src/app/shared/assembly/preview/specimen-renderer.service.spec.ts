import * as THREE from 'three';
import {
  createFireBreathEffect,
  projectSpecimenFrame,
} from './specimen-renderer.service';
import { SpecimenFrame } from './specimen-pose';

describe('specimen camera projection', () => {
  const longFrame: SpecimenFrame = {
    center: { x: 0, y: 0, z: 0 },
    halfExtents: { x: 6, y: 1, z: 1.5 },
    radius: Math.hypot(6, 1.5),
    halfHeight: 1,
  };

  it('fits an end-on dragon from its visible width, not its nose-to-tail length', () => {
    const side = projectSpecimenFrame(longFrame, { x: 0, y: 0, z: 1 });
    const end = projectSpecimenFrame(longFrame, { x: 1, y: 0, z: 0 });

    expect(side.halfWidth).toBeCloseTo(6, 5);
    expect(end.halfWidth).toBeCloseTo(1.5, 5);
    expect(end.halfWidth).toBeLessThan(side.halfWidth / 3);
  });

  it('includes depth in screen height when the camera is elevated', () => {
    const level = projectSpecimenFrame(longFrame, { x: 1, y: 0, z: 0 });
    const elevated = projectSpecimenFrame(longFrame, { x: 1, y: 1, z: 0 });

    expect(elevated.halfHeight).toBeGreaterThan(level.halfHeight);
  });

  it('does not fit an empty diagonal corner no actual part occupies', () => {
    const sparse: SpecimenFrame = {
      ...longFrame,
      halfExtents: { x: 6, y: 3, z: 1.5 },
      points: [
        { x: -6, y: -1, z: -1.5 },
        { x: -6, y: 1, z: 1.5 },
        { x: 2, y: -1, z: -1.5 },
        { x: 2, y: 1, z: 1.5 },
        { x: 0, y: 3, z: -1.5 },
        { x: 0, y: 3, z: 1.5 },
      ],
    };
    const exact = projectSpecimenFrame(sparse, { x: 1, y: 0.45, z: 0 });
    const boxed = projectSpecimenFrame({ ...sparse, points: undefined }, { x: 1, y: 0.45, z: 0 });

    expect(exact.halfHeight).toBeLessThan(boxed.halfHeight);
  });
});

describe('specimen fire breath', () => {
  it('uses layered tapered plumes instead of a flat-ended cone', () => {
    const effect = createFireBreathEffect(4, 1);
    const flames = effect.children.filter(child => child instanceof THREE.Mesh) as THREE.Mesh[];

    expect(flames.length).toBe(3);
    expect(flames.every(flame => flame.geometry.type === 'BufferGeometry')).toBe(true);

    const outerBounds = new THREE.Box3().setFromObject(flames[0]);
    expect(outerBounds.min.y).toBeCloseTo(0, 5);
    expect(outerBounds.max.y).toBeCloseTo(4, 5);
  });
});
