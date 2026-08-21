import * as THREE from 'three';
import {
  boxUv,
  createTaperedBoxGeometry,
  createTaperedJawGeometry,
  detail,
  latheProfileRadius,
  mesh,
  revolvedUv,
  sphereUv,
  tubeUv,
} from './dragon-geometry';

function uvSpan(geometry: THREE.BufferGeometry, axis: 'x' | 'y'): number {
  const uv = geometry.getAttribute('uv');
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < uv.count; index += 1) {
    const value = axis === 'x' ? uv.getX(index) : uv.getY(index);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return max - min;
}

function faceRadius(geometry: THREE.BufferGeometry, x: number, axis: 'y' | 'z'): number {
  const position = geometry.getAttribute('position');
  let radius = 0;
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getX(index) - x) > 0.0001) continue;
    const value = axis === 'y' ? position.getY(index) : position.getZ(index);
    radius = Math.max(radius, Math.abs(value));
  }
  return radius;
}

describe('dragon geometry helpers', () => {
  it('never reduces authored segment counts', () => {
    expect(detail(12)).toBeGreaterThanOrEqual(12);
  });

  it('creates meshes with consistent shadow participation', () => {
    const result = mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());

    expect(result.castShadow).toBe(true);
    expect(result.receiveShadow).toBe(true);
  });

  it('interpolates and clamps lathe profile radii', () => {
    const profile: readonly [number, number][] = [[-0.5, 0.4], [0, 0.8], [0.5, 0.6]];

    expect(latheProfileRadius(profile, -1)).toBeCloseTo(0.4);
    expect(latheProfileRadius(profile, -0.25)).toBeCloseTo(0.6);
    expect(latheProfileRadius(profile, 1)).toBeCloseTo(0.6);
  });

  it('tiles revolved, spherical, and tube UVs using world dimensions', () => {
    const seed = { seed: 0.25 };
    const revolved = revolvedUv(new THREE.CylinderGeometry(1, 1, 3, 8), 1, 3, 0.5, seed);
    const sphere = sphereUv(new THREE.SphereGeometry(1, 8, 6), { x: 2, y: 1, z: 1.5 }, 0.5, seed);
    const path = new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(3, 0, 0));
    const tube = tubeUv(new THREE.TubeGeometry(path, 6, 0.2, 6), 3, 0.2, 0.5, seed);

    expect(uvSpan(revolved, 'x')).toBeGreaterThan(1);
    expect(uvSpan(sphere, 'x')).toBeGreaterThan(1);
    expect(uvSpan(tube, 'x')).toBeGreaterThan(1);
  });

  it('cube-projects UVs for tapered and other seam-free geometry', () => {
    const geometry = boxUv(new THREE.BoxGeometry(3, 1, 1), 0.5, { seed: 0.2 });

    expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count);
    expect(uvSpan(geometry, 'x')).toBeGreaterThan(1);
  });

  it('tapers only the positive-x face of a box', () => {
    const geometry = createTaperedBoxGeometry(2, 1, 0.8, 0.5, 0.25);

    expect(faceRadius(geometry, 1, 'y')).toBeCloseTo(0.25);
    expect(faceRadius(geometry, -1, 'y')).toBeCloseTo(0.5);
    expect(faceRadius(geometry, 1, 'z')).toBeCloseTo(0.1);
    expect(faceRadius(geometry, -1, 'z')).toBeCloseTo(0.4);
  });

  it('builds a closed, UV-mapped tapered jaw loft', () => {
    const geometry = createTaperedJawGeometry(2, 1, 0.8, 0.5, 0.25);

    expect(geometry.userData['kind']).toBe('dragon-jaw');
    expect(geometry.getIndex()).toBeTruthy();
    expect(geometry.getAttribute('normal')).toBeTruthy();
    expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count);
    expect(faceRadius(geometry, 1, 'y')).toBeCloseTo(0.25);
    expect(faceRadius(geometry, -1, 'y')).toBeCloseTo(0.5);
  });
});
