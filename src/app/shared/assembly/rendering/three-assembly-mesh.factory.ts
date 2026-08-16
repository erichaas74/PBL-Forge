import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AssemblyPart } from '../domain/assembly.models';
import { positiveNumber } from '../domain/vector-data';
import {
  instantiateAssemblyAsset,
  isSharedAssemblyAssetTexture,
  loadAssemblyAssetTemplate,
} from './assembly-asset-loader';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';
import { isSharedDragonTexture } from './dragon-textures';
import { createMiniDragonProceduralObject } from './mini-dragon-procedural-mesh.factory';

export interface AssemblyMaterialOptions {
  emissive?: number;
  emissiveIntensity?: number;
}

/**
 * Renderable object for a part. Dispatches on the visual profile:
 * - `asset`: authored GLB (async), with the procedural/primitive build as an
 *   immediate fallback that is swapped out when the file arrives.
 * - `procedural`: generated anatomy (dragon parts), falling back to primitives.
 * - `primitive`: rounded-box / sphere / cylinder with the profile's material.
 *
 * The returned group's transform belongs to physics; visual-profile offsets are
 * applied inside. Appearance (team tint, damage) is managed per material via
 * {@link applyAssemblyTeamTint} and {@link applyAssemblyDamageAppearance}.
 */
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
    void loadAssemblyAssetTemplate(profile.assetId).then(template => {
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
    const procedural =
      createMiniDragonProceduralObject(part) ?? createDragonProceduralObject(part);
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
  if (profile.scale) object.scale.multiply(new THREE.Vector3(profile.scale.x, profile.scale.y, profile.scale.z));
  if (profile.rotation) {
    object.quaternion.multiply(
      new THREE.Quaternion(profile.rotation.x, profile.rotation.y, profile.rotation.z, profile.rotation.w),
    );
  }
  if (profile.offset) object.position.add(new THREE.Vector3(profile.offset.x, profile.offset.y, profile.offset.z));
}

// ---------------------------------------------------------------------------
// Appearance: base values captured per material, then tint/damage reapplied
// non-destructively (survives async GLB swaps).
// ---------------------------------------------------------------------------

interface MaterialAppearanceBase {
  color: number;
  emissive: number;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
}

interface TeamTintState {
  emissive: number;
  intensity: number;
}

interface DamageState {
  healthRatio: number;
  destroyed: boolean;
}

const DAMAGE_COLOR = new THREE.Color('#7f1d1d');
const DESTROYED_COLOR = new THREE.Color('#1f2937');
const TRAIT_MUTED_COLOR = new THREE.Color('#8b93a1');

export function prepareAssemblyAppearance(root: THREE.Object3D): void {
  forEachStandardMaterial(root, material => {
    if (material.userData['appearanceBase']) return;
    const base: MaterialAppearanceBase = {
      color: material.color.getHex(),
      emissive: material.emissive.getHex(),
      emissiveIntensity: material.emissiveIntensity,
      opacity: material.opacity,
      transparent: material.transparent,
    };
    material.userData['appearanceBase'] = base;
  });
}

export function applyAssemblyTeamTint(root: THREE.Object3D, emissive: number, intensity: number): void {
  const state: TeamTintState = { emissive, intensity };
  root.userData['teamTint'] = state;

  forEachStandardMaterial(root, material => {
    if (material.userData['preserveAppearance']) return;
    material.emissive.setHex(emissive);
    material.emissiveIntensity = intensity;
  });
}

export function applyAssemblyDamageAppearance(
  root: THREE.Object3D,
  state: DamageState | null,
): void {
  root.userData['damageState'] = state;

  forEachStandardMaterial(root, material => {
    const base = material.userData['appearanceBase'] as MaterialAppearanceBase | undefined;
    if (!base || material.userData['preserveAppearance']) return;

    if (state?.destroyed) {
      material.color.copy(DESTROYED_COLOR);
      material.opacity = 0.38;
      material.transparent = true;
      return;
    }

    const damage = state ? 1 - Math.max(0, Math.min(1, state.healthRatio)) : 0;
    material.color.setHex(base.color).lerp(DAMAGE_COLOR, damage);
    material.opacity = base.opacity;
    material.transparent = base.transparent;

    /*
     * Scorch.
     *
     * Past the halfway mark a part starts to glow at its cracks — the darkened
     * albedo alone reads as "dirty" rather than as "failing", and a student
     * watching a duel needs to see which parts are about to go without reading
     * the scoreboard. Ramped from 0.5 so an early graze changes nothing and the
     * glow arrives as a genuine warning.
     *
     * Skipped while a hit flash is up, since that owns the emissive channel and
     * restores its own value on release.
     */
    if (!root.userData['hitFlashActive']) {
      const scorch = Math.max(0, damage - 0.5) * 2;
      if (scorch > 0) {
        material.emissive.setHex(SCORCH_EMISSIVE);
        material.emissiveIntensity = scorch * SCORCH_MAX_INTENSITY;
      } else {
        material.emissive.setHex(base.emissive);
        material.emissiveIntensity = base.emissiveIntensity;
      }
    }
  });
}

/** Cooling ember in a crack: the arena's accent hue, so damage reads as heat. */
const SCORCH_EMISSIVE = 0xc2410c;
const SCORCH_MAX_INTENSITY = 0.55;

const HIT_FLASH_EMISSIVE = 0xff6a3d;
const HIT_FLASH_INTENSITY = 0.85;

/**
 * Momentary emissive pulse when a part takes damage. Restores the team tint (or
 * the material's base emissive) when the flash ends.
 */
export function applyAssemblyHitFlash(root: THREE.Object3D, active: boolean): void {
  if (Boolean(root.userData['hitFlashActive']) === active) return;
  root.userData['hitFlashActive'] = active;

  if (active) {
    forEachStandardMaterial(root, material => {
      if (material.userData['preserveAppearance']) return;
      material.emissive.setHex(HIT_FLASH_EMISSIVE);
      material.emissiveIntensity = HIT_FLASH_INTENSITY;
    });
    return;
  }

  const tint = root.userData['teamTint'] as TeamTintState | undefined;
  /*
   * A badly damaged part keeps its scorch when the flash releases. Restoring
   * the team tint unconditionally would clear the glow for a frame and read as
   * the damage having been repaired — a false signal in the one moment the
   * student is looking hardest at the part that was just hit.
   */
  const damage = root.userData['damageState'] as DamageState | null | undefined;
  const scorch = damage && !damage.destroyed
    ? Math.max(0, (1 - Math.max(0, Math.min(1, damage.healthRatio))) - 0.5) * 2
    : 0;

  forEachStandardMaterial(root, material => {
    if (material.userData['preserveAppearance']) return;
    const base = material.userData['appearanceBase'] as MaterialAppearanceBase | undefined;
    if (scorch > 0) {
      material.emissive.setHex(SCORCH_EMISSIVE);
      material.emissiveIntensity = scorch * SCORCH_MAX_INTENSITY;
    } else if (tint) {
      material.emissive.setHex(tint.emissive);
      material.emissiveIntensity = tint.intensity;
    } else if (base) {
      material.emissive.setHex(base.emissive);
      material.emissiveIntensity = base.emissiveIntensity;
    }
  });
}

/**
 * Trait focus for teaching views: `true` leaves a part at full colour, `false`
 * mutes it toward neutral grey, `null` clears focus mode entirely.
 *
 * This is how a student sees *which parts a gene shaped* — select "wing span"
 * and only the wings stay coloured. It reads and writes the same
 * `appearanceBase` snapshot as damage and team tint, so the three never fight
 * over a material, and it is restored after an async GLB swap.
 */
export function applyAssemblyTraitFocus(root: THREE.Object3D, focused: boolean | null): void {
  root.userData['traitFocus'] = focused;

  forEachStandardMaterial(root, material => {
    const base = material.userData['appearanceBase'] as MaterialAppearanceBase | undefined;
    if (!base) return;

    if (focused === null || focused) {
      material.color.setHex(base.color);
      material.opacity = base.opacity;
      material.transparent = base.transparent;
      return;
    }

    if (material.userData['preserveAppearance']) return;
    material.color.setHex(base.color).lerp(TRAIT_MUTED_COLOR, 0.78);
    // Slight transparency pushes muted parts behind the focused ones without
    // hiding the silhouette a student needs for context.
    material.opacity = base.opacity * 0.55;
    material.transparent = true;
  });
}

function reapplyStoredAppearance(root: THREE.Object3D): void {
  const tint = root.userData['teamTint'] as TeamTintState | undefined;
  if (tint) applyAssemblyTeamTint(root, tint.emissive, tint.intensity);

  const damage = root.userData['damageState'] as DamageState | null | undefined;
  if (damage !== undefined) applyAssemblyDamageAppearance(root, damage);

  const traitFocus = root.userData['traitFocus'] as boolean | null | undefined;
  if (traitFocus !== undefined) applyAssemblyTraitFocus(root, traitFocus);
}

function forEachStandardMaterial(
  root: THREE.Object3D,
  callback: (material: THREE.MeshStandardMaterial) => void,
): void {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) callback(material);
    }
  });
}

/**
 * Frees a part's geometry and materials.
 *
 * Textures are only disposed when this object *owns* them. The dragon's PBR
 * maps are generated once and shared by every dragon on the field, so freeing
 * one part's map would strip the skin off all of its siblings — the shared
 * cache outlives any single mesh and is released by `disposeDragonTextures`.
 */
export function disposeAssemblyObject(root: THREE.Object3D): void {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const textures = new Set<THREE.Texture>();
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      for (const texture of textures) {
        if (!isSharedDragonTexture(texture) && !isSharedAssemblyAssetTexture(texture)) {
          texture.dispose();
        }
      }
      material.dispose();
    }
  });
}

// ---------------------------------------------------------------------------
// Primitive geometry and materials.
// ---------------------------------------------------------------------------

export function createAssemblyGeometry(part: AssemblyPart): THREE.BufferGeometry {
  const dimensions = part.dimensions;
  let geometry: THREE.BufferGeometry;
  switch (part.shape) {
    case 'box': {
      const width = positiveNumber(dimensions.x, 1);
      const height = positiveNumber(dimensions.y, 1);
      const depth = positiveNumber(dimensions.z, 1);
      // Chamfered edges catch specular highlights; razor-sharp boxes read as CAD.
      const bevel = Math.min(width, height, depth) * 0.12;
      geometry = new RoundedBoxGeometry(width, height, depth, 2, bevel);
      break;
    }
    case 'sphere':
      geometry = new THREE.SphereGeometry(positiveNumber(dimensions.x, 0.5), 32, 16);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        positiveNumber(dimensions.x, 0.5),
        positiveNumber(dimensions.z, dimensions.x),
        positiveNumber(dimensions.y, 1),
        32,
      );
      if (isWheel(part)) geometry.rotateX(Math.PI / 2);
      break;
  }

  const visual = part.visualProfile;
  if (visual?.scale) geometry.scale(visual.scale.x, visual.scale.y, visual.scale.z);
  if (visual?.rotation) {
    geometry.applyQuaternion(new THREE.Quaternion(
      visual.rotation.x,
      visual.rotation.y,
      visual.rotation.z,
      visual.rotation.w,
    ));
  }
  if (visual?.offset) geometry.translate(visual.offset.x, visual.offset.y, visual.offset.z);
  return geometry;
}

export function createAssemblyMaterial(
  part: AssemblyPart,
  options: AssemblyMaterialOptions = {},
): THREE.MeshStandardMaterial {
  const materialId = part.visualProfile?.materialId ?? 'default';
  const style = materialStyle(materialId);
  return new THREE.MeshStandardMaterial({
    color: part.color,
    metalness: style.metalness,
    roughness: style.roughness,
    transparent: style.opacity < 1,
    opacity: style.opacity,
    side: style.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

export function getAssemblyRenderSignature(part: AssemblyPart): string {
  const profile = part.visualProfile;
  const parameters = profile?.parameters
    ? Object.fromEntries(Object.entries(profile.parameters).sort(([left], [right]) => left.localeCompare(right)))
    : null;

  // This signature is the renderer's rebuild contract. Keep every field that
  // can change geometry, material, or the profile-local transform here. JSON
  // avoids delimiter collisions in free-form profile strings, while sorting
  // sets and maps prevents equivalent state from rebuilding unnecessarily.
  return JSON.stringify({
    shape: part.shape,
    dimensions: part.dimensions,
    color: part.color,
    roles: [...(part.roles ?? [])].sort(),
    profile: profile ? {
      meshType: profile.meshType,
      profileId: profile.profileId,
      assetId: profile.assetId ?? null,
      materialId: profile.materialId ?? null,
      parameters,
      scale: profile.scale ?? null,
      offset: profile.offset ?? null,
      rotation: profile.rotation ?? null,
    } : null,
  });
}

function isWheel(part: AssemblyPart): boolean {
  return part.shape === 'cylinder'
    && (part.roles?.includes('wheel')
      || part.visualProfile?.profileId === 'car-wheel'
      || part.id.toLowerCase().includes('wheel'));
}

function materialStyle(materialId: string): {
  metalness: number;
  roughness: number;
  opacity: number;
  doubleSided: boolean;
} {
  if (materialId.includes('glass')) {
    return { metalness: 0.05, roughness: 0.12, opacity: 0.58, doubleSided: true };
  }
  if (materialId.includes('rubber')) {
    return { metalness: 0.02, roughness: 0.92, opacity: 1, doubleSided: false };
  }
  if (materialId.includes('metal') || materialId.includes('gold')) {
    return { metalness: 0.58, roughness: 0.36, opacity: 1, doubleSided: false };
  }
  if (materialId.includes('wing-membrane')) {
    return { metalness: 0, roughness: 0.68, opacity: 0.78, doubleSided: true };
  }
  if (materialId.includes('scale')) {
    return { metalness: 0.08, roughness: 0.74, opacity: 1, doubleSided: false };
  }
  return { metalness: 0.1, roughness: 0.55, opacity: 1, doubleSided: false };
}
