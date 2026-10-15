import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';

export interface AssemblyMeshGeneratorPlugin {
  readonly id: string;
  readonly priority?: number;
  /** Return null when a fallback-discovery call does not belong to this generator. */
  readonly create: (part: AssemblyPart) => THREE.Object3D | null;
}

const generators = new Map<string, AssemblyMeshGeneratorPlugin>();

/** Registers a package generator and returns a safe hot-reload/test cleanup function. */
export function registerAssemblyMeshGenerator(plugin: AssemblyMeshGeneratorPlugin): () => void {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(plugin.id)) {
    throw new Error('Assembly mesh generator id is invalid.');
  }
  if (generators.has(plugin.id)) throw new Error(`Assembly mesh generator ${plugin.id} is already registered.`);
  generators.set(plugin.id, plugin);
  return () => {
    if (generators.get(plugin.id) === plugin) generators.delete(plugin.id);
  };
}

export function createRegisteredAssemblyObject(part: AssemblyPart): THREE.Object3D | null {
  const requested = part.visualProfile?.generatorId;
  if (requested) return generators.get(requested)?.create(part) ?? null;
  const ordered = [...generators.values()].sort((left, right) =>
    (right.priority ?? 0) - (left.priority ?? 0) || left.id.localeCompare(right.id));
  for (const generator of ordered) {
    const object = generator.create(part);
    if (object) return object;
  }
  return null;
}

export function registeredAssemblyGeneratorIds(): readonly string[] {
  return [...generators.keys()].sort();
}
