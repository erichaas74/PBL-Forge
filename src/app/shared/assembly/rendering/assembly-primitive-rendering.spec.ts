import { AssemblyPart } from '../domain/assembly.models';
import { getAssemblyRenderSignature } from './assembly-primitive-rendering';

function part(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
  return {
    id: 'part',
    shape: 'box',
    mass: 1,
    dimensions: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 0, z: 0 },
    color: '#123456',
    visualProfile: {
      profileId: 'dragon-body',
      meshType: 'procedural',
      parameters: { spikeCount: 3, camber: 0.2 },
    },
    ...overrides,
  };
}

describe('getAssemblyRenderSignature', () => {
  it('changes for procedural parameters and profile rotation', () => {
    const baseline = getAssemblyRenderSignature(part());
    const parameterChange = getAssemblyRenderSignature(
      part({
        visualProfile: {
          profileId: 'dragon-body',
          meshType: 'procedural',
          parameters: { spikeCount: 4, camber: 0.2 },
        },
      }),
    );
    const rotationChange = getAssemblyRenderSignature(
      part({
        visualProfile: {
          profileId: 'dragon-body',
          meshType: 'procedural',
          parameters: { spikeCount: 3, camber: 0.2 },
          rotation: { x: 0, y: 0, z: 1, w: 0 },
        },
      }),
    );

    expect(parameterChange).not.toBe(baseline);
    expect(rotationChange).not.toBe(baseline);
  });

  it('changes when a geometry-affecting role changes', () => {
    expect(getAssemblyRenderSignature(part({ roles: ['wheel'] }))).not.toBe(
      getAssemblyRenderSignature(part({ roles: [] })),
    );
  });

  it('is stable when roles and parameter keys are merely reordered', () => {
    const left = part({
      roles: ['core', 'armor'],
      visualProfile: {
        profileId: 'dragon-body',
        meshType: 'procedural',
        parameters: { spikeCount: 3, camber: 0.2 },
      },
    });
    const right = part({
      roles: ['armor', 'core'],
      visualProfile: {
        profileId: 'dragon-body',
        meshType: 'procedural',
        parameters: { camber: 0.2, spikeCount: 3 },
      },
    });

    expect(getAssemblyRenderSignature(left)).toBe(getAssemblyRenderSignature(right));
  });
});
