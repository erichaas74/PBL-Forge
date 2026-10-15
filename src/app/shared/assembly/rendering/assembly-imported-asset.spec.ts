import * as THREE from 'three';
import {
  inspectImportedAssemblyAsset,
  normalizeImportedAssemblyAsset,
  validateGlbHeader,
} from './assembly-imported-asset';

describe('assembly imported asset validation', () => {
  it('rejects files that are not binary glTF 2.0', () => {
    expect(() => validateGlbHeader(new ArrayBuffer(12), 'part.glb'))
      .toThrowError(/binary glTF 2.0/);
  });

  it('counts geometry and normalizes translated source bounds to one unit', () => {
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0x884422 }),
    );
    mesh.position.set(8, 3, -2);
    scene.add(mesh);

    const inspection = inspectImportedAssemblyAsset(scene, 2048);
    const normalized = normalizeImportedAssemblyAsset(scene, inspection.sourceSize);
    const bounds = new THREE.Box3().setFromObject(normalized);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    expect(inspection.meshCount).toBe(1);
    expect(inspection.triangleCount).toBe(12);
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(1);
    expect(center.length()).toBeCloseTo(0);
  });

  it('rejects animation and skinned-mesh content', () => {
    const animated = new THREE.Group();
    animated.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
    expect(() => inspectImportedAssemblyAsset(animated, 1000, 1)).toThrowError(/animations/);

    const skinned = new THREE.Group();
    skinned.add(new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
    expect(() => inspectImportedAssemblyAsset(skinned, 1000)).toThrowError(/skinned meshes/);
  });

  it('repairs missing vertex normals for lightweight generated meshes', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -1, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ], 3));
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));

    inspectImportedAssemblyAsset(scene, 512);

    expect(geometry.getAttribute('normal')).toBeTruthy();
  });
});
