import * as THREE from 'three';
import { detailSegments, resolveRenderQuality } from './render-quality';
import { applyBoxProjectedUv, applyTiledUv } from './dragon-uv';

interface DragonUvSeed {
  seed: number;
}

/** Resolve the device tier once for all geometry built in this session. */
let cachedDetail: ((base: number) => number) | null = null;

export function detail(base: number): number {
  if (!cachedDetail) {
    const quality = resolveRenderQuality();
    cachedDetail = (value: number) => detailSegments(value, quality);
  }
  return cachedDetail(base);
}

/** Creates a consistently shadow-enabled dragon mesh. */
export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

/** Radius of a lathe profile at `t` along its length, clamped at both ends. */
export function latheProfileRadius(profile: readonly [number, number][], t: number): number {
  for (let index = 1; index < profile.length; index += 1) {
    const [fromT, fromRadius] = profile[index - 1];
    const [toT, toRadius] = profile[index];
    if (t <= toT) {
      const blend = (t - fromT) / Math.max(toT - fromT, 1e-6);
      return fromRadius + (toRadius - fromRadius) * Math.max(0, Math.min(1, blend));
    }
  }
  return profile[profile.length - 1][1];
}

/** Bodies of revolution: `u` wraps the axis and `v` runs along it. */
export function revolvedUv<T extends THREE.BufferGeometry>(
  geometry: T,
  radius: number,
  length: number,
  tile: number,
  palette: DragonUvSeed,
): T {
  applyTiledUv(geometry, 2 * Math.PI * Math.abs(radius), Math.abs(length), tile, palette.seed);
  return geometry;
}

/** Spheres, with the three semi-axes the mesh will be scaled to. */
export function sphereUv<T extends THREE.BufferGeometry>(
  geometry: T,
  radii: { x: number; y: number; z: number },
  tile: number,
  palette: DragonUvSeed,
): T {
  applyTiledUv(
    geometry,
    Math.PI * (Math.abs(radii.x) + Math.abs(radii.z)),
    Math.PI * Math.abs(radii.y),
    tile,
    palette.seed,
  );
  return geometry;
}

/** Boxes and shapes without a useful seam: cube-project from object space. */
export function boxUv<T extends THREE.BufferGeometry>(
  geometry: T,
  tile: number,
  palette: DragonUvSeed,
): T {
  applyBoxProjectedUv(geometry, tile, palette.seed);
  return geometry;
}

/** TubeGeometry runs `u` along its path and `v` around its tube. */
export function tubeUv<T extends THREE.BufferGeometry>(
  geometry: T,
  length: number,
  radius: number,
  tile: number,
  palette: DragonUvSeed,
): T {
  applyTiledUv(geometry, Math.abs(length), 2 * Math.PI * Math.abs(radius), tile, palette.seed);
  return geometry;
}

/** Box whose +x face is scaled down: useful for snouts, jaws, and feet. */
export function createTaperedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  frontScaleY: number,
  frontScaleZ: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 2, 1, 1);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    if (x <= 0) continue;
    const blend = x / (width / 2);
    positions.setY(index, positions.getY(index) * (1 - blend * (1 - frontScaleY)));
    positions.setZ(index, positions.getZ(index) * (1 - blend * (1 - frontScaleZ)));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Elliptical loft used for fleshy snouts; preserves the authored front taper. */
export function createTaperedJawGeometry(
  width: number,
  height: number,
  depth: number,
  frontScaleY: number,
  frontScaleZ: number,
): THREE.BufferGeometry {
  const axial = [-0.5, -0.32, -0.08, 0.14, 0.32, 0.5];
  const radialSegments = detail(16);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const columns = radialSegments + 1;

  for (const along of axial) {
    const blend = Math.max(0, along * 2);
    const yScale = 1 - blend * (1 - frontScaleY);
    const zScale = 1 - blend * (1 - frontScaleZ);
    for (let radial = 0; radial <= radialSegments; radial += 1) {
      const angle = (radial / radialSegments) * Math.PI * 2;
      positions.push(
        along * width,
        Math.cos(angle) * height * 0.5 * yScale,
        Math.sin(angle) * depth * 0.5 * zScale,
      );
      uvs.push(along + 0.5, radial / radialSegments);
    }
  }

  for (let row = 0; row < axial.length - 1; row += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const a = row * columns + radial;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const rearCenter = positions.length / 3;
  positions.push(-width / 2, 0, 0);
  uvs.push(0, 0.5);
  const frontCenter = positions.length / 3;
  positions.push(width / 2, 0, 0);
  uvs.push(1, 0.5);
  const frontRing = (axial.length - 1) * columns;
  for (let radial = 0; radial < radialSegments; radial += 1) {
    indices.push(rearCenter, radial + 1, radial);
    indices.push(frontCenter, frontRing + radial, frontRing + radial + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.userData['kind'] = 'dragon-jaw';
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
