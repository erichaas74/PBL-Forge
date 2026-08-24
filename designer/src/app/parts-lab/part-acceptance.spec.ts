import { describe, expect, it } from 'vitest';
import { createDragonProceduralObject } from '@pbl/assembly/rendering/dragon-procedural-mesh.factory';
import { createMiniDragonProceduralObject } from '@pbl/assembly/rendering/mini-dragon-procedural-mesh.factory';
import { disposeAssemblyObject } from '@pbl/assembly/rendering/assembly-object-disposal';
import { editableDragonParametersForProfile } from '@pbl/assembly/model-pack/dragon-visual-parameter-registry';
import { ASSEMBLY_PART_DEFINITIONS, createPartFromDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { MINI_DRAGON_PART_DEFINITIONS } from './mini-dragon-part-definitions';
import { buildPartAcceptanceReport } from './part-acceptance';

describe('Dragon part upgrade acceptance', () => {
  const definitions = [
    ...ASSEMBLY_PART_DEFINITIONS.filter(definition => definition.family === 'dragon'),
    ...MINI_DRAGON_PART_DEFINITIONS,
  ];

  it('accepts every lab and Mini Dragon catalog definition', () => {
    for (const definition of definitions) {
      const report = buildPartAcceptanceReport(definition);
      expect(report.passed, `${definition.id}: ${report.checks.filter(check => !check.passed).map(check => check.label).join(', ')}`).toBe(true);
    }
  });

  it('renders every editable numeric parameter at both authoring extremes', () => {
    for (const definition of definitions) {
      const profile = definition.visualProfile?.profileId ?? '';
      const controls = editableDragonParametersForProfile(profile);
      for (const extreme of ['min', 'max'] as const) {
        const part = createPartFromDefinition(definition, { x: 0, y: 0, z: 0 }, `${definition.id}-${extreme}`);
        if (part.visualProfile) {
          part.visualProfile.parameters = {
            ...part.visualProfile.parameters,
            ...Object.fromEntries(controls.map(control => [control.key, control[extreme]!])),
          };
        }
        const object = createMiniDragonProceduralObject(part) ?? createDragonProceduralObject(part);
        expect(object, `${definition.id} at ${extreme}`).toBeTruthy();
        if (object) disposeAssemblyObject(object);
      }
    }
  });
});
