import { AssemblyBlueprint, AssemblyPart } from '@pbl/assembly/domain/assembly.models';
import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { PartAnatomyLayer } from './part-anatomy-layers';
import {
  BACK_SPIKE_PLACEMENT_SUFFIX,
  applyHeadSexPreview,
  applyLayerGenePreview,
  applyWorkshopPlacements,
  matchingAssemblyPartIds,
} from './part-workshop-assembly';

function part(
  id: string,
  definitionId: string | undefined,
  profileId = 'dragon-body',
): AssemblyPart {
  return {
    id,
    definitionId,
    shape: 'box',
    mass: 1,
    dimensions: { x: 2, y: 1, z: 0.5 },
    position: { x: 1, y: 2, z: 3 },
    color: '#884422',
    visualProfile: { profileId, meshType: 'procedural', parameters: {} },
  };
}

function definition(id: string, profileId = 'dragon-body'): AssemblyPartDefinition {
  return {
    id,
    label: id,
    family: 'dragon',
    shape: 'box',
    dimensions: { x: 1, y: 1, z: 1 },
    mass: 1,
    color: '#884422',
    visualProfile: { profileId, meshType: 'procedural' },
    snapPoints: [],
  };
}

function blueprint(...parts: AssemblyPart[]): AssemblyBlueprint {
  return { parts, joints: [] };
}

const spikeLayer: PartAnatomyLayer = {
  id: 'back-spike-rows',
  label: 'Back spikes',
  description: 'Spikes',
  category: 'Surface',
  parameterKeys: ['backSpikeCount', 'backSpikeRows', 'backSpikeScale'],
  geneIds: ['spikes'],
  placement: 'back-spikes',
};

describe('Parts Lab whole-assembly preview', () => {
  it('matches exact definition instances before falling back to the profile', () => {
    const source = blueprint(
      part('left', 'selected'),
      part('right', 'selected'),
      part('other', 'other'),
    );
    expect(matchingAssemblyPartIds(source, definition('selected'))).toEqual(['left', 'right']);
    expect(matchingAssemblyPartIds(source, definition('missing'))).toEqual(['left', 'right', 'other']);
  });

  it('applies position, rotation, and uniform scale without mutating the preset', () => {
    const source = blueprint(part('wing', 'wing-definition', 'dragon-wing'));
    const placed = applyWorkshopPlacements(source, {
      wing: {
        offset: { x: 0.25, y: -0.5, z: 0.75 },
        rotationDegrees: { x: 0, y: 90, z: 0 },
        scale: 1.5,
      },
    });

    expect(placed.parts[0].position).toEqual({ x: 1.25, y: 1.5, z: 3.75 });
    expect(placed.parts[0].dimensions).toEqual({ x: 3, y: 1.5, z: 0.75 });
    expect(placed.parts[0].rotation?.y).toBeCloseTo(Math.SQRT1_2);
    expect(source.parts[0].position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('places generated spike rows inside the body instead of moving the torso', () => {
    const source = blueprint(part('body', 'body-definition'));
    const placed = applyWorkshopPlacements(source, {
      [`body${BACK_SPIKE_PLACEMENT_SUFFIX}`]: {
        offset: { x: 0.4, y: 0.1, z: -0.05 },
        rotationDegrees: { x: 10, y: 20, z: 30 },
        scale: 1.4,
      },
    });
    const parameters = placed.parts[0].visualProfile?.parameters;

    expect(placed.parts[0].position).toEqual(source.parts[0].position);
    expect(parameters?.['backSpikeOffsetX']).toBeCloseTo(0.2);
    expect(parameters?.['backSpikeYaw']).toBeCloseTo(20 * Math.PI / 180);
    expect(parameters?.['backSpikePlacementScale']).toBe(1.4);
  });

  it('compares dominant and recessive expression without changing authored values', () => {
    const source = blueprint(part('body', 'body-definition'));
    source.parts[0].visualProfile!.parameters = { backSpikeRows: 2 };

    const dominant = applyLayerGenePreview(source, ['body'], spikeLayer, 'lab', 'dominant');
    const recessive = applyLayerGenePreview(source, ['body'], spikeLayer, 'lab', 'recessive');

    expect(dominant.parts[0].visualProfile?.parameters?.['backSpikeRows']).toBe(3);
    expect(recessive.parts[0].visualProfile?.parameters?.['backSpikeRows']).toBe(1);
    expect(source.parts[0].visualProfile?.parameters?.['backSpikeRows']).toBe(2);
  });

  it('previews female and male head forms without changing the authored sex', () => {
    const head = part('head', 'head-definition', 'dragon-head-horned');
    head.visualProfile!.parameters = { sex: 'female' };
    const body = part('body', 'body-definition');
    const source = blueprint(head, body);

    const male = applyHeadSexPreview(source, ['head'], 'male');
    const authored = applyHeadSexPreview(source, ['head'], 'authored');

    expect(male.parts[0].visualProfile?.parameters?.['sex']).toBe('male');
    expect(male.parts[1].visualProfile?.parameters?.['sex']).toBeUndefined();
    expect(authored.parts[0].visualProfile?.parameters?.['sex']).toBe('female');
    expect(source.parts[0].visualProfile?.parameters?.['sex']).toBe('female');
  });
});
