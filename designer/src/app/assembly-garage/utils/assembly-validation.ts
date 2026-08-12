import {
  AssemblyJoint,
  AssemblyState,
  JOINT_TYPES,
  SHAPE_TYPES,
  Vector3Data,
} from '../models/assembly.models';

const shapeTypes = new Set<string>(SHAPE_TYPES);
const jointTypes = new Set<string>(JOINT_TYPES);

export function parseAssemblyState(input: unknown): AssemblyState {
  const candidate = readRecord(input, 'assembly');
  const partsInput = readArray(candidate['parts'], 'parts');
  const jointsInput = readArray(candidate['joints'], 'joints');
  const partIds = new Set<string>();

  const parts = partsInput.map((item, index) => {
    const record = readRecord(item, `parts[${index}]`);
    const id = readString(record['id'], `parts[${index}].id`);
    const shape = readString(record['shape'], `parts[${index}].shape`);

    if (!shapeTypes.has(shape)) {
      throw new Error(`Unsupported shape "${shape}".`);
    }

    if (partIds.has(id)) {
      throw new Error(`Duplicate part id "${id}".`);
    }

    partIds.add(id);

    return {
      id,
      definitionId: readOptionalString(record['definitionId'], `parts[${index}].definitionId`),
      label: readOptionalString(record['label'], `parts[${index}].label`),
      roles: readOptionalStringArray(record['roles'], `parts[${index}].roles`),
      shape: shape as AssemblyState['parts'][number]['shape'],
      mass: readFiniteNumber(record['mass'], `parts[${index}].mass`),
      dimensions: readVector(record['dimensions'], `parts[${index}].dimensions`),
      position: readVector(record['position'], `parts[${index}].position`),
      rotation: readOptionalQuaternion(record['rotation'], `parts[${index}].rotation`),
      color: readString(record['color'], `parts[${index}].color`),
      visualProfile: readOptionalVisualProfile(record['visualProfile'], `parts[${index}].visualProfile`),
      snapPoints: readOptionalSnapDefinitions(record['snapPoints'], `parts[${index}].snapPoints`),
      attachment: readOptionalAttachmentRule(record['attachment'], `parts[${index}].attachment`),
    };
  });

  for (const part of parts) {
    const attachment = part.attachment;

    if (!attachment) {
      continue;
    }

    if (attachment.parentPartId && !partIds.has(attachment.parentPartId)) {
      throw new Error(`Attachment for "${part.id}" references a missing parent part.`);
    }

    if (part.snapPoints?.length && !part.snapPoints.some(snap => snap.id === attachment.childSnapId)) {
      throw new Error(`Attachment for "${part.id}" references a missing child snap.`);
    }

    const parent = attachment.parentPartId
      ? parts.find(candidate => candidate.id === attachment.parentPartId)
      : null;

    if (
      parent?.snapPoints?.length
      && !parent.snapPoints.some(snap => snap.id === attachment.parentSnapId)
    ) {
      throw new Error(`Attachment for "${part.id}" references a missing parent snap.`);
    }
  }

  const jointIds = new Set<string>();
  const joints = jointsInput.map((item, index): AssemblyJoint => {
    const record = readRecord(item, `joints[${index}]`);
    const id = readString(record['id'], `joints[${index}].id`);
    const type = readString(record['type'], `joints[${index}].type`);
    const parentPartId = readString(record['parentPartId'], `joints[${index}].parentPartId`);
    const childPartId = readString(record['childPartId'], `joints[${index}].childPartId`);

    if (!jointTypes.has(type)) {
      throw new Error(`Unsupported joint type "${type}".`);
    }

    if (jointIds.has(id)) {
      throw new Error(`Duplicate joint id "${id}".`);
    }

    if (!partIds.has(parentPartId) || !partIds.has(childPartId)) {
      throw new Error(`Joint "${id}" references a missing part.`);
    }

    if (parentPartId === childPartId) {
      throw new Error(`Joint "${id}" cannot connect a part to itself.`);
    }

    jointIds.add(id);

    return {
      id,
      type: type as AssemblyJoint['type'],
      parentPartId,
      childPartId,
      pivotOnParent: readVector(record['pivotOnParent'], `joints[${index}].pivotOnParent`),
      pivotOnChild: readVector(record['pivotOnChild'], `joints[${index}].pivotOnChild`),
      axis: readVector(record['axis'], `joints[${index}].axis`),
      behavior: readOptionalJointBehavior(record['behavior'], `joints[${index}].behavior`),
    };
  });

  return {
    parts,
    joints,
    isSimulating: false,
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function readArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readString(value, label);
}

function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function readVector(value: unknown, label: string): Vector3Data {
  const record = readRecord(value, label);

  return {
    x: readFiniteNumber(record['x'], `${label}.x`),
    y: readFiniteNumber(record['y'], `${label}.y`),
    z: readFiniteNumber(record['z'], `${label}.z`),
  };
}

function readOptionalVector(value: unknown, label: string): Vector3Data | undefined {
  return value === undefined ? undefined : readVector(value, label);
}

function readOptionalQuaternion(
  value: unknown,
  label: string,
): AssemblyState['parts'][number]['rotation'] {
  if (value === undefined) {
    return undefined;
  }

  const record = readRecord(value, label);

  return {
    x: readFiniteNumber(record['x'], `${label}.x`),
    y: readFiniteNumber(record['y'], `${label}.y`),
    z: readFiniteNumber(record['z'], `${label}.z`),
    w: readFiniteNumber(record['w'], `${label}.w`),
  };
}

function readOptionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readArray(value, label).map((item, index) => readString(item, `${label}[${index}]`));
}

function readOptionalVisualProfile(
  value: unknown,
  label: string,
): AssemblyState['parts'][number]['visualProfile'] {
  if (value === undefined) {
    return undefined;
  }

  const record = readRecord(value, label);
  const meshType = readString(record['meshType'], `${label}.meshType`);

  if (meshType !== 'primitive' && meshType !== 'procedural' && meshType !== 'asset') {
    throw new Error(`Unsupported visual mesh type "${meshType}".`);
  }

  return {
    profileId: readString(record['profileId'], `${label}.profileId`),
    meshType,
    materialId: readOptionalString(record['materialId'], `${label}.materialId`),
    assetId: readOptionalString(record['assetId'], `${label}.assetId`),
    parameters: readOptionalVisualParameters(record['parameters'], `${label}.parameters`),
    scale: readOptionalVector(record['scale'], `${label}.scale`),
    offset: readOptionalVector(record['offset'], `${label}.offset`),
    rotation: readOptionalQuaternion(record['rotation'], `${label}.rotation`),
  };
}

function readOptionalVisualParameters(
  value: unknown,
  label: string,
): Record<string, string | number | boolean> | undefined {
  if (value === undefined) return undefined;
  const record = readRecord(value, label);
  const parameters: Record<string, string | number | boolean> = {};

  for (const [key, parameter] of Object.entries(record)) {
    if (!key.trim()) throw new Error(`${label} contains an empty parameter name.`);
    if (typeof parameter === 'number' && !Number.isFinite(parameter)) {
      throw new Error(`${label}.${key} must be finite.`);
    }
    if (typeof parameter !== 'string' && typeof parameter !== 'number'
      && typeof parameter !== 'boolean') {
      throw new Error(`${label}.${key} must be a string, number, or boolean.`);
    }
    parameters[key] = parameter;
  }

  return parameters;
}

function readOptionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
}

function readOptionalSnapDefinitions(
  value: unknown,
  label: string,
): AssemblyState['parts'][number]['snapPoints'] {
  if (value === undefined) {
    return undefined;
  }

  return readArray(value, label).map((item, index) => {
    const record = readRecord(item, `${label}[${index}]`);

    return {
      id: readString(record['id'], `${label}[${index}].id`),
      label: readString(record['label'], `${label}[${index}].label`),
      localPosition: readVector(record['localPosition'], `${label}[${index}].localPosition`),
      localRotation: readOptionalQuaternion(
        record['localRotation'],
        `${label}[${index}].localRotation`,
      ),
      mateIds: readOptionalStringArray(record['mateIds'], `${label}[${index}].mateIds`),
      singleUse: readOptionalBoolean(record['singleUse'], `${label}[${index}].singleUse`),
    };
  });
}

function readOptionalAttachmentRule(
  value: unknown,
  label: string,
): AssemblyState['parts'][number]['attachment'] {
  if (value === undefined) {
    return undefined;
  }

  const record = readRecord(value, label);
  const jointType = readString(record['jointType'], `${label}.jointType`);

  if (!jointTypes.has(jointType)) {
    throw new Error(`Unsupported joint type "${jointType}".`);
  }

  return {
    parentPartId: readOptionalString(record['parentPartId'], `${label}.parentPartId`),
    parentSnapId: readString(record['parentSnapId'], `${label}.parentSnapId`),
    childSnapId: readString(record['childSnapId'], `${label}.childSnapId`),
    jointType: jointType as AssemblyState['joints'][number]['type'],
    axis: readVector(record['axis'], `${label}.axis`),
    childRotation: readOptionalQuaternion(record['childRotation'], `${label}.childRotation`),
    behavior: readOptionalJointBehavior(record['behavior'], `${label}.behavior`),
    jointId: readOptionalString(record['jointId'], `${label}.jointId`),
  };
}

function readOptionalJointBehavior(
  value: unknown,
  label: string,
): AssemblyState['joints'][number]['behavior'] {
  if (value === undefined) {
    return undefined;
  }

  const record = readRecord(value, label);
  const profile = readString(record['profile'], `${label}.profile`);

  if (
    profile !== 'passive'
    && profile !== 'motor'
    && profile !== 'oscillatingMotor'
    && profile !== 'springHinge'
  ) {
    throw new Error(`Unsupported joint behavior profile "${profile}".`);
  }

  return {
    profile,
    motorSpeed: readOptionalNumber(record['motorSpeed'], `${label}.motorSpeed`),
    motorForce: readOptionalNumber(record['motorForce'], `${label}.motorForce`),
    oscillationSpeed: readOptionalNumber(record['oscillationSpeed'], `${label}.oscillationSpeed`),
    oscillationAmplitude: readOptionalNumber(
      record['oscillationAmplitude'],
      `${label}.oscillationAmplitude`,
    ),
    springStiffness: readOptionalNumber(record['springStiffness'], `${label}.springStiffness`),
    springDamping: readOptionalNumber(record['springDamping'], `${label}.springDamping`),
    breakForce: readOptionalNumber(record['breakForce'], `${label}.breakForce`),
    breakDamage: readOptionalNumber(record['breakDamage'], `${label}.breakDamage`),
  };
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  return value === undefined ? undefined : readFiniteNumber(value, label);
}
