import {
  AssemblyPart,
  AssemblyBlueprint,
  Vector3Data,
} from '../../shared/assembly/domain/assembly.models';
import { cloneAssemblyBlueprint } from '../../shared/assembly/domain/assembly-clone';
import { CreationAssemblyAsset } from '../../creation-library/models/creation-library.models';
import {
  ArenaControlMode,
  BattleCombatant,
  BattleController,
  BattlePartStatus,
  BattleTeam,
} from '../models/arena.models';

export function createCombatant(
  id: string,
  asset: CreationAssemblyAsset,
  team: BattleTeam,
  spawnPosition: Vector3Data,
  controller: BattleController,
  controlMode: ArenaControlMode,
  initialRotation: Vector3Data = { x: 0, y: 0, z: 0 },
): BattleCombatant {
  const assembly = cloneAssemblyBlueprint(asset.assembly);

  return {
    id,
    name: asset.name,
    team,
    presetId: asset.id,
    assembly,
    combatProfile: structuredClone(asset.combatProfile),
    corePartId: asset.combatProfile.corePartId || chooseCorePartId(assembly),
    spawnPosition,
    initialRotation,
    controller,
    controlMode,
  };
}

export function createPartStatuses(combatants: BattleCombatant[]): Record<string, BattlePartStatus> {
  const statuses: Record<string, BattlePartStatus> = {};

  for (const combatant of combatants) {
    for (const part of combatant.assembly.parts) {
      const bodyKey = getBodyKey(combatant.id, part.id);
      const combatPart = combatant.combatProfile.parts[part.id];
      const maxHealth = combatPart?.maxHealth ?? getPartMaxHealth(part);

      statuses[bodyKey] = {
        bodyKey,
        combatantId: combatant.id,
        sourcePartId: part.id,
        label: part.label ?? part.id.replace(`${combatant.presetId}-`, '').replace(/-/g, ' '),
        maxHealth,
        health: maxHealth,
        destroyed: false,
      };
    }
  }

  return statuses;
}

export function getBodyKey(combatantId: string, partId: string): string {
  return `${combatantId}:${partId}`;
}

export function getPartMaxHealth(part: AssemblyPart): number {
  const volume = Math.max(part.dimensions.x * part.dimensions.y * part.dimensions.z, 0.05);
  return Math.round(28 + part.mass * 18 + volume * 10);
}

function chooseCorePartId(state: AssemblyBlueprint): string {
  const explicitCore = state.parts.find(part => part.roles?.includes('core'));
  const torso = state.parts.find(part => part.id.includes('torso'));
  const chassis = state.parts.find(part => part.id.includes('chassis'));
  const body = state.parts.find(part => part.id.includes('body'));
  const heaviest = [...state.parts].sort((a, b) => b.mass - a.mass)[0];

  return explicitCore?.id ?? torso?.id ?? chassis?.id ?? body?.id ?? heaviest?.id ?? state.parts[0]?.id ?? '';
}
