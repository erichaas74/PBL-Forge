import {
  AssemblyPart,
  AssemblyBlueprint,
  QuaternionData,
  Vector3Data,
} from '../../assembly/domain/assembly.models';
import { identityQuaternion } from '../../assembly/domain/vector-data';
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

/**
 * The whole animal, measured in its torso's frame.
 *
 * A dragon gets exactly one physics body — the torso — and every limb is posed
 * around it (see `buildDragonArenaPose`). That body is a short box in the
 * middle of the chest, so nothing the solver knows about says the animal has
 * legs under it, a tail behind it, or wings out to the side: left to the
 * contacts alone the torso settles until *it* touches the sand, with the feet a
 * metre underneath, and it walks up to the palisade with three metres of tail
 * already through it.
 *
 * This measures what the renderer will actually draw, so the physics can stand
 * the dragon on the floor and keep it inside the ring. Taken from the
 * blueprint's authored pose, which is the pose the arena renders whenever no
 * attack is playing.
 */
export interface DragonBodyFrame {
  /** Torso height that puts the feet on the sand. */
  standingHeight: number;
  /** Centre of the animal's box, relative to the torso centre, in its frame. */
  center: Vector3Data;
  /** Half extents of that box: x along the spine, y up, z across. */
  half: Vector3Data;
}

export function dragonBodyFrame(
  blueprint: AssemblyBlueprint,
  corePartId: string,
): DragonBodyFrame | null {
  const core = blueprint.parts.find(part => part.id === corePartId);
  if (!core) return null;

  let min: Vector3Data = { x: Infinity, y: Infinity, z: Infinity };
  let max: Vector3Data = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const part of blueprint.parts) {
    const half = rotatedHalfExtent(partHalfExtent(part), part.rotation ?? identityQuaternion());
    min = {
      x: Math.min(min.x, part.position.x - half.x),
      y: Math.min(min.y, part.position.y - half.y),
      z: Math.min(min.z, part.position.z - half.z),
    };
    max = {
      x: Math.max(max.x, part.position.x + half.x),
      y: Math.max(max.y, part.position.y + half.y),
      z: Math.max(max.z, part.position.z + half.z),
    };
  }

  if (!Number.isFinite(min.x)) return null;

  return {
    // The authored blueprint puts the sand at y = 0, so the drop from the torso
    // to the lowest foot is exactly the height the torso has to ride at.
    standingHeight: core.position.y - min.y,
    center: {
      x: (min.x + max.x) / 2 - core.position.x,
      y: (min.y + max.y) / 2 - core.position.y,
      z: (min.z + max.z) / 2 - core.position.z,
    },
    half: {
      x: (max.x - min.x) / 2,
      y: (max.y - min.y) / 2,
      z: (max.z - min.z) / 2,
    },
  };
}

/**
 * Half extents of one part, reading `dimensions` the way
 * `createAssemblyGeometry` does. Deliberately the *collision* size: the
 * specimen viewer inflates procedural profiles so a camera never crops a wing
 * tip, and padding a dragon's silhouette for framing would make it float above
 * the sand here.
 */
function partHalfExtent(part: AssemblyPart): Vector3Data {
  const half = coreHalfExtents(part);
  return { x: half.length, y: half.height, z: half.width };
}

/** Axis-aligned half extents of an oriented box. */
function rotatedHalfExtent(half: Vector3Data, rotation: QuaternionData): Vector3Data {
  const { x, y, z, w } = rotation;
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;

  return {
    x: Math.abs(1 - 2 * (yy + zz)) * half.x
      + Math.abs(2 * (x * y - w * z)) * half.y
      + Math.abs(2 * (x * z + w * y)) * half.z,
    y: Math.abs(2 * (x * y + w * z)) * half.x
      + Math.abs(1 - 2 * (xx + zz)) * half.y
      + Math.abs(2 * (y * z - w * x)) * half.z,
    z: Math.abs(2 * (x * z - w * y)) * half.x
      + Math.abs(2 * (y * z + w * x)) * half.y
      + Math.abs(1 - 2 * (xx + yy)) * half.z,
  };
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
