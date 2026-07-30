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
    .then(gltf => gltf.scene)
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
    object.material = Array.isArray(object.material)
      ? object.material.map(material => material.clone())
      : object.material.clone();
  });

  return instance;
}

/** Test hook: clears the template cache. */
export function resetAssemblyAssetCache(): void {
  templateCache.clear();
  warnedAssetIds.clear();
}
