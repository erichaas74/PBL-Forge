import { createDragonModelPack } from './dragon-model-pack-export';
import { AssemblyState } from '@pbl/assembly/domain/assembly.models';
import { DEFAULT_DRAGON_STYLE } from '@pbl/assembly/rendering/dragon-procedural-mesh.factory';

describe('createDragonModelPack', () => {
  it('strips Garage-only state and preserves phenotype parameters', () => {
    const editorState: AssemblyState = {
      parts: [{
        id: 'body',
        shape: 'box',
        mass: 1,
        dimensions: { x: 1, y: 1, z: 1 },
        position: { x: 0, y: 0, z: 0 },
        color: '#335533',
        visualProfile: {
          profileId: 'dragon-body',
          meshType: 'procedural',
          parameters: { sex: 'male', backSpikeCount: 8 },
        },
      }],
      joints: [],
      isSimulating: true,
    };
    const pack = createDragonModelPack(editorState, {
      modelId: 'classic-dragon',
      label: 'Classic Dragon',
      description: 'Designer export',
      packVersion: '1.0.0',
      style: DEFAULT_DRAGON_STYLE,
    });

    expect('isSimulating' in pack.models[0].blueprint).toBeFalse();
    expect(pack.models[0].blueprint.parts[0].visualProfile?.parameters?.['sex']).toBe('male');
    expect(pack.models[0].blueprint.parts[0].visualProfile?.parameters?.['spikeCount'])
      .toBe(DEFAULT_DRAGON_STYLE.body.spikeCount);
  });
});
