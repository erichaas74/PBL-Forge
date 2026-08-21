import * as THREE from 'three';
import { DragonTextureSet } from './dragon-texture-constants';
import { memo, textureSize } from './dragon-texture-cache';
import {
  HeightField,
  clamp01,
  colorTexture,
  fbm,
  fract,
  greyscaleTexture,
  hash2,
  normalTexture,
  sampleField,
  smoothstep,
  tilingNoise,
} from './dragon-texture-generation';

const SCALE_CELLS_X = 6;
const SCALE_CELLS_Y = 8;

/**
 * A scale is a lateral dome that ramps up across the cell and drops off a lip
 * at the boundary — the hard step at `fy === 0` is the overlap edge, and it is
 * what catches a grazing key light.
 */
function scaleHeight(u: number, v: number): number {
  const row = Math.floor(v * SCALE_CELLS_Y);
  const fy = v * SCALE_CELLS_Y - row;
  const staggered = u * SCALE_CELLS_X + (row % 2 === 0 ? 0 : 0.5);
  const column = Math.floor(staggered);
  const fx = staggered - column;

  const cellSeed = hash2(column % SCALE_CELLS_X, row % SCALE_CELLS_Y);
  const asymmetry = (hash2(column + 19, row + 7) - 0.5) * 0.18;
  const across = (fx - 0.5 + asymmetry * (fy - 0.35)) * 2;
  const dome = Math.pow(Math.max(0, 1 - across * across), 0.72);
  const shingle = smoothstep(clamp01((fy - 0.025) / 0.94));
  const sideCrease = smoothstep(clamp01((1 - Math.abs(across) - 0.02) / 0.16));
  const rootCrease = smoothstep(clamp01(fy / 0.1));
  const amplitude = 0.78 + 0.22 * cellSeed;
  const pores = fbm(u + 0.37, v + 0.61, 42) - 0.5;

  return clamp01(
    (0.24 + 0.76 * dome) * (0.22 + 0.78 * shingle) * amplitude * sideCrease * rootCrease +
      pores * 0.075 +
      0.055,
  );
}

function scaleAlbedo(height: number, u: number, v: number): readonly [number, number, number] {
  const broad = fbm(u + 0.17, v + 0.63, 7) - 0.5;
  const grain = fbm(u + 0.71, v + 0.29, 31) - 0.5;
  const warmth = tilingNoise(u + 0.43, v + 0.11, 12) - 0.5;
  const value = clamp01(0.68 + height * 0.27 + broad * 0.11 + grain * 0.055);

  return [value * (1 + warmth * 0.055), value * (1 + broad * 0.018), value * (1 - warmth * 0.07)];
}

/**
 * Relief is shared between the plain and spotted scale sets.
 *
 * A pattern is pigment, not geometry: a spotted animal's spots are level with
 * the skin around them. So the normal and roughness maps are literally the same
 * texture objects for both sets, and only the albedo differs — which also keeps
 * the "a hundred dragons share a handful of texture sets" property intact when
 * the spotted variant is in play.
 */
const scaleRelief = memo(() => {
  const size = textureSize();
  const height = sampleField(size, scaleHeight);
  return {
    size,
    height,
    normalMap: normalTexture(height, size, 3.05),
    roughnessMap: greyscaleTexture(
      height,
      size,
      (h, u, v) => 0.82 - 0.32 * h + (fbm(u + 0.2, v + 0.8, 23) - 0.5) * 0.12,
      {},
    ),
  };
});

export const dragonScaleTextures = memo((): DragonTextureSet => {
  const relief = scaleRelief();
  return {
    map: colorTexture(relief.height, relief.size, scaleAlbedo, { srgb: true }),
    normalMap: relief.normalMap,
    roughnessMap: relief.roughnessMap,
    alphaMap: null,
  };
});

/**
 * A pattern as a **mask** rather than as a darkened albedo.
 *
 * This is the shape of the marking and nothing else: 0 is bare skin, 1 is inside
 * the marking. The material mixes two of the dragon's own colours through it, so
 * a stripe is a second *hue* and not a darker shade of the first — which a
 * greyscale albedo can never be, since multiplying can only ever darken.
 *
 * That keeps rule 1 at the top of this file intact, and is the reason it can: the
 * mask carries no colour, so one cached mask still serves every dragon whatever
 * pair of pigments it is wearing.
 *
 * Linear, not sRGB — this is data the shader reads, not a colour.
 */
function patternMaskTexture(mask: HeightField): THREE.Texture | null {
  const size = textureSize();
  return greyscaleTexture(sampleField(size, mask), size, (h) => h, {});
}

/**
 * Splotches: irregular blotches, the way a patterned animal is actually marked.
 *
 * A rosette is a circle with noise on its edge, and at any size it still reads
 * as a printed dot. A splotch is the noise *itself*, thresholded: two octaves of
 * tiling value noise with a soft cut, which gives blobs of uneven size that run
 * into each other in places and leave clean skin in others.
 *
 * `SPLOTCH_CELLS` is low for the same reason `SPOT_CELLS` is: one tile covers
 * 0.22 world units, so anything finer becomes speckle at body scale rather than
 * markings.
 */
/*
 * Three cells per tile. Two is too few, and the reason is the *parts*, not the
 * body: a tile is 0.22 world units and a leg or a jaw is barely wider than that,
 * so a two-cell blotch swallows a whole limb and the dragon comes out in solid
 * blocks of colour. Three keeps a blotch smaller than the smallest scaled part it
 * has to land on.
 */
const SPLOTCH_CELLS = 3;
const SPLOTCH_CUT = 0.52;

function splotchMask(u: number, v: number): number {
  /*
   * Domain warp first. Thresholding plain value noise gives shapes with the
   * lattice still visible in them — blobs that all lean the same way on a grid.
   * Displacing the sample point by another noise field bends that grid out of
   * recognition, which is the difference between markings and a pattern.
   */
  const warpU = u + (fbm(u + 0.31, v + 0.17, SPLOTCH_CELLS * 2) - 0.5) * 0.35;
  const warpV = v + (fbm(u + 0.73, v + 0.51, SPLOTCH_CELLS * 2) - 0.5) * 0.35;
  const field = fbm(warpU, warpV, SPLOTCH_CELLS);

  // Soft cut rather than a hard step: a blotch on skin has a diffuse edge a few
  // scales wide, and a hard one reads as vinyl.
  return smoothstep(clamp01((field - SPLOTCH_CUT) / 0.22));
}

export const dragonSplotchMask = memo(() => patternMaskTexture(splotchMask));

/**
 * Zig-zag stripes: chevron bands running around the body.
 *
 * The stripe is a band in `v` whose centre line is displaced by a **triangle**
 * wave in `u`. A sine there gives wavy stripes; the hard corner of a triangle
 * wave is what makes them read as zig-zag, which is the whole ask.
 *
 * Both counts have to divide the tile evenly or the pattern breaks at the wrap
 * seam — the chevrons would step sideways every repeat.
 */
/*
 * One band per tile, with two chevrons across it.
 *
 * A tile is 0.22 world units, so this puts a stripe and its gap at about 0.11
 * units each — five stripes down a flank. Twice this was legible while the pattern
 * only darkened the skin, and read as herringbone knitwear the moment the stripe
 * became a second *hue*: contrast that high needs half as many edges.
 */
const ZIGZAG_BANDS = 1;
const ZIGZAG_TEETH = 1;
const ZIGZAG_AMPLITUDE = 0.18;

/** Triangle wave on 0..1, peaking at 0.5. */
function triangleWave(t: number): number {
  const phase = fract(t);
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

function zigzagMask(u: number, v: number): number {
  const displaced = v + (triangleWave(u * ZIGZAG_TEETH) - 0.5) * ZIGZAG_AMPLITUDE * 2;
  // Distance from the nearest band centre, in band widths.
  const across = Math.abs(fract(displaced * ZIGZAG_BANDS) - 0.5) * 2;
  // Keep pigment on a minority of the skin and vary it across nearby scales;
  // wide, regular bands read as woven herringbone rather than anatomy.
  const grain = fbm(u + 0.31, v + 0.67, 12);
  const edge = 0.22 + 0.08 * (grain - 0.5);
  const stripe = 1 - smoothstep(clamp01((across - edge + 0.14) / 0.14));
  return stripe * (0.7 + grain * 0.3);
}

export const dragonZigzagMask = memo(() => patternMaskTexture(zigzagMask));

// ---------------------------------------------------------------------------
// Horn and bone: lengthwise ridges banded by growth rings.
