import {
  AssemblyJoint,
  AssemblyAttachmentRule,
  AssemblyJointBehavior,
  AssemblyPart,
  AssemblyPartRole,
  AssemblyPreset,
  AssemblySnapDefinition,
  AssemblyVisualProfile,
  QuaternionData,
  AssemblyBlueprint,
  JointType,
  ShapeType,
  Vector3Data,
} from '../../models/assembly.models';
import { inferAssemblyPartRoles } from '../../../assembly/domain/assembly-clone';

interface PartOptions {
  label?: string;
  roles?: AssemblyPartRole[];
  mass?: number;
  color?: string;
  visualProfile?: AssemblyVisualProfile;
  rotation?: QuaternionData;
  snapPoints?: AssemblySnapDefinition[];
  attachment?: AssemblyAttachmentRule;
}

interface JointOptions {
  pivotOnParent?: Vector3Data;
  pivotOnChild?: Vector3Data;
  axis?: Vector3Data;
  behavior?: AssemblyJointBehavior;
}

export function part(
  id: string,
  shape: ShapeType,
  dimensions: Vector3Data,
  position: Vector3Data,
  options: PartOptions = {},
): AssemblyPart {
  return {
    id,
    label: options.label,
    roles: options.roles ?? inferAssemblyPartRoles(id, options.label),
    shape,
    dimensions,
    position,
    rotation: options.rotation,
    mass: options.mass ?? 1,
    color: options.color ?? '#2f80ed',
    visualProfile: options.visualProfile,
    snapPoints: options.snapPoints,
    attachment: options.attachment,
  };
}

export function joint(
  id: string,
  type: JointType,
  parentPartId: string,
  childPartId: string,
  options: JointOptions = {},
): AssemblyJoint {
  return {
    id,
    type,
    parentPartId,
    childPartId,
    pivotOnParent: options.pivotOnParent ?? { x: 0, y: 0, z: 0 },
    pivotOnChild: options.pivotOnChild ?? { x: 0, y: 0, z: 0 },
    axis: options.axis ?? { x: 0, y: 1, z: 0 },
    behavior: options.behavior,
  };
}

export function assembly(parts: AssemblyPart[], joints: AssemblyJoint[] = []): AssemblyBlueprint {
  return { parts, joints };
}

export function preset(
  id: string,
  name: string,
  description: string,
  state: AssemblyBlueprint,
): AssemblyPreset {
  return {
    id,
    name,
    description,
    state,
  };
}
