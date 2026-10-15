import { describe, expect, it } from 'vitest';
import { AssemblyPart } from '../domain/assembly.models';
import { serializeDragonCustomPartRecipe } from './dragon-custom-part-recipe';
import { createAssemblyObject, disposeAssemblyObject } from './three-assembly-mesh.factory';

describe('universal custom-part composition', () => {
  it('adds custom pieces to a non-dragon primitive through the shared renderer', () => {
    const part: AssemblyPart = {
      id: 'custom-vehicle-panel',
      shape: 'box',
      mass: 1,
      dimensions: { x: 2, y: 0.4, z: 1 },
      position: { x: 0, y: 0, z: 0 },
      color: '#ef4444',
      visualProfile: {
        profileId: 'primitive-box',
        meshType: 'primitive',
        parameters: {
          customPartRecipe: serializeDragonCustomPartRecipe({
            version: 2,
            pieces: [{
              id: 'sensor', label: 'Sensor', kind: 'primitive', shape: 'sphere', material: 'dark',
              offset: { x: 0.2, y: 0.5, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 },
              scale: { x: 0.1, y: 0.2, z: 0.2 }, mirrored: false, visible: true,
            }],
          }),
        },
      },
    };
    const object = createAssemblyObject(part);
    expect(object.getObjectByName('dragon-custom-piece-sensor-single')).toBeTruthy();
    disposeAssemblyObject(object);
  });
});
