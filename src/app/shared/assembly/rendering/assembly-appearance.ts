import * as THREE from 'three';

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
  forEachStandardMaterial(root, (material) => {
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

export function applyAssemblyTeamTint(
  root: THREE.Object3D,
  emissive: number,
  intensity: number,
): void {
  const state: TeamTintState = { emissive, intensity };
  root.userData['teamTint'] = state;

  forEachStandardMaterial(root, (material) => {
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

  forEachStandardMaterial(root, (material) => {
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
    forEachStandardMaterial(root, (material) => {
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
  const scorch =
    damage && !damage.destroyed
      ? Math.max(0, 1 - Math.max(0, Math.min(1, damage.healthRatio)) - 0.5) * 2
      : 0;

  forEachStandardMaterial(root, (material) => {
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

  forEachStandardMaterial(root, (material) => {
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

export function reapplyStoredAppearance(root: THREE.Object3D): void {
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
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) callback(material);
    }
  });
}
