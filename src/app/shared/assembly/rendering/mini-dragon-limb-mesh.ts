import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniJointBall, miniDetail, miniMesh } from './mini-dragon-geometry';
import { miniCoatMaterial, miniPawMaterial } from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniLimbMorphology } from './mini-dragon-morphology';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

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
  const morphology = miniLimbMorphology(part);
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const limb = new THREE.LatheGeometry(
    MINI_THIGH_PROFILE.map(([t, radius]) =>
      new THREE.Vector2(radius * dims.x * morphology.thickness, t * dims.y)),
    miniDetail(16),
  );
  const thigh = miniMesh(limb, coat);
  thigh.name = 'mini-dragon-thigh';
  group.add(thigh);

  // The ball is centred exactly on the body-to-thigh pivot authored by the
  // anatomy builder, so it stays seated in the hip while the leg swings.
  addMiniJointBall(
    group,
    dims.x * 0.92 * morphology.thickness * miniVisualNumber(part, 'miniJointBall', 1),
    coat,
    {
    x: 0,
    y: dims.y * 0.4,
    z: 0,
    },
  );
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
  const toeCount = Math.max(2, Math.round(miniVisualNumber(part, 'miniToeCount', 3)));
  const morphology = miniLimbMorphology(part);
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);

  const limb = new THREE.LatheGeometry(
    MINI_LEG_PROFILE.map(([t, radius]) =>
      new THREE.Vector2(radius * dims.x * morphology.thickness, t * dims.y)),
    miniDetail(16),
  );
  const shank = miniMesh(limb, coat);
  shank.name = 'mini-dragon-shank';
  group.add(shank);
  addMiniJointBall(group, dims.x * 0.82 * morphology.thickness * miniVisualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: dims.y * 0.4,
    z: 0,
  });

  // Paw: a squashed ball with soft toe beans. No talons — this animal is bred
  // to sit on a lap.
  const pawRadius = dims.x * 0.72 * morphology.pawScale;
  const paw = miniMesh(
    new THREE.SphereGeometry(pawRadius, miniDetail(16), miniDetail(11)),
    coat,
  );
  paw.name = 'mini-dragon-paw';
  paw.scale.set(1.22, 0.62, 1.08);
  paw.position.y = -dims.y * 0.5;
  group.add(paw);

  const beans = miniPawMaterial(palette, `${part.id}-paw`);
  const pad = miniMesh(
    new THREE.SphereGeometry(pawRadius * 0.58, miniDetail(13), miniDetail(9)),
    beans,
  );
  pad.name = 'mini-dragon-paw-pad';
  pad.scale.set(1.18, 0.18, 0.92);
  pad.position.set(pawRadius * 0.08, -dims.y * 0.5 - pawRadius * 0.42, 0);
  group.add(pad);

  for (let index = 0; index < toeCount; index += 1) {
    const step = toeCount === 1 ? 0 : index / (toeCount - 1) - 0.5;
    const toeRadius = dims.x * 0.18 * morphology.pawScale;
    const toe = miniMesh(
      new THREE.CapsuleGeometry(
        toeRadius,
        dims.x * 0.22 * morphology.pawScale,
        miniDetail(4),
        miniDetail(8),
      ),
      beans,
    );
    toe.name = 'mini-dragon-toe';
    toe.rotation.z = Math.PI / 2;
    toe.rotation.y = -step * 0.32;
    toe.position.set(
      pawRadius * 0.98,
      -dims.y * 0.53,
      step * dims.x * 1.08 * morphology.pawScale * morphology.toeSplay,
    );
    group.add(toe);
  }

  // A shallow collar blends the knee ball into the narrower shank. It sits
  // inside both meshes instead of forming a separate floating ring.
  const cuff = miniMesh(
    new THREE.SphereGeometry(
      dims.x * 0.68 * morphology.thickness,
      miniDetail(14),
      miniDetail(10),
    ),
    coat,
  );
  cuff.name = 'mini-dragon-leg-cuff';
  cuff.scale.set(1, 0.34, 1);
  cuff.position.y = dims.y * 0.28;
  group.add(cuff);

  return group;
}
