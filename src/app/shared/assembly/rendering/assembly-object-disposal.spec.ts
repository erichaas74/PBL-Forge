import * as THREE from 'three';
import { disposeAssemblyObject } from './assembly-object-disposal';

describe('assembly object disposal', () => {
  it('disposes object-owned geometry, material, and textures', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometryDisposed = vi.fn();
    const textureDisposed = vi.fn();
    const materialDisposed = vi.fn();
    geometry.addEventListener('dispose', geometryDisposed);
    texture.addEventListener('dispose', textureDisposed);
    material.addEventListener('dispose', materialDisposed);

    disposeAssemblyObject(new THREE.Mesh(geometry, material));

    expect(geometryDisposed).toHaveBeenCalledOnce();
    expect(textureDisposed).toHaveBeenCalledOnce();
    expect(materialDisposed).toHaveBeenCalledOnce();
  });
});
