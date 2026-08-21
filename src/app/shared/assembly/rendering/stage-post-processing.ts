import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { RenderQuality } from './render-quality';

export interface StagePostPipeline {
  render(): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

export interface StagePostOptions {
  /**
   * Bloom is a *dark-stage* effect. It selects pixels above a luminance
   * threshold and smears them, which reads as glow only when most of the frame
   * sits below that line.
   *
   * Pass `false` on a bright stage. The specimen bench renders a near-white
   * background under a 2.35-intensity key, so at the arena's 0.88 threshold
   * essentially every pixel qualifies and the whole image blooms into fog
   * rather than the eyes picking up a glow.
   */
  bloom?: boolean;
}

/**
 * Post chain: GTAO (high only) grounds the assembled parts into one creature,
 * optional bloom lifts emissive accents, SMAA cleans edges. Returns null on low
 * quality, where the caller should render directly.
 */
export function createStagePostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  quality: RenderQuality,
  options: StagePostOptions = {},
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

  if (options.bloom ?? true) {
    addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.4, 0.88));
  }
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
