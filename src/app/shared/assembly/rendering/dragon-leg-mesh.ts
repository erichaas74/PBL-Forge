import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildJointBall, jointBallScale } from './dragon-anatomy';
import { detail, latheProfileRadius, mesh, revolvedUv } from './dragon-geometry';
import { DragonPalette, scaleMaterial } from './dragon-materials';
import { SCALE_TILE } from './dragon-texture-constants';

/**
 * Limb meshes fill their physics volume, like every other part here. They used
 * to render at half scale with a compensating lift, which left every socket on
 * the chain — hip, knee, ankle — pointing at empty space: the joints were
 * correct, the geometry attached to them was not.
 */
const LEG_PROFILE: readonly [number, number][] = [
  [-0.5, 0.55],
  [-0.35, 0.6],
  [-0.12, 0.52],
  [0.15, 0.72],
  [0.38, 0.95],
  [0.5, 0.88],
];

/**
 * Where a leg's upper joint sits along its own length, as a fraction of it.
 *
 * Read off the shipped skeleton rather than chosen: every hip and knee in the
 * pack puts `pivotOnChild.y` at 0.40 of the segment's height — 0.24 of 0.6 on a
 * foreleg, 0.264 of 0.66 on a hind, and the lower legs within a hundredth of
 * the same. The lower joint is simpler: it is the end of the part, at -0.5.
 *
 * A ball has to sit on the pivot, not on the rim, or it swings with the part
 * and opens the gap it was added to close.
 */
const LEG_SOCKET_T = 0.4;

export function buildDragonLeg(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const lathe = new THREE.LatheGeometry(
    LEG_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    detail(16),
  );
  revolvedUv(lathe, dims.x * 0.7, dims.y, SCALE_TILE, palette);
  const skin = mesh(lathe, scaleMaterial(palette));
  skin.name = 'dragon-leg-skin';
  group.add(skin);

  addLimbJointBalls(group, part, palette, LEG_PROFILE, 'dragon-leg');
  return group;
}

/**
 * The two balls every limb segment carries.
 *
 * Both ends, because one segment is two different joints depending on where it
 * sits in the chain: an upper leg's top ball is a hip and its bottom one a knee
 * cap, and on the lower leg the same two are the other half of that knee and
 * the ankle. The socket ball is mostly swallowed by whatever it plugs into —
 * the body at the hip, the thigh at the knee — which is the intended look.
 */
export function addLimbJointBalls(
  group: THREE.Group,
  part: AssemblyPart,
  palette: DragonPalette,
  profile: readonly [number, number][],
  namePrefix: string,
): void {
  const dims = part.dimensions;
  const scale = jointBallScale(part);

  const socket = buildJointBall(
    latheProfileRadius(profile, LEG_SOCKET_T) * dims.x * scale,
    palette,
    `${namePrefix}-socket-ball`,
  );
  socket.position.y = LEG_SOCKET_T * dims.y;
  group.add(socket);

  const heel = buildJointBall(
    latheProfileRadius(profile, -0.5) * dims.x * scale,
    palette,
    `${namePrefix}-heel-ball`,
  );
  heel.position.y = -0.5 * dims.y;
  group.add(heel);
}
