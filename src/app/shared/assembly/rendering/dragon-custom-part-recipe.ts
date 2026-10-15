import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import {
  DragonPalette,
  hornMaterial,
  membraneMaterial,
  nostrilMaterial,
  scaleMaterial,
  toothMaterial,
} from './dragon-materials';
import { visualString } from './dragon-visual-parameter-readers';
import { instantiateRegisteredAssemblyAsset } from './assembly-asset-loader';

export type DragonCustomPieceShape = 'sphere' | 'box' | 'cylinder' | 'cone';
export type DragonCustomMaterialSlot = 'skin' | 'horn' | 'tooth' | 'membrane' | 'dark';
export type DragonCustomPieceMaterial = DragonCustomMaterialSlot | 'original';

interface DragonCustomPartPieceBase {
  readonly id: string;
  readonly label: string;
  readonly material: DragonCustomPieceMaterial;
  readonly offset: Vector3Data;
  readonly rotationDegrees: Vector3Data;
  readonly scale: Vector3Data;
  readonly mirrored: boolean;
  readonly visible: boolean;
}

export interface DragonCustomPrimitivePiece extends DragonCustomPartPieceBase {
  readonly kind: 'primitive';
  readonly shape: DragonCustomPieceShape;
  readonly material: DragonCustomMaterialSlot;
}

export interface DragonCustomAssetPiece extends DragonCustomPartPieceBase {
  readonly kind: 'asset';
  readonly assetId: string;
  readonly sourceFileName: string;
}

export type DragonCustomPartPiece = DragonCustomPrimitivePiece | DragonCustomAssetPiece;

export interface DragonCustomPartRecipe {
  readonly version: 2;
  readonly pieces: readonly DragonCustomPartPiece[];
}

export const EMPTY_DRAGON_CUSTOM_PART_RECIPE: DragonCustomPartRecipe = {
  version: 2,
  pieces: [],
};

const SHAPES = new Set<DragonCustomPieceShape>(['sphere', 'box', 'cylinder', 'cone']);
const MATERIALS = new Set<DragonCustomMaterialSlot>(['skin', 'horn', 'tooth', 'membrane', 'dark']);
const PIECE_MATERIALS = new Set<DragonCustomPieceMaterial>([...MATERIALS, 'original']);
const MAX_PIECES = 32;
const MAX_RECIPE_LENGTH = 96_000;
const DEGREES_TO_RADIANS = Math.PI / 180;

/** Reads the bounded legacy-compatible recipe carried by any assembly visual profile. */
export function dragonCustomPartRecipe(part: AssemblyPart): DragonCustomPartRecipe {
  return parseDragonCustomPartRecipe(visualString(part, 'customPartRecipe', ''));
}

export function parseDragonCustomPartRecipe(value: string): DragonCustomPartRecipe {
  if (!value || value.length > MAX_RECIPE_LENGTH) return EMPTY_DRAGON_CUSTOM_PART_RECIPE;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || (parsed['version'] !== 1 && parsed['version'] !== 2)
      || !Array.isArray(parsed['pieces'])) {
      return EMPTY_DRAGON_CUSTOM_PART_RECIPE;
    }
    const version = parsed['version'];
    const ids = new Set<string>();
    const pieces = parsed['pieces'].slice(0, MAX_PIECES * 4)
      .flatMap(piece => readPiece(piece, version)).filter(piece => {
      if (ids.has(piece.id) || ids.size >= MAX_PIECES) return false;
      ids.add(piece.id);
      return true;
    });
    return { version: 2, pieces };
  } catch {
    return EMPTY_DRAGON_CUSTOM_PART_RECIPE;
  }
}

export function serializeDragonCustomPartRecipe(recipe: DragonCustomPartRecipe): string {
  return recipe.pieces.length ? JSON.stringify({ version: 2, pieces: recipe.pieces }) : '';
}

/** Appends package-neutral recipe pieces inside the owning part composition. */
export function addDragonCustomPartPieces(
  group: THREE.Group,
  part: AssemblyPart,
  dimensions: Vector3Data,
  palette: DragonPalette,
): void {
  const recipe = dragonCustomPartRecipe(part);
  if (!recipe.pieces.length) return;
  const recipeGroup = new THREE.Group();
  recipeGroup.name = 'dragon-custom-part-recipe';

  for (const piece of recipe.pieces) {
    if (!piece.visible) continue;
    const sides = piece.mirrored
      ? [{ side: -1, suffix: 'left' }, { side: 1, suffix: 'right' }]
      : [{ side: 1, suffix: 'single' }];
    for (const instance of sides) {
      const object = createPieceObject(piece, palette);
      object.name = `dragon-custom-piece-${piece.id}-${instance.suffix}`;
      object.position.set(
        dimensions.x * piece.offset.x,
        dimensions.y * piece.offset.y,
        dimensions.z * (piece.mirrored ? Math.abs(piece.offset.z) * instance.side : piece.offset.z),
      );
      object.rotation.set(
        piece.rotationDegrees.x * DEGREES_TO_RADIANS * (piece.mirrored ? instance.side : 1),
        piece.rotationDegrees.y * DEGREES_TO_RADIANS * (piece.mirrored ? instance.side : 1),
        piece.rotationDegrees.z * DEGREES_TO_RADIANS,
      );
      object.scale.set(
        dimensions.x * piece.scale.x,
        dimensions.y * piece.scale.y,
        dimensions.z * piece.scale.z * (piece.mirrored && instance.side < 0 ? -1 : 1),
      );
      object.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      recipeGroup.add(object);
    }
  }
  if (recipeGroup.children.length) group.add(recipeGroup);
}

function readPiece(value: unknown, version: 1 | 2): DragonCustomPartPiece[] {
  if (!isRecord(value) || typeof value['id'] !== 'string' || !/^[a-z0-9-]{1,40}$/.test(value['id'])
    || typeof value['label'] !== 'string'
    || !isVector(value['offset']) || !isVector(value['rotationDegrees']) || !isVector(value['scale'])
    || typeof value['mirrored'] !== 'boolean' || typeof value['visible'] !== 'boolean') return [];
  const scale = value['scale'];
  if (scale.x <= 0 || scale.y <= 0 || scale.z <= 0) return [];
  const base = {
    id: value['id'],
    label: value['label'].slice(0, 48),
    offset: boundedVector(value['offset'], -2, 2),
    rotationDegrees: boundedVector(value['rotationDegrees'], -360, 360),
    scale: boundedVector(scale, 0.01, 2),
    mirrored: value['mirrored'],
    visible: value['visible'],
  };
  const kind = version === 1 ? 'primitive' : value['kind'];
  if (kind === 'primitive' && SHAPES.has(value['shape'] as DragonCustomPieceShape)
    && MATERIALS.has(value['material'] as DragonCustomMaterialSlot)) {
    return [{
      ...base,
      kind: 'primitive',
      shape: value['shape'] as DragonCustomPieceShape,
      material: value['material'] as DragonCustomMaterialSlot,
    }];
  }
  if (kind === 'asset' && typeof value['assetId'] === 'string'
    && /^[a-zA-Z0-9._-]{1,96}$/.test(value['assetId'])
    && typeof value['sourceFileName'] === 'string'
    && PIECE_MATERIALS.has(value['material'] as DragonCustomPieceMaterial)) {
    return [{
      ...base,
      kind: 'asset',
      assetId: value['assetId'],
      sourceFileName: value['sourceFileName'].slice(0, 96),
      material: value['material'] as DragonCustomPieceMaterial,
    }];
  }
  return [];
}

function createPieceObject(piece: DragonCustomPartPiece, palette: DragonPalette): THREE.Object3D {
  if (piece.kind === 'primitive') {
    return new THREE.Mesh(geometryFor(piece.shape), materialFor(piece.material, palette));
  }
  const imported = instantiateRegisteredAssemblyAsset(piece.assetId);
  if (!imported) return missingAssetPlaceholder(piece.assetId);
  if (piece.material !== 'original') applyImportedMaterial(imported, piece.material, palette);
  return imported;
}

function applyImportedMaterial(
  object: THREE.Object3D,
  slot: DragonCustomMaterialSlot,
  palette: DragonPalette,
): void {
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const previous = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of previous) material.dispose();
    child.material = materialFor(slot, palette);
  });
}

function missingAssetPlaceholder(assetId: string): THREE.Object3D {
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xe87938, wireframe: true }),
  );
  placeholder.name = `dragon-custom-asset-missing-${assetId}`;
  placeholder.userData['missingAssetId'] = assetId;
  return placeholder;
}

function geometryFor(shape: DragonCustomPieceShape): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere': return new THREE.SphereGeometry(0.5, 20, 12);
    case 'box': return new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 2);
    case 'cone': return new THREE.CylinderGeometry(0.025, 0.5, 1, 20, 2);
  }
}

function materialFor(slot: DragonCustomMaterialSlot, palette: DragonPalette): THREE.Material {
  switch (slot) {
    case 'skin': return scaleMaterial(palette);
    case 'horn': return hornMaterial(palette);
    case 'tooth': return toothMaterial(palette);
    case 'membrane': return membraneMaterial(palette);
    case 'dark': return nostrilMaterial(palette);
  }
}

function boundedVector(vector: Vector3Data, min: number, max: number): Vector3Data {
  return {
    x: Math.max(min, Math.min(max, vector.x)),
    y: Math.max(min, Math.min(max, vector.y)),
    z: Math.max(min, Math.min(max, vector.z)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVector(value: unknown): value is Vector3Data {
  return isRecord(value)
    && typeof value['x'] === 'number' && Number.isFinite(value['x'])
    && typeof value['y'] === 'number' && Number.isFinite(value['y'])
    && typeof value['z'] === 'number' && Number.isFinite(value['z']);
}
