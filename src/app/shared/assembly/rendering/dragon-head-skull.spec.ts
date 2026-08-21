import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { dragonHeadExtent } from './dragon-head-profile';
import { buildDragonNeckSocket, buildDragonSkull } from './dragon-head-skull';
import { dragonPaletteForPart } from './dragon-materials';
import { getActiveDragonStyle } from './dragon-style';

function headPart(shape: 'sphere' | 'box', dimensions: AssemblyPart['dimensions']): AssemblyPart {
  return {
    id: 'dragon-head-horned',
    label: 'Horned Head',
    roles: ['head'],
    shape,
    mass: 0.8,
    dimensions,
    position: { x: 0, y: 0, z: 0 },
    color: '#f97316',
    visualProfile: { profileId: 'dragon-head-horned', meshType: 'procedural' },
  };
}

function buildHead(part: AssemblyPart): THREE.Group {
  const palette = dragonPaletteForPart(part);
  const dims = dragonHeadExtent(part.dimensions, part.shape);
  const { skull, shape } = buildDragonSkull(dims, palette, getActiveDragonStyle().head);
  const group = new THREE.Group();
  group.add(skull);
  group.add(buildDragonNeckSocket(part, dims, palette, shape));
  return group;
}

function childNamed(object: THREE.Object3D, name: string): THREE.Object3D {
  const child = object.getObjectByName(name);
  if (!child) throw new Error(`no child named ${name}`);
  return child;
}

function skullOf(object: THREE.Object3D): THREE.Mesh {
  let densest: THREE.Mesh | null = null;
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const count = child.geometry.getAttribute('position')?.count ?? 0;
    if (count > (densest?.geometry.getAttribute('position')?.count ?? -1)) densest = child;
  });
  if (!densest) throw new Error('no mesh in head');
  return densest;
}

function signedVolume(mesh: THREE.Mesh): number {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex()!;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let total = 0;

  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(position, index.getX(i));
    b.fromBufferAttribute(position, index.getX(i + 1));
    c.fromBufferAttribute(position, index.getX(i + 2));
    total += a.dot(b.clone().cross(c)) / 6;
  }
  return total;
}

describe('dragon head skull', () => {
  it('closes the throat where the skull hinges on the torso', () => {
    const head = buildHead(headPart('sphere', { x: 0.42, y: 0.32, z: 0.3 }));
    const neck = new THREE.Box3().setFromObject(childNamed(head, 'dragon-neck-ball'));
    const center = neck.getCenter(new THREE.Vector3());

    expect(center.x).toBeLessThan(0);
    expect(center.z).toBeCloseTo(0, 4);
    expect(neck.max.y - neck.min.y).toBeGreaterThan(0);
  });

  /**
   * The skull used to be a `SphereGeometry` with `scale.set(1.18, 0.92, 0.9)`,
   * built from `dims.x` alone — the other two axes were discarded, so no gene
   * could move it. Lofting the profile is what gives a trait somewhere to land.
   */
  it('lofts a skull that responds to all three dimensions', () => {
    const round = skullOf(buildHead(headPart('box', { x: 0.5, y: 0.4, z: 0.4 }))!);
    const long = skullOf(buildHead(headPart('box', { x: 1.1, y: 0.4, z: 0.4 }))!);

    const roundBox = new THREE.Box3().setFromObject(round);
    const longBox = new THREE.Box3().setFromObject(long);

    expect(longBox.max.x - longBox.min.x).toBeGreaterThan((roundBox.max.x - roundBox.min.x) * 1.8);
    // A stretched skull is not just a scaled one: the muzzle thins as it runs out.
    expect(longBox.max.y - longBox.min.y).toBeLessThanOrEqual(
      roundBox.max.y - roundBox.min.y + 1e-6,
    );
  });

  /**
   * Winding was derived, not observed. Inside-out triangles are invisible under
   * backface culling, which is the kind of bug that only shows up in the app.
   */
  it('winds its triangles outward', () => {
    for (const part of [
      headPart('sphere', { x: 0.42, y: 0.42, z: 0.42 }),
      headPart('box', { x: 0.68, y: 0.38, z: 0.34 }),
    ]) {
      expect(signedVolume(skullOf(buildHead(part)!))).toBeGreaterThan(0);
    }
  });

  /**
   * A sphere part's `dimensions.x` is a radius, not a width. Read as a width the
   * horned head lofts at half size and every horn and eye lands inside the bone.
   */
  it('sizes a sphere head from its radius, not its diameter', () => {
    const head = buildHead(headPart('sphere', { x: 0.42, y: 0.42, z: 0.42 }))!;
    const bounds = new THREE.Box3().setFromObject(skullOf(head));

    expect(bounds.max.x).toBeCloseTo(0.42, 2);
    expect(bounds.min.x).toBeCloseTo(-0.42, 2);
  });

  it('keeps the skull inside the physics volume', () => {
    const dims = { x: 0.54, y: 0.48, z: 0.44 };
    const bounds = new THREE.Box3().setFromObject(skullOf(buildHead(headPart('box', dims))!));

    expect(bounds.max.y).toBeLessThanOrEqual(dims.y / 2 + 1e-4);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-dims.y / 2 - 1e-4);
    expect(bounds.max.z).toBeLessThanOrEqual(dims.z / 2 + 1e-4);
  });

  it('gives the skull UVs so the scale texture lands on it', () => {
    const skull = skullOf(buildHead(headPart('box', { x: 0.68, y: 0.38, z: 0.34 }))!);
    const uv = skull.geometry.getAttribute('uv');

    expect(uv).toBeTruthy();
    expect(uv.count).toBe(skull.geometry.getAttribute('position').count);
  });
});
