import * as THREE from 'three';
import { trackDragonTexture } from './dragon-texture-cache';

export const fract = (value: number): number => value - Math.floor(value);
export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
export const smoothstep = (t: number): number => t * t * (3 - 2 * t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
}

/** Value noise on a wrapped lattice, so the result tiles at the texture edge. */
export function tilingNoise(u: number, v: number, cells: number): number {
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
export function fbm(u: number, v: number, cells: number): number {
  return tilingNoise(u, v, cells) * 0.65 + tilingNoise(u, v, cells * 2) * 0.35;
}

export type HeightField = (u: number, v: number) => number;

export function sampleField(size: number, field: HeightField): Float32Array {
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

export function createCanvas(size: number): HTMLCanvasElement | null {
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

export interface TextureOptions {
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
  trackDragonTexture(texture);
  return texture;
}

/** Writes a height field through `shade` into a single-channel greyscale texture. */
export function greyscaleTexture(
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

export type RgbSample = readonly [red: number, green: number, blue: number];

/** Writes a near-neutral RGB albedo while preserving the material's genetic pigment. */
export function colorTexture(
  height: Float32Array,
  size: number,
  shade: (h: number, u: number, v: number) => RgbSample,
  options: TextureOptions,
): THREE.CanvasTexture | null {
  const canvas = createCanvas(size);
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return null;

  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const [red, green, blue] = shade(height[index], x / size, y / size);
      image.data[index * 4] = options.srgb ? srgbByte(red) : Math.round(clamp01(red) * 255);
      image.data[index * 4 + 1] = options.srgb ? srgbByte(green) : Math.round(clamp01(green) * 255);
      image.data[index * 4 + 2] = options.srgb ? srgbByte(blue) : Math.round(clamp01(blue) * 255);
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
export function normalTexture(
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
      image.data[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      image.data[index + 1] = Math.round(((dy / length) * 0.5 + 0.5) * 255);
      image.data[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return finishTexture(canvas, { ...options, srgb: false });
}

export function blurField(source: Float32Array, size: number, radius: number): Float32Array {
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
