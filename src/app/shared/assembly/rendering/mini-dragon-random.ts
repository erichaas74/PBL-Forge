/** Deterministic helpers used by mini-dragon palettes, textures, and feather placement. */
export function miniDragonHashUnit(value: string | number): number {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/**
 * FNV-1a with an avalanche finalizer for stable discrete choices. The finalizer
 * keeps modulo-based allele draws from alternating in lockstep by trailing index.
 */
export function miniDragonStableHash(value: string | number): number {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function miniDragonFract(value: number): number {
  return value - Math.floor(value);
}
