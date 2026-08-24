import * as THREE from 'three';
import { Vector3Data } from '../domain/assembly.models';
import { createMiniLoftGeometry } from './mini-dragon-geometry';
import { MiniDragonHeadMorphology } from './mini-dragon-morphology';

export interface MiniDragonSkullShape {
  geometry: THREE.BufferGeometry;
  point: (direction: THREE.Vector3, lift?: number) => THREE.Vector3;
  radii: THREE.Vector3;
}

/** A neotenous skull loft: broad braincase, tucked forehead, and a real muzzle root. */
export function createMiniDragonSkullShape(
  dims: Vector3Data,
  morphology: MiniDragonHeadMorphology,
): MiniDragonSkullShape {
  const radii = new THREE.Vector3(
    dims.x * 0.48 * morphology.skullLength,
    dims.y * 0.5 * morphology.skullHeight,
    dims.z * 0.5 * morphology.skullWidth,
  );
  const stations = [
    [-1, 0.28, 0.32, 0],
    [-0.82, 0.7, 0.76, 0.04],
    [-0.52, 0.96, 1, 0.08],
    [-0.12, 1, 1.02, 0.04],
    [0.25, 0.9, 0.94, -0.02],
    [0.55, 0.7, 0.74, -0.08],
    [0.78, 0.42, 0.48, -0.13],
    [0.86, 0.2, 0.24, -0.15],
  ] as const;
  const geometry = createMiniLoftGeometry(
    stations.map(([x, y, z, offset]) => ({
      x: x * radii.x,
      yRadius: y * radii.y,
      zRadius: z * radii.z,
      yOffset: offset * radii.y,
    })),
    26,
  );

  const point = (direction: THREE.Vector3, lift = 1): THREE.Vector3 => {
    const unit = direction.clone().normalize();
    const denominator = Math.sqrt(
      (unit.x / radii.x) ** 2
      + (unit.y / radii.y) ** 2
      + (unit.z / radii.z) ** 2,
    );
    return unit.multiplyScalar((1 / Math.max(denominator, 1e-6)) * lift);
  };

  return { geometry, point, radii };
}

/** Soft tapered muzzle whose root blends into the skull instead of floating in front of it. */
export function createMiniDragonMuzzleGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  return createMiniLoftGeometry([
    { x: -length * 0.48, yRadius: height * 0.48, zRadius: width * 0.5 },
    { x: -length * 0.2, yRadius: height * 0.55, zRadius: width * 0.58 },
    { x: length * 0.16, yRadius: height * 0.5, zRadius: width * 0.54 },
    { x: length * 0.42, yRadius: height * 0.38, zRadius: width * 0.44 },
    { x: length * 0.5, yRadius: height * 0.22, zRadius: width * 0.28 },
  ], 18);
}
