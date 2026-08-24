import * as THREE from 'three';
import { named, part } from './mini-dragon-mesh.spec-helpers';
import { createMiniDragonProceduralObject } from './mini-dragon-procedural-mesh.factory';

const SPECIAL_PARTS = [
  ['mini-dragon-face-shield', { miniFaceShieldScale: 1 }],
  ['mini-dragon-nose-horn', { miniNoseHornScale: 1 }],
  ['mini-dragon-serpent-body-segment', { miniSerpentSegmentScale: 1 }],
  ['mini-dragon-fork-tail-branch', { miniForkTailScale: 1 }],
  ['mini-dragon-fairy-wing', { miniWingSide: 1, miniWingSpread: 1 }],
  ['mini-dragon-aero-wing', { miniWingSide: 1, miniWingSpread: 1 }],
] as const;

describe('Mini Dragon breed anatomy parts', () => {
  it.each(SPECIAL_PARTS)('builds finite geometry for %s', (profileId, parameters) => {
    const object = createMiniDragonProceduralObject(part(profileId, {}, parameters))!;
    const meshes: THREE.Mesh[] = [];
    object.traverse(child => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });
    expect(meshes.length, profileId).toBeGreaterThan(0);
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      expect(positions.count, `${profileId}/${mesh.name}`).toBeGreaterThan(0);
      expect(Array.from(positions.array).every(Number.isFinite), `${profileId}/${mesh.name}`).toBe(true);
    }
  });

  it('keeps derived anatomy suppressible outside its visible combination', () => {
    for (const [profileId, key] of [
      ['mini-dragon-face-shield', 'miniFaceShieldScale'],
      ['mini-dragon-nose-horn', 'miniNoseHornScale'],
      ['mini-dragon-serpent-body-segment', 'miniSerpentSegmentScale'],
      ['mini-dragon-fork-tail-branch', 'miniForkTailScale'],
    ] as const) {
      const object = createMiniDragonProceduralObject(part(profileId, {}, { [key]: 0 }))!;
      const meshes: THREE.Mesh[] = [];
      object.traverse(child => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
      expect(meshes, profileId).toHaveLength(0);
    }
  });

  it('gives Fairy and Amphiptere wings distinct named membranes', () => {
    const fairy = createMiniDragonProceduralObject(part('mini-dragon-fairy-wing'))!;
    const aero = createMiniDragonProceduralObject(part('mini-dragon-aero-wing'))!;
    expect(named(fairy, 'mini-dragon-fairy-wing-membrane')).toHaveLength(1);
    expect(named(aero, 'mini-dragon-aero-wing-membrane')).toHaveLength(1);
  });
});
