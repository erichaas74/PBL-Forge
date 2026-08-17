import { DragonJourneyRosterRepository } from './dragon-journey-roster.repository';

describe('DragonJourneyRosterRepository', () => {
  const studentId = 'journey-roster-spec';
  const assignmentId = 'assignment-1';
  const repository = new DragonJourneyRosterRepository();

  afterEach(() => {
    for (const pathId of ['dragon-arena', 'mini-dragon-show']) {
      localStorage.removeItem(
        `pbl-forge.dragon-genetics.journey-roster.v1.${studentId}.${assignmentId}.${pathId}`,
      );
    }
  });

  it('creates exactly one female and one male starter for Arena', () => {
    const roster = repository.loadOrCreate(
      studentId,
      assignmentId,
      'dragon-arena',
      'classic-ember-tide',
    );

    expect(roster.starters.map((starter) => starter.sex)).toEqual(['female', 'male']);
    expect(roster.starters.map((starter) => starter.dragonId)).toEqual(['ember', 'tide']);
  });

  it('is idempotent when a class starter preset changes later', () => {
    const first = repository.loadOrCreate(
      studentId,
      assignmentId,
      'mini-dragon-show',
      'mini-biscuit-pepper',
    );
    const second = repository.loadOrCreate(
      studentId,
      assignmentId,
      'mini-dragon-show',
      'mini-cinder-sorrel',
    );

    expect(second.createdAtIso).toBe(first.createdAtIso);
    expect(second.starterPairPresetId).toBe('mini-biscuit-pepper');
    expect(second.starters).toEqual(first.starters);
  });
});
