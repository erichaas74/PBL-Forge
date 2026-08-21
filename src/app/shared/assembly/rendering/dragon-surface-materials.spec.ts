import * as THREE from 'three';
import { createDragonPalette } from './dragon-palette';
import { scaleMaterial } from './dragon-surface-materials';

describe('dragon materials', () => {
  it('lets the roughness map own the full roughness range', () => {
    const material = scaleMaterial(createDragonPalette('#22c55e', 0.25));

    expect(material.roughnessMap).toBeTruthy();
    expect(material.roughness).toBe(1);
    expect(material.color.getHexString()).toBe(new THREE.Color('#22c55e').getHexString());
    expect(material.metalness).toBeLessThan(0.05);
  });

  it('varies scale relief using the stable part seed', () => {
    const shallow = scaleMaterial(createDragonPalette('#22c55e', 0));
    const deep = scaleMaterial(createDragonPalette('#22c55e', 1));

    expect(deep.normalScale.x).toBeGreaterThan(shallow.normalScale.x);
  });

  it('uses a distinct shader program for two-tone scale patterns', () => {
    const material = scaleMaterial(createDragonPalette('#22c55e', 0.5, 'zigzag', '#f97316'));

    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.customProgramCacheKey()).toBe('dragon-two-tone-pattern');
  });
});
