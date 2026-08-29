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
    expect(build({ bodyArchetype: 'serpent' }).getObjectByName('dragon-body-serpent-ridge'))
      .toBeFalsy();
  });

  it('expresses one or three complete rows of tall back spikes', () => {
    const oneRow = build({ backSpikeCount: 5, backSpikeRows: 1, backSpikeScale: 1.15 });
    const threeRows = build({ backSpikeCount: 5, backSpikeRows: 3, backSpikeScale: 1.15 });
    const oneRowGroup = oneRow.getObjectByName('dragon-back-spike-rows')!;
    const threeRowGroup = threeRows.getObjectByName('dragon-back-spike-rows')!;

    expect(oneRowGroup.children.filter(child => child.name === 'dragon-back-spike-row-1')).toHaveLength(5);
    expect(threeRowGroup.children.filter(child => child.name.startsWith('dragon-back-spike-row-')))
      .toHaveLength(15);
    expect(threeRowGroup.children.filter(child => child.name === 'dragon-back-spike-row-3'))
      .toHaveLength(5);
  });

  it('moves, rotates, and scales the complete spike-row group as one authored layer', () => {
    const body = build({
      backSpikeOffsetX: 0.1,
      backSpikeOffsetY: 0.2,
      backSpikeOffsetZ: -0.3,
      backSpikePitch: 0.2,
      backSpikeYaw: 0.3,
      backSpikeRoll: 0.4,
      backSpikePlacementScale: 1.5,
    });
    const spikes = body.getObjectByName('dragon-back-spike-rows')!;

    expect(spikes.position.x).toBeCloseTo(bodyPart().dimensions.x * 0.1);
    expect(spikes.position.y).toBeCloseTo(bodyPart().dimensions.y * 0.2);
    expect(spikes.position.z).toBeCloseTo(bodyPart().dimensions.z * -0.3);
    expect(spikes.rotation.toArray().slice(0, 3)).toEqual(expect.arrayContaining([0.2, 0.3, 0.4]));
    expect(spikes.scale.x).toBeCloseTo(1.5);
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

  it('applies body-station overrides to the torso, belly, and end sockets', () => {
    const defaultBody = build();
    const tunedBody = build({
      bodyNeckWidth: 1.5,
      bodyBellyDepth: 1.4,
      bodySpineArch: 0.2,
    });
    const defaultNeck = new THREE.Box3().setFromObject(
      defaultBody.getObjectByName('dragon-body-neck-socket')!,
    );
    const tunedNeck = new THREE.Box3().setFromObject(
      tunedBody.getObjectByName('dragon-body-neck-socket')!,
    );
    const defaultBelly = defaultBody.getObjectByName('dragon-belly') as THREE.Mesh;
    const tunedBelly = tunedBody.getObjectByName('dragon-belly') as THREE.Mesh;

    expect(tunedNeck.max.z - tunedNeck.min.z)
      .toBeGreaterThan((defaultNeck.max.z - defaultNeck.min.z) * 1.45);
    expect(tunedBelly.scale.y).toBeCloseTo(bodyPart().dimensions.y * 0.3 * 1.4);
    expect(tunedBelly.position.y).toBeGreaterThan(defaultBelly.position.y);
  });
});
