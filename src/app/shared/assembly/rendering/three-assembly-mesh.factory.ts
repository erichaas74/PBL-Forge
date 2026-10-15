import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { instantiateAssemblyAsset, loadAssemblyAssetTemplate } from './assembly-asset-loader';
import { prepareAssemblyAppearance, reapplyStoredAppearance } from './assembly-appearance';
import { disposeAssemblyObject } from './assembly-object-disposal';
import { createAssemblyGeometry, createAssemblyMaterial } from './assembly-primitive-rendering';
import { createRegisteredAssemblyObject } from './assembly-generator-registry';
import { ensureBuiltInAssemblyGenerators } from './built-in-assembly-generators';
import { addDragonCustomPartPieces } from './dragon-custom-part-recipe';
import { dragonPaletteForPart } from './dragon-materials';

export interface AssemblyObjectOptions {
  /**
   * Skip the authored-GLB fetch and keep the procedural build. Small previews
   * and thumbnail grids set this: a clutch of eight specimens would otherwise
   * issue one network request per part per specimen for artwork nobody can see
   * at that size.
   */
  proceduralOnly?: boolean;
  /** Called after an authored asset replaces its immediate fallback. */
  onAsyncReady?: () => void;
}

export function createAssemblyObject(
  part: AssemblyPart,
  options: AssemblyObjectOptions = {},
): THREE.Group {
  const root = new THREE.Group();
  root.userData['partId'] = part.id;

  ensureBuiltInAssemblyGenerators();

  const content = composeContent(part, buildContent(part));
  root.add(content);
  prepareAssemblyAppearance(root);

  const profile = part.visualProfile;
  if (!options.proceduralOnly && profile?.meshType === 'asset' && profile.assetId) {
    void loadAssemblyAssetTemplate(profile.assetId).then((template) => {
      if (!template || !root.parent) return;
      const authored = instantiateAssemblyAsset(template);
      applyProfileTransform(authored, part);
      const replacement = composeContent(part, authored);
      disposeAssemblyObject(content);
      root.remove(content);
      root.add(replacement);
      prepareAssemblyAppearance(root);
      reapplyStoredAppearance(root);
      options.onAsyncReady?.();
    });
  }

  return root;
}

function buildContent(part: AssemblyPart): THREE.Object3D {
  const meshType = part.visualProfile?.meshType;

  if (meshType === 'procedural' || meshType === 'asset') {
    const procedural = createRegisteredAssemblyObject(part);
    if (procedural) {
      applyProfileTransform(procedural, part);
      return procedural;
    }
  }

  const mesh = new THREE.Mesh(createAssemblyGeometry(part), createAssemblyMaterial(part));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Custom primitives and imported pieces are a capability of every package part. */
function composeContent(part: AssemblyPart, base: THREE.Object3D): THREE.Group {
  const group = new THREE.Group();
  group.name = 'assembly-part-composition';
  group.add(base);
  addDragonCustomPartPieces(group, part, part.dimensions, dragonPaletteForPart(part));
  return group;
}

function applyProfileTransform(object: THREE.Object3D, part: AssemblyPart): void {
  const profile = part.visualProfile;
  if (!profile) return;
  if (profile.scale)
    object.scale.multiply(new THREE.Vector3(profile.scale.x, profile.scale.y, profile.scale.z));
  if (profile.rotation) {
    object.quaternion.multiply(
      new THREE.Quaternion(
        profile.rotation.x,
        profile.rotation.y,
        profile.rotation.z,
        profile.rotation.w,
      ),
    );
  }
  if (profile.offset)
    object.position.add(new THREE.Vector3(profile.offset.x, profile.offset.y, profile.offset.z));
}

// ---------------------------------------------------------------------------
// Appearance: base values captured per material, then tint/damage reapplied
// non-destructively (survives async GLB swaps).
// ---------------------------------------------------------------------------

export {
  applyAssemblyDamageAppearance,
  applyAssemblyHitFlash,
  applyAssemblyTeamTint,
  applyAssemblySelectionFocus,
  applyAssemblyTraitFocus,
  prepareAssemblyAppearance,
} from './assembly-appearance';
export { disposeAssemblyObject } from './assembly-object-disposal';
export type { AssemblyMaterialOptions } from './assembly-primitive-rendering';
export {
  createAssemblyGeometry,
  createAssemblyMaterial,
  getAssemblyRenderSignature,
} from './assembly-primitive-rendering';
