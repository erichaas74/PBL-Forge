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
  environmentIntensity: number;
}

/** Dusk battle arena: moody, saturated, game-like. */
export const ARENA_STAGE_THEME: StageTheme = {
  skyTop: '#141e30',
  skyBottom: '#2c3e5c',
  fogColor: '#2c3e5c',
  hemisphereSky: '#9db4d6',
  hemisphereGround: '#33261d',
  keyColor: '#ffe0b8',
  keyIntensity: 2.4,
  fillColor: '#7fa7d9',
  fillIntensity: 0.55,
  rimColor: '#9dd8ff',
  rimIntensity: 1.7,
  environmentIntensity: 0.5,
};

/** Bright workshop: neutral, readable, for the garage and previews. */
export const STUDIO_STAGE_THEME: StageTheme = {
  skyTop: '#dfe8f4',
  skyBottom: '#f6f8fc',
  fogColor: '#e8eef7',
  hemisphereSky: '#dbe7f5',
  hemisphereGround: '#b0a695',
  keyColor: '#fff4e2',
  keyIntensity: 2.1,
  fillColor: '#c3d9f2',
  fillIntensity: 0.6,
  rimColor: '#eaf4ff',
  rimIntensity: 1.1,
  environmentIntensity: 0.85,
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
