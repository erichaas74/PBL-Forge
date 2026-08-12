import {
  AssemblyBlueprint,
  AssemblyPartRole,
  AssemblyState,
} from './assembly.models';
import { cloneQuaternion, cloneVector3 } from './vector-data';

export function cloneAssemblyBlueprint(blueprint: AssemblyBlueprint): AssemblyBlueprint {
  return {
    parts: blueprint.parts.map(part => ({
      ...part,
      roles: part.roles ? [...part.roles] : undefined,
      dimensions: cloneVector3(part.dimensions),
      position: cloneVector3(part.position),
      rotation: part.rotation ? cloneQuaternion(part.rotation) : undefined,
      visualProfile: part.visualProfile
        ? {
            ...part.visualProfile,
            parameters: part.visualProfile.parameters
              ? { ...part.visualProfile.parameters }
              : undefined,
            scale: part.visualProfile.scale ? cloneVector3(part.visualProfile.scale) : undefined,
            offset: part.visualProfile.offset ? cloneVector3(part.visualProfile.offset) : undefined,
            rotation: part.visualProfile.rotation ? cloneQuaternion(part.visualProfile.rotation) : undefined,
          }
        : undefined,
      snapPoints: part.snapPoints?.map(snapPoint => ({
        ...snapPoint,
        localPosition: cloneVector3(snapPoint.localPosition),
        localRotation: snapPoint.localRotation ? cloneQuaternion(snapPoint.localRotation) : undefined,
        mateIds: snapPoint.mateIds ? [...snapPoint.mateIds] : undefined,
      })),
      attachment: part.attachment
        ? {
            ...part.attachment,
            axis: cloneVector3(part.attachment.axis),
            childRotation: part.attachment.childRotation
              ? cloneQuaternion(part.attachment.childRotation)
              : undefined,
            behavior: part.attachment.behavior ? { ...part.attachment.behavior } : undefined,
          }
        : undefined,
    })),
    joints: blueprint.joints.map(joint => ({
      ...joint,
      pivotOnParent: cloneVector3(joint.pivotOnParent),
      pivotOnChild: cloneVector3(joint.pivotOnChild),
      axis: cloneVector3(joint.axis),
      behavior: joint.behavior ? { ...joint.behavior } : undefined,
    })),
  };
}

export function createAssemblyEditorState(blueprint: AssemblyBlueprint): AssemblyState {
  return { ...cloneAssemblyBlueprint(blueprint), isSimulating: false };
}

/** Adds stable semantic roles to legacy blueprints without changing IDs. */
export function normalizeAssemblyRoles(blueprint: AssemblyBlueprint): AssemblyBlueprint {
  const clone = cloneAssemblyBlueprint(blueprint);
  clone.parts = clone.parts.map(part => ({
    ...part,
    roles: uniqueRoles(part.roles?.length ? part.roles : inferAssemblyPartRoles(part.id, part.label)),
  }));

  if (!clone.parts.some(part => part.roles?.includes('core'))) {
    const heaviest = [...clone.parts].sort((a, b) => b.mass - a.mass)[0];
    if (heaviest) heaviest.roles = uniqueRoles([...(heaviest.roles ?? []), 'core']);
  }

  return clone;
}

export function inferAssemblyPartRoles(id: string, label = ''): AssemblyPartRole[] {
  const value = `${id} ${label}`.toLowerCase();
  const roles: AssemblyPartRole[] = [];
  if (/torso|chassis|body|core/.test(value)) roles.push('core');
  if (/head|skull/.test(value)) roles.push('head', 'sensor');
  if (/jaw|snout/.test(value)) roles.push('jaw', 'weapon');
  if (/wing/.test(value)) roles.push('wing', 'locomotion');
  if (/tail/.test(value)) roles.push('tail');
  if (/leg|foot/.test(value)) roles.push('leg', 'locomotion');
  if (/arm/.test(value)) roles.push('arm');
  if (/wheel/.test(value)) roles.push('wheel', 'locomotion');
  if (/claw|horn|stinger|club|blade|weapon/.test(value)) roles.push('weapon');
  if (/armor|armored/.test(value)) roles.push('armor');
  return uniqueRoles(roles);
}

function uniqueRoles(roles: readonly AssemblyPartRole[]): AssemblyPartRole[] {
  return [...new Set(roles)];
}
