import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import {
  addMiniJointBall,
  createMiniLoftGeometry,
  miniDetail,
  miniMesh,
} from './mini-dragon-geometry';
import {
  miniCoatMaterial,
  miniEmberMaterial,
  miniMouthMaterial,
  miniToothMaterial,
} from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniToothCount } from './mini-dragon-morphology';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

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
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const mouthMaterial = miniMouthMaterial(palette);

  const lowerMuzzle = miniMesh(createMiniLoftGeometry([
    { x: -dims.x * 0.5, yRadius: dims.y * 0.42, zRadius: dims.z * 0.4 },
    { x: -dims.x * 0.18, yRadius: dims.y * 0.58, zRadius: dims.z * 0.53 },
    { x: dims.x * 0.22, yRadius: dims.y * 0.5, zRadius: dims.z * 0.48 },
    { x: dims.x * 0.48, yRadius: dims.y * 0.3, zRadius: dims.z * 0.34 },
  ], 18), coat);
  lowerMuzzle.name = 'mini-dragon-lower-muzzle';
  group.add(lowerMuzzle);
  addMiniJointBall(group, dims.y * 0.32 * miniVisualNumber(part, 'miniJointBall', 1), coat, {
    x: -dims.x * 0.36,
    y: 0,
    z: 0,
  });

  const mouth = miniMesh(
    new THREE.SphereGeometry(
      0.5,
      miniDetail(14),
      miniDetail(9),
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.56,
    ),
    mouthMaterial,
  );
  mouth.name = 'mini-dragon-mouth';
  mouth.scale.set(dims.x * 0.78, dims.y * 0.12, dims.z * 0.72);
  mouth.position.set(dims.x * 0.06, dims.y * 0.46, 0);
  group.add(mouth);

  // A small lantern inside the articulated mouth makes ember colour readable
  // during the learned cue without turning the whole face into a light source.
  const emberLantern = miniMesh(
    new THREE.SphereGeometry(dims.y * 0.22, miniDetail(11), miniDetail(9)),
    miniEmberMaterial(palette, 1.65),
  );
  emberLantern.name = 'mini-dragon-mouth-ember';
  emberLantern.position.set(dims.x * 0.24, dims.y * 0.32, 0);
  emberLantern.scale.set(1.35, 0.65, 0.88);
  group.add(emberLantern);

  const toothMaterial = miniToothMaterial(palette, `${part.id}-teeth`);
  const toothCount = miniToothCount(part);
  for (let index = 0; index < toothCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const tooth = miniMesh(
      new THREE.ConeGeometry(dims.y * 0.1, dims.y * 0.36, miniDetail(8)),
      toothMaterial,
    );
    tooth.name = 'mini-dragon-milk-tooth';
    tooth.position.set(
      dims.x * (0.18 - row * 0.2),
      dims.y * 0.46,
      side * dims.z * (0.2 + row * 0.06),
    );
    tooth.rotation.z = Math.PI;
    group.add(tooth);
  }

  return group;
}
