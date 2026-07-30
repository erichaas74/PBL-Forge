import {
  AssemblyPreset,
  AssemblySnapDefinition,
  AssemblySnapPoint,
  AssemblyBlueprint,
  Vector3Data,
} from '../../models/assembly.models';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  createPartFromDefinition,
} from '../assembly-part-definitions';
import {
  getAssemblySnapPoints,
  getPartSnapPoints,
  subtractVectors,
} from '../../utils/snap-points';
import {
  cloneVector3,
  identityQuaternion,
  invertQuaternion,
  multiplyQuaternions,
  normalizeVector3,
  rotateVectorByQuaternion,
} from '../../utils/vector-data';
import { preset } from './assembly-preset-builder';

interface CatalogPresetPart {
  definitionId: string;
  partId: string;
  label?: string;
}

const CLASSIC_DRAGON_PARTS: readonly CatalogPresetPart[] = [
  { definitionId: 'dragon-classic-body', partId: 'classic-dragon-body', label: 'Classic Dragon Body' },
  { definitionId: 'dragon-horned-head', partId: 'classic-dragon-horned-head', label: 'Horned Head' },
  { definitionId: 'dragon-snap-snout', partId: 'classic-dragon-snap-snout', label: 'Snap Snout' },
  { definitionId: 'dragon-upper-jaw', partId: 'classic-dragon-upper-jaw', label: 'Upper Jaw' },
  { definitionId: 'dragon-lower-jaw', partId: 'classic-dragon-lower-jaw', label: 'Lower Jaw' },
  { definitionId: 'dragon-front-left-leg', partId: 'classic-dragon-front-left-leg', label: 'Front Left Leg' },
  { definitionId: 'dragon-front-right-leg', partId: 'classic-dragon-front-right-leg', label: 'Front Right Leg' },
  { definitionId: 'dragon-rear-left-leg', partId: 'classic-dragon-rear-left-leg', label: 'Rear Left Leg' },
  { definitionId: 'dragon-rear-right-leg', partId: 'classic-dragon-rear-right-leg', label: 'Rear Right Leg' },
  { definitionId: 'dragon-clawed-foot', partId: 'classic-dragon-front-left-foot', label: 'Front Left Foot' },
  { definitionId: 'dragon-clawed-foot', partId: 'classic-dragon-front-right-foot', label: 'Front Right Foot' },
  { definitionId: 'dragon-clawed-foot', partId: 'classic-dragon-rear-left-foot', label: 'Rear Left Foot' },
  { definitionId: 'dragon-clawed-foot', partId: 'classic-dragon-rear-right-foot', label: 'Rear Right Foot' },
  { definitionId: 'dragon-left-wing', partId: 'classic-dragon-left-wing', label: 'Left Wing' },
  { definitionId: 'dragon-right-wing', partId: 'classic-dragon-right-wing', label: 'Right Wing' },
  { definitionId: 'dragon-wing-hand-claw', partId: 'classic-dragon-left-wing-claw', label: 'Left Wing Claw' },
  { definitionId: 'dragon-wing-hand-claw', partId: 'classic-dragon-right-wing-claw', label: 'Right Wing Claw' },
  { definitionId: 'dragon-tail-chain-root', partId: 'classic-dragon-tail-chain-root', label: 'Tail Chain Root' },
  { definitionId: 'dragon-tail-chain-link', partId: 'classic-dragon-tail-link-1', label: 'Tail Chain Link 1' },
  { definitionId: 'dragon-tail-chain-link', partId: 'classic-dragon-tail-link-2', label: 'Tail Chain Link 2' },
  { definitionId: 'dragon-tail-stinger', partId: 'classic-dragon-tail-stinger', label: 'Tail Stinger' },
];

export const CLASSIC_DRAGON_TEST_PRESET: AssemblyPreset = preset(
  'classic-dragon-test',
  'Classic Dragon Test',
  'A catalog-built dragon with clawed feet, wing claws, snapping jaws, flapping wings, and a segmented tail chain.',
  buildCatalogPresetAssembly(CLASSIC_DRAGON_PARTS, { x: 0, y: 1.32, z: 0 }),
);

function buildCatalogPresetAssembly(
  entries: readonly CatalogPresetPart[],
  basePosition: Vector3Data,
): AssemblyBlueprint {
  const state: AssemblyBlueprint = {
    parts: [],
    joints: [],
  };

  for (const entry of entries) {
    const definition = getDefinition(entry.definitionId);
    const part = createPartFromDefinition(definition, getFallbackPosition(state.parts.length, basePosition), entry.partId);
    part.label = entry.label ?? definition.label;

    const attachment = definition.attachment;

    if (!attachment) {
      part.position = cloneVector3(basePosition);
      state.parts.push(part);
      continue;
    }

    const targetSnap = findOpenTargetSnap(state, attachment.parentSnapId);
    const childSnap = findDefinitionSnap(definition, attachment.childSnapId);

    if (!targetSnap || !childSnap) {
      state.parts.push(part);
      continue;
    }

    const rotation = attachment.childRotation
      ? multiplyQuaternions(targetSnap.worldRotation, attachment.childRotation)
      : multiplyQuaternions(
          targetSnap.worldRotation,
          invertQuaternion(childSnap.localRotation ?? identityQuaternion()),
        );

    part.rotation = rotation;
    part.position = subtractVectors(
      targetSnap.worldPosition,
      rotateVectorByQuaternion(childSnap.localPosition, rotation),
    );
    state.parts.push(part);

    const placedChildSnap = getPartSnapPoints(part).find(snap => snap.id === attachment.childSnapId);

    if (!placedChildSnap) {
      continue;
    }

    state.joints.push({
      id: attachment.jointId ?? `joint-${targetSnap.partId}-${part.id}`,
      type: attachment.jointType,
      parentPartId: targetSnap.partId,
      childPartId: part.id,
      pivotOnParent: cloneVector3(targetSnap.localPosition),
      pivotOnChild: cloneVector3(placedChildSnap.localPosition),
      axis: normalizeVector3(attachment.axis),
      behavior: attachment.behavior ? { ...attachment.behavior } : undefined,
    });
  }

  return state;
}

function getDefinition(definitionId: string): AssemblyPartDefinition {
  const definition = ASSEMBLY_PART_DEFINITIONS.find(item => item.id === definitionId);

  if (!definition) {
    throw new Error(`Missing assembly part definition "${definitionId}".`);
  }

  return definition;
}

function findDefinitionSnap(
  definition: AssemblyPartDefinition,
  snapPointId: string,
): AssemblySnapDefinition | null {
  return definition.snapPoints.find(snap => snap.id === snapPointId) ?? null;
}

function findOpenTargetSnap(state: AssemblyBlueprint, snapPointId: string): AssemblySnapPoint | null {
  return getAssemblySnapPoints(state).find(snapPoint =>
    snapPoint.id === snapPointId && isSnapUnused(state, snapPoint),
  ) ?? null;
}

function isSnapUnused(state: AssemblyBlueprint, snapPoint: AssemblySnapPoint): boolean {
  if (!snapPoint.singleUse) {
    return true;
  }

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

function getFallbackPosition(index: number, basePosition: Vector3Data): Vector3Data {
  return {
    x: basePosition.x - 1.8 + (index % 4) * 1.2,
    y: basePosition.y + 0.7 + Math.floor(index / 4) * 0.6,
    z: basePosition.z + (index % 2) * 0.6,
  };
}
