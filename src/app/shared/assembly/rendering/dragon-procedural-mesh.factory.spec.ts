import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';

function wingPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
  return {
    id: 'left-wing',
    label: 'Left Wing',
    roles: ['wing'],
    shape: 'box',
    mass: 0.55,
    dimensions: { x: 0.26, y: 0.08, z: 1.35 },
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId: 'dragon-wing', meshType: 'procedural' },
    snapPoints: [{
      id: 'dragon-wing-root',
      label: 'root',
      localPosition: { x: 0, y: 0, z: 0.6 },
    }],
    ...overrides,
  };
}

/** The membrane is the densest mesh in the wing group. */
function membraneOf(object: THREE.Object3D): THREE.Mesh {
  let densest: THREE.Mesh | null = null;
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const count = child.geometry.getAttribute('position')?.count ?? 0;
    const best = densest?.geometry.getAttribute('position')?.count ?? -1;
    if (count > best) densest = child;
  });
  if (!densest) throw new Error('no mesh in wing');
  return densest;
}

function verticalRelief(mesh: THREE.Mesh): number {
  const position = mesh.geometry.getAttribute('position');
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  return max - min;
}

function bodyPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
  return {
    id: 'body',
    label: 'Body',
    roles: ['core'],
    shape: 'box',
    mass: 4,
    dimensions: { x: 1.6, y: 0.72, z: 0.68 },
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId: 'dragon-body', meshType: 'procedural' },
    ...overrides,
  };
}

function jawPart(profileId: 'dragon-upper-jaw' | 'dragon-lower-jaw'): AssemblyPart {
  return {
    id: profileId,
    label: profileId === 'dragon-upper-jaw' ? 'Upper Jaw' : 'Lower Jaw',
    roles: ['weapon'],
    shape: 'box',
    mass: 0.28,
    dimensions: { x: 0.52, y: 0.2, z: 0.3 },
    position: { x: 0, y: 0, z: 0 },
    color: '#fbbf24',
    visualProfile: { profileId, meshType: 'procedural' },
  };
}

function limbPart(profileId: 'dragon-leg' | 'dragon-claw', dimensions: AssemblyPart['dimensions']): AssemblyPart {
  return {
    id: profileId,
    label: profileId,
    roles: ['leg'],
    shape: 'cylinder',
    mass: 0.2,
    dimensions,
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId, meshType: 'procedural' },
  };
}

describe('dragon body mesh', () => {
  it('adds a simple belly mesh that scales with the body', () => {
    const body = createDragonProceduralObject(bodyPart())!;
    const belly = body.getObjectByName('dragon-belly') as THREE.Mesh | undefined;

    expect(belly).toBeTruthy();
    expect(belly?.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(belly?.scale.x).toBeCloseTo(bodyPart().dimensions.x * 0.38);
  });
});

describe('dragon upper jaw mesh', () => {
  it('builds both nostrils directly into the upper jaw', () => {
    const upperJaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;

    expect(upperJaw.getObjectByName('dragon-nostril-left')).toBeTruthy();
    expect(upperJaw.getObjectByName('dragon-nostril-right')).toBeTruthy();
  });

  it('does not put nostrils on the lower jaw', () => {
    const lowerJaw = createDragonProceduralObject(jawPart('dragon-lower-jaw'))!;

    expect(lowerJaw.getObjectByName('dragon-nostril-left')).toBeFalsy();
    expect(lowerJaw.getObjectByName('dragon-nostril-right')).toBeFalsy();
  });
});

describe('dragon limb meshes', () => {
  /**
   * These used to render at half scale with a compensating lift, which put the
   * visible thigh nowhere near the hip, knee, and ankle sockets the joints are
   * built from. Every socket on a limb sits on the face of its own physics
   * volume, so the mesh has to fill that volume for the chain to read as
   * connected.
   */
  it('fills the physics volume so limb sockets land on the mesh', () => {
    const leg = createDragonProceduralObject(limbPart('dragon-leg', { x: 0.22, y: 0.72, z: 0.22 }))!;
    const foot = createDragonProceduralObject({
      ...limbPart('dragon-leg', { x: 0.34, y: 0.14, z: 0.28 }),
      visualProfile: { profileId: 'dragon-foot', meshType: 'procedural' },
    })!;
    const claw = createDragonProceduralObject(limbPart('dragon-claw', { x: 0.08, y: 0.2, z: 0.08 }))!;

    for (const limb of [leg, foot, claw]) {
      expect(limb.scale.toArray()).toEqual([1, 1, 1]);
      expect(limb.position.toArray()).toEqual([0, 0, 0]);
    }

    const legBounds = new THREE.Box3().setFromObject(leg);

    expect(legBounds.min.y).toBeCloseTo(-0.72 / 2, 2);
    expect(legBounds.max.y).toBeCloseTo(0.72 / 2, 2);
  });
});

describe('dragon wing membrane', () => {
  /**
   * The original membrane was a `ShapeGeometry`, which only emits vertices along
   * the outline — there was no interior to displace, so it rendered as a
   * perfectly flat sheet whatever the bones did. Front-on it was a single line.
   * This pins the fix: the surface must have real vertical relief.
   */
  it('is a curved surface, not a flat sheet', () => {
    const object = createDragonProceduralObject(wingPart());
    expect(object).toBeTruthy();

    const membrane = membraneOf(object!);
    const dims = wingPart().dimensions;

    // Camber is a fraction of chord (dims.x * 2.6), so relief scales with the
    // part rather than being a fixed number of world units.
    expect(verticalRelief(membrane)).toBeGreaterThan(dims.x * 0.15);
  });

  it('has interior vertices to curve, not just an outline', () => {
    const membrane = membraneOf(createDragonProceduralObject(wingPart())!);

    expect(membrane.geometry.getAttribute('position').count).toBeGreaterThan(100);
    expect(membrane.geometry.getIndex()).toBeTruthy();
  });

  it('carries usable normals, so lighting reads the curvature', () => {
    const membrane = membraneOf(createDragonProceduralObject(wingPart())!);
    const normals = membrane.geometry.getAttribute('normal');

    expect(normals).toBeTruthy();
    // A flat sheet would give every vertex the same normal; a curved one varies.
    const first = new THREE.Vector3().fromBufferAttribute(normals, 0);
    let varies = false;
    for (let index = 1; index < normals.count; index += 1) {
      const other = new THREE.Vector3().fromBufferAttribute(normals, index);
      if (first.distanceTo(other) > 0.05) { varies = true; break; }
    }
    expect(varies).toBe(true);
  });

  it('scales its relief with the genome, not a fixed size', () => {
    const small = membraneOf(createDragonProceduralObject(wingPart())!);
    const large = membraneOf(createDragonProceduralObject(wingPart({
      dimensions: { x: 0.52, y: 0.08, z: 1.35 },
    }))!);

    expect(verticalRelief(large)).toBeGreaterThan(verticalRelief(small) * 1.5);
  });

  it('mirrors the right wing rather than building a second mesh', () => {
    const right = createDragonProceduralObject(wingPart({
      id: 'right-wing',
      label: 'Right Wing',
      snapPoints: [{
        id: 'dragon-wing-root',
        label: 'root',
        localPosition: { x: 0, y: 0, z: -0.6 },
      }],
    }));

    expect(right!.scale.z).toBe(-1);
  });
});
