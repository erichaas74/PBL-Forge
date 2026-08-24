import * as THREE from 'three';
import { createMiniLoftGeometry } from './mini-dragon-geometry';

describe('mini dragon loft geometry', () => {
  it('winds the side wall outward for front-side coat materials', () => {
    const geometry = createMiniLoftGeometry([
      { x: -1, yRadius: 0.5, zRadius: 0.4 },
      { x: 0, yRadius: 0.6, zRadius: 0.5 },
      { x: 1, yRadius: 0.5, zRadius: 0.4 },
    ], 8);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const columns = (position.count - 2) / 3;
    const topOfMiddleRing = columns;

    expect(position.getY(topOfMiddleRing)).toBeCloseTo(0.6, 5);
    expect(normal.getY(topOfMiddleRing)).toBeGreaterThan(0.9);
  });
});
