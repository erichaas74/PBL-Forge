import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { sampleProfile } from './mini-dragon-rendering';

/** `[fraction along the spine, radius as a fraction of the half extents]`. */
export const MINI_BODY_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.34],
  [-0.38, 0.62],
  [-0.2, 0.88],
  [0, 1.0],
  [0.18, 0.98],
  [0.34, 0.86],
  [0.46, 0.66],
  [0.5, 0.5],
];

export function sampleMiniBodyRadius(axialFraction: number): number {
  return sampleProfile(MINI_BODY_PROFILE, axialFraction);
}

/** A point on the torso surface in body-local space. Angle 0 is the belly. */
export function miniBodySurfacePoint(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
): Vector3Data {
  const radius = sampleMiniBodyRadius(axialFraction);
  return {
    x: axialFraction * dimensions.x,
    y: (-Math.cos(angle) * radius * dimensions.y) / 2,
    z: (Math.sin(angle) * radius * dimensions.z) / 2,
  };
}

/** Surface normal for the same generated torso profile, sampled numerically. */
export function miniBodySurfaceNormal(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
): Vector3Data {
  const epsilon = 0.002;
  const fromAxial = miniBodySurfacePoint(dimensions, axialFraction - epsilon, angle);
  const toAxial = miniBodySurfacePoint(dimensions, axialFraction + epsilon, angle);
  const fromAngle = miniBodySurfacePoint(dimensions, axialFraction, angle - epsilon);
  const toAngle = miniBodySurfacePoint(dimensions, axialFraction, angle + epsilon);
  const axialTangent = new THREE.Vector3(
    toAxial.x - fromAxial.x,
    toAxial.y - fromAxial.y,
    toAxial.z - fromAxial.z,
  );
  const angleTangent = new THREE.Vector3(
    toAngle.x - fromAngle.x,
    toAngle.y - fromAngle.y,
    toAngle.z - fromAngle.z,
  );
  const normal = axialTangent.cross(angleTangent).normalize();
  return { x: normal.x, y: normal.y, z: normal.z };
}
