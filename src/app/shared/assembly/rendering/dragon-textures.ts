/**
 * Stable compatibility surface for dragon textures.
 *
 * Generator ownership lives in the focused modules re-exported here so existing
 * renderers and disposal code do not need to know how the maps are organized.
 */
export {
  disposeDragonTextures,
  isSharedDragonTexture,
  membraneUsesTransmission,
} from './dragon-texture-cache';
export { dragonScaleTextures, dragonSplotchMask, dragonZigzagMask } from './dragon-scale-textures';
export { dragonHornTextures, dragonKeratinTextures } from './dragon-keratin-textures';
export { dragonMembraneTextures } from './dragon-membrane-textures';

export function dragonPartSeed(id: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % 10000) / 10000;
}
