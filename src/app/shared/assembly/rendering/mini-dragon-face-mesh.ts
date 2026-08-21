import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { MiniDragonPalette, mesh } from './mini-dragon-rendering';

export type MiniDragonSkullPoint = (direction: THREE.Vector3, lift?: number) => THREE.Vector3;

export interface MiniDragonFaceOptions {
  eyeSize: number;
  earTuft: number;
  earScale: number;
  cheekTuft: number;
}

/** Adds eyes, ears, and cheek tufts to the already-built mini-dragon cranium. */
export function addMiniDragonFace(
  group: THREE.Group,
  dims: Vector3Data,
  palette: MiniDragonPalette,
  coat: THREE.Material,
  skullPoint: MiniDragonSkullPoint,
  options: MiniDragonFaceOptions,
): void {
  const { eyeSize, earTuft, earScale, cheekTuft } = options;
  /*
   * A three-part eye: an ember-coloured iris, a dark pupil, and a catchlight.
   *
   * The first version was one emissive sphere, which on this bright stage
   * saturated to a flat white ball — the animal had two blank dots for eyes. The
   * iris carries the ember gene as a *surface* colour rather than as glow, so it
   * survives the lighting, and the pupil is what actually makes it read as an
   * eye looking back at you.
   */
  const iris = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.ember),
    emissive: new THREE.Color(palette.ember),
    emissiveIntensity: 0.3,
    roughness: 0.28,
    metalness: 0,
  });
  iris.userData['preserveAppearance'] = true;

  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: '#150c06',
    roughness: 0.18,
    metalness: 0,
  });
  pupilMaterial.userData['preserveAppearance'] = true;

  const highlight = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.7,
    roughness: 0.1,
  });
  highlight.userData['preserveAppearance'] = true;

  /*
   * Eyes. Forward on the face, not out on the widest point of the skull, and a
   * sixth of the cranium rather than half of it — the first pass sized them off
   * the part height and produced two balloons larger than the snout.
   */
  for (const side of [-1, 1] as const) {
    const radius = dims.y * 0.075 * (0.8 + eyeSize * 0.5);
    const socket = skullPoint(new THREE.Vector3(1, 0.12, side * 0.52), 0.94);
    const outward = socket.clone().normalize();

    const eye = mesh(new THREE.SphereGeometry(radius, 14, 12), iris);
    eye.name = 'mini-dragon-eye';
    eye.position.copy(socket);
    group.add(eye);

    const pupil = mesh(new THREE.SphereGeometry(radius * 0.52, 10, 8), pupilMaterial);
    pupil.name = 'mini-dragon-pupil';
    pupil.position.copy(socket).addScaledVector(outward, radius * 0.62);
    group.add(pupil);

    const spark = mesh(new THREE.SphereGeometry(radius * 0.24, 8, 6), highlight);
    spark.name = 'mini-dragon-eye-highlight';
    spark.position
      .copy(socket)
      .addScaledVector(outward, radius * 0.78)
      .add(new THREE.Vector3(0, radius * 0.4, side * radius * 0.24));
    group.add(spark);
  }

  /*
   * Ears. The cone and its tuft ride in one group, so the tufts follow the ear
   * when it tilts — placed independently they hung in the air above the head.
   */
  for (const side of [-1, 1] as const) {
    const earLength = dims.y * 0.36 * earScale;
    const earRoot = skullPoint(new THREE.Vector3(-0.24, 0.9, side * 0.5), 0.9);
    const ear = new THREE.Group();
    ear.name = 'mini-dragon-ear';

    const petal = mesh(new THREE.SphereGeometry(dims.y * 0.16, 12, 10), coat);
    petal.name = 'mini-dragon-ear-petal';
    petal.scale.set(0.58, earLength / (dims.y * 0.16), 0.34);
    petal.position.y = earLength * 0.48;
    ear.add(petal);

    const tuft = mesh(new THREE.SphereGeometry(dims.y * (0.025 + earTuft * 0.018), 9, 7), coat);
    tuft.name = 'mini-dragon-ear-tuft';
    tuft.scale.set(0.75, 1.25, 0.75);
    tuft.position.y = earLength * 0.88;
    ear.add(tuft);

    ear.position.copy(earRoot);
    ear.rotation.z = side * -0.34;
    ear.rotation.x = side * -0.4;
    group.add(ear);
  }

  // Small cheek tufts keep the species youthful without carrying a gene.
  for (const side of [-1, 1] as const) {
    const cheek = skullPoint(new THREE.Vector3(0.1, -0.34, side * 0.94), 0.94);
    for (let index = 0; index < 3; index += 1) {
      const cheekScale = mesh(
        new THREE.SphereGeometry(dims.y * (0.035 + cheekTuft * 0.018), 9, 7),
        coat,
      );
      cheekScale.name = 'mini-dragon-cheek-scale';
      cheekScale.scale.set(0.72, 1, 0.48);
      cheekScale.position.set(
        cheek.x - index * dims.x * 0.035,
        cheek.y - index * dims.y * 0.018,
        cheek.z + side * index * dims.z * 0.018,
      );
      group.add(cheekScale);
    }
  }
}
