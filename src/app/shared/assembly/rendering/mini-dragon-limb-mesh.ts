import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import {
  MiniDragonPalette,
  addJointBall,
  coatMaterial,
  mesh,
  pawMaterial,
  visualNumber,
} from './mini-dragon-rendering';

// ---------------------------------------------------------------------------
// Two-piece leg: rounded hip and thigh, articulated knee, soft paw below.
// ---------------------------------------------------------------------------

const MINI_THIGH_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.58],
  [-0.2, 0.66],
  [0.2, 0.78],
  [0.5, 0.9],
];

export function buildMiniThigh(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);
  const limb = new THREE.LatheGeometry(
    MINI_THIGH_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  const thigh = mesh(limb, coat);
  thigh.name = 'mini-dragon-thigh';
  group.add(thigh);

  // The ball is centred exactly on the body-to-thigh pivot authored by the
  // anatomy builder, so it stays seated in the hip while the leg swings.
  addJointBall(group, dims.x * 0.92 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: dims.y * 0.4,
    z: 0,
  });
  return group;
}

const MINI_LEG_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.62],
  [-0.32, 0.5],
  [-0.05, 0.46],
  [0.22, 0.66],
  [0.42, 0.86],
  [0.5, 0.78],
];

export function buildMiniLeg(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const toeCount = Math.max(2, Math.round(visualNumber(part, 'miniToeCount', 3)));
  const coat = coatMaterial(palette.coat);

  const limb = new THREE.LatheGeometry(
    MINI_LEG_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  const shank = mesh(limb, coat);
  shank.name = 'mini-dragon-shank';
  group.add(shank);
  addJointBall(group, dims.x * 0.82 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: dims.y * 0.4,
    z: 0,
  });

  // Paw: a squashed ball with soft toe beans. No talons — this animal is bred
  // to sit on a lap.
  const paw = mesh(new THREE.SphereGeometry(dims.x * 0.78, 12, 10), coat);
  paw.name = 'mini-dragon-paw';
  paw.scale.set(1, 0.72, 1.05);
  paw.position.y = -dims.y * 0.5;
  group.add(paw);

  const beans = pawMaterial(palette);
  for (let index = 0; index < toeCount; index += 1) {
    const step = toeCount === 1 ? 0 : index / (toeCount - 1) - 0.5;
    const toe = mesh(new THREE.SphereGeometry(dims.x * 0.28, 8, 6), beans);
    toe.name = 'mini-dragon-toe';
    toe.scale.set(1.15, 0.7, 1);
    toe.position.set(dims.x * 0.62, -dims.y * 0.56, step * dims.x * 1.05);
    group.add(toe);
  }

  // A shallow collar blends the knee ball into the narrower shank. It sits
  // inside both meshes instead of forming a separate floating ring.
  const cuff = mesh(new THREE.SphereGeometry(dims.x * 0.68, 12, 9), coat);
  cuff.name = 'mini-dragon-leg-cuff';
  cuff.scale.set(1, 0.34, 1);
  cuff.position.y = dims.y * 0.28;
  group.add(cuff);

  return group;
}
