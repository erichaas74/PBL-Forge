import { describe, expect, it } from 'vitest';
import { ASSEMBLY_PART_DEFINITIONS } from '../assembly-garage/data/assembly-part-definitions';
import { ASSEMBLY_PROJECT_PACKAGES, partProfileSchema } from './assembly-project-packages';

describe('bundled assembly project packages', () => {
  it('ships complete Dragon, Vehicle, and Robot manifests', () => {
    expect(ASSEMBLY_PROJECT_PACKAGES.map(project => project.id)).toEqual([
      'dragon', 'vehicle', 'robot', 'primitive',
    ]);
    for (const id of ['dragon', 'vehicle', 'robot']) {
      const project = ASSEMBLY_PROJECT_PACKAGES.find(candidate => candidate.id === id)!;
      expect(project.categories.length).toBeGreaterThanOrEqual(4);
      expect(project.materials.length).toBeGreaterThanOrEqual(4);
      expect(project.profiles.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives the proof wheel and arm mixed schema-generated controls', () => {
    const wheel = partProfileSchema(ASSEMBLY_PART_DEFINITIONS.find(part => part.id === 'car-front-left-wheel')!);
    const arm = partProfileSchema(ASSEMBLY_PART_DEFINITIONS.find(part => part.id === 'robot-left-arm')!);
    expect(wheel.generatorId).toBe('vehicle');
    expect(wheel.controls.map(control => control.type)).toEqual(expect.arrayContaining(['number', 'select', 'color']));
    expect(arm.generatorId).toBe('robot');
    expect(arm.controls.map(control => control.key)).toContain('toolMode');
  });

  it('adapts dragon jaw controls to the same universal profile schema', () => {
    const jaw = partProfileSchema(ASSEMBLY_PART_DEFINITIONS.find(part => part.id === 'dragon-lower-jaw')!);
    expect(jaw.generatorId).toBe('dragon');
    expect(jaw.capabilities).toContain('custom-pieces');
    expect(jaw.controls.map(control => control.key)).toEqual(expect.arrayContaining([
      'toothCount', 'toothOffsetX', 'toothRake',
    ]));
  });
});
