import * as THREE from 'three';
import { resolveRenderQuality } from './render-quality';

/**
 * Procedural PBR maps for the dragon parts, plus the UV assignment that makes
 * them sit at a constant world size on every part.
 *
 * Two rules shape everything here:
 *
 * 1. **The maps are greyscale and colour-agnostic.** Pigment still comes from
 *    `part.color` through the material's `color`; the albedo map only *darkens*
 *    crevices, so the genetics pipeline keeps full control of hue. That is what
 *    lets one cached texture serve every dragon in an arena.
 * 2. **Tiling lives in the UVs, not the texture.** `Texture.repeat` is a
 *    property of the texture, so per-part tiling would need a texture clone per
 *    part. Instead each builder bakes its repeat into the geometry's `uv`
 *    attribute, and all parts share one immutable texture object.
 *
 * Every set is built lazily on first use and cached for the lifetime of the
 * app. They are deliberately *not* disposed with the meshes that reference them
 * — see `isSharedDragonTexture`.
 */

export interface DragonTextureSet {
  /** Greyscale crevice darkening, multiplied into the material colour. */
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  /** Encodes the roughness value directly, so materials set `roughness: 1`. */
  roughnessMap: THREE.Texture | null;
  alphaMap: THREE.Texture | null;
}

/** World units covered by one tile of each texture. Sets the apparent detail size. */
export const SCALE_TILE = 0.22;
export const HORN_TILE = 0.16;
export const KERATIN_TILE = 0.1;

const EMPTY_SET: DragonTextureSet = { map: null, normalMap: null, roughnessMap: null, alphaMap: null };

// ---------------------------------------------------------------------------
// Cache plumbing.
// ---------------------------------------------------------------------------

const resetters: (() => void)[] = [];
const createdTextures: THREE.Texture[] = [];

function memo<T>(factory: () => T): () => T {
  let value: T | undefined;
  let resolved = false;
  resetters.push(() => {
    value = undefined;
    resolved = false;
  });
  return () => {
    if (!resolved) {
      value = factory();
      resolved = true;
    }
    return value as T;
  };
}

/**
 * Drops every cached texture. Only for teardown in tests — production code
 * should let the cache live for the session, since the whole point is that a
 * hundred dragons share four texture sets.
 */
export function disposeDragonTextures(): void {
  for (const texture of createdTextures.splice(0)) {
    texture.dispose();
  }
  for (const reset of resetters) {
    reset();
  }
}

/**
 * True for a texture owned by this module's cache. Disposal walkers must skip
 * these: freeing a map still referenced by every other dragon on the field
 * leaves the survivors rendering untextured.
 */
export function isSharedDragonTexture(texture: THREE.Texture | null | undefined): boolean {
  return Boolean(texture?.userData['sharedDragonTexture']);
}

/**
 * Texture detail drops on weaker machines, where fill rate matters more than
 * grain. Gated on `!== 'low'` rather than `=== 'high'`: these maps are the
 * difference between scales and flat plastic at inspection size, and the cost
 * is one bake per session shared by every dragon, not per-frame.
 */
const textureSize = memo((): number => (resolveRenderQuality() !== 'low' ? 512 : 256));

/**
 * Transmission renders the scene into a separate target — the one genuinely
 * per-frame cost in this module. If the frame budget on a low-end machine ever
 * fails, narrow this back to `=== 'high'` before touching anything else.
 */
export const membraneUsesTransmission = memo((): boolean => resolveRenderQuality() !== 'low');

// ---------------------------------------------------------------------------
// Noise and field sampling.
// ---------------------------------------------------------------------------

const fract = (value: number): number => value - Math.floor(value);
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smoothstep = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
}

/** Value noise on a wrapped lattice, so the result tiles at the texture edge. */
function tilingNoise(u: number, v: number, cells: number): number {
  const x = u * cells;
  const y = v * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const wrap = (n: number): number => ((n % cells) + cells) % cells;

  const a = hash2(wrap(x0), wrap(y0));
  const b = hash2(wrap(x0 + 1), wrap(y0));
  const c = hash2(wrap(x0), wrap(y0 + 1));
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1));

  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/** Two octaves is enough grain at these texture sizes and keeps generation cheap. */
function fbm(u: number, v: number, cells: number): number {
  return tilingNoise(u, v, cells) * 0.65 + tilingNoise(u, v, cells * 2) * 0.35;
}

type HeightField = (u: number, v: number) => number;

function sampleField(size: number, field: HeightField): Float32Array {
  const data = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      data[y * size + x] = field(x / size, y / size);
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Canvas → texture.
// ---------------------------------------------------------------------------

function createCanvas(size: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/** Linear value → sRGB byte, so an albedo map means what it says once decoded. */
function srgbByte(linear: number): number {
  const value = clamp01(linear);
  const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

interface TextureOptions {
  /** sRGB for anything multiplied into colour; linear for normal/roughness/alpha data. */
  srgb?: boolean;
  wrap?: THREE.Wrapping;
}

function finishTexture(canvas: HTMLCanvasElement, options: TextureOptions): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  const wrap = options.wrap ?? THREE.RepeatWrapping;
  texture.wrapS = wrap;
  texture.wrapT = wrap;
  texture.colorSpace = options.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  // Scales and membranes are seen edge-on constantly; three clamps this to
  // whatever the device actually supports at upload time.
  texture.anisotropy = 8;
  texture.userData['sharedDragonTexture'] = true;
  createdTextures.push(texture);
  return texture;
}

/** Writes a height field through `shade` into a single-channel greyscale texture. */
function greyscaleTexture(
  height: Float32Array,
  size: number,
  shade: (h: number, u: number, v: number) => number,
  options: TextureOptions,
): THREE.CanvasTexture | null {
  const canvas = createCanvas(size);
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return null;

  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const value = clamp01(shade(height[index], x / size, y / size));
      const byte = options.srgb ? srgbByte(value) : Math.round(value * 255);
      image.data[index * 4] = byte;
      image.data[index * 4 + 1] = byte;
      image.data[index * 4 + 2] = byte;
      image.data[index * 4 + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return finishTexture(canvas, options);
}

/**
 * Sobel-style height → tangent-space normal map.
 *
 * Sampling wraps, so a tiling height field yields a tiling normal map. The
 * green channel takes `+dy` rather than `-dy` because three flips textures on
 * upload: canvas rows run downward while UV `v` runs upward, and three's normal
 * maps are OpenGL convention (green up).
 */
function normalTexture(
  height: Float32Array,
  size: number,
  strength: number,
  options: TextureOptions = {},
): THREE.CanvasTexture | null {
  const canvas = createCanvas(size);
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return null;

  const at = (x: number, y: number): number =>
    height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  // Per-texel deltas shrink as the texture grows; keep the relief size-independent.
  const scaled = strength * (size / 256);

  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * scaled;
      const dy = (at(x, y + 1) - at(x, y - 1)) * scaled;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      image.data[index] = Math.round((-dx / length * 0.5 + 0.5) * 255);
      image.data[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      image.data[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return finishTexture(canvas, { ...options, srgb: false });
}

// ---------------------------------------------------------------------------
// Scales: staggered shingles.
// ---------------------------------------------------------------------------

/**
 * Cells per tile. The row count must stay even or the half-cell stagger on odd
 * rows would not line up across the wrap seam.
 */
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

  const across = (fx - 0.5) * 2;
  const dome = Math.max(0, 1 - across * across);
  const shingle = smoothstep(fy);
  // Per-cell amplitude keeps the grid from reading as a machined pattern.
  const amplitude = 0.74 + 0.26 * hash2(column % SCALE_CELLS_X, row % SCALE_CELLS_Y);

  return clamp01((0.3 + 0.7 * dome) * (0.26 + 0.74 * shingle) * amplitude + fbm(u, v, 26) * 0.09);
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
    normalMap: normalTexture(height, size, 3.4),
    roughnessMap: greyscaleTexture(height, size, h => 0.78 - 0.3 * h, {}),
  };
});

export const dragonScaleTextures = memo((): DragonTextureSet => {
  const relief = scaleRelief();
  return {
    map: greyscaleTexture(relief.height, relief.size, h => 0.72 + 0.28 * h, { srgb: true }),
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
  return greyscaleTexture(sampleField(size, mask), size, h => h, {});
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
// ---------------------------------------------------------------------------

const HORN_RIDGES = 9;
const HORN_RINGS = 7;

function hornHeight(u: number, v: number): number {
  const ridges = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * HORN_RIDGES);
  // Saw profile: growth creeps up, then steps back at each ring.
  const rings = Math.pow(fract(v * HORN_RINGS), 0.4);
  return clamp01(0.2 + 0.42 * ridges + 0.28 * rings + fbm(u, v, 34) * 0.11);
}

export const dragonHornTextures = memo((): DragonTextureSet => {
  const size = textureSize();
  const height = sampleField(size, hornHeight);

  return {
    map: greyscaleTexture(height, size, h => 0.76 + 0.24 * h, { srgb: true }),
    normalMap: normalTexture(height, size, 2.6),
    roughnessMap: greyscaleTexture(height, size, (h, u, v) => 0.58 - 0.2 * h + fbm(u, v, 12) * 0.12, {}),
    alphaMap: null,
  };
});

// ---------------------------------------------------------------------------
// Keratin: claws and teeth. Fine striations only — these parts are small and
// read mostly by their specular highlight.
// ---------------------------------------------------------------------------

function keratinHeight(u: number, v: number): number {
  const striation = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 16);
  return clamp01(0.42 + 0.22 * striation + fbm(u, v, 46) * 0.34);
}

export const dragonKeratinTextures = memo((): DragonTextureSet => {
  const size = textureSize();
  const height = sampleField(size, keratinHeight);

  return {
    map: greyscaleTexture(height, size, h => 0.84 + 0.16 * h, { srgb: true }),
    normalMap: normalTexture(height, size, 1.5),
    roughnessMap: greyscaleTexture(height, size, h => 0.44 - 0.16 * h, {}),
    alphaMap: null,
  };
});

// ---------------------------------------------------------------------------
// Membrane: a branching vein network, mapped once over the whole wing.
// ---------------------------------------------------------------------------

/** Deterministic PRNG so the vein pattern is identical every session. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Veins radiate from the wing root. The membrane's UVs are `u = chord`
 * (0 leading edge → 1 trailing) and `v = span` (0 root → 1 tip), and three
 * flips the canvas on upload, so the root corner is canvas bottom-left.
 */
function drawMembraneVeins(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = '#000000';
  context.fillRect(0, 0, size, size);
  context.strokeStyle = '#ffffff';
  context.lineCap = 'round';

  const random = mulberry32(0x5eed);

  const branch = (
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    depth: number,
  ): void => {
    if (depth <= 0 || length < size * 0.012) return;

    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, y);
    // A slight bow reads as a vessel rather than a wireframe.
    context.quadraticCurveTo(
      (x + endX) / 2 + (random() - 0.5) * length * 0.3,
      (y + endY) / 2 + (random() - 0.5) * length * 0.3,
      endX,
      endY,
    );
    context.stroke();

    const children = depth > 3 ? 3 : 2;
    for (let index = 0; index < children; index += 1) {
      branch(
        endX,
        endY,
        angle + (random() - 0.5) * 0.9,
        length * (0.58 + random() * 0.22),
        Math.max(width * 0.62, size * 0.0018),
        depth - 1,
      );
    }
  };

  // Root anchor at the leading edge, fanning toward the tip and trailing edge.
  const rootX = size * 0.04;
  const rootY = size * 0.98;
  for (let index = 0; index < 5; index += 1) {
    const spread = index / 4;
    branch(
      rootX,
      rootY,
      lerp(-Math.PI * 0.46, -Math.PI * 0.06, spread) + (random() - 0.5) * 0.15,
      size * (0.3 + random() * 0.12),
      size * 0.012,
      6,
    );
  }
}

/** Separable box blur, so hard canvas strokes become rounded vessels in the normal map. */
function blurField(source: Float32Array, size: number, radius: number): Float32Array {
  const horizontal = new Float32Array(size * size);
  const result = new Float32Array(size * size);
  const span = radius * 2 + 1;
  const clampIndex = (n: number): number => Math.max(0, Math.min(size - 1, n));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let total = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        total += source[y * size + clampIndex(x + offset)];
      }
      horizontal[y * size + x] = total / span;
    }
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let total = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        total += horizontal[clampIndex(y + offset) * size + x];
      }
      result[y * size + x] = total / span;
    }
  }
  return result;
}

export const dragonMembraneTextures = memo((): DragonTextureSet => {
  const size = textureSize();
  const canvas = createCanvas(size);
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return EMPTY_SET;

  drawMembraneVeins(context, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const raw = new Float32Array(size * size);
  for (let index = 0; index < raw.length; index += 1) {
    raw[index] = pixels[index * 4] / 255;
  }
  const veins = blurField(raw, size, Math.max(1, Math.round(size / 170)));

  const wrap = THREE.ClampToEdgeWrapping;
  return {
    // Vessels carry pigment, so they read darker than the webbing between them.
    map: greyscaleTexture(veins, size, vein => 1 - 0.26 * vein, { srgb: true, wrap }),
    normalMap: normalTexture(veins, size, 2.2, { wrap }),
    roughnessMap: greyscaleTexture(veins, size, (vein, u, v) => 0.7 - 0.24 * vein + fbm(u, v, 9) * 0.1, { wrap }),
    /*
     * Thickness rises along every vessel and falls toward the trailing edge
     * (u → 1), where a real wing is little more than skin.
     *
     * The floor was 0.52 falling to roughly 0.22 at the trailing edge, which was
     * tuned against the arena's mid-toned overcast sky. On the near-white
     * specimen bench a half-transparent pale membrane against a white background
     * is simply not there — the wings read as three bare struts. Raised so the
     * webbing holds its own colour on a bright stage; the vessel contrast that
     * does the actual descriptive work is unchanged.
     */
    alphaMap: greyscaleTexture(
      veins,
      size,
      (vein, u, v) => 0.74 + 0.24 * vein - 0.22 * Math.pow(u, 1.5) + fbm(u, v, 7) * 0.1,
      { wrap },
    ),
  };
});

// ---------------------------------------------------------------------------
// Per-part variation.
// ---------------------------------------------------------------------------

/**
 * Stable 0..1 value from a part id. Shifting texture UVs by this stops four
 * identical legs from showing the same scale under the same highlight, without
 * needing a texture per part.
 */
export function dragonPartSeed(id: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

// ---------------------------------------------------------------------------
// UV assignment.
// ---------------------------------------------------------------------------

/**
 * Bakes tiling into an existing UV set so one texture tile covers `tile` world
 * units, regardless of how the genome scaled the part.
 *
 * Repeats are rounded to whole numbers: revolved geometry wraps its `u` from 1
 * back to 0, and a fractional repeat would put a visible seam down that join.
 */
export function applyTiledUv(
  geometry: THREE.BufferGeometry,
  spanU: number,
  spanV: number,
  tile: number,
  seed = 0,
): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) return;

  const repeatU = Math.max(1, Math.round(spanU / tile));
  const repeatV = Math.max(1, Math.round(spanV / tile));
  const offsetU = seed;
  const offsetV = fract(seed * 7.13);

  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * repeatU + offsetU, uv.getY(index) * repeatV + offsetV);
  }
  uv.needsUpdate = true;
}

/**
 * Cube projection from object space, for boxes and tapered boxes.
 *
 * `BoxGeometry` normalises each face's UVs to 0..1 over that face's own extent,
 * so a long muzzle would stretch its scales lengthwise and squash them across.
 * Projecting from position instead gives every face the same density.
 */
export function applyBoxProjectedUv(geometry: THREE.BufferGeometry, tile: number, seed = 0): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal) return;

  const uv = new Float32Array(position.count * 2);
  const offsetU = seed;
  const offsetV = fract(seed * 7.13);

  for (let index = 0; index < position.count; index += 1) {
    const nx = Math.abs(normal.getX(index));
    const ny = Math.abs(normal.getY(index));
    const nz = Math.abs(normal.getZ(index));
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);

    let u: number;
    let v: number;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }

    uv[index * 2] = u / tile + offsetU;
    uv[index * 2 + 1] = v / tile + offsetV;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
