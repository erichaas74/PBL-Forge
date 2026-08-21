import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import {
  MINI_BODY_PROFILE,
  miniBodySurfacePoint,
  sampleMiniBodyRadius,
} from './mini-dragon-anatomy';
import { addMiniBodyFeathers } from './mini-dragon-feathers';
import {
  MiniDragonPalette,
  addJointBall,
  coatMaterial,
  emberMaterial,
  mesh,
  visualNumber,
} from './mini-dragon-rendering';

/** Three orderly rows of rounded scales; the recessive form grows soft baby spikes. */
export function buildMiniDorsalScales(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-dorsal-scale-rows';
  const dims = part.dimensions;
  const bumpy = visualNumber(part, 'miniDorsalBumps', 0) >= 0.5;
  const baseMaterial = coatMaterial(palette.coat.clone().lerp(new THREE.Color('#fff4d6'), 0.08));
  const patchMaterial = coatMaterial(palette.patch);
  const rowAngles = [Math.PI - 0.42, Math.PI, Math.PI + 0.42] as const;
  const stations = [-0.38, -0.25, -0.12, 0.01, 0.14, 0.27, 0.38] as const;

  for (const [rowIndex, angle] of rowAngles.entries()) {
    for (const [stationIndex, axial] of stations.entries()) {
      const root = miniBodySurfacePoint(dims, axial, angle);
      const material =
        !palette.patch.equals(palette.coat) && (stationIndex + rowIndex) % 4 < 2
          ? patchMaterial
          : baseMaterial;
      const scaleRadius = dims.y * (bumpy ? 0.052 : 0.045);
      const scale = mesh(new THREE.SphereGeometry(scaleRadius, 10, 7), material);
      scale.name = bumpy ? 'mini-dragon-bumpy-scale' : 'mini-dragon-smooth-scale';
      scale.position.set(root.x, root.y + scaleRadius * 0.18, root.z);
      scale.scale.set(1.25, bumpy ? 0.72 : 0.34, 0.9);
      group.add(scale);

      if (!bumpy) continue;
      const spikeHeight = dims.y * (rowIndex === 1 ? 0.105 : 0.078);
      const spike = mesh(
        new THREE.CapsuleGeometry(scaleRadius * 0.46, spikeHeight, 4, 8),
        material,
      );
      spike.name = 'mini-dragon-baby-spike';
      spike.position.set(root.x - dims.x * 0.012, root.y + spikeHeight * 0.56, root.z);
      spike.rotation.z = -0.16;
      group.add(spike);
    }
  }

  return group;
}

/** A separate neck gives learned cues a second expressive hinge behind the head. */
export function buildMiniNeck(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const neck = mesh(
    new THREE.CapsuleGeometry(dims.z * 0.34, dims.x * 0.48, 6, 12),
    coatMaterial(palette.coat),
  );
  neck.name = 'mini-dragon-neck';
  neck.rotation.z = Math.PI / 2.7;
  neck.scale.set(1, 1, dims.y / Math.max(dims.z, 0.001));
  group.add(neck);
  addJointBall(
    group,
    dims.z * 0.25 * visualNumber(part, 'miniJointBall', 1),
    coatMaterial(palette.coat),
    { x: 0, y: 0, z: 0 },
  );
  return group;
}

export function buildMiniBody(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);
  const twoToned = !palette.patch.equals(palette.coat);
  const patchCoat = twoToned ? coatMaterial(palette.patch) : undefined;
  // Keep these tufts sparse enough that the inherited dorsal rows remain the
  // readable silhouette feature.

  const barrel = new THREE.LatheGeometry(
    MINI_BODY_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * dims.x)),
    22,
  );
  barrel.rotateZ(-Math.PI / 2);
  barrel.scale(1, dims.y / 2, dims.z / 2);
  const torso = mesh(barrel, coat);
  torso.name = 'mini-dragon-torso';
  group.add(torso);

  // LatheGeometry leaves both axial ends open. Close those large cuts so the
  // only openings the assembled animal suggests are the deliberately sized
  // neck and tail sockets below.
  for (const side of [-1, 1] as const) {
    const endRadius = sampleMiniBodyRadius(side * 0.5);
    const cap = mesh(new THREE.CircleGeometry(1, 28), coat);
    cap.name = side > 0 ? 'mini-dragon-front-body-cap' : 'mini-dragon-rear-body-cap';
    cap.position.x = side * dims.x * 0.5;
    cap.rotation.y = (side * Math.PI) / 2;
    cap.scale.set(endRadius * dims.z * 0.5, endRadius * dims.y * 0.5, 1);
    group.add(cap);
  }

  // Recessed cups beneath the two axial attachment balls. The neck pivot is
  // authored at (+.38, +.28) of the torso and the shortened tail's root ball
  // lands at about (-.42, +.08), so these rims remain visible around the balls
  // instead of making either appendage look pasted onto an unbroken hide.
  addMiniBodySocket(
    group,
    dims,
    palette,
    'neck',
    { x: dims.x * 0.38, y: dims.y * 0.28, z: 0 },
    new THREE.Vector3(0.58, 0.82, 0),
  );
  addMiniBodySocket(
    group,
    dims,
    palette,
    'tail',
    { x: -dims.x * 0.42, y: dims.y * 0.08, z: 0 },
    new THREE.Vector3(-0.96, 0.28, 0),
  );

  /*
   * Two-tone coat. A codominant specimen carries both alleles' colours at once,
   * so the second colour has to appear as its own area on the animal rather than
   * as a blend — a blended midpoint would be indistinguishable from a third
   * allele, which is exactly the confusion this locus exists to break.
   *
   * Blotches on the hide and alternating dorsal scales carry both colours.
   */
  if (patchCoat) {
    const patches: readonly (readonly [number, number, number])[] = [
      [-0.2, 1.45, 0.8],
      [0.1, 2.0, 0.95],
      [0.3, 1.0, 0.66],
    ];
    for (const [axial, angle, size] of patches) {
      for (const side of [-1, 1] as const) {
        const point = miniBodySurfacePoint(dims, axial, angle * side);
        const blob = mesh(new THREE.SphereGeometry(dims.y * 0.13 * size, 12, 9), patchCoat);
        blob.name = 'mini-dragon-coat-patch';
        blob.position.set(point.x, point.y, point.z);
        // Sink the blob so only the cap shows, reading as a patch of coat rather
        // than a ball stuck to the flank.
        blob.position.multiplyScalar(0.88);
        blob.scale.set(1.6, 0.72, 0.88);
        group.add(blob);
      }
    }
  }

  addMiniBodyFeathers(group, part, palette);

  // Throat glow, tucked under the neck.
  const throat = mesh(new THREE.SphereGeometry(dims.y * 0.11, 10, 8), emberMaterial(palette, 0.7));
  throat.name = 'mini-dragon-throat-ember';
  const throatPoint = miniBodySurfacePoint(dims, 0.3, 0.25);
  throat.position.set(throatPoint.x, throatPoint.y * 0.94, throatPoint.z);
  group.add(throat);

  return group;
}

/** A shallow visual socket whose normal points toward the attached appendage. */
function addMiniBodySocket(
  group: THREE.Group,
  dims: Vector3Data,
  palette: MiniDragonPalette,
  kind: 'neck' | 'tail',
  position: Vector3Data,
  normal: THREE.Vector3,
): void {
  const radius = dims.y * 0.12;
  const direction = normal.clone().normalize();
  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    direction,
  );
  const cavityMaterial = coatMaterial(palette.coatDeep.clone().multiplyScalar(0.55));
  const rimMaterial = coatMaterial(palette.coat.clone().multiplyScalar(0.86));

  const cavity = mesh(new THREE.CircleGeometry(radius * 0.82, 24), cavityMaterial);
  cavity.name = `mini-dragon-${kind}-socket-cavity`;
  cavity.position
    .set(position.x, position.y, position.z)
    .addScaledVector(direction, radius * 0.035);
  cavity.quaternion.copy(orientation);
  group.add(cavity);

  const rim = mesh(new THREE.TorusGeometry(radius * 0.88, radius * 0.13, 8, 24), rimMaterial);
  rim.name = `mini-dragon-${kind}-socket-rim`;
  rim.position.set(position.x, position.y, position.z).addScaledVector(direction, radius * 0.055);
  rim.quaternion.copy(orientation);
  group.add(rim);
}
