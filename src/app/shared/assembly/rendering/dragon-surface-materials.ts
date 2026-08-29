import * as THREE from 'three';
import { DragonPalette } from './dragon-palette';
import {
  dragonHornTextures,
  dragonKeratinTextures,
  dragonMembraneTextures,
  dragonScaleTextures,
  dragonSplotchMask,
  dragonZigzagMask,
  membraneUsesTransmission,
} from './dragon-textures';

function reliefScale(palette: DragonPalette, base: number): THREE.Vector2 {
  const depth = base * palette.surfaceRelief * (0.85 + palette.seed * 0.3);
  return new THREE.Vector2(depth, depth);
}

/**
 * Gives one material its own UV transform without mutating the cached texture
 * shared by every dragon. The cloned wrapper still shares the canvas pixels;
 * only its repeat matrix is private and is disposed with the material.
 */
function detailTexture(texture: THREE.Texture | null, scale: number): THREE.Texture | null {
  if (!texture || scale === 1) return texture;
  const clone = texture.clone();
  clone.repeat.multiplyScalar(scale);
  clone.userData = { ...clone.userData, sharedDragonTexture: false };
  clone.needsUpdate = true;
  return clone;
}

function roughness(palette: DragonPalette, fallback: number): number {
  return Math.max(0, Math.min(1, fallback * palette.surfaceRoughness));
}

function patternMaskOf(palette: DragonPalette): THREE.Texture | null {
  switch (palette.pattern) {
    case 'splotch':
      return dragonSplotchMask();
    case 'zigzag':
      return dragonZigzagMask();
    default:
      return null;
  }
}

/** Applies a second pigment through the scale-pattern mask at shader compile time. */
function applyTwoTonePattern(
  material: THREE.MeshStandardMaterial,
  mask: THREE.Texture,
  base: THREE.Color,
  marking: THREE.Color,
  strength: number,
  scale: number,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['dragonPatternMask'] = { value: mask };
    shader.uniforms['dragonBaseColor'] = { value: base };
    shader.uniforms['dragonPatternColor'] = { value: marking };
    shader.uniforms['dragonPatternStrength'] = { value: strength };
    shader.uniforms['dragonPatternScale'] = { value: scale };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D dragonPatternMask;
        uniform vec3 dragonBaseColor;
        uniform vec3 dragonPatternColor;
        uniform float dragonPatternStrength;
        uniform float dragonPatternScale;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float dragonPattern = texture2D( dragonPatternMask, vMapUv * dragonPatternScale ).r
          * dragonPatternStrength;
        diffuseColor.rgb *= mix( dragonBaseColor, dragonPatternColor, dragonPattern );`,
      );
  };
  material.customProgramCacheKey = () => 'dragon-two-tone-pattern';
}

/** Scale skin. A roughness map must own the full 0..1 roughness range. */
export function scaleMaterial(palette: DragonPalette, relief = 0.9): THREE.MeshStandardMaterial {
  const skin = dragonScaleTextures();
  const mask = patternMaskOf(palette);
  const material = new THREE.MeshStandardMaterial({
    color: mask ? new THREE.Color(0xffffff) : palette.scale,
    map: detailTexture(skin.map, palette.surfaceDetailScale),
    normalMap: detailTexture(skin.normalMap, palette.surfaceDetailScale),
    normalScale: reliefScale(palette, relief),
    roughnessMap: detailTexture(skin.roughnessMap, palette.surfaceDetailScale),
    roughness: roughness(palette, skin.roughnessMap ? 1 : 0.58),
    metalness: 0.015,
  });

  if (mask) {
    applyTwoTonePattern(
      material,
      mask,
      palette.scale,
      palette.patternColor ?? palette.scaleDeep,
      (palette.pattern === 'zigzag' ? 0.52 : 0.7) * palette.surfacePatternStrength,
      (palette.pattern === 'zigzag' ? 0.5 : 0.55) * palette.surfacePatternScale,
    );
  }
  return material;
}

export function bellyMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const skin = dragonScaleTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.scaleDeep,
    map: detailTexture(skin.map, palette.surfaceDetailScale),
    normalMap: detailTexture(skin.normalMap, palette.surfaceDetailScale),
    normalScale: reliefScale(palette, 0.6),
    roughnessMap: detailTexture(skin.roughnessMap, palette.surfaceDetailScale),
    roughness: roughness(palette, skin.roughnessMap ? 1 : 0.66),
    metalness: 0,
  });
}

export function hornMaterial(
  palette: DragonPalette,
  side: THREE.Side = THREE.FrontSide,
): THREE.MeshStandardMaterial {
  const keratin = dragonHornTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.horn,
    map: detailTexture(keratin.map, palette.surfaceDetailScale),
    normalMap: detailTexture(keratin.normalMap, palette.surfaceDetailScale),
    normalScale: reliefScale(palette, 0.75),
    roughnessMap: detailTexture(keratin.roughnessMap, palette.surfaceDetailScale),
    roughness: roughness(palette, keratin.roughnessMap ? 1 : 0.42),
    metalness: 0.015,
    side,
  });
}

export function clawMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const keratin = dragonKeratinTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.claw,
    map: detailTexture(keratin.map, palette.surfaceDetailScale),
    normalMap: detailTexture(keratin.normalMap, palette.surfaceDetailScale),
    normalScale: reliefScale(palette, 0.5),
    roughnessMap: detailTexture(keratin.roughnessMap, palette.surfaceDetailScale),
    roughness: roughness(palette, keratin.roughnessMap ? 1 : 0.4),
    metalness: 0.02,
  });
}

export function toothMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const keratin = dragonKeratinTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.tooth,
    normalMap: detailTexture(keratin.normalMap, palette.surfaceDetailScale),
    normalScale: reliefScale(palette, 0.35),
    roughness: roughness(palette, 0.35),
    metalness: 0.02,
  });
}

/** Thin wing skin with high-tier transmission and a lower-tier alpha fallback. */
export function membraneMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const skin = dragonMembraneTextures();
  const shared = {
    color: palette.membrane,
    map: skin.map,
    normalMap: skin.normalMap,
    normalScale: reliefScale(palette, 0.7),
    roughnessMap: skin.roughnessMap,
    roughness: roughness(palette, skin.roughnessMap ? 1 : 0.62),
    alphaMap: skin.alphaMap,
    metalness: 0,
    transparent: true,
    opacity: skin.alphaMap ? 0.97 : 0.84,
    side: THREE.DoubleSide,
  };

  if (!membraneUsesTransmission()) return new THREE.MeshStandardMaterial(shared);

  return new THREE.MeshPhysicalMaterial({
    ...shared,
    transmission: 0.07,
    thickness: 0.02,
    ior: 1.35,
  });
}

export function nostrilMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.scaleDeep, roughness: 0.7 });
}
