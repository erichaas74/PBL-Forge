import { describe, expect, it } from 'vitest';
import { AssemblyProjectPackageManifest, validateAssemblyProjectPackage } from './assembly-part-schema';

const packageManifest = (): AssemblyProjectPackageManifest => ({
  schemaVersion: 1,
  id: 'test-machine',
  label: 'Test machine',
  description: 'A small schema fixture.',
  familyId: 'test',
  categories: [{ id: 'frame', label: 'Frame', description: 'Main frame.' }],
  materials: [{ id: 'metal', label: 'Metal', description: 'Painted metal.' }],
  supportedJointTypes: ['fixed', 'hinge'],
  supportedConstraintTypes: ['socket'],
  profiles: [{
    schemaVersion: 1,
    profileId: 'test-arm',
    generatorId: 'test-generator',
    categoryId: 'frame',
    capabilities: ['dimensions', 'parameters'],
    sections: [{ id: 'form', label: 'Form', description: 'Shape.', category: 'Form' }],
    controls: [{
      key: 'length', label: 'Length', description: 'Arm length.', sectionId: 'form',
      type: 'number', defaultValue: 1, binding: 'parameter', min: 0.5, max: 2, step: 0.05,
    }],
  }],
});

describe('assembly project package schema', () => {
  it('accepts a coherent data-driven inspector package', () => {
    expect(validateAssemblyProjectPackage(packageManifest()).id).toBe('test-machine');
  });

  it('rejects controls assigned to missing sections', () => {
    const manifest = packageManifest();
    const broken = {
      ...manifest,
      profiles: [{ ...manifest.profiles[0], controls: [{ ...manifest.profiles[0].controls[0], sectionId: 'missing' }] }],
    };
    expect(() => validateAssemblyProjectPackage(broken)).toThrow(/unknown section/i);
  });
});
