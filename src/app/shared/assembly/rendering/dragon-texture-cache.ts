import * as THREE from 'three';
import { DragonTextureSet } from './dragon-texture-constants';
import { resolveRenderQuality } from './render-quality';

export const EMPTY_SET: DragonTextureSet = {
  map: null,
  normalMap: null,
  roughnessMap: null,
  alphaMap: null,
};

// ---------------------------------------------------------------------------
// Cache plumbing.
// ---------------------------------------------------------------------------

const resetters: (() => void)[] = [];
const createdTextures: THREE.Texture[] = [];

export function trackDragonTexture(texture: THREE.Texture): void {
  createdTextures.push(texture);
}

export function memo<T>(factory: () => T): () => T {
  let value: T | undefined;
  let resolved = false;
  resetters.push(() => {
    value = undefined;
    resolved = false;
  });
  return () => {
    if (!resolved) {
      value = factory();
      resolved = true;
    }
    return value as T;
  };
}

/**
 * Drops every cached texture. Only for teardown in tests — production code
 * should let the cache live for the session, since the whole point is that a
 * hundred dragons share four texture sets.
 */
export function disposeDragonTextures(): void {
  for (const texture of createdTextures.splice(0)) {
    texture.dispose();
  }
  for (const reset of resetters) {
    reset();
  }
}

/**
 * True for a texture owned by this module's cache. Disposal walkers must skip
 * these: freeing a map still referenced by every other dragon on the field
 * leaves the survivors rendering untextured.
 */
export function isSharedDragonTexture(texture: THREE.Texture | null | undefined): boolean {
  return Boolean(texture?.userData['sharedDragonTexture']);
}

/**
 * Texture detail drops on weaker machines, where fill rate matters more than
 * grain. Gated on `!== 'low'` rather than `=== 'high'`: these maps are the
 * difference between scales and flat plastic at inspection size, and the cost
 * is one bake per session shared by every dragon, not per-frame.
 */
export const textureSize = memo((): number => (resolveRenderQuality() !== 'low' ? 512 : 256));

/**
 * Transmission renders the scene into a separate target — the one genuinely
 * per-frame cost in this module. If the frame budget on a low-end machine ever
 * fails, narrow this back to `=== 'high'` before touching anything else.
 */
export const membraneUsesTransmission = memo((): boolean => resolveRenderQuality() !== 'low');
