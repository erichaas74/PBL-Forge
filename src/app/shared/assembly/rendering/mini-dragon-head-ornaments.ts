import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { MiniDragonSkullPoint } from './mini-dragon-face-mesh';
import { MiniDragonPalette, hornMaterial, mesh } from './mini-dragon-rendering';

export interface MiniDragonHeadOrnamentOptions {
  hornCurl: number;
  hornLength: number;
  crownCrest: boolean;
  sideFrill: boolean;
}

/** Adds inherited horns and codominant crest forms to a mini-dragon head. */
export function addMiniDragonHeadOrnaments(
  group: THREE.Group,
  dims: Vector3Data,
  palette: MiniDragonPalette,
  coat: THREE.Material,
  skullPoint: MiniDragonSkullPoint,
  options: MiniDragonHeadOrnamentOptions,
): void {
  const { hornCurl, hornLength, crownCrest, sideFrill } = options;
  for (const side of [-1, 1] as const) {
    const hornRoot = skullPoint(new THREE.Vector3(-0.05, 0.82, side * 0.46), 0.9);
    const horn = buildMiniHorn(dims, palette, side, hornCurl, hornLength);
    horn.position.copy(hornRoot);
    group.add(horn);
  }

  if (crownCrest) {
    for (const [index, axial] of [-0.24, -0.08, 0.08, 0.24].entries()) {
      const bump = mesh(
        new THREE.CapsuleGeometry(dims.y * 0.055, dims.y * (0.08 + index * 0.015), 4, 8),
        coat,
      );
      bump.name = 'mini-dragon-crown-bump';
      bump.position.set(axial * dims.x, dims.y * (0.43 + index * 0.012), 0);
      bump.rotation.z = -0.18;
      group.add(bump);
    }
  }

  if (sideFrill) {
    for (const side of [-1, 1] as const) {
      for (const [index, lift] of [-0.18, 0, 0.18].entries()) {
        const petal = mesh(new THREE.SphereGeometry(dims.y * 0.13, 10, 8), coat);
        petal.name = 'mini-dragon-side-frill';
        petal.scale.set(0.48, 1.05, 1.3);
        petal.position.set(-dims.x * (0.25 + index * 0.035), lift * dims.y, side * dims.z * 0.47);
        group.add(petal);
      }
    }
  }
}

/**
 * One horn, swept along a curve whose arc is set by the curl gene.
 *
 * `curl` 0 is a short straight spike angled back; 1 is a full ram coil that
 * wraps down and forward past the ear. The curve is walked as tapered cylinder
 * segments rather than a tube because a tube cannot narrow toward its tip, and a
 * horn that does not taper reads as a pipe.
 */
function buildMiniHorn(
  dims: Vector3Data,
  palette: MiniDragonPalette,
  side: -1 | 1,
  curl: number,
  lengthFactor: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-horn';

  const material = hornMaterial(palette);
  const length = dims.y * 0.72 * Math.max(lengthFactor, 0.15);
  const baseRadius = dims.y * 0.065;
  const segments = 12;
  const sweep = 0.55 + curl * 4.7;
  // Radius of the coil that makes the arc come out `length` long overall.
  const coil = length / sweep;

  const start = new THREE.Vector2(0, 0);
  const heading = new THREE.Vector2(-0.42, 1).normalize();
  // Curve backward and down: the centre sits on the heading's right-hand side.
  const centre = start.clone().add(new THREE.Vector2(heading.y, -heading.x).multiplyScalar(coil));

  const pointAt = (t: number): THREE.Vector3 => {
    const angle = sweep * t;
    const offset = start.clone().sub(centre);
    const rotated = new THREE.Vector2(
      offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
      offset.x * Math.sin(angle) + offset.y * Math.cos(angle),
    );
    const planar = centre.clone().add(rotated);
    // Drift outward as it coils, so a curled horn wraps around the ear rather
    // than through the skull.
    return new THREE.Vector3(planar.x, planar.y, side * t * length * 0.34 * curl);
  };

  for (let index = 0; index < segments; index += 1) {
    const from = pointAt(index / segments);
    const to = pointAt((index + 1) / segments);
    const axis = new THREE.Vector3().subVectors(to, from);
    const height = axis.length();
    if (height < 1e-5) continue;

    const taper = (value: number): number => baseRadius * (1 - 0.74 * value);
    const segment = mesh(
      new THREE.CylinderGeometry(
        taper((index + 1) / segments),
        taper(index / segments),
        height,
        10,
      ),
      material,
    );
    segment.position.copy(from).addScaledVector(axis, 0.5);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    group.add(segment);
  }

  // Cap the tip so a coiled horn does not end in a visible open cylinder.
  const tip = pointAt(1);
  const cap = mesh(new THREE.SphereGeometry(baseRadius * 0.3, 8, 6), material);
  cap.position.copy(tip);
  group.add(cap);

  return group;
}
