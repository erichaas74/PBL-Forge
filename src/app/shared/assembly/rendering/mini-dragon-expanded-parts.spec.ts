import * as THREE from 'three';
import { part } from './mini-dragon-mesh.spec-helpers';
import { createMiniDragonProceduralObject } from './mini-dragon-procedural-mesh.factory';

const EXPANDED_PARTS = [
  ['mini-dragon-brow-plates', 'miniBrowScale'],
  ['mini-dragon-whiskers', 'miniWhiskerScale'],
  ['mini-dragon-chin-tuft', 'miniChinScale'],
  ['mini-dragon-dewlap', 'miniDewlapScale'],
  ['mini-dragon-neck-ruff', 'miniRuffScale'],
  ['mini-dragon-shoulder-plates', 'miniShoulderScale'],
  ['mini-dragon-belly-scutes', 'miniBellyScuteScale'],
  ['mini-dragon-flank-fins', 'miniFlankFinScale'],
  ['mini-dragon-hip-fins', 'miniHipFinScale'],
  ['mini-dragon-tail-sail', 'miniTailSailScale'],
] as const;

describe('expanded Mini Dragon inherited parts', () => {
  it.each(EXPANDED_PARTS)('builds finite geometry for %s', (profileId, parameterKey) => {
    const object = createMiniDragonProceduralObject(part(profileId, {}, { [parameterKey]: 1 }))!;
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    expect(meshes.length, profileId).toBeGreaterThan(0);
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const normal = mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
      expect(position.count, `${profileId}/${mesh.name}`).toBeGreaterThan(0);
      expect(Array.from(position.array).every(Number.isFinite), `${profileId}/${mesh.name}/position`).toBe(true);
      expect(Array.from(normal.array).every(Number.isFinite), `${profileId}/${mesh.name}/normal`).toBe(true);
    }
  });

  it.each(EXPANDED_PARTS)('can suppress %s for a no-part phenotype', (profileId, parameterKey) => {
    const object = createMiniDragonProceduralObject(part(profileId, {}, { [parameterKey]: 0 }))!;
    let meshCount = 0;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) meshCount += 1;
    });

    expect(meshCount).toBe(0);
  });

  it('uses a solid material for the extruded chin petals', () => {
    const object = createMiniDragonProceduralObject(
      part('mini-dragon-chin-tuft', {}, { miniChinScale: 1 }),
    )!;
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material as THREE.MeshStandardMaterial;
      expect(material.alphaMap).toBeNull();
    });
  });
});
