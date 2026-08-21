import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import {
  MiniDragonPalette,
  addJointBall,
  coatMaterial,
  mesh,
  visualNumber,
} from './mini-dragon-rendering';

// ---------------------------------------------------------------------------
// Tail and plume.
// ---------------------------------------------------------------------------

const MINI_TAIL_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.42],
  [-0.2, 0.5],
  [0.16, 0.66],
  [0.42, 0.82],
  [0.5, 0.94],
];

export function buildMiniTail(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);

  const lathe = new THREE.LatheGeometry(
    MINI_TAIL_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * dims.x)),
    16,
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  const segment = mesh(lathe, coat);
  segment.name = 'mini-dragon-tail-segment';
  group.add(segment);
  const jointBallScale = visualNumber(part, 'miniJointBall', 1);
  // +X is the body-facing, broad end; -X is the narrow distal end. Match each
  // socket cover to the surface beneath it so neither a gap nor a bead appears.
  addJointBall(group, dims.y * 0.48 * jointBallScale, coat, {
    x: dims.x * 0.47,
    y: 0,
    z: 0,
  });
  addJointBall(group, dims.y * 0.24 * jointBallScale, coat, {
    x: -dims.x * 0.47,
    y: 0,
    z: 0,
  });

  return group;
}

export function buildMiniTailPlume(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const fan = visualNumber(part, 'miniPlumeFan', 0.8);
  const tailStyle = Math.round(visualNumber(part, 'miniTailStyle', 2));
  const coat = coatMaterial(palette.coat);

  const core = mesh(new THREE.SphereGeometry(dims.y * 0.3, 10, 8), coat);
  core.name = 'mini-dragon-plume-core';
  group.add(core);
  addJointBall(group, dims.y * 0.28 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: dims.x * 0.12,
    y: 0,
    z: 0,
  });

  if (tailStyle === 0) {
    const club = mesh(new THREE.SphereGeometry(dims.y * 0.48, 14, 10), coat);
    club.name = 'mini-dragon-star-club';
    club.scale.set(1.15, 1, 1);
    club.position.x = -dims.x * 0.2;
    group.add(club);
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      const lobe = mesh(new THREE.CapsuleGeometry(dims.y * 0.11, dims.y * 0.16, 4, 8), coat);
      lobe.name = 'mini-dragon-star-lobe';
      lobe.position.set(
        -dims.x * 0.2,
        Math.cos(angle) * dims.y * 0.44,
        Math.sin(angle) * dims.z * 0.44,
      );
      lobe.rotation.x = angle;
      group.add(lobe);
    }
    return group;
  }

  if (tailStyle === 1) {
    for (const side of [-1, 1] as const) {
      const fork = mesh(new THREE.CapsuleGeometry(dims.y * 0.18, dims.x * 0.48, 5, 10), coat);
      fork.name = 'mini-dragon-tail-fork';
      fork.rotation.z = Math.PI / 2 + side * 0.42;
      fork.position.set(-dims.x * 0.28, side * dims.y * 0.19, 0);
      fork.scale.z = 0.72;
      group.add(fork);
    }
    return group;
  }

  // One soft pom with a solid heart and six overlapping dimples. The previous
  // ring duplicated its first bubble and read as loose grapes with holes.
  const pomCore = mesh(new THREE.SphereGeometry(dims.y * (0.34 + fan * 0.04), 14, 11), coat);
  pomCore.name = 'mini-dragon-pom-core';
  pomCore.position.x = -dims.x * 0.2;
  pomCore.scale.set(1.18, 1, 1);
  group.add(pomCore);

  const pomRadius = dims.y * (0.19 + fan * 0.035);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bubble = mesh(new THREE.SphereGeometry(pomRadius, 10, 8), coat);
    bubble.name = 'mini-dragon-pom-bubble';
    bubble.position.set(
      -dims.x * (0.2 + (index % 2) * 0.035),
      Math.cos(angle) * dims.y * 0.24,
      Math.sin(angle) * dims.z * 0.24,
    );
    group.add(bubble);
  }

  return group;
}
