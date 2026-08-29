import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { instantiateAssemblyAsset, loadAssemblyAssetTemplate } from './assembly-asset-loader';
import { prepareAssemblyAppearance, reapplyStoredAppearance } from './assembly-appearance';
import { disposeAssemblyObject } from './assembly-object-disposal';
import { createAssemblyGeometry, createAssemblyMaterial } from './assembly-primitive-rendering';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';
import { createMiniDragonProceduralObject } from './mini-dragon-procedural-mesh.factory';

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

  const content = buildContent(part);
  root.add(content);
  prepareAssemblyAppearance(root);

  const profile = part.visualProfile;
  if (!options.proceduralOnly && profile?.meshType === 'asset' && profile.assetId) {
    void loadAssemblyAssetTemplate(profile.assetId).then((template) => {
      if (!template || !root.parent) return;
      const authored = instantiateAssemblyAsset(template);
      applyProfileTransform(authored, part);
      disposeAssemblyObject(content);
      root.remove(content);
      root.add(authored);
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
    // Two independent procedural species. The mini dragon is asked first because
    // its profile ids are its own namespace; neither factory answers for the
    // other's parts, so the order only decides which lookup happens twice.
    const procedural = createMiniDragonProceduralObject(part) ?? createDragonProceduralObject(part);
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
