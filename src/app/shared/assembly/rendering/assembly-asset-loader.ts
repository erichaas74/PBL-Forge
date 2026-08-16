import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Loads authored GLB part models referenced by `visualProfile.assetId`. Files live
 * in `public/models/<assetId>.glb` and are fetched at runtime, so they never count
 * against the JS bundle budget. One template load per assetId; instances are
 * clones with cloned materials so per-part tinting stays independent.
 *
 * A missing file resolves to null (warned once) and callers keep their
 * procedural/primitive fallback — art can land one part at a time.
 */
const templateCache = new Map<string, Promise<THREE.Group | null>>();
const warnedAssetIds = new Set<string>();

export function loadAssemblyAssetTemplate(assetId: string): Promise<THREE.Group | null> {
  const cached = templateCache.get(assetId);
  if (cached) return cached;

  const pending = new GLTFLoader()
    .loadAsync(`models/${encodeURIComponent(assetId)}.glb`)
    .then(gltf => {
      markTemplateResourcesShared(gltf.scene);
      return gltf.scene;
    })
    .catch((error: unknown) => {
      if (!warnedAssetIds.has(assetId)) {
        warnedAssetIds.add(assetId);
        console.warn(`Assembly asset "${assetId}" failed to load; using fallback mesh.`, error);
      }
      return null;
    });

  templateCache.set(assetId, pending);
  return pending;
}

export function instantiateAssemblyAsset(template: THREE.Group): THREE.Group {
  const instance = template.clone(true);

  instance.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.geometry = object.geometry.clone();
    object.material = Array.isArray(object.material)
      ? object.material.map(material => material.clone())
      : object.material.clone();
  });

  return instance;
}

export function isSharedAssemblyAssetTexture(
  texture: THREE.Texture | null | undefined,
): boolean {
  return Boolean(texture?.userData['sharedAssemblyAssetTexture']);
}

/** Clears cached templates and releases their owned geometry, materials, and textures. */
export function resetAssemblyAssetCache(): void {
  for (const pending of templateCache.values()) {
    void pending.then(template => {
      if (template) disposeTemplate(template);
    });
  }
  templateCache.clear();
  warnedAssetIds.clear();
}

function markTemplateResourcesShared(template: THREE.Group): void {
  template.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.userData['sharedAssemblyAssetTexture'] = true;
      }
    }
  });
}

function disposeTemplate(template: THREE.Group): void {
  const textures = new Set<THREE.Texture>();
  template.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    }
  });
  for (const texture of textures) texture.dispose();
}
