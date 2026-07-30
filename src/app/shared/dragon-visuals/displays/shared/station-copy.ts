/**
 * Curriculum wording never lives inside the graphics package. A station receives a copy
 * map keyed by the semantic label IDs carried in the scene and teaching sequence.
 */
export type StationCopy = Readonly<Record<string, string>>;

/** Resolves a semantic label ID, falling back to a readable form of the ID itself. */
export function resolveStationCopy(copy: StationCopy, labelId: string | undefined | null): string {
  if (!labelId) return '';
  const value = copy[labelId];
  return value?.trim() ? value : humanizeLabelId(labelId);
}

/** Turns `observation.nest-dust.label` into `Nest dust` so a missing entry stays legible. */
export function humanizeLabelId(labelId: string): string {
  const segments = labelId.split('.').filter(Boolean);
  const meaningful = segments.length > 2 ? segments.slice(1, -1) : segments.slice(-1);
  const words = meaningful.join(' ').replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : labelId;
}
