import { DragonProceduralProfileId } from './dragon-model-pack.models';
import { DRAGON_VISUAL_PARAMETER_REGISTRY } from './dragon-visual-parameter-registry';

export type DragonVisualParameterType = 'number' | 'string' | 'boolean';
export type DragonVisualParameterContract = Readonly<Record<string, DragonVisualParameterType>>;

/**
 * Canonical renderer contract for parameters carried by a published dragon.
 * Writers and readers share this table, so a misspelling is rejected at the
 * model-pack boundary instead of being silently replaced by a visual default.
 */
export const DRAGON_VISUAL_PARAMETER_CONTRACT = Object.fromEntries(
  DRAGON_VISUAL_PARAMETER_REGISTRY
    .flatMap(definition => definition.profiles.map(profile => [profile, definition] as const))
    .reduce((entries, [profile, definition]) => {
      const existing = entries.get(profile) ?? {};
      existing[definition.key] = definition.type;
      entries.set(profile, existing);
      return entries;
    }, new Map<string, Record<string, DragonVisualParameterType>>()),
) as Record<DragonProceduralProfileId, DragonVisualParameterContract>;

export function validateDragonVisualParameters(
  profileId: DragonProceduralProfileId,
  parameters: Record<string, string | number | boolean> | undefined,
  label: string,
): void {
  if (!parameters) return;
  const contract: DragonVisualParameterContract = DRAGON_VISUAL_PARAMETER_CONTRACT[profileId];
  for (const [key, value] of Object.entries(parameters)) {
    const expected = contract[key];
    if (!expected) {
      throw new Error(`${label}.${key} is not supported by procedural profile "${profileId}".`);
    }
    if (typeof value !== expected) {
      throw new Error(`${label}.${key} must be a ${expected} for procedural profile "${profileId}".`);
    }
  }
}
