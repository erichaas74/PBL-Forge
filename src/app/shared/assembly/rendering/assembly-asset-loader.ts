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
const registeredTemplates = new Map<string, THREE.Group>();
const warnedAssetIds = new Set<string>();

export function loadAssemblyAssetTemplate(assetId: string): Promise<THREE.Group | null> {
  const registered = registeredTemplates.get(assetId);
  if (registered) return Promise.resolve(registered);
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

/** Makes a parsed local Designer asset available without requiring a network URL. */
export function registerAssemblyAssetTemplate(assetId: string, template: THREE.Group): void {
  if (!/^[a-zA-Z0-9._-]{1,96}$/.test(assetId)) {
    throw new Error('Assembly asset ids may contain only letters, numbers, dots, underscores, and hyphens.');
  }
  const previous = registeredTemplates.get(assetId);
  if (previous && previous !== template) disposeTemplate(previous);
  markTemplateResourcesShared(template);
  registeredTemplates.set(assetId, template);
  templateCache.delete(assetId);
  warnedAssetIds.delete(assetId);
}

/** Synchronous lookup used by procedural recipes after the Designer hydrates IndexedDB. */
export function instantiateRegisteredAssemblyAsset(assetId: string): THREE.Group | null {
  const template = registeredTemplates.get(assetId);
  return template ? instantiateAssemblyAsset(template) : null;
}

export function hasRegisteredAssemblyAsset(assetId: string): boolean {
  return registeredTemplates.has(assetId);
}

export function unregisterAssemblyAssetTemplate(assetId: string): void {
  const template = registeredTemplates.get(assetId);
  if (template) disposeTemplate(template);
  registeredTemplates.delete(assetId);
  templateCache.delete(assetId);
  warnedAssetIds.delete(assetId);
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
  for (const template of registeredTemplates.values()) disposeTemplate(template);
  registeredTemplates.clear();
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
