import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { MiniDragonPalette, createMiniDragonPalette } from './mini-dragon-rendering';

export type MiniDragonBuilder = (part: AssemblyPart, palette: MiniDragonPalette) => THREE.Object3D;

export function part(
  profileId: string,
  overrides: Partial<AssemblyPart> = {},
  parameters: Record<string, string | number | boolean> = {},
): AssemblyPart {
  return {
    id: `test-${profileId}`,
    shape: 'box',
    mass: 1,
    dimensions: { x: 0.8, y: 0.6, z: 0.5 },
    position: { x: 0, y: 0, z: 0 },
    color: '#c8a24a',
    visualProfile: { profileId, meshType: 'procedural', parameters },
    ...overrides,
  };
}

export function renderMiniPart(
  builder: MiniDragonBuilder,
  profileId: string,
  overrides: Partial<AssemblyPart> = {},
  parameters: Record<string, string | number | boolean> = {},
): THREE.Object3D {
  const value = part(profileId, overrides, parameters);
  return builder(value, createMiniDragonPalette(value));
}

export function named(object: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  object.traverse((child) => {
    if (child.name === name) found.push(child);
  });
  return found;
}

export function meshCount(object: THREE.Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) count += 1;
  });
  return count;
}
