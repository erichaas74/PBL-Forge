import { describe, expect, it } from 'vitest';
import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { partGeneContext } from './part-workshop-context';

function part(profileId: string): AssemblyPartDefinition {
  return {
    id: `test-${profileId}`,
    label: profileId,
    family: 'dragon',
    shape: 'box',
    dimensions: { x: 1, y: 1, z: 1 },
    mass: 1,
    color: '#ffffff',
    snapPoints: [],
    visualProfile: { profileId, meshType: 'procedural', parameters: {} },
  };
}

describe('Part Workshop gene context', () => {
  it('connects Arena body parts to the editable chassis and spike loci', () => {
    expect(partGeneContext(part('dragon-body'), 'lab').map(entry => entry.id))
      .toEqual(['body-type', 'armor', 'spikes']);
  });

  it('connects Show anatomy to the corresponding Mini Dragon genes', () => {
    expect(partGeneContext(part('mini-dragon-wing'), 'mini').map(entry => entry.id))
      .toEqual(['wings', 'plumage']);
    expect(partGeneContext(part('mini-dragon-tail-sail'), 'mini').map(entry => entry.id))
      .toEqual(['tail-sail']);
  });

  it('does not invent a gene relationship for an unmapped utility part', () => {
    expect(partGeneContext(part('dragon-wing-claw'), 'lab')).toEqual([]);
  });
});
