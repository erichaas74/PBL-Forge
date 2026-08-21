import * as THREE from 'three';

const fract = (value: number): number => value - Math.floor(value);


/**
 * Bakes tiling into an existing UV set so one texture tile covers `tile` world
 * units, regardless of how the genome scaled the part.
 *
 * Repeats are rounded to whole numbers: revolved geometry wraps its `u` from 1
 * back to 0, and a fractional repeat would put a visible seam down that join.
 */
export function applyTiledUv(
  geometry: THREE.BufferGeometry,
  spanU: number,
  spanV: number,
  tile: number,
  seed = 0,
): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) return;

  const repeatU = Math.max(1, Math.round(spanU / tile));
  const repeatV = Math.max(1, Math.round(spanV / tile));
  const offsetU = seed;
  const offsetV = fract(seed * 7.13);

  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * repeatU + offsetU, uv.getY(index) * repeatV + offsetV);
  }
  uv.needsUpdate = true;
}

/**
 * Cube projection from object space, for boxes and tapered boxes.
 *
 * `BoxGeometry` normalises each face's UVs to 0..1 over that face's own extent,
 * so a long muzzle would stretch its scales lengthwise and squash them across.
 * Projecting from position instead gives every face the same density.
 */
export function applyBoxProjectedUv(geometry: THREE.BufferGeometry, tile: number, seed = 0): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal) return;

  const uv = new Float32Array(position.count * 2);
  const offsetU = seed;
  const offsetV = fract(seed * 7.13);

  for (let index = 0; index < position.count; index += 1) {
    const nx = Math.abs(normal.getX(index));
    const ny = Math.abs(normal.getY(index));
    const nz = Math.abs(normal.getZ(index));
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);

    let u: number;
    let v: number;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }

    uv[index * 2] = u / tile + offsetU;
    uv[index * 2 + 1] = v / tile + offsetV;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

