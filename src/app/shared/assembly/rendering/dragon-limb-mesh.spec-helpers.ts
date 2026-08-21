import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildDragonFoot, buildDragonTalon } from './dragon-foot-mesh';
import { buildDragonGraspArm, buildDragonGraspHand } from './dragon-grasp-mesh';
import { buildDragonLeg } from './dragon-leg-mesh';
import { dragonPaletteForPart } from './dragon-materials';

export function limbPart(
  profileId: 'dragon-leg' | 'dragon-claw',
  dimensions: AssemblyPart['dimensions'],
): AssemblyPart {
  return {
    id: profileId,
    label: profileId,
    roles: ['leg'],
    shape: 'cylinder',
    mass: 0.2,
    dimensions,
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId, meshType: 'procedural' },
  };
}

export function childNamed(object: THREE.Object3D, name: string): THREE.Object3D {
  const child = object.getObjectByName(name);
  if (!child) throw new Error(`no child named ${name}`);
  return child;
}

export function buildLimb(part: AssemblyPart): THREE.Group {
  const palette = dragonPaletteForPart(part);
  switch (part.visualProfile?.profileId) {
    case 'dragon-leg':
      return buildDragonLeg(part, palette);
    case 'dragon-grasp-arm':
      return buildDragonGraspArm(part, palette);
    case 'dragon-grasp-hand':
      return buildDragonGraspHand(part, palette);
    case 'dragon-foot':
      return buildDragonFoot(part, palette);
    case 'dragon-claw':
    case 'dragon-wing-claw':
      return buildDragonTalon(part.dimensions.x, part.dimensions.y, palette);
    default:
      throw new Error(`unsupported limb profile: ${part.visualProfile?.profileId ?? '(none)'}`);
  }
}
