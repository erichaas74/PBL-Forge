import * as THREE from 'three';
import { AssemblyPart, AssemblyVisualProfile } from '../domain/assembly.models';
import { createDragonPalette, dragonPaletteForPart } from './dragon-palette';

function bodyPart(parameters: AssemblyVisualProfile['parameters'] = {}): AssemblyPart {
  return {
    id: 'body',
    label: 'Body',
    roles: ['core'],
    shape: 'box',
    mass: 4,
    dimensions: { x: 1.6, y: 0.72, z: 0.68 },
    position: { x: 0, y: 0, z: 0 },
    color: '#22c55e',
    visualProfile: { profileId: 'dragon-body', meshType: 'procedural', parameters },
  };
}

describe('dragon palette', () => {
  it('resolves the persisted pattern and second pigment from the part', () => {
    const palette = dragonPaletteForPart(
      bodyPart({
        scalePattern: 1,
        patternColor: '#f97316',
      }),
    );

    expect(palette.pattern).toBe('splotch');
    expect(palette.patternColor?.getHexString()).toBe(new THREE.Color('#f97316').getHexString());
    expect(palette.scale.getHexString()).toBe(new THREE.Color('#22c55e').getHexString());
    expect(palette.seed).toBeGreaterThanOrEqual(0);
    expect(palette.seed).toBeLessThanOrEqual(1);
  });

  it('falls back to plain skin for unknown or non-numeric pattern values', () => {
    expect(dragonPaletteForPart(bodyPart({ scalePattern: 99 })).pattern).toBe('plain');
    expect(dragonPaletteForPart(bodyPart({ scalePattern: 'zigzag' })).pattern).toBe('plain');
  });

  it('resolves per-part procedural surface controls without changing pigment ownership', () => {
    const palette = dragonPaletteForPart(bodyPart({
      surfaceRelief: 1.6,
      surfaceRoughness: 0.55,
      surfaceDetailScale: 2.25,
      surfacePatternStrength: 0.4,
      surfacePatternScale: 1.8,
    }));

    expect(palette.surfaceRelief).toBe(1.6);
    expect(palette.surfaceRoughness).toBe(0.55);
    expect(palette.surfaceDetailScale).toBe(2.25);
    expect(palette.surfacePatternStrength).toBe(0.4);
    expect(palette.surfacePatternScale).toBe(1.8);
    expect(palette.scale.getHexString()).toBe(new THREE.Color('#22c55e').getHexString());
  });

  it('derives secondary tones without mutating the base pigment', () => {
    const palette = createDragonPalette('#a855f7', 0.5);

    expect(palette.scale.getHexString()).toBe(new THREE.Color('#a855f7').getHexString());
    expect(palette.scaleDeep.getHexString()).not.toBe(palette.scale.getHexString());
    expect(palette.membrane.getHexString()).not.toBe(palette.scale.getHexString());
  });

  it('uses the stable part seed to vary derived accents while preserving base pigment', () => {
    const first = createDragonPalette('#a855f7', 0.1);
    const second = createDragonPalette('#a855f7', 0.9);

    expect(first.scale.getHexString()).toBe(second.scale.getHexString());
    expect(first.scaleDeep.getHexString()).not.toBe(second.scaleDeep.getHexString());
    expect(first.horn.getHexString()).not.toBe(second.horn.getHexString());
    expect(first.membrane.getHexString()).not.toBe(second.membrane.getHexString());
  });
});
