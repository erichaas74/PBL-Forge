import type * as THREE from 'three';

export interface DragonTextureSet {
  /** Near-neutral albedo variation multiplied into the genetically selected pigment. */
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  /** Encodes the roughness value directly, so materials set `roughness: 1`. */
  roughnessMap: THREE.Texture | null;
  alphaMap: THREE.Texture | null;
}

/** World units covered by one tile of each texture. Sets the apparent detail size. */
export const SCALE_TILE = 0.22;
export const HORN_TILE = 0.16;
export const KERATIN_TILE = 0.1;
