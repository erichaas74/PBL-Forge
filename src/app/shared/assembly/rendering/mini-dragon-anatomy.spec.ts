import * as THREE from 'three';
import {
  miniBodySurfaceNormal,
  miniBodySurfacePoint,
  sampleMiniBodyRadius,
} from './mini-dragon-anatomy';

describe('mini dragon anatomy', () => {
  it('samples the torso profile inside its declared range', () => {
    for (const t of [-0.5, -0.2, 0, 0.25, 0.5]) {
      const radius = sampleMiniBodyRadius(t);
      expect(radius).toBeGreaterThan(0);
      expect(radius).toBeLessThanOrEqual(1);
    }
  });

  it('puts a torso surface point on the surface it samples', () => {
    const dimensions = { x: 0.8, y: 0.6, z: 0.5 };
    const point = miniBodySurfacePoint(dimensions, 0, Math.PI);
    // Angle PI is the spine: straight up, at the sampled radius.
    expect(point.x).toBeCloseTo(0, 6);
    expect(point.y).toBeCloseTo((sampleMiniBodyRadius(0) * dimensions.y) / 2, 6);
    expect(point.z).toBeCloseTo(0, 6);
  });

  it('aligns the sampled torso normal away from the hide', () => {
    const normal = miniBodySurfaceNormal({ x: 0.8, y: 0.6, z: 0.5 }, 0, Math.PI);

    expect(normal.x).toBeLessThan(0);
    expect(normal.y).toBeGreaterThan(0.99);
    expect(normal.z).toBeCloseTo(0, 4);
    expect(new THREE.Vector3(normal.x, normal.y, normal.z).length()).toBeCloseTo(1, 6);
  });
});
