import { AssemblyBlueprint } from '../domain/assembly.models';
import { cloneAssemblyBlueprint } from '../domain/assembly-clone';
import {
  SPECIMEN_MODEL_SCHEMA_VERSION,
  SpecimenDescriptor,
  SpecimenTraitReadout,
  StoredSpecimenModel,
} from './specimen.models';

/**
 * Turning specimens into records a student's work can carry, and reading those
 * records back without trusting them.
 *
 * Anything here may have been written by an older build, hand-edited in
 * localStorage, or round-tripped through Firestore. Parsing therefore validates
 * rather than casts, and returns `null` instead of throwing.
 */

export interface StoreSpecimenOptions {
  /**
   * The genome that produced this specimen. Include it whenever the owning
   * simulation has one — it is smaller than the blueprint and lets the saved
   * specimen re-express through later anatomy improvements.
   */
  genome?: unknown;
  /**
   * Bake the blueprint into the record as well. Defaults to true, which costs
   * space but guarantees the specimen still renders on a screen where the
   * owning profile is not registered. Set false for genome-only records.
   */
  includeBlueprint?: boolean;
  /** Persist the trait readouts as saved, instead of recomputing them on load. */
  includeTraits?: boolean;
  savedAt?: string;
}

export function toStoredSpecimenModel(
  descriptor: SpecimenDescriptor,
  options: StoreSpecimenOptions = {},
): StoredSpecimenModel {
  const includeBlueprint = options.includeBlueprint ?? true;
  const includeTraits = options.includeTraits ?? true;

  return {
    schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
    id: descriptor.id,
    label: descriptor.label,
    profileId: descriptor.profileId,
    generation: descriptor.generation,
    accentColor: descriptor.accentColor,
    blueprint: includeBlueprint ? cloneAssemblyBlueprint(descriptor.blueprint) : undefined,
    genome: options.genome,
    traits: includeTraits && descriptor.traits.length ? descriptor.traits.map(cloneTrait) : undefined,
    savedAt: options.savedAt ?? new Date().toISOString(),
  };
}

/** Validates an untrusted record. Returns null when it is unusable. */
export function parseStoredSpecimenModel(value: unknown): StoredSpecimenModel | null {
  if (!isRecord(value)) return null;
  if (value['schemaVersion'] !== SPECIMEN_MODEL_SCHEMA_VERSION) return null;

  const id = value['id'];
  const label = value['label'];
  if (typeof id !== 'string' || !id) return null;

  const blueprint = parseBlueprint(value['blueprint']);
  const genome = value['genome'];
  // A record that carries neither cannot produce a specimen by any route.
  if (!blueprint && genome === undefined) return null;

  return {
    schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
    id,
    label: typeof label === 'string' && label ? label : id,
    profileId: optionalString(value['profileId']),
    generation: optionalNumber(value['generation']),
    accentColor: optionalString(value['accentColor']),
    blueprint: blueprint ?? undefined,
    genome,
    traits: parseTraits(value['traits']),
    savedAt: optionalString(value['savedAt']),
  };
}

export function parseStoredSpecimenModels(value: unknown): StoredSpecimenModel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parseStoredSpecimenModel)
    .filter((model): model is StoredSpecimenModel => model !== null);
}

function parseBlueprint(value: unknown): AssemblyBlueprint | null {
  if (!isRecord(value)) return null;
  const parts = value['parts'];
  const joints = value['joints'];
  if (!Array.isArray(parts) || !Array.isArray(joints)) return null;
  if (!parts.every(isRenderablePart)) return null;

  // Structurally sound: clone through the shared deep-clone so the caller never
  // holds a reference into parsed storage data.
  return cloneAssemblyBlueprint({
    parts: parts as AssemblyBlueprint['parts'],
    joints: joints as AssemblyBlueprint['joints'],
  });
}

/** The minimum a part needs for the mesh factory to build something for it. */
function isRenderablePart(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value['id'] === 'string'
    && typeof value['shape'] === 'string'
    && typeof value['color'] === 'string'
    && isVector(value['dimensions'])
    && isVector(value['position']);
}

function parseTraits(value: unknown): SpecimenTraitReadout[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const traits = value.filter(isRecord).flatMap(entry => {
    const id = entry['id'];
    const label = entry['label'];
    const valueLabel = entry['valueLabel'];
    if (typeof id !== 'string' || typeof label !== 'string' || typeof valueLabel !== 'string') {
      return [];
    }
    const roles = entry['roles'];
    return [{
      id,
      label,
      valueLabel,
      detail: optionalString(entry['detail']),
      roles: Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [],
      normalized: optionalNumber(entry['normalized']),
    }];
  });

  return traits.length ? traits : undefined;
}

function cloneTrait(trait: SpecimenTraitReadout): SpecimenTraitReadout {
  return { ...trait, roles: [...trait.roles] };
}

function isVector(value: unknown): boolean {
  return isRecord(value)
    && typeof value['x'] === 'number'
    && typeof value['y'] === 'number'
    && typeof value['z'] === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
