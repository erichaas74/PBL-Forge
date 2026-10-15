import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AssemblyPart } from '../domain/assembly.models';
import {
  createRegisteredAssemblyObject,
  registerAssemblyMeshGenerator,
  registeredAssemblyGeneratorIds,
} from './assembly-generator-registry';

describe('assembly mesh generator registry', () => {
  it('lets a project package register and explicitly route a generator', () => {
    const id = 'spec-generator';
    const unregister = registerAssemblyMeshGenerator({
      id,
      create: part => {
        const group = new THREE.Group();
        group.name = `generated-${part.id}`;
        return group;
      },
    });
    const part: AssemblyPart = {
      id: 'custom-part', shape: 'box', mass: 1,
      dimensions: { x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 }, color: '#ffffff',
      visualProfile: { profileId: 'custom', generatorId: id, meshType: 'procedural' },
    };
    expect(createRegisteredAssemblyObject(part)?.name).toBe('generated-custom-part');
    expect(registeredAssemblyGeneratorIds()).toContain(id);
    unregister();
    expect(registeredAssemblyGeneratorIds()).not.toContain(id);
  });
});
