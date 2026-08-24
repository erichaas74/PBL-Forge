import * as THREE from 'three';
import { disposeAssemblyObject } from './assembly-object-disposal';
import { disposeMiniDragonTextures, miniDragonCoatTextures } from './mini-dragon-textures';

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

  it('preserves mini-dragon textures shared across assembled specimens', () => {
    const texture = miniDragonCoatTextures().map!;
    const textureDisposed = vi.fn();
    texture.addEventListener('dispose', textureDisposed);
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ map: texture }),
    );

    disposeAssemblyObject(object);

    expect(textureDisposed).not.toHaveBeenCalled();
    disposeMiniDragonTextures();
    expect(textureDisposed).toHaveBeenCalledOnce();
  });
});
