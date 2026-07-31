import { AssemblyBlueprint } from '../domain/assembly.models';
import { SPECIMEN_MODEL_SCHEMA_VERSION, describeSpecimen } from './specimen.models';
import {
  parseStoredSpecimenModel,
  parseStoredSpecimenModels,
  toStoredSpecimenModel,
} from './stored-specimen';

function blueprint(): AssemblyBlueprint {
  return {
    parts: [{
      id: 'core',
      roles: ['core'],
      shape: 'box',
      mass: 1,
      dimensions: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: 1, z: 0 },
      color: '#334455',
    }],
    joints: [],
  };
}

function descriptor() {
  return describeSpecimen('dragon-7', blueprint(), {
    label: 'Ember',
    profileId: 'dragon-genetics',
    generation: 2,
    accentColor: '#c0562f',
    traits: [{ id: 'wing-span', label: 'Wing span', valueLabel: '1.24x', roles: ['wing'] }],
  });
}

describe('toStoredSpecimenModel', () => {
  it('bakes the blueprint by default so the record renders without a profile', () => {
    const model = toStoredSpecimenModel(descriptor());

    expect(model.schemaVersion).toBe(SPECIMEN_MODEL_SCHEMA_VERSION);
    expect(model.blueprint?.parts.length).toBe(1);
    expect(model.label).toBe('Ember');
    expect(model.profileId).toBe('dragon-genetics');
  });

  it('can store the genome alone for a compact record', () => {
    const model = toStoredSpecimenModel(descriptor(), {
      genome: { seed: 4 },
      includeBlueprint: false,
    });

    expect(model.blueprint).toBeUndefined();
    expect(model.genome).toEqual({ seed: 4 });
  });

  it('deep-copies the blueprint so later edits do not mutate the record', () => {
    const source = descriptor();
    const model = toStoredSpecimenModel(source);
    source.blueprint.parts[0].color = '#ffffff';

    expect(model.blueprint?.parts[0].color).toBe('#334455');
  });

  it('round-trips through JSON', () => {
    const model = toStoredSpecimenModel(descriptor(), { genome: { seed: 9 } });
    const parsed = parseStoredSpecimenModel(JSON.parse(JSON.stringify(model)));

    expect(parsed).toBeTruthy();
    expect(parsed?.id).toBe('dragon-7');
    expect(parsed?.genome).toEqual({ seed: 9 });
    expect(parsed?.traits?.[0].roles).toEqual(['wing']);
  });
});

describe('parseStoredSpecimenModel', () => {
  it('rejects a record from a different schema version', () => {
    expect(parseStoredSpecimenModel({ schemaVersion: 99, id: 'x', blueprint: blueprint() })).toBeNull();
  });

  it('rejects a record with neither a blueprint nor a genome', () => {
    expect(parseStoredSpecimenModel({
      schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
      id: 'x',
      label: 'x',
    })).toBeNull();
  });

  it('rejects a blueprint whose parts are not renderable', () => {
    const parsed = parseStoredSpecimenModel({
      schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
      id: 'x',
      label: 'x',
      blueprint: { parts: [{ id: 'core' }], joints: [] },
    });

    expect(parsed).toBeNull();
  });

  it('accepts a genome-only record', () => {
    const parsed = parseStoredSpecimenModel({
      schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
      id: 'x',
      label: 'X',
      profileId: 'dragon-genetics',
      genome: { kind: 'lab' },
    });

    expect(parsed?.profileId).toBe('dragon-genetics');
  });

  it('falls back to the id when the label is missing', () => {
    const parsed = parseStoredSpecimenModel({
      schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
      id: 'dragon-7',
      blueprint: blueprint(),
    });

    expect(parsed?.label).toBe('dragon-7');
  });

  it('drops malformed traits without discarding the record', () => {
    const parsed = parseStoredSpecimenModel({
      schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
      id: 'x',
      label: 'X',
      blueprint: blueprint(),
      traits: [{ id: 'ok', label: 'Ok', valueLabel: '1', roles: ['wing', 7] }, { id: 'broken' }],
    });

    expect(parsed?.traits?.length).toBe(1);
    expect(parsed?.traits?.[0].roles).toEqual(['wing']);
  });

  it('rejects non-objects', () => {
    expect(parseStoredSpecimenModel(null)).toBeNull();
    expect(parseStoredSpecimenModel('a string')).toBeNull();
    expect(parseStoredSpecimenModel([])).toBeNull();
  });
});

describe('parseStoredSpecimenModels', () => {
  it('keeps the valid records and drops the rest', () => {
    const valid = toStoredSpecimenModel(descriptor());
    const models = parseStoredSpecimenModels([valid, { schemaVersion: 2 }, null, 'nope']);

    expect(models.length).toBe(1);
    expect(models[0].id).toBe('dragon-7');
  });

  it('returns an empty list for a non-array', () => {
    expect(parseStoredSpecimenModels({ nope: true })).toEqual([]);
  });
});
