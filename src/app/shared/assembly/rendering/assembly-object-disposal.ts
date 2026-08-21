import * as THREE from 'three';
import { isSharedAssemblyAssetTexture } from './assembly-asset-loader';
import { isSharedDragonTexture } from './dragon-textures';
/** Frees object-owned resources while preserving shared texture caches. */
export function disposeAssemblyObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const textures = new Set<THREE.Texture>();
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      for (const texture of textures) {
        if (!isSharedDragonTexture(texture) && !isSharedAssemblyAssetTexture(texture)) {
          texture.dispose();
        }
      }
      material.dispose();
    }
  });
}
