import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { dragonPartSeed } from './dragon-textures';
import { visualNumber, visualString } from './dragon-visual-parameter-readers';

/** The shared, cached scale albedos a dragon can wear. */
export type ScalePattern = 'plain' | 'splotch' | 'zigzag';

export interface DragonPalette {
  scale: THREE.Color;
  scaleDeep: THREE.Color;
  horn: THREE.Color;
  claw: THREE.Color;
  tooth: THREE.Color;
  membrane: THREE.Color;
  /** The expressed scale pattern; genotype distinctions are resolved upstream. */
  pattern: ScalePattern;
  /** The second pigment, or null for the legacy deep-shade fallback. */
  patternColor: THREE.Color | null;
  /** Stable 0..1 variation derived from the part id. */
  seed: number;
  /** Per-part material controls authored in Parts Lab. */
  surfaceRelief: number;
  surfaceRoughness: number;
  surfaceDetailScale: number;
  surfacePatternStrength: number;
  surfacePatternScale: number;
}

function scalePatternOf(part: AssemblyPart): ScalePattern {
  const value = Math.round(visualNumber(part, 'scalePattern', 0));
  if (value === 1) return 'splotch';
  if (value === 2) return 'zigzag';
  return 'plain';
}

function shiftHsl(
  color: THREE.Color,
  hueDegrees: number,
  saturationScale: number,
  lightnessScale: number,
): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return new THREE.Color().setHSL(
    (hsl.h + hueDegrees / 360 + 1) % 1,
    Math.min(1, hsl.s * saturationScale),
    Math.min(1, hsl.l * lightnessScale),
  );
}

/** Derives every rendered dragon tone from the phenotype's base pigment. */
export function createDragonPalette(
  baseColor: string,
  seed: number,
  pattern: ScalePattern = 'plain',
  patternColor = '',
  surface: Partial<Pick<DragonPalette,
    'surfaceRelief' | 'surfaceRoughness' | 'surfaceDetailScale'
    | 'surfacePatternStrength' | 'surfacePatternScale'>> = {},
): DragonPalette {
  const scale = new THREE.Color(baseColor);
  const variation = Math.max(-0.5, Math.min(0.5, seed - 0.5));
  const bone = new THREE.Color('#d9c59e').offsetHSL(
    variation * 0.035,
    variation * 0.06,
    variation * 0.08,
  );
  return {
    pattern,
    patternColor: patternColor ? new THREE.Color(patternColor) : null,
    scale,
    scaleDeep: shiftHsl(
      scale,
      -18 + variation * 12,
      1.24 + variation * 0.16,
      0.5 + variation * 0.1,
    ),
    horn: scale.clone().lerp(bone, 0.56 + variation * 0.16),
    claw: scale
      .clone()
      .lerp(bone, 0.62 + variation * 0.12)
      .multiplyScalar(0.88 + variation * 0.08),
    tooth: new THREE.Color('#f2ead6'),
    // Backlit skin should remain saturated and visible against the white bench.
    membrane: shiftHsl(scale, 6 + variation * 16, 1.24 + variation * 0.14, 0.8 + variation * 0.1),
    seed,
    surfaceRelief: surface.surfaceRelief ?? 1,
    surfaceRoughness: surface.surfaceRoughness ?? 1,
    surfaceDetailScale: surface.surfaceDetailScale ?? 1,
    surfacePatternStrength: surface.surfacePatternStrength ?? 1,
    surfacePatternScale: surface.surfacePatternScale ?? 1,
  };
}

/** Resolves persisted visual parameters and stable variation for one part. */
export function dragonPaletteForPart(part: AssemblyPart): DragonPalette {
  return createDragonPalette(
    part.color,
    dragonPartSeed(part.id),
    scalePatternOf(part),
    visualString(part, 'patternColor', ''),
    {
      surfaceRelief: visualNumber(part, 'surfaceRelief', 1),
      surfaceRoughness: visualNumber(part, 'surfaceRoughness', 1),
      surfaceDetailScale: visualNumber(part, 'surfaceDetailScale', 1),
      surfacePatternStrength: visualNumber(part, 'surfacePatternStrength', 1),
      surfacePatternScale: visualNumber(part, 'surfacePatternScale', 1),
    },
  );
}
