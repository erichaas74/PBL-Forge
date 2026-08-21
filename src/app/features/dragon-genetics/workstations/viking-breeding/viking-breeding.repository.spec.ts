import {
  VikingBreedingRepository,
  createProgram,
  emptyBreedingPrograms,
} from './viking-breeding.repository';
import { WORKING_ROLE_BY_ID } from './viking-breeding.models';
import { breedLitter } from './viking-breeding.domain';

describe('viking breeding repository', () => {
  const repository = new VikingBreedingRepository();

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty record for a student with no programmes', () => {
    expect(repository.load('student-1').programs).toEqual({});
  });

  it('round-trips a line the student has bred', () => {
    // Losing a six-season line is the worst failure this workstation could have, so the animals
    // are stored rather than regenerated.
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const program = createProgram('granary-mouser', 'student-1');
    const dam = program.kennel.find((animal) => animal.sex === 'female')!;
    const sire = program.kennel.find((animal) => animal.sex === 'male')!;
    const litter = breedLitter(dam, sire, role, 1, 'litter-1');

    repository.save({
      schemaVersion: 1,
      studentId: 'student-1',
      programs: {
        'granary-mouser': {
          ...program,
          season: 3,
          kennel: [...program.kennel, ...litter.pups],
          plan: 'Keeping every teacup pup and pairing the two with sail ears.',
        },
      },
    });

    const loaded = repository.load('student-1').programs['granary-mouser'];
    expect(loaded.season).toBe(3);
    expect(loaded.kennel.length).toBe(program.kennel.length + litter.pups.length);
    expect(loaded.plan).toContain('sail ears');
    // Genomes must survive the round trip exactly, or the line is not the line any more.
    expect(loaded.kennel.at(-1)?.genome).toEqual(litter.pups.at(-1)?.genome);
  });

  it('keeps separate lines for separate students', () => {
    repository.save({
      schemaVersion: 1,
      studentId: 'student-1',
      programs: { 'granary-mouser': createProgram('granary-mouser', 'student-1') },
    });
    expect(repository.load('student-2').programs).toEqual({});
  });

  it('drops a programme for a settlement that no longer exists', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.viking-breeding.v1.student-1',
      JSON.stringify({
        schemaVersion: 1,
        studentId: 'student-1',
        programs: { 'retired-role': createProgram('granary-mouser', 'student-1') },
      }),
    );
    expect(repository.load('student-1').programs).toEqual({});
  });

  it('restocks rather than resuming a programme with no animals left', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.viking-breeding.v1.student-1',
      JSON.stringify({
        schemaVersion: 1,
        studentId: 'student-1',
        programs: {
          'granary-mouser': { ...createProgram('granary-mouser', 'student-1'), kennel: [] },
        },
      }),
    );
    expect(repository.load('student-1').programs['granary-mouser'].kennel.length).toBeGreaterThan(0);
  });

  it('rejects a stored animal whose genome is not a real mini-dragon genome', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.viking-breeding.v1.student-1',
      JSON.stringify({
        schemaVersion: 1,
        studentId: 'student-1',
        programs: {
          'granary-mouser': {
            ...createProgram('granary-mouser', 'student-1'),
            kennel: [{ id: 'x', name: 'x', sex: 'female', genome: { nonsense: 1 }, founderIds: [] }],
          },
        },
      }),
    );
    const kennel = repository.load('student-1').programs['granary-mouser'].kennel;
    expect(kennel.some((animal) => animal.id === 'x')).toBe(false);
    expect(kennel.length).toBeGreaterThan(0);
  });

  it('falls back cleanly on unreadable storage', () => {
    localStorage.setItem('pbl-forge.dragon-genetics.viking-breeding.v1.student-1', 'not json');
    expect(repository.load('student-1')).toEqual(emptyBreedingPrograms('student-1'));
  });
});
