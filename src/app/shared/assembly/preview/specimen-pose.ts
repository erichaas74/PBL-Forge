import {
  AssemblyBlueprint,
  AssemblyPart,
  QuaternionData,
  Vector3Data,
} from '../domain/assembly.models';
import {
  cloneQuaternion,
  cloneVector3,
  identityQuaternion,
  multiplyQuaternions,
  quaternionFromAxisAngle,
  rotateVectorByQuaternion,
} from '../domain/vector-data';

/**
 * Static posing and framing for the specimen viewer — no physics engine.
 *
 * This is safe because blueprint authoring already leaves parts in a valid
 * anatomical pose: presets are assembled through snap points, and the genetics
 * pipeline re-derives every child position from its joint pivots after scaling
 * (see `realignPartsToJoints` in the dragon phenotype builder). The solver was
 * never what made the pose correct, so a viewer does not need one.
 */

export interface SpecimenPosePart {
  partId: string;
  position: Vector3Data;
  rotation: QuaternionData;
}

export interface SpecimenPose {
  parts: readonly SpecimenPosePart[];
}

export interface SpecimenPoseOptions {
  /**
   * Per-link downward bend applied along chains of parts with this role, in
   * radians. Authored blueprints hold hanging chains (dragon tails) straight
   * out, because in the arena gravity does the work. A viewer has no gravity,
   * so a straight tail reads as broken. 0 disables it.
   */
  droopRadians?: number;
  /** Role whose chains droop. Defaults to `tail`. */
  droopRole?: string;
  /** World axis the droop rotates around. Defaults to +Z (sagittal bend). */
  droopAxis?: Vector3Data;
}

const DEFAULT_DROOP_ROLE = 'tail';
const DEFAULT_DROOP_AXIS: Vector3Data = { x: 0, y: 0, z: 1 };

/** Poses every part of a blueprint for display. */
export function buildSpecimenPose(
  blueprint: AssemblyBlueprint,
  options: SpecimenPoseOptions = {},
): SpecimenPose {
  const parts = new Map<string, SpecimenPosePart>(
    blueprint.parts.map(part => [part.id, {
      partId: part.id,
      position: cloneVector3(part.position),
      rotation: part.rotation ? cloneQuaternion(part.rotation) : identityQuaternion(),
    }]),
  );

  const droop = options.droopRadians ?? 0;
  if (droop !== 0) {
    applyChainDroop(blueprint, parts, droop, options);
  }

  return { parts: blueprint.parts.map(part => parts.get(part.id)!) };
}

/**
 * Bends chains of `droopRole` parts. Each joint in the chain rotates its child
 * and everything downstream of it around that joint's world pivot, so the bend
 * accumulates into an arc instead of shearing links apart.
 */
function applyChainDroop(
  blueprint: AssemblyBlueprint,
  parts: Map<string, SpecimenPosePart>,
  droop: number,
  options: SpecimenPoseOptions,
): void {
  const role = options.droopRole ?? DEFAULT_DROOP_ROLE;
  const rotation = quaternionFromAxisAngle(options.droopAxis ?? DEFAULT_DROOP_AXIS, droop);
  const partsById = new Map(blueprint.parts.map(part => [part.id, part]));
  const childIds = new Map<string, string[]>();
  for (const joint of blueprint.joints) {
    childIds.set(joint.parentPartId, [...(childIds.get(joint.parentPartId) ?? []), joint.childPartId]);
  }

  for (const joint of orderJointsParentFirst(blueprint)) {
    if (!hasRole(partsById.get(joint.childPartId), role)) continue;

    const parentPose = parts.get(joint.parentPartId);
    const childPose = parts.get(joint.childPartId);
    if (!parentPose || !childPose) continue;

    const pivot = addVectors(
      parentPose.position,
      rotateVectorByQuaternion(joint.pivotOnParent, parentPose.rotation),
    );

    for (const affectedId of collectSubtree(joint.childPartId, childIds)) {
      const pose = parts.get(affectedId);
      if (!pose) continue;
      const offset = subtractVectors(pose.position, pivot);
      pose.position = addVectors(pivot, rotateVectorByQuaternion(offset, rotation));
      pose.rotation = multiplyQuaternions(rotation, pose.rotation);
    }
  }
}

/**
 * Joints ordered so a parent is always processed before its children. Chains
 * bent out of order would rotate a link around a pivot that has already moved.
 */
function orderJointsParentFirst(blueprint: AssemblyBlueprint) {
  const childIds = new Set(blueprint.joints.map(joint => joint.childPartId));
  const settled = new Set(blueprint.parts.map(part => part.id).filter(id => !childIds.has(id)));
  const pending = [...blueprint.joints];
  const ordered: typeof blueprint.joints = [];

  while (pending.length) {
    const readyIndex = pending.findIndex(joint => settled.has(joint.parentPartId));
    // Cycle or orphan: stop rather than loop forever; the rest keeps its pose.
    if (readyIndex < 0) break;
    const [joint] = pending.splice(readyIndex, 1);
    settled.add(joint.childPartId);
    ordered.push(joint);
  }

  return ordered;
}

function collectSubtree(rootId: string, childIds: Map<string, string[]>): string[] {
  const collected: string[] = [];
  const queue = [rootId];
  const seen = new Set<string>();

  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    collected.push(id);
    queue.push(...(childIds.get(id) ?? []));
  }

  return collected;
}

function hasRole(part: AssemblyPart | undefined, role: string): boolean {
  return Boolean(part?.roles?.includes(role));
}

// ---------------------------------------------------------------------------
// Framing
// ---------------------------------------------------------------------------

/** A camera framing volume: everything worth seeing sits inside this sphere. */
export interface SpecimenFrame {
  center: Vector3Data;
  radius: number;
}

/**
 * Chord/span inflation for procedural profiles whose mesh is deliberately
 * larger than the physics box it hugs. Mirrors the multipliers in
 * `dragon-procedural-mesh.factory.ts`; without it a wide-winged specimen gets
 * cropped at the tips.
 */
const PROFILE_INFLATION: Readonly<Record<string, Vector3Data>> = {
  'dragon-wing': { x: 2.8, y: 1, z: 1.1 },
  'dragon-secondary-wing': { x: 2.8, y: 1, z: 1.1 },
  'dragon-tail-club': { x: 1.8, y: 1.2, z: 1.8 },
  'dragon-head-horned': { x: 1.4, y: 2.2, z: 1.4 },
};

/**
 * Bounding sphere estimated from part geometry, without touching WebGL — so it
 * runs in tests, in a worker, and before anything is mounted.
 */
export function estimateSpecimenFrame(
  blueprint: AssemblyBlueprint,
  pose?: SpecimenPose,
): SpecimenFrame {
  const positions = new Map(
    (pose?.parts ?? []).map(part => [part.partId, part.position]),
  );

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const part of blueprint.parts) {
    const center = positions.get(part.id) ?? part.position;
    const half = halfExtent(part);
    minX = Math.min(minX, center.x - half.x);
    minY = Math.min(minY, center.y - half.y);
    minZ = Math.min(minZ, center.z - half.z);
    maxX = Math.max(maxX, center.x + half.x);
    maxY = Math.max(maxY, center.y + half.y);
    maxZ = Math.max(maxZ, center.z + half.z);
  }

  if (!Number.isFinite(minX)) {
    return { center: { x: 0, y: 0, z: 0 }, radius: 1 };
  }

  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
  const radius = Math.max(
    0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ),
    0.001,
  );
  return { center, radius };
}

/**
 * One frame that contains every specimen.
 *
 * Use this when specimens are shown side by side. Framing each one individually
 * scales them all to the same on-screen size, which erases exactly the size
 * difference a student is being asked to observe.
 */
export function mergeSpecimenFrames(frames: readonly SpecimenFrame[]): SpecimenFrame {
  if (frames.length === 0) return { center: { x: 0, y: 0, z: 0 }, radius: 1 };

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const frame of frames) {
    minX = Math.min(minX, frame.center.x - frame.radius);
    minY = Math.min(minY, frame.center.y - frame.radius);
    minZ = Math.min(minZ, frame.center.z - frame.radius);
    maxX = Math.max(maxX, frame.center.x + frame.radius);
    maxY = Math.max(maxY, frame.center.y + frame.radius);
    maxZ = Math.max(maxZ, frame.center.z + frame.radius);
  }

  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    radius: Math.max(0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ), 0.001),
  };
}

/** Lowest point of the specimen, so a ground plane can sit under it. */
export function estimateSpecimenFloor(blueprint: AssemblyBlueprint, pose?: SpecimenPose): number {
  const positions = new Map((pose?.parts ?? []).map(part => [part.partId, part.position]));
  let floor = Infinity;

  for (const part of blueprint.parts) {
    const center = positions.get(part.id) ?? part.position;
    floor = Math.min(floor, center.y - halfExtent(part).y);
  }

  return Number.isFinite(floor) ? floor : 0;
}

function halfExtent(part: AssemblyPart): Vector3Data {
  const dimensions = part.dimensions;
  // Matches createAssemblyGeometry: sphere reads x as a radius, cylinder reads
  // x as a radius and y as full height, box reads all three as full extents.
  const base: Vector3Data = part.shape === 'sphere'
    ? { x: dimensions.x, y: dimensions.x, z: dimensions.x }
    : part.shape === 'cylinder'
      ? { x: dimensions.x, y: dimensions.y / 2, z: dimensions.x }
      : { x: dimensions.x / 2, y: dimensions.y / 2, z: dimensions.z / 2 };

  const profileId = part.visualProfile?.profileId ?? '';
  const inflation = Object.prototype.hasOwnProperty.call(PROFILE_INFLATION, profileId)
    ? PROFILE_INFLATION[profileId]
    : null;
  const scale = part.visualProfile?.scale;

  return {
    x: Math.abs(base.x * (inflation?.x ?? 1) * (scale?.x ?? 1)),
    y: Math.abs(base.y * (inflation?.y ?? 1) * (scale?.y ?? 1)),
    z: Math.abs(base.z * (inflation?.z ?? 1) * (scale?.z ?? 1)),
  };
}

function addVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
