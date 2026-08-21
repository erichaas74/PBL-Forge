import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import {
  DragonProceduralProfileId,
  SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS,
} from '../model-pack/dragon-model-pack.models';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';

function routedPart(profileId: DragonProceduralProfileId): AssemblyPart {
  const shape = profileId.includes('head') || profileId.includes('stinger') ? 'sphere'
    : profileId.includes('leg') || profileId.includes('claw') || profileId.includes('tail')
      ? 'cylinder'
      : 'box';

  return {
    id: profileId,
    label: profileId,
    roles: ['core'],
    shape,
    mass: 1,
    dimensions: { x: 0.45, y: 0.5, z: 0.55 },
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId, meshType: 'procedural' },
    snapPoints: [{
      id: 'dragon-wing-root',
      label: 'root',
      localPosition: { x: 0, y: 0, z: 0.25 },
    }],
  };
}

describe('dragon procedural profile routing', () => {
  it.each(SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS)('routes %s to a rendered object', profileId => {
    expect(createDragonProceduralObject(routedPart(profileId))).toBeInstanceOf(THREE.Object3D);
  });

  it('returns null for an unsupported profile', () => {
    const part = routedPart('dragon-body');
    part.visualProfile = { profileId: 'not-a-dragon-profile', meshType: 'procedural' };

    expect(createDragonProceduralObject(part)).toBeNull();
  });
});
