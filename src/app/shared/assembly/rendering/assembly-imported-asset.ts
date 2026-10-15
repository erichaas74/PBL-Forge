import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ImportedAssemblyAssetInspection {
  readonly byteLength: number;
  readonly meshCount: number;
  readonly triangleCount: number;
  readonly materialCount: number;
  readonly textureCount: number;
  readonly maxTextureDimension: number;
  readonly sourceSize: { readonly x: number; readonly y: number; readonly z: number };
}

export interface ImportedAssemblyAsset {
  readonly template: THREE.Group;
  readonly inspection: ImportedAssemblyAssetInspection;
}

export const IMPORTED_ASSEMBLY_ASSET_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxMeshes: 32,
  maxTriangles: 50_000,
  maxMaterials: 4,
  maxTextures: 8,
  maxTextureDimension: 2048,
} as const;

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const MIN_GLTF_EXTENT = 1e-6;

/** Parses one self-contained GLB, validates its cost, and normalizes it to a unit bounding box. */
export async function importAssemblyGlb(
  bytes: ArrayBuffer,
  fileName: string,
): Promise<ImportedAssemblyAsset> {
  validateGlbHeader(bytes, fileName);
  let parsed: Awaited<ReturnType<GLTFLoader['parseAsync']>>;
  try {
    parsed = await new GLTFLoader().parseAsync(bytes, '');
  } catch {
    throw new Error(`${fileName} could not be parsed as a self-contained GLB.`);
  }
  const inspection = inspectImportedAssemblyAsset(
    parsed.scene,
    bytes.byteLength,
    parsed.animations.length,
  );
  return {
    template: normalizeImportedAssemblyAsset(parsed.scene, inspection.sourceSize),
    inspection,
  };
}

export function validateGlbHeader(bytes: ArrayBuffer, fileName = 'The selected file'): void {
  if (bytes.byteLength > IMPORTED_ASSEMBLY_ASSET_LIMITS.maxBytes) {
    throw new Error(`${fileName} is larger than the 5 MB local import limit.`);
  }
  if (bytes.byteLength < 12) throw new Error(`${fileName} is not a complete GLB file.`);
  const header = new DataView(bytes, 0, 12);
  if (header.getUint32(0, true) !== GLB_MAGIC || header.getUint32(4, true) !== GLB_VERSION) {
    throw new Error(`${fileName} must be a binary glTF 2.0 (.glb) file.`);
  }
  if (header.getUint32(8, true) !== bytes.byteLength) {
    throw new Error(`${fileName} has an invalid GLB length header.`);
  }
}

export function inspectImportedAssemblyAsset(
  scene: THREE.Object3D,
  byteLength: number,
  animationCount = 0,
): ImportedAssemblyAssetInspection {
  let meshCount = 0;
  let triangleCount = 0;
  let unsupported = '';
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let maxTextureDimension = 0;

  scene.traverse(object => {
    if (object instanceof THREE.SkinnedMesh) unsupported ||= 'skinned meshes';
    else if (object instanceof THREE.Camera) unsupported ||= 'embedded cameras';
    else if (object instanceof THREE.Light) unsupported ||= 'embedded lights';
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const position = object.geometry.getAttribute('position');
    if (!position) return;
    if (!object.geometry.getAttribute('normal')) object.geometry.computeVertexNormals();
    triangleCount += object.geometry.index
      ? Math.floor(object.geometry.index.count / 3)
      : Math.floor(position.count / 3);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of meshMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture)) continue;
        textures.add(value);
        const image = value.image as { width?: unknown; height?: unknown } | undefined;
        const width = typeof image?.width === 'number' ? image.width : 0;
        const height = typeof image?.height === 'number' ? image.height : 0;
        maxTextureDimension = Math.max(maxTextureDimension, width, height);
      }
    }
  });

  if (animationCount) unsupported ||= 'animations';
  if (unsupported) throw new Error(`Imported parts cannot contain ${unsupported}.`);
  if (!meshCount) throw new Error('The GLB does not contain a visible mesh.');
  enforceLimit(meshCount, IMPORTED_ASSEMBLY_ASSET_LIMITS.maxMeshes, 'meshes');
  enforceLimit(triangleCount, IMPORTED_ASSEMBLY_ASSET_LIMITS.maxTriangles, 'triangles');
  enforceLimit(materials.size, IMPORTED_ASSEMBLY_ASSET_LIMITS.maxMaterials, 'materials');
  enforceLimit(textures.size, IMPORTED_ASSEMBLY_ASSET_LIMITS.maxTextures, 'textures');
  enforceLimit(
    maxTextureDimension,
    IMPORTED_ASSEMBLY_ASSET_LIMITS.maxTextureDimension,
    'pixels on one texture edge',
  );

  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  if (!isFiniteVector(size) || Math.max(size.x, size.y, size.z) < MIN_GLTF_EXTENT) {
    throw new Error('The GLB has empty or invalid bounds.');
  }
  return {
    byteLength,
    meshCount,
    triangleCount,
    materialCount: materials.size,
    textureCount: textures.size,
    maxTextureDimension,
    sourceSize: { x: size.x, y: size.y, z: size.z },
  };
}

/** Centres the imported scene and makes its longest source dimension equal one. */
export function normalizeImportedAssemblyAsset(
  scene: THREE.Group,
  sourceSize: ImportedAssemblyAssetInspection['sourceSize'],
): THREE.Group {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  const center = bounds.getCenter(new THREE.Vector3());
  const longest = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
  const normalized = new THREE.Group();
  normalized.name = 'normalized-imported-assembly-asset';
  const centered = new THREE.Group();
  centered.position.copy(center).multiplyScalar(-1);
  centered.add(scene);
  normalized.add(centered);
  normalized.scale.setScalar(1 / longest);
  normalized.updateMatrixWorld(true);
  return normalized;
}

function enforceLimit(actual: number, maximum: number, label: string): void {
  if (actual > maximum) {
    throw new Error(`The imported part has ${actual.toLocaleString()} ${label}; the limit is ${maximum.toLocaleString()}.`);
  }
}

function isFiniteVector(vector: THREE.Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}
