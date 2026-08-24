import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import { MiniLoftStation, sampleMiniProfile } from './mini-dragon-geometry';
import {
  DEFAULT_MINI_DRAGON_BODY_MORPHOLOGY,
  MiniDragonBodyMorphology,
  miniBodyMorphology,
} from './mini-dragon-morphology';

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
  return sampleMiniProfile(MINI_BODY_PROFILE, axialFraction);
}

/** A point on the torso surface in body-local space. Angle 0 is the belly. */
export function miniBodySurfacePoint(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
  morphology: MiniDragonBodyMorphology = DEFAULT_MINI_DRAGON_BODY_MORPHOLOGY,
): Vector3Data {
  const section = miniBodySection(dimensions, axialFraction, morphology);
  return {
    x: axialFraction * dimensions.x,
    y: section.yOffset - Math.cos(angle) * section.yRadius,
    z: Math.sin(angle) * section.zRadius,
  };
}

/** Surface normal for the same generated torso profile, sampled numerically. */
export function miniBodySurfaceNormal(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
  morphology: MiniDragonBodyMorphology = DEFAULT_MINI_DRAGON_BODY_MORPHOLOGY,
): Vector3Data {
  const epsilon = 0.002;
  const fromAxial = miniBodySurfacePoint(dimensions, axialFraction - epsilon, angle, morphology);
  const toAxial = miniBodySurfacePoint(dimensions, axialFraction + epsilon, angle, morphology);
  const fromAngle = miniBodySurfacePoint(dimensions, axialFraction, angle - epsilon, morphology);
  const toAngle = miniBodySurfacePoint(dimensions, axialFraction, angle + epsilon, morphology);
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

/** Stations for the connected torso loft. Dorsal rows and feathers sample the same equation. */
export function miniBodyLoftStations(part: AssemblyPart): readonly MiniLoftStation[] {
  const morphology = miniBodyMorphology(part);
  return [-0.5, -0.42, -0.32, -0.2, -0.08, 0.05, 0.18, 0.3, 0.4, 0.48, 0.5]
    .map(axial => {
      const section = miniBodySection(part.dimensions, axial, morphology);
      return {
        x: axial * part.dimensions.x,
        yRadius: section.yRadius,
        zRadius: section.zRadius,
        yOffset: section.yOffset,
      };
    });
}

function miniBodySection(
  dimensions: Vector3Data,
  axialFraction: number,
  morphology: MiniDragonBodyMorphology,
): { yRadius: number; zRadius: number; yOffset: number } {
  const radius = sampleMiniBodyRadius(axialFraction);
  const chest = bell(axialFraction, 0.22, 0.21);
  const hip = bell(axialFraction, -0.23, 0.2);
  const waist = bell(axialFraction, -0.01, 0.16);
  const middle = bell(axialFraction, 0, 0.38);
  const lateralScale = Math.max(
    0.35,
    1
      + (morphology.chestScale - 1) * chest
      + (morphology.hipScale - 1) * hip
      + (morphology.waistScale - 1) * waist,
  );
  const verticalScale = Math.max(
    0.35,
    1
      + (morphology.chestScale - 1) * chest * 0.46
      + (morphology.hipScale - 1) * hip * 0.4
      + (morphology.bellyScale - 1) * middle * 0.72,
  );
  const yRadius = radius * dimensions.y * 0.5 * verticalScale;
  const zRadius = radius * dimensions.z * 0.5 * lateralScale;
  const arch = morphology.spineArch * dimensions.y * middle * 0.34;
  const bellyDrop = Math.max(0, morphology.bellyScale - 1) * dimensions.y * middle * 0.08;
  return { yRadius, zRadius, yOffset: arch - bellyDrop };
}

function bell(value: number, center: number, width: number): number {
  const distance = (value - center) / Math.max(width, 1e-6);
  return Math.exp(-distance * distance);
}
