import { AssemblyBlueprint, AssemblyPartRole } from '../domain/assembly.models';
import { getAssemblyRenderSignature } from '../rendering/three-assembly-mesh.factory';

/**
 * A specimen is "one built thing a student can look at and reason about".
 *
 * Nothing in this folder knows about dragons, genetics, or any particular
 * simulation. A simulation supplies a {@link SpecimenDescriptor} — a blueprint
 * plus the trait readouts it wants labelled — and the viewer renders it.
 */

export const SPECIMEN_MODEL_SCHEMA_VERSION = 1;

/**
 * One observable trait, as the owning simulation wants it explained.
 *
 * `roles` is the load-bearing field: it ties the trait to the parts it shaped,
 * so selecting a trait can highlight exactly those parts in the 3D view. An
 * empty list means the trait affects the whole specimen (overall size, colour).
 */
export interface SpecimenTraitReadout {
  id: string;
  label: string;
  /** Short value shown beside the label: `Wide (1.42x)`, `Winged`, `Hue 214`. */
  valueLabel: string;
  /** Optional sentence of explanation for the detail panel. */
  detail?: string;
  /** Part roles this trait shaped. Empty means the whole specimen. */
  roles: readonly AssemblyPartRole[];
  /** 0..1 when the trait is continuous, so hosts can draw a meter. */
  normalized?: number;
}

/** Everything the viewer needs to draw and label one specimen. */
export interface SpecimenDescriptor {
  id: string;
  label: string;
  blueprint: AssemblyBlueprint;
  traits: readonly SpecimenTraitReadout[];
  /** Which registered profile expressed this, when it came from a genome. */
  profileId?: string;
  generation?: number;
  /** Optional accent for host chrome (badges, borders). Not used by the renderer. */
  accentColor?: string;
}

/**
 * The serializable form: what gets written to a student record, localStorage,
 * or Firestore.
 *
 * Two storage strategies, both supported on purpose:
 * - `blueprint` baked in — renders forever with no profile registered, larger,
 *   and frozen at the geometry that was saved.
 * - `genome` only — compact, and re-expresses through the registered profile so
 *   saved specimens pick up later improvements to the anatomy. Requires the
 *   owning simulation's profile to be registered at load time.
 *
 * Saving both is legitimate: the genome is the source of truth and the
 * blueprint is the fallback when the profile is missing.
 */
export interface StoredSpecimenModel {
  schemaVersion: typeof SPECIMEN_MODEL_SCHEMA_VERSION;
  id: string;
  label: string;
  profileId?: string;
  generation?: number;
  accentColor?: string;
  blueprint?: AssemblyBlueprint;
  genome?: unknown;
  traits?: readonly SpecimenTraitReadout[];
  /** ISO timestamp, informational only. */
  savedAt?: string;
}

/** Where a viewer gets its specimen from. */
export type SpecimenSource =
  | { kind: 'descriptor'; descriptor: SpecimenDescriptor }
  | {
      kind: 'blueprint';
      id: string;
      blueprint: AssemblyBlueprint;
      label?: string;
      traits?: readonly SpecimenTraitReadout[];
    }
  | { kind: 'stored'; model: StoredSpecimenModel }
  | {
      kind: 'genome';
      profileId: string;
      genome: unknown;
      id?: string;
      label?: string;
      generation?: number;
    };

export type SpecimenResolution =
  | { status: 'ready'; descriptor: SpecimenDescriptor }
  | { status: 'error'; message: string };

/** Options a profile honours when expressing a genome into a descriptor. */
export interface SpecimenExpressOptions {
  id?: string;
  label?: string;
  generation?: number;
}

/** Convenience for simulations that already hold a blueprint. */
export function describeSpecimen(
  id: string,
  blueprint: AssemblyBlueprint,
  options: {
    label?: string;
    traits?: readonly SpecimenTraitReadout[];
    profileId?: string;
    generation?: number;
    accentColor?: string;
  } = {},
): SpecimenDescriptor {
  return {
    id,
    label: options.label ?? id,
    blueprint,
    traits: options.traits ?? [],
    profileId: options.profileId,
    generation: options.generation,
    accentColor: options.accentColor,
  };
}

/**
 * Cache key for a rendered specimen. Built from the per-part render signatures
 * the mesh factory already defines, so any change that would produce different
 * geometry or colour produces a different key.
 */
export function specimenSignature(descriptor: SpecimenDescriptor): string {
  const parts = descriptor.blueprint.parts
    .map(part => getAssemblyRenderSignature(part))
    .join('|');
  return `${descriptor.id}#${hashString(parts)}`;
}

/** Roles touched by a trait, or `null` when the trait covers the whole specimen. */
export function traitFocusRoles(
  descriptor: SpecimenDescriptor,
  traitId: string | null,
): readonly AssemblyPartRole[] | null {
  if (!traitId) return null;
  const trait = descriptor.traits.find(item => item.id === traitId);
  if (!trait || trait.roles.length === 0) return null;
  return trait.roles;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
