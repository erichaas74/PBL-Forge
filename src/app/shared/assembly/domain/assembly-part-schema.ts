import { JointType } from './assembly.models';

/** Stable ids understood by the bundled authoring packages. Custom packages may add their own id. */
export type AssemblyProjectTypeId = 'dragon' | 'vehicle' | 'robot' | 'primitive' | string;

export type AssemblyPartCapability =
  | 'dimensions'
  | 'materials'
  | 'parameters'
  | 'custom-pieces'
  | 'imported-meshes'
  | 'sockets'
  | 'constraints'
  | 'symmetry'
  | 'surface'
  | string;

export type AssemblyInspectorControlType = 'number' | 'boolean' | 'select' | 'color';
export type AssemblyInspectorControlBinding = 'parameter' | 'style';
export type AssemblyControlValue = string | number | boolean;
export type AssemblyHandleKind = 'move' | 'rotate' | 'scale';
export type AssemblyHandleAxis = 'horizontal' | 'vertical' | 'diagonal';

export interface AssemblyInspectorOption {
  readonly value: string | number;
  readonly label: string;
}

/**
 * One inspector field. The Designer renders these records; a project package,
 * not a page component, decides which controls a part exposes.
 */
export interface AssemblyInspectorControlDefinition {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly sectionId: string;
  readonly type: AssemblyInspectorControlType;
  readonly defaultValue: AssemblyControlValue;
  readonly binding: AssemblyInspectorControlBinding;
  readonly styleSection?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly unit?: string;
  readonly options?: readonly AssemblyInspectorOption[];
  readonly readOnly?: boolean;
  readonly surface?: boolean;
  readonly handle?: {
    readonly kind: AssemblyHandleKind;
    readonly axis: AssemblyHandleAxis;
  };
}

export interface AssemblyInspectorSectionDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: 'Form' | 'Surface' | 'Appendage' | 'Support' | 'Mechanism';
  readonly structural?: boolean;
}

export interface AssemblyPartProfileSchema {
  readonly schemaVersion: 1;
  readonly profileId: string;
  readonly generatorId: string | null;
  readonly categoryId: string;
  readonly capabilities: readonly AssemblyPartCapability[];
  readonly sections: readonly AssemblyInspectorSectionDefinition[];
  readonly controls: readonly AssemblyInspectorControlDefinition[];
}

export interface AssemblyProjectCategoryDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface AssemblyProjectMaterialDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface AssemblyProjectPackageManifest {
  readonly schemaVersion: 1;
  readonly id: AssemblyProjectTypeId;
  readonly label: string;
  readonly description: string;
  /** Existing catalog family used while older saved URLs are migrated. */
  readonly familyId: string;
  readonly categories: readonly AssemblyProjectCategoryDefinition[];
  readonly materials: readonly AssemblyProjectMaterialDefinition[];
  readonly supportedJointTypes: readonly JointType[];
  readonly supportedConstraintTypes: readonly string[];
  readonly profiles: readonly AssemblyPartProfileSchema[];
}

/** Fails early when a third-party package contains ambiguous inspector data. */
export function validateAssemblyProjectPackage(
  manifest: AssemblyProjectPackageManifest,
): AssemblyProjectPackageManifest {
  if (manifest.schemaVersion !== 1 || !identifier(manifest.id) || !manifest.label.trim()) {
    throw new Error('Assembly project package identity is invalid.');
  }
  uniqueIds(manifest.categories, 'category', category => category.id);
  uniqueIds(manifest.materials, 'material', material => material.id);
  uniqueIds(manifest.profiles, 'profile', profile => profile.profileId);
  for (const profile of manifest.profiles) {
    if (profile.schemaVersion !== 1 || !identifier(profile.profileId)
      || (profile.generatorId !== null && !identifier(profile.generatorId))) {
      throw new Error(`Assembly profile ${profile.profileId || '(empty)'} is invalid.`);
    }
    const categoryIds = new Set(manifest.categories.map(category => category.id));
    if (!categoryIds.has(profile.categoryId)) {
      throw new Error(`Assembly profile ${profile.profileId} uses unknown category ${profile.categoryId}.`);
    }
    uniqueIds(profile.sections, `section in ${profile.profileId}`, section => section.id);
    uniqueIds(profile.controls, `control in ${profile.profileId}`, control => control.key);
    const sectionIds = new Set(profile.sections.map(section => section.id));
    for (const control of profile.controls) {
      if (!sectionIds.has(control.sectionId)) {
        throw new Error(`Assembly control ${control.key} uses unknown section ${control.sectionId}.`);
      }
      validateControl(control);
    }
  }
  return manifest;
}

function validateControl(control: AssemblyInspectorControlDefinition): void {
  if (!identifier(control.key) || !control.label.trim()) {
    throw new Error('Assembly inspector control identity is invalid.');
  }
  if (control.type === 'number') {
    if (typeof control.defaultValue !== 'number' || !Number.isFinite(control.defaultValue)
      || !Number.isFinite(control.min) || !Number.isFinite(control.max)
      || control.min! >= control.max! || !Number.isFinite(control.step) || control.step! <= 0) {
      throw new Error(`Assembly number control ${control.key} has an invalid range.`);
    }
  } else if (control.type === 'boolean' && typeof control.defaultValue !== 'boolean') {
    throw new Error(`Assembly boolean control ${control.key} has an invalid default.`);
  } else if (control.type === 'color'
    && (typeof control.defaultValue !== 'string' || !/^#[0-9a-f]{6}$/i.test(control.defaultValue))) {
    throw new Error(`Assembly color control ${control.key} has an invalid default.`);
  } else if (control.type === 'select') {
    if (!control.options?.length
      || !control.options.some(option => option.value === control.defaultValue)) {
      throw new Error(`Assembly select control ${control.key} has an invalid default.`);
    }
  }
  if (control.binding === 'style' && !identifier(control.styleSection ?? '')) {
    throw new Error(`Assembly style control ${control.key} is missing its style section.`);
  }
}

function uniqueIds<T>(
  values: readonly T[],
  label: string,
  read: (value: T) => string,
): void {
  const ids = values.map(read);
  if (ids.some(id => !identifier(id)) || new Set(ids).size !== ids.length) {
    throw new Error(`Assembly package ${label} ids must be unique and non-empty.`);
  }
}

function identifier(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value);
}
