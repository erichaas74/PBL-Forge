import {
  AssemblyPart,
  AssemblyBlueprint,
  Vector3Data,
} from '../../assembly/domain/assembly.models';
import { cloneAssemblyBlueprint } from '../../assembly/domain/assembly-clone';
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

/** Half-extents of a torso: along its spine, across it, and vertically. */
export interface CoreHalfExtents {
  length: number;
  width: number;
  height: number;
}

/**
 * Torso half-extents in the body's own frame.
 *
 * Mirrors `createAssemblyGeometry`'s reading of `dimensions`: a sphere carries
 * a radius in `x`, a cylinder a radius in `x` and a full height in `y`, and a
 * box three full extents.
 *
 * Shared by the physics and the sensors on purpose. Both have to agree on how
 * big a dragon is, or a controller aims for a range its attacks cannot reach.
 */
export function coreHalfExtents(part: AssemblyPart): CoreHalfExtents {
  if (part.shape === 'sphere') {
    return { length: part.dimensions.x, width: part.dimensions.x, height: part.dimensions.x };
  }
  if (part.shape === 'cylinder') {
    return { length: part.dimensions.x, width: part.dimensions.x, height: part.dimensions.y / 2 };
  }
  return {
    length: part.dimensions.x / 2,
    width: part.dimensions.z / 2,
    height: part.dimensions.y / 2,
  };
}

/**
 * How far a torso reaches from its centre in a world direction, on the ground
 * plane: the box support function.
 *
 * A dragon showing its flank is under a unit of body from its centre; one
 * pointing its nose at you is nearly two. Every measurement of "how far apart
 * are these two" has to go through this, because a dragon torso is longer than
 * most of the attack ranges in the game.
 */
export function horizontalTorsoSupport(
  half: CoreHalfExtents,
  forwardX: number,
  forwardZ: number,
  dirX: number,
  dirZ: number,
): number {
  const along = Math.abs(dirX * forwardX + dirZ * forwardZ);
  const across = Math.abs(dirX * -forwardZ + dirZ * forwardX);
  return along * half.length + across * half.width;
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
