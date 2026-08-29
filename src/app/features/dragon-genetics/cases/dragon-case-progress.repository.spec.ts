import { DragonCaseProgressRepository, emptyProgress } from './dragon-case-progress.repository';

describe('DragonCaseProgressRepository', () => {
  const repository = new DragonCaseProgressRepository();

  beforeEach(() => localStorage.clear());

  it('keeps branch progress separate by student and path', () => {
    const arena = repository.save({
      ...emptyProgress('student-1', 'arena', 'dragon-in-the-ash'),
      runtimeState: 'investigating',
      acceptedAtIso: '2026-08-23T12:00:00.000Z',
    });

    expect(repository.load('student-1', 'arena', 'dragon-in-the-ash').runtimeState).toBe(
      'investigating',
    );
    expect(repository.load('student-1', 'mini-show', 'dragon-in-the-ash').runtimeState).toBe(
      'offered',
    );
    expect(repository.load('student-2', 'arena', 'dragon-in-the-ash').runtimeState).toBe('offered');
    expect(arena.schemaVersion).toBe(1);
  });

  it('keeps the two cases separate inside the same lesson and path', () => {
    repository.save({
      ...emptyProgress('student-1', 'arena', 'food-that-steals-fire'),
      runtimeState: 'investigating',
      acceptedAtIso: '2026-08-23T12:00:00.000Z',
    });

    expect(repository.load('student-1', 'arena', 'food-that-steals-fire').runtimeState).toBe(
      'investigating',
    );
    expect(repository.load('student-1', 'arena', 'dragon-in-the-ash').runtimeState).toBe('offered');
  });
});
