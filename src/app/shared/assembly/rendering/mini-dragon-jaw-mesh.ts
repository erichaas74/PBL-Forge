import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import {
  MiniDragonPalette,
  addJointBall,
  coatMaterial,
  emberMaterial,
  hornMaterial,
  mesh,
  visualNumber,
} from './mini-dragon-rendering';

/**
 * Soft lower muzzle with a readable mouth line and two tiny milk teeth.
 *
 * It is a separate part because the show-training rig opens it on the lantern
 * cue. Keeping it in the mini factory preserves the species' matte coat and
 * avoids borrowing the classic dragon's scaled jaw.
 */
export function buildMiniJaw(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);
  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: '#351820',
    roughness: 0.82,
    metalness: 0,
  });

  const lowerMuzzle = mesh(new THREE.SphereGeometry(0.5, 14, 10), coat);
  lowerMuzzle.name = 'mini-dragon-lower-muzzle';
  lowerMuzzle.scale.set(dims.x, dims.y, dims.z);
  group.add(lowerMuzzle);
  addJointBall(group, dims.y * 0.32 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: -dims.x * 0.36,
    y: 0,
    z: 0,
  });

  const mouth = mesh(
    new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mouthMaterial,
  );
  mouth.name = 'mini-dragon-mouth';
  mouth.scale.set(dims.x * 0.78, dims.y * 0.12, dims.z * 0.72);
  mouth.position.set(dims.x * 0.06, dims.y * 0.46, 0);
  group.add(mouth);

  // A small lantern inside the articulated mouth makes ember colour readable
  // during the learned cue without turning the whole face into a light source.
  const emberLantern = mesh(
    new THREE.SphereGeometry(dims.y * 0.22, 10, 8),
    emberMaterial(palette, 1.65),
  );
  emberLantern.name = 'mini-dragon-mouth-ember';
  emberLantern.position.set(dims.x * 0.24, dims.y * 0.32, 0);
  emberLantern.scale.set(1.35, 0.65, 0.88);
  group.add(emberLantern);

  const toothMaterial = hornMaterial(palette);
  for (const side of [-1, 1] as const) {
    const tooth = mesh(new THREE.ConeGeometry(dims.y * 0.12, dims.y * 0.42, 7), toothMaterial);
    tooth.name = 'mini-dragon-milk-tooth';
    tooth.position.set(dims.x * 0.12, dims.y * 0.48, side * dims.z * 0.23);
    tooth.rotation.z = Math.PI;
    group.add(tooth);
  }

  return group;
}
