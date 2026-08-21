import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { dragonPaletteForPart } from './dragon-materials';
import {
  buildDragonTailClub,
  buildDragonTailSegment,
  buildDragonTailStinger,
} from './dragon-tail-mesh';

function buildTail(part: AssemblyPart): THREE.Group {
  const palette = dragonPaletteForPart(part);
  switch (part.visualProfile?.profileId) {
    case 'dragon-tail':
      return buildDragonTailSegment(part, palette);
    case 'dragon-tail-club':
      return buildDragonTailClub(part, palette);
    case 'dragon-tail-stinger':
      return buildDragonTailStinger(part.dimensions.x, palette);
    default:
      throw new Error(`unsupported tail profile: ${part.visualProfile?.profileId ?? '(none)'}`);
  }
}

describe('dragon tail weapons', () => {
    function tailPart(profileId: 'dragon-tail-club' | 'dragon-tail-stinger'): AssemblyPart {
        return {
            id: profileId,
            label: profileId,
            roles: ['weapon'],
            shape: profileId === 'dragon-tail-club' ? 'cylinder' : 'sphere',
            mass: 0.9,
            dimensions: profileId === 'dragon-tail-club'
                ? { x: 0.2, y: 1.05, z: 0.28 }
                : { x: 0.2, y: 0.2, z: 0.2 },
            position: { x: 0, y: 0, z: 0 },
            color: '#92400e',
            visualProfile: { profileId, meshType: 'procedural' },
        };
    }

    /**
     * Both of these grew from their own middle, which buried half of every spike
     * in the knob it rings and pushed the stinger's blunt end back out through the
     * top of the knuckle. They are anchored by their roots now.
     */
    it('stands the club spikes clear of the knob instead of burying them in it', () => {
        const dims = tailPart('dragon-tail-club').dimensions;
        const club = buildTail(tailPart('dragon-tail-club'))!;
        const knobRadius = dims.z * 0.8;
        const knobCentre = new THREE.Vector3(0, -dims.y * 0.42, 0);
        const spikes = club.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry);

        expect(spikes.length).toBeGreaterThan(0);
        for (const spike of spikes) {
            const length = (spike.geometry as THREE.ConeGeometry).parameters.height;
            const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(spike.quaternion);
            const root = spike.position.clone().addScaledVector(axis, -length / 2);
            const tip = spike.position.clone().addScaledVector(axis, length / 2);

            // Root inside the knob, and most of the spike showing outside it.
            expect(root.distanceTo(knobCentre)).toBeLessThan(knobRadius);
            expect(tip.distanceTo(knobCentre) - knobRadius).toBeGreaterThan(length * 0.4);
        }
    });

    it('keeps the stinger blade out of the top of its knuckle', () => {
        const stinger = buildTail(tailPart('dragon-tail-stinger'))!;
        const radius = tailPart('dragon-tail-stinger').dimensions.x;
        const knuckleTop = radius * 0.18 + radius * 0.72;
        const knuckleBottom = radius * 0.18 - radius * 0.72;
        // The knuckle is the only sphere; whatever else is there is the blade.
        const blade = stinger.children.find(child => !(child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry))!;

        stinger.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(blade);

        expect(box.max.y).toBeLessThanOrEqual(knuckleTop);
        expect(box.min.y).toBeLessThan(knuckleBottom);
    });
});

/** Each tail link supplies the shared vertebra at its root. */
describe('dragon tail joints', () => {
  it('puts one shared vertebra at the root of every tail link', () => {
    const dims = { x: 0.12, y: 0.58, z: 0.12 };
    const part: AssemblyPart = {
      id: 'tail-link',
      label: 'Tail Link',
      roles: ['tail'],
      shape: 'cylinder',
      mass: 0.2,
      dimensions: dims,
      position: { x: 0, y: 0, z: 0 },
      color: '#a855f7',
      visualProfile: { profileId: 'dragon-tail', meshType: 'procedural' },
    };
    const link = buildTail(part);

    const ball = link.getObjectByName('dragon-tail-root-ball');
    expect(ball).toBeTruthy();
    expect(new THREE.Box3().setFromObject(ball!).getCenter(new THREE.Vector3()).y)
      .toBeCloseTo(0.5 * dims.y, 4);
    expect(link.getObjectByName('dragon-tail-tip-ball')).toBeFalsy();
  });
});

