import { AssemblyPart } from '../domain/assembly.models';

/** Reads a finite numeric visual parameter or returns its authored default. */
export function visualNumber(part: AssemblyPart, key: string, fallback: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Reads a string visual parameter or returns its authored default. */
export function visualString(part: AssemblyPart, key: string, fallback: string): string {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'string' ? value : fallback;
}

/** Flags are enabled only by the literal boolean value true. */
export function visualFlag(part: AssemblyPart, key: string): boolean {
  return part.visualProfile?.parameters?.[key] === true;
}
