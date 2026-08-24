import { AssemblyPart } from '../domain/assembly.models';

/** Typed accessors for the mini-dragon-only visual parameter namespace. */
export function miniVisualNumber(part: AssemblyPart, key: string, fallback: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clampedMiniVisualNumber(part: AssemblyPart, key: string, fallback: number): number {
  return Math.max(0, Math.min(1, miniVisualNumber(part, key, fallback)));
}

export function miniVisualString(part: AssemblyPart, key: string, fallback: string): string {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'string' && value.length ? value : fallback;
}
