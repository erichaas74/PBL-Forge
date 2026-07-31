import { TestBed } from '@angular/core/testing';
import { AssemblyBlueprint } from '../domain/assembly.models';
import {
  SPECIMEN_MODEL_SCHEMA_VERSION,
  SpecimenDescriptor,
  StoredSpecimenModel,
  describeSpecimen,
} from './specimen.models';
import {
  SpecimenProfile,
  SpecimenProfileRegistry,
  provideSpecimenProfile,
} from './specimen-profile.registry';

interface TestGenome {
  size: number;
}

function blueprint(size = 1): AssemblyBlueprint {
  return {
    parts: [{
      id: 'core',
      roles: ['core'],
      shape: 'box',
      mass: 1,
      dimensions: { x: size, y: size, z: size },
      position: { x: 0, y: 0, z: 0 },
      color: '#445566',
    }],
    joints: [],
  };
}

const TEST_PROFILE: SpecimenProfile<TestGenome> = {
  id: 'test-sim',
  supports: (value): value is TestGenome =>
    typeof value === 'object' && value !== null && typeof (value as TestGenome).size === 'number',
  express: (genome, options): SpecimenDescriptor => describeSpecimen(
    options.id ?? 'expressed',
    blueprint(genome.size),
    {
      label: options.label ?? 'Expressed specimen',
      generation: options.generation,
      traits: [{ id: 'size', label: 'Size', valueLabel: `${genome.size}x`, roles: [] }],
    },
  ),
};

function registryWith(...profiles: SpecimenProfile[]): SpecimenProfileRegistry {
  TestBed.configureTestingModule({
    providers: profiles.map(profile => provideSpecimenProfile(profile)),
  });
  return TestBed.inject(SpecimenProfileRegistry);
}

function storedModel(overrides: Partial<StoredSpecimenModel> = {}): StoredSpecimenModel {
  return {
    schemaVersion: SPECIMEN_MODEL_SCHEMA_VERSION,
    id: 'saved-1',
    label: 'Saved specimen',
    ...overrides,
  };
}

describe('SpecimenProfileRegistry', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('collects profiles registered through providers', () => {
    expect(registryWith(TEST_PROFILE as SpecimenProfile).registeredIds).toEqual(['test-sim']);
  });

  it('resolves a descriptor source unchanged', () => {
    const descriptor = describeSpecimen('given', blueprint());
    const resolution = registryWith().resolve({ kind: 'descriptor', descriptor });

    expect(resolution).toEqual({ status: 'ready', descriptor });
  });

  it('resolves a raw blueprint without needing any profile', () => {
    const resolution = registryWith().resolve({
      kind: 'blueprint',
      id: 'ad-hoc',
      blueprint: blueprint(),
      label: 'Ad hoc',
    });

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.label).toBe('Ad hoc');
  });

  it('expresses a genome through the registered profile', () => {
    const resolution = registryWith(TEST_PROFILE as SpecimenProfile).resolve({
      kind: 'genome',
      profileId: 'test-sim',
      genome: { size: 3 },
      id: 'student-dragon',
    });

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.id).toBe('student-dragon');
    expect(resolution.descriptor.profileId).toBe('test-sim');
    expect(resolution.descriptor.blueprint.parts[0].dimensions.x).toBe(3);
  });

  it('reports an unregistered profile instead of throwing', () => {
    const resolution = registryWith().resolve({
      kind: 'genome',
      profileId: 'missing-sim',
      genome: { size: 1 },
    });

    expect(resolution.status).toBe('error');
    if (resolution.status !== 'error') return;
    expect(resolution.message).toContain('missing-sim');
  });

  it('reports a genome the profile does not recognise', () => {
    const resolution = registryWith(TEST_PROFILE as SpecimenProfile).resolve({
      kind: 'genome',
      profileId: 'test-sim',
      genome: { unexpected: true },
    });

    expect(resolution.status).toBe('error');
  });

  it('prefers the stored genome so saved specimens pick up newer anatomy', () => {
    const resolution = registryWith(TEST_PROFILE as SpecimenProfile).resolve({
      kind: 'stored',
      model: storedModel({
        profileId: 'test-sim',
        genome: { size: 4 },
        // Stale bake from an older build: the genome must win.
        blueprint: blueprint(1),
      }),
    });

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.blueprint.parts[0].dimensions.x).toBe(4);
  });

  it('falls back to the baked blueprint when the profile is absent', () => {
    const resolution = registryWith().resolve({
      kind: 'stored',
      model: storedModel({ profileId: 'test-sim', genome: { size: 4 }, blueprint: blueprint(7) }),
    });

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.blueprint.parts[0].dimensions.x).toBe(7);
  });

  it('explains a genome-only record whose profile is missing', () => {
    const resolution = registryWith().resolve({
      kind: 'stored',
      model: storedModel({ profileId: 'test-sim', genome: { size: 4 } }),
    });

    expect(resolution.status).toBe('error');
    if (resolution.status !== 'error') return;
    expect(resolution.message).toContain('test-sim');
  });

  it('keeps saved trait readouts over freshly expressed ones', () => {
    const resolution = registryWith(TEST_PROFILE as SpecimenProfile).resolve({
      kind: 'stored',
      model: storedModel({
        profileId: 'test-sim',
        genome: { size: 2 },
        traits: [{ id: 'size', label: 'Size', valueLabel: 'as recorded', roles: [] }],
      }),
    });

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.traits[0].valueLabel).toBe('as recorded');
  });

  it('accepts a profile registered at runtime', () => {
    const registry = registryWith();
    registry.register(TEST_PROFILE as SpecimenProfile);

    expect(registry.get('test-sim')).toBeTruthy();
  });
});
