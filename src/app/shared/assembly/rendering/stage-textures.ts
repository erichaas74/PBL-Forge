import * as THREE from 'three';
import { StageTheme } from './stage-themes';

/** Vertical gradient sky as a screen-space background texture. */
export function createGradientSkyTexture(theme: StageTheme): THREE.CanvasTexture | null {
  const canvas = createCanvas(2, 256);
  if (!canvas) return null;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * An overcast sky, as a full spherical background rather than a screen-space
 * gradient.
 *
 * A vertical gradient is the right answer for a studio stage, where the
 * background is a backdrop and the camera barely moves. It is the wrong answer
 * outdoors: the arena camera orbits, and a gradient painted onto the screen
 * slides with it, so the sky is the one thing in the scene that never turns.
 * Mapping the canvas equirectangularly fixes the weather in world space, which
 * is what lets a cloud sit behind a particular sea stack and stay there.
 *
 * The cloud deck is deliberately confined to a band above the horizon and left
 * out of the zenith: an equirectangular projection stretches everything near
 * the poles into streaks, and a cloud painted at the top of the canvas arrives
 * overhead as a smear.
 */
export function createOvercastSkyTexture(theme: StageTheme): THREE.CanvasTexture | null {
  const width = 1024;
  const height = 512;
  const canvas = createCanvas(width, height);
  if (!canvas) return null;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(0.46, theme.skyBottom);
  gradient.addColorStop(0.52, theme.fogColor);
  // Below the horizon is haze over water, not more sky.
  gradient.addColorStop(1, '#7d8f9b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // Seeded, so the weather is the same weather on every load. A sky that
  // reshuffles between two visits to the same arena reads as a rendering fault.
  const random = seededRandom(0x5e4b17);
  const decks = [
    { count: 46, top: 0.1, span: 0.16, size: 78, alpha: 0.16, tint: '255,255,255' },
    { count: 34, top: 0.24, span: 0.14, size: 116, alpha: 0.2, tint: '246,249,251' },
    // The low, heavier band: undersides are what make a deck read as weather
    // rather than as fog, so this one is grey and sits just over the horizon.
    { count: 26, top: 0.35, span: 0.09, size: 148, alpha: 0.26, tint: '150,164,177' },
  ];

  for (const deck of decks) {
    for (let index = 0; index < deck.count; index += 1) {
      const x = random() * width;
      const y = (deck.top + random() * deck.span) * height;
      const radius = deck.size * (0.45 + random() * 0.9);
      const puff = context.createRadialGradient(x, y, 0, x, y, radius);
      puff.addColorStop(0, `rgba(${deck.tint},${deck.alpha})`);
      puff.addColorStop(0.55, `rgba(${deck.tint},${deck.alpha * 0.45})`);
      puff.addColorStop(1, `rgba(${deck.tint},0)`);
      context.fillStyle = puff;
      // Flattened: cloud decks are wide and shallow, and a circular puff reads
      // as a cotton ball.
      context.save();
      context.translate(x, y);
      context.scale(1, 0.42);
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Subtle noise + vignette ground texture so large floors don't read as flat plastic. */
export function createGroundTexture(
  baseColor: string,
  speckleColor: string,
): THREE.CanvasTexture | null {
  const size = 512;
  const canvas = createCanvas(size, size);
  if (!canvas) return null;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = baseColor;
  context.fillRect(0, 0, size, size);

  context.fillStyle = speckleColor;
  for (let index = 0; index < 2600; index += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    context.globalAlpha = 0.03 + Math.random() * 0.07;
    context.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  context.globalAlpha = 1;

  const vignette = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.22,
    size / 2,
    size / 2,
    size * 0.72,
  );
  vignette.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
