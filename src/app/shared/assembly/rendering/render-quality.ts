/**
 * Render quality tiers gate the expensive parts of the pipeline (post-processing,
 * shadow resolution, pixel ratio) so battles stay smooth on school Chromebooks
 * while desktops get the full treatment.
 */
export type RenderQuality = 'high' | 'medium' | 'low';

export const RENDER_QUALITY_STORAGE_KEY = 'pbl-forge.render-quality';

const QUALITY_VALUES: readonly RenderQuality[] = ['high', 'medium', 'low'];

/**
 * User override first, then a device heuristic.
 *
 * The heuristic no longer returns `'low'`. It used to, and the effect was that
 * the specimen viewers a student actually inspects a dragon in ran with
 * pixelRatio 1, half-resolution textures, and no post chain — the whole
 * material pipeline was built and then switched off at the surface it was
 * built for. `'medium'` is the floor now: pixelRatio 1.5, full-resolution
 * texture maps, bloom and SMAA, but still no GTAO, which is the expensive one.
 *
 * `'low'` remains reachable through {@link storeRenderQuality}, so the settings
 * override is the escape hatch for a machine that cannot keep up.
 */
export function resolveRenderQuality(): RenderQuality {
  const stored = readStoredRenderQuality();
  if (stored) return stored;

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  if ((memory !== undefined && memory <= 4) || cores <= 4) return 'medium';
  return 'high';
}

export function readStoredRenderQuality(): RenderQuality | null {
  try {
    const value = globalThis.localStorage?.getItem(RENDER_QUALITY_STORAGE_KEY);
    return QUALITY_VALUES.includes(value as RenderQuality) ? (value as RenderQuality) : null;
  } catch {
    return null;
  }
}

export function storeRenderQuality(quality: RenderQuality | null): void {
  try {
    if (quality) {
      globalThis.localStorage?.setItem(RENDER_QUALITY_STORAGE_KEY, quality);
    } else {
      globalThis.localStorage?.removeItem(RENDER_QUALITY_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (private mode, sandboxed iframe): fall back to the heuristic.
  }
}

export function shadowMapSizeForQuality(quality: RenderQuality): number {
  return quality === 'high' ? 2048 : 1024;
}

/**
 * Multiplier on procedural segment counts.
 *
 * The dragon builders carry hand-tuned segment counts that were chosen to look
 * right, so this scales them rather than replacing them, and callers floor the
 * result at the authored value — `'low'` must never produce a coarser dragon
 * than the one those counts were tuned against.
 */
export function geometryDetailForQuality(quality: RenderQuality): number {
  if (quality === 'high') return 1.6;
  if (quality === 'medium') return 1.25;
  return 1;
}

/**
 * Segment count for a builder whose authored value is `base`.
 *
 * Always at least `base`: the tiers add detail, they never remove it.
 */
export function detailSegments(base: number, quality: RenderQuality): number {
  return Math.max(base, Math.round(base * geometryDetailForQuality(quality)));
}

export function pixelRatioForQuality(quality: RenderQuality): number {
  const device = globalThis.devicePixelRatio || 1;
  if (quality === 'high') return Math.min(device, 2);
  if (quality === 'medium') return Math.min(device, 1.5);
  return 1;
}
