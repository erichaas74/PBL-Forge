import { createMiniDragonProceduralObject } from '@pbl/assembly/rendering/mini-dragon-procedural-mesh.factory';
import { createPartFromDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { MINI_DRAGON_PART_DEFINITIONS } from './mini-dragon-part-definitions';

describe('Mini Dragon Parts Lab catalog', () => {
  it('gives every shared Mini Dragon mesh profile an isolated renderable part', () => {
    const profileIds = MINI_DRAGON_PART_DEFINITIONS.map(
      definition => definition.visualProfile?.profileId,
    );

    expect(new Set(MINI_DRAGON_PART_DEFINITIONS.map(definition => definition.id)).size)
      .toBe(MINI_DRAGON_PART_DEFINITIONS.length);
    expect(profileIds).toContain('mini-dragon-thigh');
    expect(profileIds).toContain('mini-dragon-leg');

    for (const definition of MINI_DRAGON_PART_DEFINITIONS) {
      const part = createPartFromDefinition(definition, { x: 0, y: 0, z: 0 }, definition.id);
      expect(createMiniDragonProceduralObject(part))
        .withContext(definition.visualProfile?.profileId ?? definition.id)
        .toBeTruthy();
    }
  });
});
