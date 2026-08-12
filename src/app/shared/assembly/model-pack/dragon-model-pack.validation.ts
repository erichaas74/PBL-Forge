import {
  AssemblyAttachmentRule,
  AssemblyBlueprint,
  AssemblyJoint,
  AssemblyJointBehavior,
  AssemblyPart,
  AssemblyPartRole,
  AssemblySnapDefinition,
  AssemblyVisualProfile,
  JOINT_TYPES,
  QuaternionData,
  SHAPE_TYPES,
  Vector3Data,
} from '../domain/assembly.models';
import {
  DRAGON_MODEL_PACK_SCHEMA_VERSION,
  DRAGON_RENDERER_CONTRACT_VERSION,
  DragonModelPackV1,
  SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS,
} from './dragon-model-pack.models';

const shapeTypes = new Set<string>(SHAPE_TYPES);
const jointTypes = new Set<string>(JOINT_TYPES);
const supportedProfiles = new Set<string>(SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS);

/** Parses untrusted JSON and returns a fresh, runtime-safe model pack. */
export function parseDragonModelPack(input: unknown): DragonModelPackV1 {
  const pack = record(input, 'Dragon model pack');
  const schemaVersion = finiteNumber(pack['schemaVersion'], 'schemaVersion');
  const rendererContractVersion = finiteNumber(
    pack['rendererContractVersion'],
    'rendererContractVersion',
  );

  if (schemaVersion !== DRAGON_MODEL_PACK_SCHEMA_VERSION) {
    throw new Error(`Unsupported DragonModelPack schema version ${schemaVersion}.`);
  }
  if (rendererContractVersion !== DRAGON_RENDERER_CONTRACT_VERSION) {
    throw new Error(`Unsupported dragon renderer contract ${rendererContractVersion}.`);
  }
  if ('isSimulating' in pack) throw new Error('Published model packs cannot contain editor state.');

  const modelIds = new Set<string>();
  const models = array(pack['models'], 'models').map((value, index) => {
    const model = record(value, `models[${index}]`);
    const id = nonEmptyString(model['id'], `models[${index}].id`);
    if (modelIds.has(id)) throw new Error(`Duplicate model id "${id}".`);
    modelIds.add(id);

    return {
      id,
      label: nonEmptyString(model['label'], `models[${index}].label`),
      description: stringValue(model['description'], `models[${index}].description`),
      blueprint: parseBlueprint(model['blueprint'], `models[${index}].blueprint`),
    };
  });

  if (!models.length) throw new Error('DragonModelPack requires at least one model.');
  const defaultModelId = nonEmptyString(pack['defaultModelId'], 'defaultModelId');
  if (!modelIds.has(defaultModelId)) {
    throw new Error(`Default dragon model "${defaultModelId}" does not exist.`);
  }

  return {
    schemaVersion: DRAGON_MODEL_PACK_SCHEMA_VERSION,
    packId: nonEmptyString(pack['packId'], 'packId'),
    packVersion: nonEmptyString(pack['packVersion'], 'packVersion'),
    rendererContractVersion: DRAGON_RENDERER_CONTRACT_VERSION,
    defaultModelId,
    models,
  };
}

function parseBlueprint(input: unknown, label: string): AssemblyBlueprint {
  const blueprint = record(input, label);
  if ('isSimulating' in blueprint) {
    throw new Error(`${label} contains Garage-only isSimulating state.`);
  }

  const partIds = new Set<string>();
  const parts = array(blueprint['parts'], `${label}.parts`).map((value, index) => {
    const part = parsePart(value, `${label}.parts[${index}]`);
    if (partIds.has(part.id)) throw new Error(`${label} has duplicate part id "${part.id}".`);
    partIds.add(part.id);
    return part;
  });
  if (!parts.length) throw new Error(`${label} requires at least one part.`);

  const jointIds = new Set<string>();
  const joints = array(blueprint['joints'], `${label}.joints`).map((value, index) => {
    const joint = parseJoint(value, `${label}.joints[${index}]`);
    if (jointIds.has(joint.id)) throw new Error(`${label} has duplicate joint id "${joint.id}".`);
    if (!partIds.has(joint.parentPartId) || !partIds.has(joint.childPartId)) {
      throw new Error(`Joint "${joint.id}" references a missing part.`);
    }
    if (joint.parentPartId === joint.childPartId) {
      throw new Error(`Joint "${joint.id}" cannot connect a part to itself.`);
    }
    jointIds.add(joint.id);
    return joint;
  });

  for (const part of parts) validateAttachment(part, parts, label);
  return { parts, joints };
}

function parsePart(input: unknown, label: string): AssemblyPart {
  const part = record(input, label);
  const shape = nonEmptyString(part['shape'], `${label}.shape`);
  if (!shapeTypes.has(shape)) throw new Error(`${label} has unsupported shape "${shape}".`);

  return {
    id: nonEmptyString(part['id'], `${label}.id`),
    label: optionalString(part['label'], `${label}.label`),
    roles: optionalStringArray(part['roles'], `${label}.roles`) as AssemblyPartRole[] | undefined,
    shape: shape as AssemblyPart['shape'],
    mass: finiteNumber(part['mass'], `${label}.mass`),
    dimensions: vector(part['dimensions'], `${label}.dimensions`),
    position: vector(part['position'], `${label}.position`),
    rotation: optionalQuaternion(part['rotation'], `${label}.rotation`),
    color: nonEmptyString(part['color'], `${label}.color`),
    visualProfile: optionalVisualProfile(part['visualProfile'], `${label}.visualProfile`),
    snapPoints: optionalSnapPoints(part['snapPoints'], `${label}.snapPoints`),
    attachment: optionalAttachment(part['attachment'], `${label}.attachment`),
  };
}

function parseJoint(input: unknown, label: string): AssemblyJoint {
  const joint = record(input, label);
  const type = nonEmptyString(joint['type'], `${label}.type`);
  if (!jointTypes.has(type)) throw new Error(`${label} has unsupported joint type "${type}".`);
  return {
    id: nonEmptyString(joint['id'], `${label}.id`),
    type: type as AssemblyJoint['type'],
    parentPartId: nonEmptyString(joint['parentPartId'], `${label}.parentPartId`),
    childPartId: nonEmptyString(joint['childPartId'], `${label}.childPartId`),
    pivotOnParent: vector(joint['pivotOnParent'], `${label}.pivotOnParent`),
    pivotOnChild: vector(joint['pivotOnChild'], `${label}.pivotOnChild`),
    axis: vector(joint['axis'], `${label}.axis`),
    behavior: optionalBehavior(joint['behavior'], `${label}.behavior`),
  };
}

function optionalVisualProfile(value: unknown, label: string): AssemblyVisualProfile | undefined {
  if (value === undefined) return undefined;
  const profile = record(value, label);
  const meshType = nonEmptyString(profile['meshType'], `${label}.meshType`);
  if (meshType !== 'primitive' && meshType !== 'procedural' && meshType !== 'asset') {
    throw new Error(`${label} has unsupported mesh type "${meshType}".`);
  }
  const profileId = nonEmptyString(profile['profileId'], `${label}.profileId`);
  if (meshType === 'procedural' && !supportedProfiles.has(profileId)) {
    throw new Error(`${label} references unsupported procedural profile "${profileId}".`);
  }
  return {
    profileId,
    meshType,
    materialId: optionalString(profile['materialId'], `${label}.materialId`),
    assetId: optionalString(profile['assetId'], `${label}.assetId`),
    parameters: optionalParameters(profile['parameters'], `${label}.parameters`),
    scale: optionalVector(profile['scale'], `${label}.scale`),
    offset: optionalVector(profile['offset'], `${label}.offset`),
    rotation: optionalQuaternion(profile['rotation'], `${label}.rotation`),
  };
}

function optionalParameters(
  value: unknown,
  label: string,
): Record<string, string | number | boolean> | undefined {
  if (value === undefined) return undefined;
  const source = record(value, label);
  const result: Record<string, string | number | boolean> = {};
  for (const [key, parameter] of Object.entries(source)) {
    if (!key.trim()) throw new Error(`${label} contains an empty parameter name.`);
    if (typeof parameter === 'number' && !Number.isFinite(parameter)) {
      throw new Error(`${label}.${key} must be finite.`);
    }
    if (typeof parameter !== 'string' && typeof parameter !== 'number'
      && typeof parameter !== 'boolean') {
      throw new Error(`${label}.${key} must be a string, number, or boolean.`);
    }
    result[key] = parameter;
  }
  return result;
}

function optionalSnapPoints(value: unknown, label: string): AssemblySnapDefinition[] | undefined {
  if (value === undefined) return undefined;
  const ids = new Set<string>();
  return array(value, label).map((item, index) => {
    const snap = record(item, `${label}[${index}]`);
    const id = nonEmptyString(snap['id'], `${label}[${index}].id`);
    if (ids.has(id)) throw new Error(`${label} has duplicate snap id "${id}".`);
    ids.add(id);
    return {
      id,
      label: nonEmptyString(snap['label'], `${label}[${index}].label`),
      localPosition: vector(snap['localPosition'], `${label}[${index}].localPosition`),
      localRotation: optionalQuaternion(snap['localRotation'], `${label}[${index}].localRotation`),
      mateIds: optionalStringArray(snap['mateIds'], `${label}[${index}].mateIds`),
      singleUse: optionalBoolean(snap['singleUse'], `${label}[${index}].singleUse`),
    };
  });
}

function optionalAttachment(value: unknown, label: string): AssemblyAttachmentRule | undefined {
  if (value === undefined) return undefined;
  const attachment = record(value, label);
  const jointType = nonEmptyString(attachment['jointType'], `${label}.jointType`);
  if (!jointTypes.has(jointType)) throw new Error(`${label} has unsupported joint type.`);
  return {
    parentPartId: optionalString(attachment['parentPartId'], `${label}.parentPartId`),
    parentSnapId: nonEmptyString(attachment['parentSnapId'], `${label}.parentSnapId`),
    childSnapId: nonEmptyString(attachment['childSnapId'], `${label}.childSnapId`),
    jointType: jointType as AssemblyAttachmentRule['jointType'],
    axis: vector(attachment['axis'], `${label}.axis`),
    childRotation: optionalQuaternion(attachment['childRotation'], `${label}.childRotation`),
    behavior: optionalBehavior(attachment['behavior'], `${label}.behavior`),
    jointId: optionalString(attachment['jointId'], `${label}.jointId`),
  };
}

function optionalBehavior(value: unknown, label: string): AssemblyJointBehavior | undefined {
  if (value === undefined) return undefined;
  const behavior = record(value, label);
  const profile = nonEmptyString(behavior['profile'], `${label}.profile`);
  if (!['passive', 'motor', 'oscillatingMotor', 'springHinge'].includes(profile)) {
    throw new Error(`${label} has unsupported behavior profile "${profile}".`);
  }
  return {
    profile: profile as AssemblyJointBehavior['profile'],
    motorSpeed: optionalNumber(behavior['motorSpeed'], `${label}.motorSpeed`),
    motorForce: optionalNumber(behavior['motorForce'], `${label}.motorForce`),
    oscillationSpeed: optionalNumber(behavior['oscillationSpeed'], `${label}.oscillationSpeed`),
    oscillationAmplitude: optionalNumber(
      behavior['oscillationAmplitude'],
      `${label}.oscillationAmplitude`,
    ),
    springStiffness: optionalNumber(behavior['springStiffness'], `${label}.springStiffness`),
    springDamping: optionalNumber(behavior['springDamping'], `${label}.springDamping`),
    breakForce: optionalNumber(behavior['breakForce'], `${label}.breakForce`),
    breakDamage: optionalNumber(behavior['breakDamage'], `${label}.breakDamage`),
  };
}

function validateAttachment(part: AssemblyPart, parts: AssemblyPart[], label: string): void {
  const attachment = part.attachment;
  if (!attachment) return;
  if (attachment.parentPartId && !parts.some(item => item.id === attachment.parentPartId)) {
    throw new Error(`${label}: attachment on "${part.id}" references a missing parent part.`);
  }
  if (part.snapPoints?.length
    && !part.snapPoints.some(snap => snap.id === attachment.childSnapId)) {
    throw new Error(`${label}: attachment on "${part.id}" references a missing child snap.`);
  }
  const parent = parts.find(item => item.id === attachment.parentPartId);
  if (parent?.snapPoints?.length
    && !parent.snapPoints.some(snap => snap.id === attachment.parentSnapId)) {
    throw new Error(`${label}: attachment on "${part.id}" references a missing parent snap.`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  return value;
}

function nonEmptyString(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!result.trim()) throw new Error(`${label} cannot be empty.`);
  return result;
}

function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : nonEmptyString(value, label);
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  return value === undefined
    ? undefined
    : array(value, label).map((item, index) => nonEmptyString(item, `${label}[${index}]`));
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function optionalNumber(value: unknown, label: string): number | undefined {
  return value === undefined ? undefined : finiteNumber(value, label);
}

function vector(value: unknown, label: string): Vector3Data {
  const source = record(value, label);
  return {
    x: finiteNumber(source['x'], `${label}.x`),
    y: finiteNumber(source['y'], `${label}.y`),
    z: finiteNumber(source['z'], `${label}.z`),
  };
}

function optionalVector(value: unknown, label: string): Vector3Data | undefined {
  return value === undefined ? undefined : vector(value, label);
}

function optionalQuaternion(value: unknown, label: string): QuaternionData | undefined {
  if (value === undefined) return undefined;
  const source = record(value, label);
  return {
    x: finiteNumber(source['x'], `${label}.x`),
    y: finiteNumber(source['y'], `${label}.y`),
    z: finiteNumber(source['z'], `${label}.z`),
    w: finiteNumber(source['w'], `${label}.w`),
  };
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean.`);
  return value;
}

