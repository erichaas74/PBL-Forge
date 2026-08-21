import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RenderQuality, pixelRatioForQuality, shadowMapSizeForQuality } from './render-quality';
import { StageTheme } from './stage-themes';

export function configureStageRenderer(
  renderer: THREE.WebGLRenderer,
  quality: RenderQuality,
): void {
  renderer.setPixelRatio(pixelRatioForQuality(quality));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
