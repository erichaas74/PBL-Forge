import * as THREE from 'three';

export interface MiniDragonTextureSet {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  alphaMap: THREE.Texture | null;
}

/** Matches the classic renderer's low tier without paying for its 512px inspection maps. */
const SIZE = 256;
const resetters: (() => void)[] = [];
const createdTextures: THREE.Texture[] = [];

function memoByVariant<T>(
  fallback: string,
  factory: (variant: string, seed: number) => T,
): (variant?: string) => T {
  const values = new Map<string, T>();
  resetters.push(() => {
    values.clear();
  });
  return (requested = fallback) => {
    const variant = requested.trim() || fallback;
    const cached = values.get(variant);
    if (cached) return cached;
    const value = factory(variant, stringHash(variant));
    values.set(variant, value);
    return value;
  };
}

function stringHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function textureName(family: string, variant: string, layer: string): string {
  const suffix = variant === family
    ? ''
    : `-${variant.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return `mini-dragon-${family}${suffix}-${layer}`;
}

function hash2(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function texture(
  name: string,
  sample: (x: number, y: number) => readonly [number, number, number, number],
  options: { srgb?: boolean; repeat?: boolean } = {},
): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const pixel = sample(x, y);
      const index = (y * SIZE + x) * 4;
      data[index] = pixel[0];
      data[index + 1] = pixel[1];
      data[index + 2] = pixel[2];
      data[index + 3] = pixel[3];
    }
  }
  const result = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  result.name = name;
  result.colorSpace = options.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.wrapS = options.repeat === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  result.wrapT = options.repeat === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = 4;
  result.userData['sharedMiniDragonTexture'] = true;
  result.needsUpdate = true;
  createdTextures.push(result);
  return result;
}

function neutral(value: number): readonly [number, number, number, number] {
  const byte = Math.max(0, Math.min(255, Math.round(value)));
  return [byte, byte, byte, 255];
}

function coatFamily(variant: string): 'sleek' | 'bumpy' | 'velvet' {
  if (variant.startsWith('sleek-')) return 'sleek';
  if (variant.startsWith('bumpy-')) return 'bumpy';
  return 'velvet';
}

/** Fine velvety grain, uniquely seeded for each anatomical part. */
export const miniDragonCoatTextures = memoByVariant(
  'coat',
  (variant, seed): MiniDragonTextureSet => ({
  map: texture(
    textureName('coat', variant, 'albedo'),
    (x, y) => {
      const family = coatFamily(variant);
      const phase = (seed % 997) / 997;
      const angle = ((seed >>> 8) % 360) * Math.PI / 180;
      if (family === 'sleek') {
        const row = Math.floor((y + seed % 13) / 8);
        const shiftedX = x + (row % 2) * 4 + seed % 17;
        const scaleX = ((shiftedX % 9) + 9) % 9 / 9;
        const scaleY = (((y + seed % 11) % 8) + 8) % 8 / 8;
        const dome = Math.sin(scaleX * Math.PI) * Math.sin(scaleY * Math.PI);
        const rim = dome < 0.2 ? -8 : 0;
        return neutral(216 + dome * 20 + rim + hash2(x + seed % 83, y + seed % 71) * 6);
      }
      if (family === 'bumpy') {
        const mound = Math.sin((x + seed % 31) * 0.24)
          * Math.sin((y + seed % 29) * 0.21);
        const freckles = hash2(Math.floor(x / 7) + seed % 43, Math.floor(y / 7) + seed % 37);
        return neutral(212 + mound * 25 + freckles * 22);
      }
      const directional = Math.sin(
        ((x * Math.cos(angle) + y * Math.sin(angle)) / SIZE + phase) * Math.PI * (10 + seed % 9),
      ) * 5;
      const grain = hash2(x + (seed % 251), y + (seed % 181)) * 16;
      const broad = hash2(Math.floor(x / (4 + seed % 4)), Math.floor(y / (5 + seed % 3))) * 9;
      return neutral(226 + grain + broad + directional);
    },
    { srgb: true },
  ),
  normalMap: texture(textureName('coat', variant, 'normal'), (x, y) => {
    const family = coatFamily(variant);
    const offsetX = seed % 233;
    const offsetY = (seed >>> 9) % 229;
    if (family === 'sleek') {
      const dx = Math.sin((x + offsetX) * Math.PI / 4.5) * 13;
      const dy = Math.sin((y + offsetY) * Math.PI / 4) * 11;
      return [128 + Math.round(dx), 128 + Math.round(dy), 250, 255];
    }
    if (family === 'bumpy') {
      const dx = Math.cos((x + offsetX) * 0.24) * 31;
      const dy = Math.cos((y + offsetY) * 0.21) * 31;
      return [128 + Math.round(dx), 128 + Math.round(dy), 238, 255];
    }
    const dx = hash2(x + 1 + offsetX, y + offsetY) - hash2(x - 1 + offsetX, y + offsetY);
    const dy = hash2(x + offsetX, y + 1 + offsetY) - hash2(x + offsetX, y - 1 + offsetY);
    return [128 - Math.round(dx * 12), 128 + Math.round(dy * 12), 252, 255];
  }),
  roughnessMap: texture(textureName('coat', variant, 'roughness'), (x, y) => {
    const family = coatFamily(variant);
    const noise = hash2(x + 17 + (seed % 149), y + 31 + (seed % 127));
    if (family === 'sleek') return neutral(118 + noise * 70);
    if (family === 'bumpy') return neutral(190 + noise * 58);
    return neutral(218 + noise * 30);
  }),
  alphaMap: null,
}));

/** Growth-ring grain for horns and milk teeth. */
export const miniDragonKeratinTextures = memoByVariant(
  'keratin',
  (variant, seed): MiniDragonTextureSet => ({
  map: texture(
    textureName('keratin', variant, 'albedo'),
    (x, y) => neutral(
      218
      + Math.sin((y / SIZE) * Math.PI * (12 + seed % 11) + (seed % 31)) * 18
      + hash2(x + seed % 173, y + seed % 137) * 8,
    ),
    { srgb: true },
  ),
  normalMap: texture(textureName('keratin', variant, 'normal'), (_x, y) => {
    const ridge = Math.cos((y / SIZE) * Math.PI * (12 + seed % 11) + (seed % 31));
    return [128, 128 + Math.round(ridge * 18), 250, 255];
  }),
  roughnessMap: texture(textureName('keratin', variant, 'roughness'), (x, y) =>
    neutral(132 + hash2(x + 5 + seed % 113, y + 9 + seed % 97) * 34),
  ),
  alphaMap: null,
}));

/** Soft veins and translucency variation for the rounded wing membrane. */
export const miniDragonMembraneTextures = memoByVariant(
  'membrane',
  (variant, seed): MiniDragonTextureSet => ({
  map: texture(
    textureName('membrane', variant, 'albedo'),
    (x, y) => {
      const pitch = 13 + seed % 9;
      const slope = 0.2 + (seed % 7) * 0.08;
      const vein = Math.abs(((x + y * slope + seed % pitch) % pitch) - pitch / 2) < 0.8 ? -28 : 0;
      return neutral(235 + vein + hash2(x + seed % 199, y + seed % 157) * 10);
    },
    { srgb: true },
  ),
  normalMap: texture(textureName('membrane', variant, 'normal'), (x, y) => {
    const pitch = 13 + seed % 9;
    const slope = 0.2 + (seed % 7) * 0.08;
    const vein = Math.abs(((x + y * slope + seed % pitch) % pitch) - pitch / 2) < 1.2;
    return [128, vein ? 142 : 128, vein ? 245 : 254, 255];
  }),
  roughnessMap: texture(textureName('membrane', variant, 'roughness'), (x, y) =>
    neutral(184 + hash2(x + 11 + seed % 109, y + 23 + seed % 83) * 30),
  ),
  alphaMap: texture(textureName('membrane', variant, 'alpha'), (x, y) =>
    neutral(222 + hash2(x + 29 + seed % 101, y + 7 + seed % 71) * 24),
  ),
}));

/** A deterministic feather card per body or wing layer. */
export const miniDragonFeatherTextures = memoByVariant(
  'feather',
  (variant, seed): MiniDragonTextureSet => ({
  map: texture(
    textureName('feather', variant, 'albedo'),
    (x, y) => {
      const offset = Math.abs(x / (SIZE - 1) - 0.5);
      const shaft = Math.max(0, 1 - offset / (0.045 + (seed % 9) * 0.002));
      const bars = Math.sin((y / SIZE) * Math.PI * (12 + seed % 8)) * 3;
      return neutral(218 + shaft * 32 + bars + hash2(x + seed % 61, y + seed % 47) * 5);
    },
    { srgb: true, repeat: false },
  ),
  normalMap: null,
  roughnessMap: null,
  alphaMap: texture(
    textureName('feather', variant, 'alpha'),
    (x, y) => {
      const t = y / (SIZE - 1);
      const envelope = 0.055 + Math.sin(Math.PI * Math.pow(t, 0.82)) * 0.43;
      const barbEdge = envelope * (0.975 + Math.sin(t * Math.PI * 8) * 0.022);
      const inside = Math.abs(x / (SIZE - 1) - 0.5) <= barbEdge;
      return neutral(inside ? 255 : 0);
    },
    { repeat: false },
  ),
}));

export function isSharedMiniDragonTexture(value: THREE.Texture | null | undefined): boolean {
  return Boolean(value?.userData['sharedMiniDragonTexture']);
}

/** Test teardown for the mini species' independent texture cache. */
export function disposeMiniDragonTextures(): void {
  for (const value of createdTextures.splice(0)) value.dispose();
  for (const reset of resetters) reset();
}
