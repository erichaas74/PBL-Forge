import { Vector3Data } from '@pbl/assembly/domain/assembly.models';
import {
  DragonCustomPartRecipe,
  parseDragonCustomPartRecipe,
} from '@pbl/assembly/rendering/dragon-custom-part-recipe';

export const SHARED_DRAGON_PARTS_COLLECTION = 'dragonParts';
export const SHARED_DRAGON_PART_SCHEMA_VERSION = 1;

export type SharedDragonPartStatus = 'draft' | 'review' | 'published' | 'archived';
export type SharedDragonPartAccess = 'owner' | 'editor' | 'viewer' | 'published';

export interface SharedDragonPart {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly ownerUid: string;
  readonly editorUids: readonly string[];
  readonly viewerUids: readonly string[];
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly sourceDefinitionId: string;
  readonly profileId: string;
  readonly status: SharedDragonPartStatus;
  readonly currentRevisionId: string;
  readonly publishedRevisionId: string;
  readonly revisionNumber: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly updatedBy: string;
}

export interface SharedDragonPartSnapshot {
  readonly sourceDefinitionId: string;
  readonly profileId: string;
  readonly dimensions: Vector3Data;
  readonly snapPoints: Readonly<Record<string, Vector3Data>>;
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
}

export interface SharedDragonPartRevision extends SharedDragonPartSnapshot {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly partId: string;
  readonly revisionNumber: number;
  readonly parentRevisionId: string;
  readonly assetIds: readonly string[];
  readonly changeNote: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface SharedDragonPartAsset {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly partId: string;
  readonly fileName: string;
  readonly storagePath: string;
  readonly byteLength: number;
  readonly meshCount: number;
  readonly triangleCount: number;
  readonly materialCount: number;
  readonly textureCount: number;
  readonly maxTextureDimension: number;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface SharedDragonPartUser {
  readonly uid: string;
  readonly displayName: string;
  readonly email: string;
}

export function sharedPartAccess(part: SharedDragonPart, uid: string): SharedDragonPartAccess | null {
  if (part.ownerUid === uid) return 'owner';
  if (part.editorUids.includes(uid)) return 'editor';
  if (part.viewerUids.includes(uid)) return 'viewer';
  return part.status === 'published' ? 'published' : null;
}

export function importedAssetIds(snapshot: SharedDragonPartSnapshot): readonly string[] {
  const value = snapshot.parameters['customPartRecipe'];
  const recipe: DragonCustomPartRecipe = parseDragonCustomPartRecipe(
    typeof value === 'string' ? value : '',
  );
  return [...new Set(recipe.pieces.flatMap(piece => piece.kind === 'asset' ? [piece.assetId] : []))];
}

export function parseSharedDragonPart(id: string, value: unknown): SharedDragonPart {
  const data = record(value, 'Shared part');
  return {
    schemaVersion: literalOne(data['schemaVersion']),
    id,
    ownerUid: textValue(data['ownerUid'], 'ownerUid', 128),
    editorUids: stringList(data['editorUids'], 'editorUids', 24, 128),
    viewerUids: stringList(data['viewerUids'], 'viewerUids', 48, 128),
    name: textValue(data['name'], 'name', 80),
    description: textValue(data['description'], 'description', 500, true),
    tags: stringList(data['tags'], 'tags', 12, 32),
    sourceDefinitionId: identifier(data['sourceDefinitionId'], 'sourceDefinitionId'),
    profileId: identifier(data['profileId'], 'profileId'),
    status: statusValue(data['status']),
    currentRevisionId: identifier(data['currentRevisionId'], 'currentRevisionId', true),
    publishedRevisionId: identifier(data['publishedRevisionId'], 'publishedRevisionId', true),
    revisionNumber: integerValue(data['revisionNumber'], 'revisionNumber', 0, 1_000_000),
    createdAt: dateValue(data['createdAt'], 'createdAt'),
    updatedAt: dateValue(data['updatedAt'], 'updatedAt'),
    updatedBy: textValue(data['updatedBy'], 'updatedBy', 128),
  };
}

export function parseSharedDragonPartRevision(
  partId: string,
  id: string,
  value: unknown,
): SharedDragonPartRevision {
  const data = record(value, 'Shared part revision');
  const parameters = parameterMap(data['parameters']);
  return {
    schemaVersion: literalOne(data['schemaVersion']),
    id,
    partId: textValue(data['partId'], 'partId', 128),
    revisionNumber: integerValue(data['revisionNumber'], 'revisionNumber', 1, 1_000_000),
    parentRevisionId: identifier(data['parentRevisionId'], 'parentRevisionId', true),
    sourceDefinitionId: identifier(data['sourceDefinitionId'], 'sourceDefinitionId'),
    profileId: identifier(data['profileId'], 'profileId'),
    dimensions: vector(data['dimensions'], 'dimensions', 0.001, 100),
    snapPoints: vectorMap(data['snapPoints'], 'snapPoints', 48, -100, 100),
    parameters,
    assetIds: stringList(data['assetIds'], 'assetIds', 32, 64),
    changeNote: textValue(data['changeNote'], 'changeNote', 300, true),
    createdBy: textValue(data['createdBy'], 'createdBy', 128),
    createdAt: dateValue(data['createdAt'], 'createdAt'),
  };
}

export function validateSharedDragonPartSnapshot(value: SharedDragonPartSnapshot): SharedDragonPartSnapshot {
  const parsed: SharedDragonPartSnapshot = {
    sourceDefinitionId: identifier(value.sourceDefinitionId, 'sourceDefinitionId'),
    profileId: identifier(value.profileId, 'profileId'),
    dimensions: vector(value.dimensions, 'dimensions', 0.001, 100),
    snapPoints: vectorMap(value.snapPoints, 'snapPoints', 48, -100, 100),
    parameters: parameterMap(value.parameters),
  };
  const recipeValue = parsed.parameters['customPartRecipe'];
  if (typeof recipeValue === 'string' && recipeValue && !parseDragonCustomPartRecipe(recipeValue).pieces.length) {
    throw new Error('The shared part contains an invalid custom-piece recipe.');
  }
  return parsed;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not a valid record.`);
  }
  return value as Record<string, unknown>;
}

function literalOne(value: unknown): 1 {
  if (value !== 1) throw new Error('Unsupported shared-part schema version.');
  return 1;
}

function textValue(value: unknown, label: string, maximum: number, empty = false): string {
  if (typeof value !== 'string' || value.length > maximum || (!empty && !value.trim())) {
    throw new Error(`Shared part ${label} is invalid.`);
  }
  return value;
}

function identifier(value: unknown, label: string, empty = false): string {
  const text = textValue(value, label, 128, empty);
  if (text && !/^[a-zA-Z0-9._-]+$/.test(text)) throw new Error(`Shared part ${label} is invalid.`);
  return text;
}

function stringList(value: unknown, label: string, maximum: number, textMaximum: number): string[] {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`Shared part ${label} is invalid.`);
  const result = value.map(entry => textValue(entry, label, textMaximum));
  if (new Set(result).size !== result.length) throw new Error(`Shared part ${label} contains duplicates.`);
  return result;
}

function statusValue(value: unknown): SharedDragonPartStatus {
  if (value !== 'draft' && value !== 'review' && value !== 'published' && value !== 'archived') {
    throw new Error('Shared part status is invalid.');
  }
  return value;
}

function integerValue(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Shared part ${label} is invalid.`);
  }
  return value;
}

function vector(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): Vector3Data {
  const data = record(value, label);
  const axis = (name: keyof Vector3Data): number => {
    const result = data[name];
    if (typeof result !== 'number' || !Number.isFinite(result)
      || result < minimum || result > maximum) {
      throw new Error(`Shared part ${label}.${name} is invalid.`);
    }
    return result;
  };
  return { x: axis('x'), y: axis('y'), z: axis('z') };
}

function vectorMap(
  value: unknown,
  label: string,
  maximum: number,
  minimumValue: number,
  maximumValue: number,
): Record<string, Vector3Data> {
  const data = record(value, label);
  const entries = Object.entries(data);
  if (entries.length > maximum) throw new Error(`Shared part ${label} has too many entries.`);
  return Object.fromEntries(entries.map(([id, point]) => [
    identifier(id, `${label} id`),
    vector(point, `${label}.${id}`, minimumValue, maximumValue),
  ]));
}

function parameterMap(value: unknown): Record<string, string | number | boolean> {
  const data = record(value, 'parameters');
  const entries = Object.entries(data);
  if (entries.length > 192) throw new Error('Shared part has too many parameters.');
  const result: Record<string, string | number | boolean> = {};
  for (const [key, parameter] of entries) {
    identifier(key, 'parameter key');
    if (typeof parameter === 'string') {
      if (parameter.length > 96_000) throw new Error(`Shared part parameter ${key} is too long.`);
      result[key] = parameter;
    } else if (typeof parameter === 'boolean') {
      result[key] = parameter;
    } else if (typeof parameter === 'number' && Number.isFinite(parameter)
      && parameter >= -10_000 && parameter <= 10_000) {
      result[key] = parameter;
    } else {
      throw new Error(`Shared part parameter ${key} is invalid.`);
    }
  }
  return result;
}

function dateValue(value: unknown, label: string): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value
    && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const result = (value as { toDate: () => Date }).toDate();
    if (Number.isFinite(result.getTime())) return result;
  }
  throw new Error(`Shared part ${label} is invalid.`);
}
