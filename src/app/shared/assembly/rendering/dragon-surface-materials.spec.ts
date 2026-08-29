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

  it('applies authored relief, roughness, and private texture frequency', () => {
    const standard = scaleMaterial(createDragonPalette('#22c55e', 0.5));
    const authored = scaleMaterial(createDragonPalette('#22c55e', 0.5, 'plain', '', {
      surfaceRelief: 1.5,
      surfaceRoughness: 0.5,
      surfaceDetailScale: 2,
    }));

    expect(authored.normalScale.x).toBeCloseTo(standard.normalScale.x * 1.5);
    expect(authored.roughness).toBeCloseTo(0.5);
    expect(authored.map).not.toBe(standard.map);
    expect(authored.map?.repeat.x).toBeCloseTo(2);
    expect(authored.normalMap?.repeat.y).toBeCloseTo(2);
    expect(authored.map?.userData['sharedDragonTexture']).toBe(false);
  });

  it('uses a distinct shader program for two-tone scale patterns', () => {
    const material = scaleMaterial(createDragonPalette('#22c55e', 0.5, 'zigzag', '#f97316'));

    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.customProgramCacheKey()).toBe('dragon-two-tone-pattern');
  });
});
