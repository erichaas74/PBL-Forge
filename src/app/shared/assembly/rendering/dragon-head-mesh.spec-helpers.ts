import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildDragonHornedHead } from './dragon-head-mesh';
import { dragonPaletteForPart } from './dragon-materials';

export function headPart(
  shape: 'sphere' | 'box',
  dimensions: AssemblyPart['dimensions'],
): AssemblyPart {
  return {
    id: 'dragon-head-horned',
    label: 'Horned Head',
    roles: ['head'],
    shape,
    mass: 0.8,
    dimensions,
    position: { x: 0, y: 0, z: 0 },
    color: '#f97316',
    visualProfile: { profileId: 'dragon-head-horned', meshType: 'procedural' },
  };
}

export function buildHead(part: AssemblyPart): THREE.Group {
  return buildDragonHornedHead(part, dragonPaletteForPart(part));
}

export function childNamed(object: THREE.Object3D, name: string): THREE.Object3D {
  const child = object.getObjectByName(name);
  if (!child) throw new Error(`no child named ${name}`);
  return child;
}
