import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { detail, mesh, revolvedUv, sphereUv } from './dragon-geometry';
import { DragonPalette, glowMaterial, scaleMaterial } from './dragon-materials';
import { getActiveDragonStyle } from './dragon-style';
import { HORN_TILE, SCALE_TILE } from './dragon-texture-constants';
import { visualNumber } from './dragon-visual-parameter-readers';

/** A flattened luminous node shared by body, head, and tail markings. */
export function buildGlowNode(radius: number): THREE.Mesh {
  const node = mesh(
    new THREE.SphereGeometry(Math.max(radius, 0.01), detail(10), detail(8)),
    glowMaterial(),
  );
  node.scale.set(0.55, 1, 1);
  node.castShadow = false;
  node.receiveShadow = false;
  return node;
}

/** Ball scale for one part: its persisted override first, then shared style. */
export function jointBallScale(part: AssemblyPart): number {
  return visualNumber(part, 'jointBall', getActiveDragonStyle().joint.ball);
}

/** Builds a compressed joint collar or an explicitly elliptical socket cap. */
export function buildJointBall(
  radii: number | { x: number; y: number; z: number },
  palette: DragonPalette,
  name: string,
): THREE.Mesh {
  const size = typeof radii === 'number' ? { x: radii, y: radii * 0.72, z: radii } : radii;
  const ball = mesh(
    sphereUv(new THREE.SphereGeometry(1, detail(10), detail(7)), size, SCALE_TILE, palette),
    scaleMaterial(palette),
  );
  ball.scale.set(size.x, size.y, size.z);
  ball.name = name;
  return ball;
}

/** Evenly spaced positions across a centred span. One item sits at the centre. */
export function spreadPositions(count: number, spread: number, center = 0): number[] {
  const total = Math.max(1, Math.round(count));
  if (total === 1) return [center];
  const step = spread / (total - 1);
  return Array.from({ length: total }, (_, index) => center - spread / 2 + index * step);
}

/** Two-segment horn drawn along its local +y axis. */
export function buildHorn(
  length: number,
  baseRadius: number,
  material: THREE.Material,
  palette: DragonPalette,
  curl = -0.18,
): THREE.Group {
  const horn = new THREE.Group();
  const base = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(baseRadius * 0.78, baseRadius, length * 0.62, detail(8)),
      baseRadius * 0.88,
      length * 0.62,
      HORN_TILE,
      palette,
    ),
    material,
  );
  base.position.y = length * 0.31;
  horn.add(base);

  const tipPivot = new THREE.Group();
  tipPivot.position.y = length * 0.62;
  tipPivot.rotation.z = curl;
  const tip = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(baseRadius * 0.05, baseRadius * 0.78, length * 0.44, detail(8)),
      baseRadius * 0.4,
      length * 0.44,
      HORN_TILE,
      palette,
    ),
    material,
  );
  tip.position.y = length * 0.22;
  tipPivot.add(tip);
  horn.add(tipPivot);
  return horn;
}
