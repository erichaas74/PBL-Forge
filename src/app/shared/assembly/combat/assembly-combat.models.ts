import { AssemblyBlueprint } from '../domain/assembly.models';

export interface AssemblyCombatPartProfile {
  maxHealth: number;
  armor: number;
  damageMultiplier: number;
}

/** Game-neutral combat metadata layered over a reusable physical blueprint. */
export interface AssemblyCombatProfile {
  corePartId: string;
  parts: Record<string, AssemblyCombatPartProfile>;
  abilityIds: string[];
}

export function createDefaultCombatProfile(blueprint: AssemblyBlueprint): AssemblyCombatProfile {
  const explicitCore = blueprint.parts.find(part => part.roles?.includes('core'));
  const heaviest = [...blueprint.parts].sort((a, b) => b.mass - a.mass)[0];
  const corePartId = explicitCore?.id ?? heaviest?.id ?? blueprint.parts[0]?.id ?? '';
  const parts = Object.fromEntries(blueprint.parts.map(part => {
    const volume = Math.max(part.dimensions.x * part.dimensions.y * part.dimensions.z, 0.05);
    const armorBonus = part.roles?.includes('armor') ? 12 : 0;
    return [part.id, {
      maxHealth: Math.round(28 + part.mass * 18 + volume * 10 + armorBonus),
      armor: part.roles?.includes('armor') ? 0.2 : 0,
      damageMultiplier: part.roles?.includes('core') ? 1 : 0.85,
    }];
  }));

  return { corePartId, parts, abilityIds: inferAbilityIds(blueprint) };
}

function inferAbilityIds(blueprint: AssemblyBlueprint): string[] {
  const abilities = new Set<string>();
  if (blueprint.parts.some(part => part.roles?.includes('jaw'))) abilities.add('bite');
  if (blueprint.parts.some(part => part.roles?.includes('wing'))) abilities.add('wing-buffet');
  if (blueprint.parts.some(part => part.roles?.includes('tail'))) abilities.add('tail-sweep');
  if (blueprint.parts.some(part => part.roles?.includes('weapon'))) abilities.add('ram');
  return [...abilities];
}
