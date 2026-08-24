import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { createMiniPetalGeometry, miniDetail, miniMesh } from './mini-dragon-geometry';

export interface MiniDragonHeadOrnamentOptions {
  crestScale: number;
  crownCrest: boolean;
  sideFrill: boolean;
}

/** Adds codominant crest forms; horns now live in independent rig parts. */
export function addMiniDragonHeadOrnaments(
  group: THREE.Group,
  dims: Vector3Data,
  coat: THREE.Material,
  options: MiniDragonHeadOrnamentOptions,
): void {
  const { crestScale, crownCrest, sideFrill } = options;

  if (crownCrest) {
    for (const [index, axial] of [-0.24, -0.08, 0.08, 0.24].entries()) {
      const bump = miniMesh(
        new THREE.CapsuleGeometry(
          dims.y * 0.055 * crestScale,
          dims.y * (0.08 + index * 0.015) * crestScale,
          miniDetail(4),
          miniDetail(9),
        ),
        coat,
      );
      bump.name = 'mini-dragon-crown-bump';
      bump.position.set(
        axial * dims.x,
        dims.y * (0.43 + index * 0.012 + (crestScale - 1) * 0.035),
        0,
      );
      bump.rotation.z = -0.18;
      group.add(bump);
    }
  }

  if (sideFrill) {
    for (const side of [-1, 1] as const) {
      for (const [index, lift] of [-0.18, 0, 0.18].entries()) {
        const petalLength = dims.y * (0.19 + index * 0.025) * crestScale;
        const petal = miniMesh(
          createMiniPetalGeometry(
            dims.y * 0.16 * crestScale,
            petalLength,
            dims.z * 0.025,
            0.75,
          ),
          coat,
        );
        petal.name = 'mini-dragon-side-frill';
        petal.position.set(-dims.x * (0.25 + index * 0.035), lift * dims.y, side * dims.z * 0.47);
        petal.rotation.x = side * Math.PI * 0.5;
        petal.rotation.z = -0.55 + index * 0.08;
        group.add(petal);
      }
    }
  }
}
