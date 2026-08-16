import { parseDragonModelPack } from './dragon-model-pack.validation';

describe('parseDragonModelPack', () => {
  it('preserves scalar visual parameters while removing editor state', () => {
    const parsed = parseDragonModelPack(pack({
      patternColor: '#88aa44',
      spikeCount: 5,
      glowMarkings: true,
    }));

    expect(parsed.models[0].blueprint.parts[0].visualProfile?.parameters).toEqual({
      patternColor: '#88aa44',
      spikeCount: 5,
      glowMarkings: true,
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

  it('rejects unknown or mistyped visual parameters for a procedural profile', () => {
    expect(() => parseDragonModelPack(pack({ wingFold: 1 })))
      .toThrowError(/wingFold.*not supported/);
    expect(() => parseDragonModelPack(pack({ spikeCount: 'many' })))
      .toThrowError(/spikeCount must be a number/);
  });

  it('rejects non-positive physical values and zero joint axes', () => {
    const invalidMass = pack();
    invalidMass.models[0].blueprint.parts[0].mass = 0;
    expect(() => parseDragonModelPack(invalidMass)).toThrowError(/mass.*greater than zero/);

    const invalidDimension = pack();
    invalidDimension.models[0].blueprint.parts[0].dimensions.z = -1;
    expect(() => parseDragonModelPack(invalidDimension)).toThrowError(/dimensions\.z.*greater than zero/);

    const invalidAxis = packWithChild();
    invalidAxis.models[0].blueprint.joints[0].axis = { x: 0, y: 0, z: 0 };
    expect(() => parseDragonModelPack(invalidAxis)).toThrowError(/non-zero direction/);
  });

  it('rejects malformed quaternions and colors', () => {
    const invalidQuaternion = pack();
    Object.assign(invalidQuaternion.models[0].blueprint.parts[0], {
      rotation: { x: 1, y: 1, z: 1, w: 1 },
    });
    expect(() => parseDragonModelPack(invalidQuaternion)).toThrowError(/unit quaternion/);

    const invalidColor = pack();
    invalidColor.models[0].blueprint.parts[0].color = 'greenish';
    expect(() => parseDragonModelPack(invalidColor)).toThrowError(/hexadecimal color/);
  });

  it('requires a connected, single-parent assembly tree', () => {
    const disconnected = packWithChild();
    disconnected.models[0].blueprint.joints.length = 0;
    expect(() => parseDragonModelPack(disconnected)).toThrowError(/one joint per non-root/);

    const multipleParents = packWithChild();
    const blueprint = multipleParents.models[0].blueprint;
    blueprint.parts.push({
      ...blueprint.parts[0],
      id: 'second-parent',
      position: { x: -1, y: 0, z: 0 },
    });
    blueprint.joints.push({
      ...blueprint.joints[0],
      id: 'second-parent-joint',
      parentPartId: 'second-parent',
    });
    expect(() => parseDragonModelPack(multipleParents)).toThrowError(/more than one parent/);

    const cycle = pack();
    const cycleBlueprint = cycle.models[0].blueprint;
    cycleBlueprint.parts.push(
      { ...cycleBlueprint.parts[0], id: 'cycle-a' },
      { ...cycleBlueprint.parts[0], id: 'cycle-b' },
    );
    cycleBlueprint.joints.push(
      joint('cycle-a-to-b', 'cycle-a', 'cycle-b'),
      joint('cycle-b-to-a', 'cycle-b', 'cycle-a'),
    );
    expect(() => parseDragonModelPack(cycle)).toThrowError(/disconnected parts or a joint cycle/);
  });

  it('requires attachment snap ids to resolve even when snap arrays are absent', () => {
    const value = pack();
    Object.assign(value.models[0].blueprint.parts[0], {
      attachment: {
        parentSnapId: 'body-socket',
        childSnapId: 'missing-child-snap',
        jointType: 'fixed',
        axis: { x: 0, y: 1, z: 0 },
      },
    });

    expect(() => parseDragonModelPack(value)).toThrowError(/missing child snap/);
  });
});

function packWithChild() {
  const value = pack();
  const blueprint = value.models[0].blueprint;
  blueprint.parts.push({
    ...blueprint.parts[0],
    id: 'child',
    position: { x: 1, y: 0, z: 0 },
  });
  blueprint.joints.push(joint('body-to-child', 'body', 'child'));
  return value;
}

function joint(id: string, parentPartId: string, childPartId: string) {
  return {
    id,
    type: 'fixed' as const,
    parentPartId,
    childPartId,
    pivotOnParent: { x: 0, y: 0, z: 0 },
    pivotOnChild: { x: 0, y: 0, z: 0 },
    axis: { x: 0, y: 1, z: 0 },
  };
}

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
