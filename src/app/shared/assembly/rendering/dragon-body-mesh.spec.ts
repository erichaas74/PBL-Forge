import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildDragonBody } from './dragon-body-mesh';
import { dragonPaletteForPart } from './dragon-materials';

function bodyPart(parameters: Record<string, string | number | boolean> = {}): AssemblyPart {
  return {
    id: 'body',
    label: 'Body',
    roles: ['core'],
    shape: 'box',
    mass: 4,
    dimensions: { x: 1.6, y: 0.72, z: 0.68 },
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId: 'dragon-body', meshType: 'procedural', parameters },
  };
}

function build(parameters: Record<string, string | number | boolean> = {}): THREE.Group {
  const part = bodyPart(parameters);
  return buildDragonBody(part, dragonPaletteForPart(part));
}

describe('dragon body mesh', () => {
  it('adds a belly mesh that scales with the body', () => {
    const body = build();
    const belly = body.getObjectByName('dragon-belly') as THREE.Mesh | undefined;

    expect(belly).toBeTruthy();
    expect(belly?.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(belly?.scale.x).toBeCloseTo(bodyPart().dimensions.x * 0.38);
  });

  it('gives alternate body plans distinct anatomical silhouettes', () => {
    expect(build({ bodyArchetype: 'wyvern' }).getObjectByName('dragon-body-wyvern-keel')).toBeTruthy();
    expect(build({ bodyArchetype: 'drake' }).getObjectByName('dragon-body-drake-mantle')).toBeTruthy();
    expect(build({ bodyArchetype: 'four-wing' }).children
      .filter(child => child.name.startsWith('dragon-body-four-wing-scapula'))).toHaveLength(4);
    expect(build({ bodyArchetype: 'classic' }).children
      .some(child => child.name.includes('wyvern-keel'))).toBe(false);
    expect(build({ bodyArchetype: 'regal' }).getObjectByName('dragon-body-regal-shoulder-1')).toBeTruthy();
    expect(build({ bodyArchetype: 'bulwark' }).getObjectByName('dragon-body-bulwark-haunch-1')).toBeTruthy();
    expect(build({ bodyArchetype: 'courser' }).getObjectByName('dragon-body-courser-keel')).toBeTruthy();
    expect(build({ bodyArchetype: 'prowler' }).getObjectByName('dragon-body-prowler-mantle-1')).toBeTruthy();
    expect(build({ bodyArchetype: 'serpent' }).getObjectByName('dragon-body-serpent-ridge')).toBeTruthy();
  });

  it('adds a seated lantern row to both flanks only when expressed', () => {
    const glowing = build({ glowMarkings: true });
    const plain = build();

    expect(glowing.children.filter(child => child.name.startsWith('dragon-glow-flank-'))).toHaveLength(12);
    expect(plain.children.some(child => child.name.startsWith('dragon-glow-flank-'))).toBe(false);
  });

  it('caps the torso openings at the neck and tail with section-matched sockets', () => {
    const dims = bodyPart().dimensions;
    const body = build();
    const neck = new THREE.Box3().setFromObject(body.getObjectByName('dragon-body-neck-socket')!);
    const tail = new THREE.Box3().setFromObject(body.getObjectByName('dragon-body-tail-socket')!);

    expect(neck.getCenter(new THREE.Vector3()).x).toBeCloseTo(0.5 * dims.x, 4);
    expect(tail.getCenter(new THREE.Vector3()).x).toBeCloseTo(-0.5 * dims.x, 4);
    expect(neck.max.y - neck.min.y).toBeGreaterThan(0.42 * dims.y);
    expect(neck.max.z - neck.min.z).toBeGreaterThan(0.42 * dims.z);
    expect(tail.max.y - tail.min.y).toBeGreaterThan(0.28 * dims.y);
    expect(tail.max.z - tail.min.z).toBeGreaterThan(0.28 * dims.z);
    expect(neck.max.z - neck.min.z).not.toBeCloseTo(neck.max.y - neck.min.y, 2);
  });
});
