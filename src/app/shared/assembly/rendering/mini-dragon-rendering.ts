import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';

// Palette, materials, and low-level helpers owned exclusively by the mini dragon.

export interface MiniDragonPalette {
  coat: THREE.Color;
  coatDeep: THREE.Color;
  /** Second coat colour. Equal to `coat` unless the specimen is two-toned. */
  patch: THREE.Color;
  horn: THREE.Color;
  paw: THREE.Color;
  ember: string;
  /** Stable 0..1 from the part id, so repeated limbs are not exact copies. */
  seed: number;
}

export function createMiniDragonPalette(part: AssemblyPart): MiniDragonPalette {
  const coat = new THREE.Color(part.color);
  const patch = new THREE.Color(visualString(part, 'miniPatchColor', part.color));
  return {
    coat,
    coatDeep: coat.clone().multiplyScalar(0.62),
    patch,
    horn: coat.clone().lerp(new THREE.Color('#efe2c4'), 0.78),
    paw: coat.clone().lerp(new THREE.Color('#f0b9c4'), 0.66),
    ember: visualString(part, 'miniEmberColor', '#ffb45e'),
    seed: partSeed(part.id),
  };
}

/** Matte scale material with no expensive image texture. */
export function coatMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0 });
}

export function hornMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.horn, roughness: 0.52, metalness: 0.04 });
}

export function pawMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.paw, roughness: 0.78, metalness: 0 });
}

/**
 * Eyes and throat glow. The ember gene is the only locus that reaches this
 * material, which is why an ember colour is worth a whole channel: it is the one
 * trait a student can read on a specimen at thumbnail size in a dark room.
 */
export function emberMaterial(
  palette: MiniDragonPalette,
  intensity = 1.2,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#2a1508',
    emissive: new THREE.Color(palette.ember),
    emissiveIntensity: intensity,
    roughness: 0.22,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

export function wingSkinMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: palette.coat.clone().lerp(new THREE.Color('#ffffff'), 0.18),
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

export function sampleProfile(
  profile: readonly (readonly [number, number])[],
  axialFraction: number,
): number {
  for (let index = 1; index < profile.length; index += 1) {
    const [fromT, fromRadius] = profile[index - 1];
    const [toT, toRadius] = profile[index];
    if (axialFraction <= toT) {
      const blend = (axialFraction - fromT) / Math.max(toT - fromT, 1e-6);
      return fromRadius + (toRadius - fromRadius) * Math.max(0, Math.min(1, blend));
    }
  }
  return profile[profile.length - 1][1];
}

/** Rounded socket cover seated at an attachment end so animated parts never reveal a gap. */
export function addJointBall(
  group: THREE.Group,
  radius: number,
  material: THREE.Material,
  position: Vector3Data,
): void {
  const ball = mesh(new THREE.SphereGeometry(Math.max(radius, 0.001), 12, 9), material);
  ball.name = 'mini-dragon-joint-ball';
  ball.position.set(position.x, position.y, position.z);
  group.add(ball);
}

export function visualNumber(part: AssemblyPart, key: string, fallback: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clampedVisualNumber(part: AssemblyPart, key: string, fallback: number): number {
  return Math.max(0, Math.min(1, visualNumber(part, key, fallback)));
}

export function visualString(part: AssemblyPart, key: string, fallback: string): string {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'string' && value.length ? value : fallback;
}

function partSeed(id: string): number {
  return hashUnit(id);
}

export function hashUnit(value: string | number): number {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function fract(value: number): number {
  return value - Math.floor(value);
}
