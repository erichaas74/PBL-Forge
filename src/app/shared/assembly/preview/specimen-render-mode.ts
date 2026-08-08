import { signal } from '@angular/core';

/**
 * How a specimen tile draws itself.
 *
 * Two genuinely different representations of the same animal, not one at two
 * quality settings:
 *
 * - `plate` — a parametric SVG specimen plate. Crisp at any size, real DOM (so
 *   it is themeable and screen-reader addressable), no WebGL, no bake, and
 *   free to exaggerate a trait until it reads at 120px. This is the field-guide
 *   illustration, and it is the right default for the workstations.
 * - `render` — a baked frame from the full procedural 3D dragon. Accurate,
 *   expensive, and at small sizes its ambient occlusion and specular detail
 *   turn into noise. Right for hero tiles and for checking that the plate has
 *   not drifted from the real anatomy.
 *
 * Both read the same trait readouts, so whichever is on screen is describing
 * the same genome. Kept side by side deliberately: the plate is an
 * interpretation, and being able to flip to the render is how you find out
 * whether the interpretation is still honest.
 *
 * Persisted, so a choice survives a reload — comparing the two is something you
 * do across pages, not inside one.
 */
export type SpecimenRenderMode = 'plate' | 'render';

export const SPECIMEN_RENDER_MODE_STORAGE_KEY = 'pbl-forge.specimen-render-mode';

const MODES: readonly SpecimenRenderMode[] = ['plate', 'render'];

const DEFAULT_MODE: SpecimenRenderMode = 'plate';

/**
 * Module-level signal rather than a service.
 *
 * Every specimen tile on the page has to react, and they are scattered across
 * components that do not share an injector — the stations each provide their
 * own specimen profile. A single signal keeps them in lockstep with no
 * plumbing, and matches how `setDragonStyleOverride` already works for the
 * parts lab.
 */
const mode = signal<SpecimenRenderMode>(readStoredRenderMode() ?? DEFAULT_MODE);

/** Read this from a template or computed; it updates every tile at once. */
export const specimenRenderMode = mode.asReadonly();

export function setSpecimenRenderMode(next: SpecimenRenderMode): void {
  mode.set(next);
  try {
    globalThis.localStorage?.setItem(SPECIMEN_RENDER_MODE_STORAGE_KEY, next);
  } catch {
    // Storage unavailable (private mode, sandboxed iframe): the choice still
    // applies for this session, it just will not survive a reload.
  }
}

export function toggleSpecimenRenderMode(): SpecimenRenderMode {
  const next: SpecimenRenderMode = mode() === 'plate' ? 'render' : 'plate';
  setSpecimenRenderMode(next);
  return next;
}

export function readStoredRenderMode(): SpecimenRenderMode | null {
  try {
    const value = globalThis.localStorage?.getItem(SPECIMEN_RENDER_MODE_STORAGE_KEY);
    return MODES.includes(value as SpecimenRenderMode) ? (value as SpecimenRenderMode) : null;
  } catch {
    return null;
  }
}

/** Test hook: drops the stored choice and returns to the default. */
export function resetSpecimenRenderMode(): void {
  mode.set(DEFAULT_MODE);
  try {
    globalThis.localStorage?.removeItem(SPECIMEN_RENDER_MODE_STORAGE_KEY);
  } catch {
    // As above.
  }
}
