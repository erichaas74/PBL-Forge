import * as THREE from 'three';
import { MiniDragonPalette } from './mini-dragon-palette';
import {
  miniDragonCoatTextures,
  miniDragonFeatherTextures,
  miniDragonKeratinTextures,
  miniDragonMembraneTextures,
} from './mini-dragon-textures';

function relief(value: number): THREE.Vector2 {
  return new THREE.Vector2(value, value);
}

export function miniCoatMaterial(
  color: THREE.Color,
  textureVariant = 'coat',
  surfaceStyle = 'velvet',
): THREE.MeshStandardMaterial {
  const textures = miniDragonCoatTextures(
    surfaceStyle === 'velvet' ? textureVariant : `${surfaceStyle}-${textureVariant}`,
  );
  const sleek = surfaceStyle === 'sleek';
  const bumpy = surfaceStyle === 'bumpy';
  return new THREE.MeshStandardMaterial({
    color,
    map: textures.map,
    normalMap: textures.normalMap,
    normalScale: relief(bumpy ? 0.48 : sleek ? 0.28 : 0.22),
    roughnessMap: textures.roughnessMap,
    roughness: textures.roughnessMap ? 1 : sleek ? 0.54 : 0.94,
    metalness: 0,
  });
}

export function miniHornMaterial(
  palette: MiniDragonPalette,
  color: THREE.Color = palette.horn,
  textureVariant = 'keratin',
): THREE.MeshStandardMaterial {
  const textures = miniDragonKeratinTextures(textureVariant);
  return new THREE.MeshStandardMaterial({
    color,
    map: textures.map,
    normalMap: textures.normalMap,
    normalScale: relief(0.46),
    roughnessMap: textures.roughnessMap,
    roughness: textures.roughnessMap ? 1 : 0.52,
    metalness: 0.04,
  });
}

export function miniPawMaterial(
  palette: MiniDragonPalette,
  textureVariant = 'paw',
): THREE.MeshStandardMaterial {
  const textures = miniDragonCoatTextures(textureVariant);
  return new THREE.MeshStandardMaterial({
    color: palette.paw,
    map: textures.map,
    normalMap: textures.normalMap,
    normalScale: relief(0.12),
    roughnessMap: textures.roughnessMap,
    roughness: textures.roughnessMap ? 1 : 0.78,
    metalness: 0,
  });
}

export function miniToothMaterial(
  palette: MiniDragonPalette,
  textureVariant = 'keratin',
): THREE.MeshStandardMaterial {
  return miniHornMaterial(palette, palette.tooth, textureVariant);
}

export function miniMouthMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.mouth, roughness: 0.82, metalness: 0 });
}

export function miniEmberMaterial(
  palette: MiniDragonPalette,
  intensity = 1.2,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: palette.mouth,
    emissive: palette.ember,
    emissiveIntensity: intensity,
    roughness: 0.22,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

export function miniWingMembraneMaterial(
  palette: MiniDragonPalette,
  textureVariant = 'membrane',
): THREE.MeshStandardMaterial {
  const textures = miniDragonMembraneTextures(textureVariant);
  return new THREE.MeshStandardMaterial({
    color: palette.membrane,
    emissive: palette.membraneVein,
    emissiveIntensity: 0.07,
    map: textures.map,
    normalMap: textures.normalMap,
    normalScale: relief(0.38),
    roughnessMap: textures.roughnessMap,
    roughness: textures.roughnessMap ? 1 : 0.86,
    alphaMap: textures.alphaMap,
    transparent: true,
    opacity: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

export function miniIrisMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: palette.eye,
    emissive: palette.eye,
    emissiveIntensity: 0.3,
    roughness: 0.28,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

export function miniPupilMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: palette.pupil,
    roughness: 0.18,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

export function miniEyeHighlightMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: palette.eyeHighlight,
    emissive: palette.eyeHighlight,
    emissiveIntensity: 0.7,
    roughness: 0.1,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

export function miniFeatherMaterial(textureVariant = 'feather'): THREE.MeshStandardMaterial {
  const textures = miniDragonFeatherTextures(textureVariant);
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: textures.map,
    alphaMap: textures.alphaMap,
    alphaTest: 0.46,
    transparent: false,
    depthWrite: true,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
}
