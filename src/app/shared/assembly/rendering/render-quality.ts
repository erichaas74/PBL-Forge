/**
 * Render quality tiers gate the expensive parts of the pipeline (post-processing,
 * shadow resolution, pixel ratio) so battles stay smooth on school Chromebooks
 * while desktops get the full treatment.
 */
export type RenderQuality = 'high' | 'medium' | 'low';

export const RENDER_QUALITY_STORAGE_KEY = 'pbl-forge.render-quality';

const QUALITY_VALUES: readonly RenderQuality[] = ['high', 'medium', 'low'];

/** User override first, then a conservative device heuristic. */
export function resolveRenderQuality(): RenderQuality {
  const stored = readStoredRenderQuality();
  if (stored) return stored;

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  if ((memory !== undefined && memory <= 2) || cores <= 2) return 'low';
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

export function pixelRatioForQuality(quality: RenderQuality): number {
  const device = globalThis.devicePixelRatio || 1;
  if (quality === 'high') return Math.min(device, 2);
  if (quality === 'medium') return Math.min(device, 1.5);
  return 1;
}
