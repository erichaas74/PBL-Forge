import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { createMiniPetalGeometry, miniDetail, miniMesh } from './mini-dragon-geometry';
import {
  miniEyeHighlightMaterial,
  miniIrisMaterial,
  miniPupilMaterial,
} from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { markSpecimenEyelid } from './specimen-facial-animation';

export type MiniDragonSkullPoint = (direction: THREE.Vector3, lift?: number) => THREE.Vector3;

export interface MiniDragonFaceOptions {
  eyeSize: number;
  eyeSpacing: number;
  cheekTuft: number;
}

/** Adds eyes and cheek tufts to the already-built mini-dragon cranium. */
export function addMiniDragonFace(
  group: THREE.Group,
  dims: Vector3Data,
  palette: MiniDragonPalette,
  coat: THREE.Material,
  skullPoint: MiniDragonSkullPoint,
  options: MiniDragonFaceOptions,
): void {
  const { eyeSize, eyeSpacing, cheekTuft } = options;
  /*
   * A three-part eye: an ember-coloured iris, a dark pupil, and a catchlight.
   *
   * The first version was one emissive sphere, which on this bright stage
   * saturated to a flat white ball — the animal had two blank dots for eyes. The
   * iris carries the ember gene as a *surface* colour rather than as glow, so it
   * survives the lighting, and the pupil is what actually makes it read as an
   * eye looking back at you.
   */
  const iris = miniIrisMaterial(palette);
  const pupilMaterial = miniPupilMaterial(palette);
  const highlight = miniEyeHighlightMaterial(palette);

  /*
   * Eyes. Forward on the face, not out on the widest point of the skull, and a
   * sixth of the cranium rather than half of it — the first pass sized them off
   * the part height and produced two balloons larger than the snout.
   */
  for (const side of [-1, 1] as const) {
    const radius = dims.y * 0.075 * (0.8 + eyeSize * 0.5);
    const socket = skullPoint(new THREE.Vector3(1, 0.12, side * 0.52 * eyeSpacing), 0.94);
    const outward = socket.clone().normalize();

    const eye = miniMesh(
      new THREE.SphereGeometry(radius, miniDetail(16), miniDetail(12)),
      iris,
    );
    eye.name = 'mini-dragon-eye';
    eye.position.copy(socket);
    group.add(eye);

    const pupil = miniMesh(
      new THREE.SphereGeometry(radius * 0.52, miniDetail(12), miniDetail(9)),
      pupilMaterial,
    );
    pupil.name = 'mini-dragon-pupil';
    pupil.position.copy(socket).addScaledVector(outward, radius * 0.62);
    group.add(pupil);

    const spark = miniMesh(
      new THREE.SphereGeometry(radius * 0.24, miniDetail(9), miniDetail(7)),
      highlight,
    );
    spark.name = 'mini-dragon-eye-highlight';
    spark.position
      .copy(socket)
      .addScaledVector(outward, radius * 0.78)
      .add(new THREE.Vector3(0, radius * 0.4, side * radius * 0.24));
    group.add(spark);

    const upperLid = miniMesh(
      new THREE.SphereGeometry(
        radius * 1.075,
        miniDetail(16),
        miniDetail(9),
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.49,
      ),
      coat,
    );
    upperLid.name = 'mini-dragon-upper-eyelid';
    markSpecimenEyelid(
      upperLid,
      socket.clone().add(new THREE.Vector3(0, radius * 0.92, 0)),
      socket.clone().add(new THREE.Vector3(0, radius * 0.015, 0)),
    );
    group.add(upperLid);

    const lowerLid = miniMesh(
      new THREE.SphereGeometry(
        radius * 1.075,
        miniDetail(16),
        miniDetail(9),
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.49,
      ),
      coat,
    );
    lowerLid.name = 'mini-dragon-lower-eyelid';
    lowerLid.rotation.z = Math.PI;
    markSpecimenEyelid(
      lowerLid,
      socket.clone().add(new THREE.Vector3(0, -radius * 0.92, 0)),
      socket.clone().add(new THREE.Vector3(0, -radius * 0.015, 0)),
    );
    group.add(lowerLid);
  }

  // Small cheek tufts keep the species youthful without carrying a gene.
  for (const side of [-1, 1] as const) {
    const cheek = skullPoint(new THREE.Vector3(0.1, -0.34, side * 0.94), 0.94);
    const cheekVolume = miniMesh(
      new THREE.SphereGeometry(dims.y * 0.12, miniDetail(14), miniDetail(10)),
      coat,
    );
    cheekVolume.name = 'mini-dragon-cheek-volume';
    cheekVolume.scale.set(0.9, 1.05, 0.55 + cheekTuft * 0.16);
    cheekVolume.position.copy(cheek).multiplyScalar(0.96);
    group.add(cheekVolume);
    for (let index = 0; index < 3; index += 1) {
      const cheekScale = miniMesh(
        createMiniPetalGeometry(
          dims.y * (0.035 + cheekTuft * 0.018),
          dims.y * (0.07 + cheekTuft * 0.025),
          dims.z * 0.012,
          0.5,
        ),
        coat,
      );
      cheekScale.name = 'mini-dragon-cheek-scale';
      cheekScale.position.set(
        cheek.x - index * dims.x * 0.035,
        cheek.y - index * dims.y * 0.018,
        cheek.z + side * index * dims.z * 0.018,
      );
      cheekScale.rotation.x = side * Math.PI * 0.48;
      cheekScale.rotation.z = -0.55 - index * 0.08;
      group.add(cheekScale);
    }
  }
}
