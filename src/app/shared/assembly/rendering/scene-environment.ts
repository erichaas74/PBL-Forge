import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import {
  RenderQuality,
  pixelRatioForQuality,
  shadowMapSizeForQuality,
} from './render-quality';

/**
 * Shared "stage" setup for every three.js view in the app: filmic tone mapping,
 * image-based lighting, a three-point light rig, and an optional post-processing
 * chain (AO + bloom + SMAA) gated by render quality.
 */
export interface StageTheme {
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  hemisphereSky: string;
  hemisphereGround: string;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
  rimColor: string;
  rimIntensity: number;
  /**
   * Weight of the image-based lighting, and a number to be stingy with.
   *
   * The probe is three's `RoomEnvironment` — a white studio with area lights in
   * it, bright enough at intensity 1 to light a scene on its own. Every theme
   * here also runs a full three-point rig, so anything near 1 means the rig is
   * a rounding error and the neutral studio *is* the lighting: measured on the
   * arena at 1.05, the probe outweighed key, fill, rim and hemisphere combined
   * by roughly four to one, and the overcast Berk palette came out as pastel
   * under a white light. Kept low so the probe does what it is actually needed
   * for — opening the shadow side and giving roughness something to reflect —
   * while the rig carries the look.
   */
  environmentIntensity: number;
}

/**
 * Berk: an overcast north-Atlantic afternoon. The arena theme.
 *
 * The point of the palette is what it *withholds*: the sky is a desaturated
 * grey-blue, the bounce is wet earth, and the rim is nearly gone, so the only
 * saturated thing in frame is fire — braziers and dragon breath. A high
 * environment intensity keeps the shadow side open the way a cloud deck does,
 * which is what makes this read as daylight rather than as a dark scene.
 *
 * This replaced a dusk-and-neon arena theme outright. There is no longer a
 * second battle look to fall back to: every scenario the arena renders, dragon
 * or otherwise, is lit as the same overcast day, because two competing looks
 * in one renderer is how an app ends up with no identity at all.
 */
export const BERK_STAGE_THEME: StageTheme = {
  skyTop: '#8fa5b8',
  skyBottom: '#c9d4dc',
  fogColor: '#b8c6d0',
  hemisphereSky: '#b9cbdc',
  hemisphereGround: '#6b5b45',
  keyColor: '#fff1dc',
  keyIntensity: 1.9,
  fillColor: '#a8bccd',
  fillIntensity: 0.8,
  rimColor: '#dbe7f0',
  rimIntensity: 0.5,
  environmentIntensity: 0.3,
};

/**
 * Bright workshop: the forge with its doors open. Neutral and readable, for
 * the garage and previews.
 *
 * Warmer and less blue than it was, so a part carried from the workshop to the
 * arena does not appear to change colour on the way.
 */
export const STUDIO_STAGE_THEME: StageTheme = {
  skyTop: '#e4ddcd',
  skyBottom: '#f8f4ea',
  fogColor: '#ece4d5',
  hemisphereSky: '#e0dccf',
  hemisphereGround: '#8a7a60',
  keyColor: '#fff3de',
  keyIntensity: 2.1,
  fillColor: '#cdd4d8',
  fillIntensity: 0.65,
  rimColor: '#f2ece0',
  rimIntensity: 1,
  environmentIntensity: 0.3,
};

/**
 * Specimen bench: brighter and flatter than the studio, with a cool rim so a
 * small silhouette still separates from the panel behind it. Tuned for
 * inspection at 300px and thumbnails at 120px, where arena contrast reads as
 * mud and a warm key hides pigment differences.
 *
 * **Deliberately left near-neutral by the Berk retheme.** This stage exists so
 * a student can compare the pigment genes of two dragons side by side, and any
 * strong colour cast here is a cast applied to the exact thing being measured.
 * The bench is an instrument, not a set.
 */
export const SPECIMEN_STAGE_THEME: StageTheme = {
  skyTop: '#f2f0ea',
  skyBottom: '#ffffff',
  fogColor: '#f2f0ea',
  hemisphereSky: '#f0eee9',
  hemisphereGround: '#c2b8a6',
  keyColor: '#fffbf5',
  keyIntensity: 2.35,
  fillColor: '#e2e4e4',
  fillIntensity: 0.85,
  rimColor: '#eceef0',
  rimIntensity: 1.45,
  environmentIntensity: 0.4,
};

export function configureStageRenderer(renderer: THREE.WebGLRenderer, quality: RenderQuality): void {
  renderer.setPixelRatio(pixelRatioForQuality(quality));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/**
 * Installs image-based lighting from the built-in RoomEnvironment. This is what
 * makes MeshStandardMaterial metalness/roughness actually read as materials.
 * Returns a disposer.
 */
export function installStageEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  theme: StageTheme,
): () => void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = pmrem.fromScene(room, 0.04);
  scene.environment = target.texture;
  scene.environmentIntensity = theme.environmentIntensity;
  room.dispose();
  pmrem.dispose();

  return () => {
    if (scene.environment === target.texture) {
      scene.environment = null;
    }
    target.dispose();
  };
}

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

/** Subtle noise + vignette ground texture so large floors don't read as flat plastic. */
export function createGroundTexture(baseColor: string, speckleColor: string): THREE.CanvasTexture | null {
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
    size / 2, size / 2, size * 0.22,
    size / 2, size / 2, size * 0.72,
  );
  vignette.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface StageBounds {
  width: number;
  depth: number;
}

/**
 * Three-point rig: warm key with a shadow frustum fitted to the stage bounds,
 * cool fill, and a rim light that separates silhouettes from the background.
 */
export function createStageLighting(
  theme: StageTheme,
  bounds: StageBounds,
  quality: RenderQuality,
): THREE.Group {
  const group = new THREE.Group();
  const radius = Math.max(bounds.width, bounds.depth);

  const hemisphere = new THREE.HemisphereLight(theme.hemisphereSky, theme.hemisphereGround, 0.55);
  group.add(hemisphere);

  const key = new THREE.DirectionalLight(theme.keyColor, theme.keyIntensity);
  key.position.set(radius * 0.55, radius * 0.85, radius * 0.45);
  key.castShadow = true;
  const shadowSize = shadowMapSizeForQuality(quality);
  key.shadow.mapSize.set(shadowSize, shadowSize);
  const halfExtent = radius * 0.72 + 1.5;
  key.shadow.camera.left = -halfExtent;
  key.shadow.camera.right = halfExtent;
  key.shadow.camera.top = halfExtent;
  key.shadow.camera.bottom = -halfExtent;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = radius * 2.5 + 10;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  group.add(key);

  const fill = new THREE.DirectionalLight(theme.fillColor, theme.fillIntensity);
  fill.position.set(-radius * 0.7, radius * 0.4, -radius * 0.25);
  group.add(fill);

  const rim = new THREE.DirectionalLight(theme.rimColor, theme.rimIntensity);
  rim.position.set(-radius * 0.25, radius * 0.55, -radius * 0.8);
  group.add(rim);

  return group;
}

export interface StagePostPipeline {
  render(): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

/**
 * Post chain: GTAO (high only) grounds the assembled parts into one creature,
 * subtle bloom lifts emissive accents, SMAA cleans edges. Returns null on low
 * quality, where the caller should render directly.
 */
export function createStagePostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  quality: RenderQuality,
): StagePostPipeline | null {
  if (quality === 'low') return null;

  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(Math.max(size.x, 1), Math.max(size.y, 1));

  const passes: Pass[] = [];
  const addPass = (pass: Pass): void => {
    composer.addPass(pass);
    passes.push(pass);
  };

  addPass(new RenderPass(scene, camera));

  if (quality === 'high') {
    const gtao = new GTAOPass(scene, camera, Math.max(size.x, 1), Math.max(size.y, 1));
    gtao.blendIntensity = 0.85;
    addPass(gtao);
  }

  addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.4, 0.88));
  addPass(new OutputPass());
  addPass(new SMAAPass());

  return {
    render: () => composer.render(),
    setSize: (width, height) => composer.setSize(Math.max(width, 1), Math.max(height, 1)),
    dispose: () => {
      for (const pass of passes) {
        pass.dispose();
      }
      composer.dispose();
    },
  };
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
