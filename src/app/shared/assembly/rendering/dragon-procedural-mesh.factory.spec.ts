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
