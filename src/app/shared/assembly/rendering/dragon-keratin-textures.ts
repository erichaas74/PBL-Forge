import { DragonTextureSet } from './dragon-texture-constants';
import { memo, textureSize } from './dragon-texture-cache';
import {
  clamp01,
  colorTexture,
  fbm,
  fract,
  greyscaleTexture,
  normalTexture,
  sampleField,
} from './dragon-texture-generation';

const HORN_RIDGES = 9;
const HORN_RINGS = 7;

function hornHeight(u: number, v: number): number {
  const warp = (fbm(u + 0.23, v + 0.61, 5) - 0.5) * 0.09;
  const ridges = Math.pow(0.5 + 0.5 * Math.cos((u + warp) * Math.PI * 2 * HORN_RIDGES), 1.35);
  // Saw profile: growth creeps up, then steps back at each ring.
  const rings = Math.pow(fract(v * HORN_RINGS + warp * 1.8), 0.46);
  return clamp01(0.17 + 0.39 * ridges + 0.3 * rings + fbm(u, v, 38) * 0.14);
}

function hornAlbedo(height: number, u: number, v: number): readonly [number, number, number] {
  const age = fbm(u + 0.5, v + 0.2, 8) - 0.5;
  const ring = Math.pow(fract(v * HORN_RINGS), 0.35);
  const value = clamp01(0.69 + height * 0.23 + age * 0.12 - (1 - ring) * 0.055);
  return [value * 1.025, value, value * 0.955];
}

export const dragonHornTextures = memo((): DragonTextureSet => {
  const size = textureSize();
  const height = sampleField(size, hornHeight);

  return {
    map: colorTexture(height, size, hornAlbedo, { srgb: true }),
    normalMap: normalTexture(height, size, 2.6),
    roughnessMap: greyscaleTexture(
      height,
      size,
      (h, u, v) => 0.58 - 0.2 * h + fbm(u, v, 12) * 0.12,
      {},
    ),
    alphaMap: null,
  };
});

// ---------------------------------------------------------------------------
// Keratin: claws and teeth. Fine striations only — these parts are small and
// read mostly by their specular highlight.
// ---------------------------------------------------------------------------

function keratinHeight(u: number, v: number): number {
  const warp = (fbm(u + 0.4, v + 0.7, 7) - 0.5) * 0.045;
  const striation = Math.pow(0.5 + 0.5 * Math.cos((u + warp) * Math.PI * 2 * 16), 1.5);
  return clamp01(0.37 + 0.2 * striation + fbm(u, v, 46) * 0.38);
}

function keratinAlbedo(height: number, u: number, v: number): readonly [number, number, number] {
  const grain = fbm(u + 0.12, v + 0.82, 19) - 0.5;
  const value = clamp01(0.79 + height * 0.17 + grain * 0.08);
  return [value * 1.018, value, value * 0.965];
}

export const dragonKeratinTextures = memo((): DragonTextureSet => {
  const size = textureSize();
  const height = sampleField(size, keratinHeight);

  return {
    map: colorTexture(height, size, keratinAlbedo, { srgb: true }),
    normalMap: normalTexture(height, size, 1.5),
    roughnessMap: greyscaleTexture(height, size, (h) => 0.44 - 0.16 * h, {}),
    alphaMap: null,
  };
});

// ---------------------------------------------------------------------------
// Membrane: a branching vein network, mapped once over the whole wing.
// ---------------------------------------------------------------------------
