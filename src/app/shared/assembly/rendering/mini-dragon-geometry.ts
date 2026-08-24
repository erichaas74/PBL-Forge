import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { detailSegments, resolveRenderQuality } from './render-quality';

export interface MiniLoftStation {
  x: number;
  yRadius: number;
  zRadius: number;
  yOffset?: number;
  zOffset?: number;
}

let cachedDetail: ((base: number) => number) | null = null;

/** Mini anatomy follows the same device tier without sharing classic-dragon builders. */
export function miniDetail(base: number): number {
  if (!cachedDetail) {
    const quality = resolveRenderQuality();
    cachedDetail = value => detailSegments(value, quality);
  }
  return cachedDetail(base);
}

/** Shared mesh setup for mini-dragon anatomy. */
export function miniMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

/** Closed elliptical loft running along local X. All measurements are already part-local. */
export function createMiniLoftGeometry(
  stations: readonly MiniLoftStation[],
  radialBase = 20,
): THREE.BufferGeometry {
  const radialSegments = Math.max(6, miniDetail(radialBase));
  const columns = radialSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const [stationIndex, station] of stations.entries()) {
    const along = stationIndex / Math.max(stations.length - 1, 1);
    for (let radial = 0; radial <= radialSegments; radial += 1) {
      const unit = radial / radialSegments;
      const angle = unit * Math.PI * 2;
      positions.push(
        station.x,
        (station.yOffset ?? 0) + Math.cos(angle) * station.yRadius,
        (station.zOffset ?? 0) + Math.sin(angle) * station.zRadius,
      );
      uvs.push(along, unit);
    }
  }

  for (let row = 0; row < stations.length - 1; row += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const a = row * columns + radial;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      // Counter-clockwise from outside the loft. The old a-c-b order pointed
      // normals inward, so front-side materials vanished at grazing angles and
      // made closed skulls look as though they had circular holes in them.
      indices.push(a, b, c, b, d, c);
    }
  }

  const rearCenter = positions.length / 3;
  const rear = stations[0];
  positions.push(rear.x, rear.yOffset ?? 0, rear.zOffset ?? 0);
  uvs.push(0, 0.5);
  const frontCenter = positions.length / 3;
  const front = stations[stations.length - 1];
  positions.push(front.x, front.yOffset ?? 0, front.zOffset ?? 0);
  uvs.push(1, 0.5);
  for (let radial = 0; radial < radialSegments; radial += 1) {
    indices.push(rearCenter, radial + 1, radial);
    const start = (stations.length - 1) * columns + radial;
    indices.push(frontCenter, start, start + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Rounded, slightly thick petal used for ears, frills, feathers, and tail paddles. */
export function createMiniPetalGeometry(
  width: number,
  length: number,
  thickness: number,
  tipRoundness = 0.65,
): THREE.ExtrudeGeometry {
  const half = width / 2;
  const shoulder = Math.max(0.15, Math.min(0.9, tipRoundness));
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-half * 0.85, length * 0.16, -half, length * 0.58, 0, length);
  shape.bezierCurveTo(half * shoulder, length * 0.72, half * 0.9, length * 0.2, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(thickness, 0.001),
    bevelEnabled: true,
    bevelSegments: miniDetail(3),
    bevelSize: Math.min(width, length) * 0.055,
    bevelThickness: Math.max(thickness * 0.42, 0.001),
    curveSegments: miniDetail(10),
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function sampleMiniProfile(
  profile: readonly (readonly [number, number])[],
  axialFraction: number,
): number {
  for (let index = 1; index < profile.length; index += 1) {
    const [fromT, fromRadius] = profile[index - 1];
    const [toT, toRadius] = profile[index];
    if (axialFraction <= toT) {
      const blend = (axialFraction - fromT) / Math.max(toT - fromT, 1e-6);
      return fromRadius + (toRadius - fromRadius) * Math.max(0, Math.min(1, blend));
    }
  }
  return profile[profile.length - 1][1];
}

/** Rounded socket cover seated at an attachment end so animated parts never reveal a gap. */
export function addMiniJointBall(
  group: THREE.Group,
  radius: number,
  material: THREE.Material,
  position: Vector3Data,
): void {
  const ball = miniMesh(
    new THREE.SphereGeometry(Math.max(radius, 0.001), miniDetail(14), miniDetail(10)),
    material,
  );
  ball.name = 'mini-dragon-joint-ball';
  ball.position.set(position.x, position.y, position.z);
  group.add(ball);
}
