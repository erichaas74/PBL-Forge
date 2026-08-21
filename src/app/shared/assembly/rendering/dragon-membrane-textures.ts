import * as THREE from 'three';
import { EMPTY_SET, memo, textureSize } from './dragon-texture-cache';
import {
  blurField,
  clamp01,
  colorTexture,
  createCanvas,
  fbm,
  greyscaleTexture,
  lerp,
  normalTexture,
} from './dragon-texture-generation';
import { DragonTextureSet } from './dragon-texture-constants';

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
  const surface = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const u = x / size;
      const v = y / size;
      const tissue = fbm(u + 0.19, v + 0.73, 18);
      surface[index] = clamp01(veins[index] * 0.84 + tissue * 0.16);
    }
  }

  const wrap = THREE.ClampToEdgeWrapping;
  return {
    // Vessels carry pigment while thin tissue picks up subtle warm/cool mottling.
    map: colorTexture(
      veins,
      size,
      (vein, u, v) => {
        const tissue = fbm(u + 0.37, v + 0.13, 11) - 0.5;
        const warmth = fbm(u + 0.79, v + 0.41, 6) - 0.5;
        const value = clamp01(0.91 - 0.29 * vein + tissue * 0.09);
        return [
          value * (1 + warmth * 0.05),
          value * (1 + tissue * 0.015),
          value * (1 - warmth * 0.065),
        ];
      },
      { srgb: true, wrap },
    ),
    normalMap: normalTexture(surface, size, 1.9, { wrap }),
    roughnessMap: greyscaleTexture(
      veins,
      size,
      (vein, u, v) => 0.72 - 0.22 * vein + (fbm(u, v, 15) - 0.5) * 0.14,
      { wrap },
    ),
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
      (vein, u, v) => 0.72 + 0.25 * vein - 0.2 * Math.pow(u, 1.45) + (fbm(u, v, 9) - 0.5) * 0.12,
      { wrap },
    ),
  };
});
