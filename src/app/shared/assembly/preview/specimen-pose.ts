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

/**
 * One articulated bend: every joint whose child carries `role` rotates that
 * child and everything downstream of it around the joint's world pivot.
 *
 * Chains accumulate — a three-link tail bends into an arc rather than shearing
 * apart — which is what makes the same primitive serve both a resting droop and
 * a swinging attack.
 */
export interface SpecimenBend {
  /**
   * Role the bent child must carry. Omit to bend purely by id.
   *
   * A role alone cannot describe a limb. Every segment of every leg carries
   * `leg`, and because bends accumulate down a chain, one role bend rotates
   * femur, tibia and foot the same way and curls the limb into an arc. A real
   * leg alternates direction at each joint, so anything past a droop needs
   * {@link matchPartId} to address the segments separately.
   */
  role?: string;
  /**
   * Extra predicate on the bent child's part id, ANDed with `role`.
   *
   * Part ids are semantic (`classic-dragon-rear-left-lower-leg`), so this is
   * how a stance says "the hind tibiae and nothing else".
   */
  matchPartId?: (partId: string) => boolean;
  radians: number;
  /** World axis to rotate around. */
  axis: Vector3Data;
  /**
   * Flip the rotation for parts on the -z side of the body, so paired limbs
   * sweep symmetrically instead of both swinging the same way.
   *
   * Wanted for wings, which fold inward toward the body from both sides. Not
   * wanted for legs, where both sides step the same way.
   */
  mirrorAcrossZ?: boolean;
}

/**
 * A whole-body pitch about the hind contact — the dragon rearing up.
 *
 * Bends cannot express this. Every bend rotates the subtree *below* a joint,
 * and the torso is the root of the tree, so no bend can reach it. Rearing is
 * the opposite motion: the torso is what moves, and the hind legs are what
 * stays put. It is therefore a rigid transform of the entire posed rig about a
 * pivot on the ground, applied after the bends have articulated the limbs.
 */
export interface SpecimenRootTilt {
  /** Positive pitches the nose up, over the hind legs. */
  radians: number;
  /** World axis to pitch around. Defaults to +Z (sagittal). */
  axis?: Vector3Data;
  /**
   * Role whose rearmost member the body pivots over. Defaults to `leg`.
   * A blueprint with no such part pivots about its own rearmost part, which is
   * the closest thing to a hind contact it has.
   */
  pivotRole?: string;
}

export interface SpecimenPoseOptions {
  /**
   * Resting droop for hanging chains, in radians per link. Authored blueprints
   * hold tails straight out because in the arena gravity does the work; a
   * viewer has no gravity, so a straight tail reads as broken. 0 disables it.
   */
  droopRadians?: number;
  /** Role whose chains droop. Defaults to `tail`. */
  droopRole?: string;
  /** World axis the droop rotates around. Defaults to +Z (sagittal bend). */
  droopAxis?: Vector3Data;
  /** Extra bends layered on top of the droop — used to animate attacks. */
  bends?: readonly SpecimenBend[];
  /** Whole-body rear-up, applied after the bends. */
  rootTilt?: SpecimenRootTilt;
}

const DEFAULT_DROOP_ROLE = 'tail';
const DEFAULT_DROOP_AXIS: Vector3Data = { x: 0, y: 0, z: 1 };
const DEFAULT_PIVOT_ROLE = 'leg';
const DEFAULT_TILT_AXIS: Vector3Data = { x: 0, y: 0, z: 1 };

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
  const bends: SpecimenBend[] = [];
  if (droop !== 0) {
    bends.push({
      role: options.droopRole ?? DEFAULT_DROOP_ROLE,
      radians: droop,
      axis: options.droopAxis ?? DEFAULT_DROOP_AXIS,
    });
  }
  bends.push(...(options.bends ?? []));

  for (const bend of bends) {
    if (bend.radians !== 0) applyBend(blueprint, parts, bend);
  }

  if (options.rootTilt && options.rootTilt.radians !== 0) {
    applyRootTilt(blueprint, parts, options.rootTilt);
  }

  return { parts: blueprint.parts.map(part => parts.get(part.id)!) };
}

/**
 * Pitches the whole rig about its hind contact.
 *
 * The pivot is taken at ground level under the rearmost pivot-role part, so
 * the hind feet stay planted and everything ahead of them swings up — rather
 * than the body rotating about its own centre, which reads as a dragon
 * levitating and tipping backwards.
 */
function applyRootTilt(
  blueprint: AssemblyBlueprint,
  parts: Map<string, SpecimenPosePart>,
  tilt: SpecimenRootTilt,
): void {
  const role = tilt.pivotRole ?? DEFAULT_PIVOT_ROLE;
  const anchors = blueprint.parts.filter(part => hasRole(part, role));
  const candidates = anchors.length ? anchors : blueprint.parts;
  if (!candidates.length) return;

  let pivotX = Infinity;
  for (const part of candidates) {
    pivotX = Math.min(pivotX, parts.get(part.id)?.position.x ?? part.position.x);
  }

  let pivotY = Infinity;
  for (const part of blueprint.parts) {
    const pose = parts.get(part.id);
    if (pose) pivotY = Math.min(pivotY, pose.position.y - halfExtent(part).y);
  }

  if (!Number.isFinite(pivotX) || !Number.isFinite(pivotY)) return;

  const pivot: Vector3Data = { x: pivotX, y: pivotY, z: 0 };
  const rotation = quaternionFromAxisAngle(tilt.axis ?? DEFAULT_TILT_AXIS, tilt.radians);

  for (const pose of parts.values()) {
    const offset = subtractVectors(pose.position, pivot);
    pose.position = addVectors(pivot, rotateVectorByQuaternion(offset, rotation));
    pose.rotation = multiplyQuaternions(rotation, pose.rotation);
  }
}

function applyBend(
  blueprint: AssemblyBlueprint,
  parts: Map<string, SpecimenPosePart>,
  bend: SpecimenBend,
): void {
  const partsById = new Map(blueprint.parts.map(part => [part.id, part]));
  const childIds = new Map<string, string[]>();
  for (const joint of blueprint.joints) {
    childIds.set(joint.parentPartId, [...(childIds.get(joint.parentPartId) ?? []), joint.childPartId]);
  }

  for (const joint of orderJointsParentFirst(blueprint)) {
    if (!bendMatches(bend, partsById.get(joint.childPartId), joint.childPartId)) continue;

    const parentPose = parts.get(joint.parentPartId);
    const childPose = parts.get(joint.childPartId);
    if (!parentPose || !childPose) continue;

    const pivot = addVectors(
      parentPose.position,
      rotateVectorByQuaternion(joint.pivotOnParent, parentPose.rotation),
    );

    // Mirrored limbs rotate opposite ways: a wing on -z must sweep toward the
    // body just as its partner on +z does.
    const sign = bend.mirrorAcrossZ && childPose.position.z < 0 ? -1 : 1;
    const rotation = quaternionFromAxisAngle(bend.axis, bend.radians * sign);

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

/**
 * Whether a bend applies to the child on one joint.
 *
 * A bend with neither `role` nor `matchPartId` matches nothing, rather than
 * everything — an under-specified bend that silently rotated the entire animal
 * is a much worse failure than one that visibly does nothing.
 */
function bendMatches(
  bend: SpecimenBend,
  part: AssemblyPart | undefined,
  partId: string,
): boolean {
  if (!bend.role && !bend.matchPartId) return false;
  if (bend.role && !hasRole(part, bend.role)) return false;
  if (bend.matchPartId && !bend.matchPartId(partId)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Framing
// ---------------------------------------------------------------------------

/**
 * A camera framing volume: an upright cylinder, not a sphere.
 *
 * Creatures are rarely round. A dragon measures roughly 6 x 2 x 4 — long and
 * wide but flat — and fitting its enclosing sphere leaves it occupying under a
 * quarter of the viewport. Splitting the horizontal radius from the vertical
 * half-height frames it tightly while staying safe under turntable rotation,
 * because the horizontal radius is taken across the XZ diagonal.
 */
export interface SpecimenFrame {
  center: Vector3Data;
  /** Half the XZ diagonal — the widest the specimen can appear when spun. */
  radius: number;
  /** Half the vertical extent. */
  halfHeight: number;
}

/**
 * Chord/span inflation for procedural profiles whose mesh is deliberately
 * larger than the physics box it hugs. Mirrors the multipliers in
 * `dragon-procedural-mesh.factory.ts`; without it a wide-winged specimen gets
 * cropped at the tips.
 */
const PROFILE_INFLATION: Readonly<Record<string, Vector3Data>> = {
  // The y figure is not the physics thickness: the membrane bows below the
  // bones and arcs above them, so a wing occupies far more height than the
  // 0.08-thick box it hugs.
  'dragon-wing': { x: 2.8, y: 2.6, z: 1.1 },
  'dragon-secondary-wing': { x: 2.8, y: 2.6, z: 1.1 },
  'dragon-tail-club': { x: 1.8, y: 1.2, z: 1.8 },
  // Wide enough for the male frill, which is a ring more than twice the skull's
  // own section and raked back behind it. A female head never fills this, and
  // over-padding the frame is the cheaper mistake: the alternative is cropping
  // the one display structure the trait exists to show.
  'dragon-head-horned': { x: 1.9, y: 2.2, z: 2.1 },
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
    return { center: { x: 0, y: 0, z: 0 }, radius: 1, halfHeight: 1 };
  }

  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    radius: Math.max(0.5 * Math.hypot(maxX - minX, maxZ - minZ), 0.001),
    halfHeight: Math.max(0.5 * (maxY - minY), 0.001),
  };
}

/**
 * One frame that contains every specimen.
 *
 * Use this when specimens are shown side by side. Framing each one individually
 * scales them all to the same on-screen size, which erases exactly the size
 * difference a student is being asked to observe.
 */
export function mergeSpecimenFrames(frames: readonly SpecimenFrame[]): SpecimenFrame {
  if (frames.length === 0) return { center: { x: 0, y: 0, z: 0 }, radius: 1, halfHeight: 1 };

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const frame of frames) {
    minX = Math.min(minX, frame.center.x - frame.radius);
    minZ = Math.min(minZ, frame.center.z - frame.radius);
    maxX = Math.max(maxX, frame.center.x + frame.radius);
    maxZ = Math.max(maxZ, frame.center.z + frame.radius);
    minY = Math.min(minY, frame.center.y - frame.halfHeight);
    maxY = Math.max(maxY, frame.center.y + frame.halfHeight);
  }

  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };

  // Grow each member's own radius by how far its centre sits from the shared
  // one. Re-deriving a diagonal from the merged box instead would inflate a
  // single disc of radius 4 to 5.66 and push every compared specimen 41%
  // further away than it needs to be.
  let radius = 0;
  let halfHeight = 0;
  for (const frame of frames) {
    radius = Math.max(
      radius,
      Math.hypot(frame.center.x - center.x, frame.center.z - center.z) + frame.radius,
    );
    halfHeight = Math.max(halfHeight, Math.abs(frame.center.y - center.y) + frame.halfHeight);
  }

  return {
    center,
    radius: Math.max(radius, 0.001),
    halfHeight: Math.max(halfHeight, 0.001),
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
