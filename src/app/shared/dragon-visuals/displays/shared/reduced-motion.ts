import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Tracks `prefers-reduced-motion`. Stations use it to reveal the same state without
 * spatial animation instead of hiding information behind motion.
 */
export function createReducedMotionSignal(): Signal<boolean> {
  const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = signal(query?.matches ?? false);
  if (!query) return reduced.asReadonly();

  const listener = (event: MediaQueryListEvent) => reduced.set(event.matches);
  query.addEventListener?.('change', listener);
  inject(DestroyRef).onDestroy(() => query.removeEventListener?.('change', listener));
  return reduced.asReadonly();
}
