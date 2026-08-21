import * as THREE from 'three';
import { createStageLighting } from './stage-lighting';
import { createStagePostPipeline } from './stage-post-processing';
import { BERK_STAGE_THEME, SPECIMEN_STAGE_THEME, STUDIO_STAGE_THEME } from './stage-themes';

function keyLight(group: THREE.Group): THREE.DirectionalLight {
  const light = group.children.find(
    (child): child is THREE.DirectionalLight =>
      child instanceof THREE.DirectionalLight && child.castShadow,
  );
  if (!light) throw new Error('stage has no shadow-casting key light');
  return light;
}

describe('stage lighting', () => {
  it('builds a hemisphere plus key, fill, and rim lights', () => {
    const lighting = createStageLighting(BERK_STAGE_THEME, { width: 12, depth: 8 }, 'medium');

    expect(
      lighting.children.filter((child) => child instanceof THREE.HemisphereLight),
    ).toHaveLength(1);
    expect(
      lighting.children.filter((child) => child instanceof THREE.DirectionalLight),
    ).toHaveLength(3);
    expect(keyLight(lighting).shadow.mapSize.x).toBeGreaterThan(0);
  });

  it('fits the key shadow camera to the larger stage dimension', () => {
    const compact = keyLight(
      createStageLighting(BERK_STAGE_THEME, { width: 6, depth: 4 }, 'medium'),
    );
    const wide = keyLight(createStageLighting(BERK_STAGE_THEME, { width: 18, depth: 4 }, 'medium'));

    expect(wide.shadow.camera.right).toBeGreaterThan(compact.shadow.camera.right);
    expect(wide.shadow.camera.far).toBeGreaterThan(compact.shadow.camera.far);
  });

  it('keeps image-based lighting subordinate to each authored light rig', () => {
    for (const theme of [BERK_STAGE_THEME, STUDIO_STAGE_THEME, SPECIMEN_STAGE_THEME]) {
      expect(theme.environmentIntensity).toBeLessThanOrEqual(0.3);
      expect(theme.keyIntensity).toBeGreaterThan(theme.environmentIntensity);
    }
  });
});

describe('stage post-processing', () => {
  it('skips the entire composer on low quality before touching WebGL state', () => {
    const pipeline = createStagePostPipeline(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      'low',
    );

    expect(pipeline).toBeNull();
  });
});
