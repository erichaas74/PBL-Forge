import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AssemblyPart } from '../domain/assembly.models';
import { positiveNumber } from '../domain/vector-data';

export interface AssemblyMaterialOptions {
  emissive?: number;
  emissiveIntensity?: number;
}

export function createAssemblyGeometry(part: AssemblyPart): THREE.BufferGeometry {
  const dimensions = part.dimensions;
  let geometry: THREE.BufferGeometry;
  switch (part.shape) {
    case 'box': {
      const width = positiveNumber(dimensions.x, 1);
      const height = positiveNumber(dimensions.y, 1);
      const depth = positiveNumber(dimensions.z, 1);
      // Chamfered edges catch specular highlights; razor-sharp boxes read as CAD.
      const bevel = Math.min(width, height, depth) * 0.12;
      geometry = new RoundedBoxGeometry(width, height, depth, 2, bevel);
      break;
    }
    case 'sphere':
      geometry = new THREE.SphereGeometry(positiveNumber(dimensions.x, 0.5), 32, 16);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        positiveNumber(dimensions.x, 0.5),
        positiveNumber(dimensions.z, dimensions.x),
        positiveNumber(dimensions.y, 1),
        32,
      );
      if (isWheel(part)) geometry.rotateX(Math.PI / 2);
      break;
  }

  const visual = part.visualProfile;
  if (visual?.scale) geometry.scale(visual.scale.x, visual.scale.y, visual.scale.z);
  if (visual?.rotation) {
    geometry.applyQuaternion(
      new THREE.Quaternion(
        visual.rotation.x,
        visual.rotation.y,
        visual.rotation.z,
        visual.rotation.w,
      ),
    );
  }
  if (visual?.offset) geometry.translate(visual.offset.x, visual.offset.y, visual.offset.z);
  return geometry;
}

export function createAssemblyMaterial(
  part: AssemblyPart,
  options: AssemblyMaterialOptions = {},
): THREE.MeshStandardMaterial {
  const materialId = part.visualProfile?.materialId ?? 'default';
  const style = materialStyle(materialId);
  return new THREE.MeshStandardMaterial({
    color: part.color,
    metalness: style.metalness,
    roughness: style.roughness,
    transparent: style.opacity < 1,
    opacity: style.opacity,
    side: style.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

export function getAssemblyRenderSignature(part: AssemblyPart): string {
  const profile = part.visualProfile;
  const parameters = profile?.parameters
    ? Object.fromEntries(
        Object.entries(profile.parameters).sort(([left], [right]) => left.localeCompare(right)),
      )
    : null;

  // This signature is the renderer's rebuild contract. Keep every field that
  // can change geometry, material, or the profile-local transform here. JSON
  // avoids delimiter collisions in free-form profile strings, while sorting
  // sets and maps prevents equivalent state from rebuilding unnecessarily.
  return JSON.stringify({
    shape: part.shape,
    dimensions: part.dimensions,
    color: part.color,
    roles: [...(part.roles ?? [])].sort(),
    profile: profile
      ? {
          meshType: profile.meshType,
          profileId: profile.profileId,
          assetId: profile.assetId ?? null,
          materialId: profile.materialId ?? null,
          parameters,
          scale: profile.scale ?? null,
          offset: profile.offset ?? null,
          rotation: profile.rotation ?? null,
        }
      : null,
  });
}

function isWheel(part: AssemblyPart): boolean {
  return (
    part.shape === 'cylinder' &&
    (part.roles?.includes('wheel') ||
      part.visualProfile?.profileId === 'car-wheel' ||
      part.id.toLowerCase().includes('wheel'))
  );
}

function materialStyle(materialId: string): {
  metalness: number;
  roughness: number;
  opacity: number;
  doubleSided: boolean;
} {
  if (materialId.includes('glass')) {
    return { metalness: 0.05, roughness: 0.12, opacity: 0.58, doubleSided: true };
  }
  if (materialId.includes('rubber')) {
    return { metalness: 0.02, roughness: 0.92, opacity: 1, doubleSided: false };
  }
  if (materialId.includes('metal') || materialId.includes('gold')) {
    return { metalness: 0.58, roughness: 0.36, opacity: 1, doubleSided: false };
  }
  if (materialId.includes('wing-membrane')) {
    return { metalness: 0, roughness: 0.68, opacity: 0.78, doubleSided: true };
  }
  if (materialId.includes('scale')) {
    return { metalness: 0.08, roughness: 0.74, opacity: 1, doubleSided: false };
  }
  return { metalness: 0.1, roughness: 0.55, opacity: 1, doubleSided: false };
}
