import { parseDragonModelPack } from './dragon-model-pack.validation';

describe('parseDragonModelPack', () => {
  it('preserves scalar visual parameters while removing editor state', () => {
    const parsed = parseDragonModelPack(pack({
      sex: 'male',
      tailClubSpikeCount: 5,
      fireBreathing: true,
    }));

    expect(parsed.models[0].blueprint.parts[0].visualProfile?.parameters).toEqual({
      sex: 'male',
      tailClubSpikeCount: 5,
      fireBreathing: true,
    });
    expect('isSimulating' in parsed.models[0].blueprint).toBeFalse();
  });

  it('rejects Garage state in a published blueprint', () => {
    const value = pack();
    (value.models[0].blueprint as Record<string, unknown>)['isSimulating'] = false;
    expect(() => parseDragonModelPack(value)).toThrowError(/Garage-only/);
  });

  it('rejects joints that reference missing parts', () => {
    const value = pack();
    value.models[0].blueprint.joints.push({
      id: 'bad-joint',
      type: 'fixed',
      parentPartId: 'body',
      childPartId: 'missing',
      pivotOnParent: { x: 0, y: 0, z: 0 },
      pivotOnChild: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 1, z: 0 },
    });
    expect(() => parseDragonModelPack(value)).toThrowError(/missing part/);
  });

  it('rejects a procedural profile the renderer cannot build', () => {
    const value = pack();
    value.models[0].blueprint.parts[0].visualProfile!.profileId = 'unknown-dragon-part';
    expect(() => parseDragonModelPack(value)).toThrowError(/unsupported procedural profile/);
  });
});

function pack(parameters?: Record<string, string | number | boolean>) {
  return {
    schemaVersion: 1,
    packId: 'test-dragons',
    packVersion: '1.0.0',
    rendererContractVersion: 1,
    defaultModelId: 'classic-dragon',
    models: [{
      id: 'classic-dragon',
      label: 'Classic Dragon',
      description: 'Test fixture',
      blueprint: {
        parts: [{
          id: 'body',
          shape: 'box' as const,
          mass: 1,
          dimensions: { x: 1, y: 1, z: 1 },
          position: { x: 0, y: 0, z: 0 },
          color: '#336633',
          visualProfile: {
            profileId: 'dragon-body',
            meshType: 'procedural' as const,
            parameters,
          },
        }],
        joints: [] as {
          id: string;
          type: 'fixed';
          parentPartId: string;
          childPartId: string;
          pivotOnParent: { x: number; y: number; z: number };
          pivotOnChild: { x: number; y: number; z: number };
          axis: { x: number; y: number; z: number };
        }[],
      },
    }],
  };
}
