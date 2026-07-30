import {
  AssemblyBlueprint,
  AssemblyPart,
  AssemblySnapDefinition,
  AssemblySnapPoint,
  Vector3Data,
} from './assembly.models';
import { identityQuaternion, multiplyQuaternions, rotateVectorByQuaternion } from './vector-data';

export interface SnapMatch {
  movingSnap: AssemblySnapPoint;
  targetSnap: AssemblySnapPoint;
  distance: number;
}

export function getPartSnapPoints(part: AssemblyPart): AssemblySnapPoint[] {
  const partRotation = part.rotation ?? identityQuaternion();
  return getSnapDefinitions(part).map(definition => ({
    ...definition,
    partId: part.id,
    localPosition: { ...definition.localPosition },
    worldPosition: addVectors(part.position, rotateVectorByQuaternion(definition.localPosition, partRotation)),
    localRotation: definition.localRotation ? { ...definition.localRotation } : undefined,
    worldRotation: multiplyQuaternions(partRotation, definition.localRotation ?? identityQuaternion()),
    mateIds: [...(definition.mateIds ?? [])],
    singleUse: definition.singleUse ?? true,
  }));
}

export function getAssemblySnapPoints(state: AssemblyBlueprint): AssemblySnapPoint[] {
  return state.parts.flatMap(getPartSnapPoints);
}

export function findSnapPoint(
  state: AssemblyBlueprint,
  partId: string | null,
  snapPointId: string,
): AssemblySnapPoint | null {
  if (!partId) return null;
  const part = state.parts.find(item => item.id === partId);
  return part ? getPartSnapPoints(part).find(point => point.id === snapPointId) ?? null : null;
}

export function getDefaultSnapPointId(part: AssemblyPart | null): string {
  return part ? getPartSnapPoints(part)[0]?.id ?? 'center' : 'center';
}

export function findNearestSnapMatch(
  state: AssemblyBlueprint,
  movingPartId: string,
  threshold = 0.35,
): SnapMatch | null {
  const movingPart = state.parts.find(part => part.id === movingPartId);
  if (!movingPart) return null;
  const movingSnaps = getPartSnapPoints(movingPart);
  const targetSnaps = state.parts.filter(part => part.id !== movingPartId).flatMap(getPartSnapPoints);
  let best: SnapMatch | null = null;
  for (const movingSnap of movingSnaps) {
    for (const targetSnap of targetSnaps) {
      if (!canSnapTogether(state, movingPart, movingSnap, targetSnap)) continue;
      const distance = distanceBetween(movingSnap.worldPosition, targetSnap.worldPosition);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { movingSnap, targetSnap, distance };
      }
    }
  }
  return best;
}

export function getAttachmentJointMatch(state: AssemblyBlueprint, movingPartId: string): SnapMatch | null {
  return findNearestSnapMatch(state, movingPartId, Number.POSITIVE_INFINITY);
}

export function addVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function distanceBetween(a: Vector3Data, b: Vector3Data): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function getSnapDefinitions(part: AssemblyPart): AssemblySnapDefinition[] {
  if (part.snapPoints?.length) return part.snapPoints;
  const halfX = part.dimensions.x / 2;
  const halfY = part.dimensions.y / 2;
  const halfZ = part.dimensions.z / 2;
  return [
    { id: 'center', label: 'Center', localPosition: { x: 0, y: 0, z: 0 } },
    { id: 'x-positive', label: '+X face', localPosition: { x: halfX, y: 0, z: 0 } },
    { id: 'x-negative', label: '-X face', localPosition: { x: -halfX, y: 0, z: 0 } },
    { id: 'y-positive', label: '+Y face', localPosition: { x: 0, y: halfY, z: 0 } },
    { id: 'y-negative', label: '-Y face', localPosition: { x: 0, y: -halfY, z: 0 } },
    { id: 'z-positive', label: '+Z face', localPosition: { x: 0, y: 0, z: halfZ } },
    { id: 'z-negative', label: '-Z face', localPosition: { x: 0, y: 0, z: -halfZ } },
  ];
}

function canSnapTogether(
  state: AssemblyBlueprint,
  movingPart: AssemblyPart,
  movingSnap: AssemblySnapPoint,
  targetSnap: AssemblySnapPoint,
): boolean {
  if (!isSnapAvailable(state, movingSnap) || !isSnapAvailable(state, targetSnap)) return false;
  const attachment = movingPart.attachment;
  if (attachment) {
    return movingSnap.id === attachment.childSnapId
      && targetSnap.id === attachment.parentSnapId
      && (!attachment.parentPartId || targetSnap.partId === attachment.parentPartId);
  }
  return snapIdsMatch(movingSnap, targetSnap) || snapIdsMatch(targetSnap, movingSnap);
}

function snapIdsMatch(a: AssemblySnapPoint, b: AssemblySnapPoint): boolean {
  return a.mateIds.length === 0 || a.mateIds.includes(b.id);
}

function isSnapAvailable(state: AssemblyBlueprint, snapPoint: AssemblySnapPoint): boolean {
  if (!snapPoint.singleUse) return true;
  return !state.joints.some(joint =>
    (joint.parentPartId === snapPoint.partId && sameVector(joint.pivotOnParent, snapPoint.localPosition))
    || (joint.childPartId === snapPoint.partId && sameVector(joint.pivotOnChild, snapPoint.localPosition)),
  );
}

function sameVector(a: Vector3Data, b: Vector3Data): boolean {
  return Math.abs(a.x - b.x) < 0.0001
    && Math.abs(a.y - b.y) < 0.0001
    && Math.abs(a.z - b.z) < 0.0001;
}
