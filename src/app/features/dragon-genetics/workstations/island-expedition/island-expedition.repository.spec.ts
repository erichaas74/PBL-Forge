import {
  IslandExpeditionRepository,
  createAttempt,
  emptyExpeditionAttempts,
} from './island-expedition.repository';
import { surveyIsland } from './island-expedition.survey';

describe('island expedition repository', () => {
  const repository = new IslandExpeditionRepository();

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty record for a student with no history', () => {
    const stored = repository.load('student-1');
    expect(stored.attempts).toEqual({});
    expect(stored.studentId).toBe('student-1');
  });

  it('round-trips an attempt', () => {
    const attempt = {
      ...createAttempt('stormrider', 'student-1'),
      predictedIslandId: 'stormcrag' as const,
      prediction: 'Gale-swept open cliffs should favour broad wings.',
    };
    repository.save({
      schemaVersion: 1,
      studentId: 'student-1',
      attempts: { stormrider: attempt },
    });

    const loaded = repository.load('student-1');
    expect(loaded.attempts['stormrider'].predictedIslandId).toBe('stormcrag');
    expect(loaded.attempts['stormrider'].prediction).toContain('broad wings');
  });

  it('keeps the drawn dragons so a field record reads back as the student saw it', () => {
    const dragons = surveyIsland('kelpreach', 6, 'seed-1');
    const attempt = {
      ...createAttempt('hidden-line', 'student-1'),
      surveys: [
        {
          id: 'seed-1',
          questId: 'hidden-line',
          islandId: 'kelpreach' as const,
          atIso: '2026-08-21T10:00:00.000Z',
          dragons,
          reasonedFirst: true,
        },
      ],
    };
    repository.save({ schemaVersion: 1, studentId: 'student-1', attempts: { 'hidden-line': attempt } });

    const loaded = repository.load('student-1');
    expect(loaded.attempts['hidden-line'].surveys[0].dragons.length).toBe(6);
    expect(loaded.attempts['hidden-line'].surveys[0].dragons[0].id).toBe(dragons[0].id);
  });

  it('keeps separate records for separate students', () => {
    repository.save({
      schemaVersion: 1,
      studentId: 'student-1',
      attempts: { stormrider: createAttempt('stormrider', 'student-1') },
    });
    expect(repository.load('student-2').attempts).toEqual({});
  });

  it('drops an attempt whose quest no longer exists', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.island-expedition.v1.student-1',
      JSON.stringify({
        schemaVersion: 1,
        studentId: 'student-1',
        attempts: { 'retired-quest': createAttempt('retired-quest', 'student-1') },
      }),
    );
    expect(repository.load('student-1').attempts).toEqual({});
  });

  it('discards an unknown island id rather than trusting stored input', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.island-expedition.v1.student-1',
      JSON.stringify({
        schemaVersion: 1,
        studentId: 'student-1',
        attempts: {
          stormrider: { ...createAttempt('stormrider', 'student-1'), predictedIslandId: 'atlantis' },
        },
      }),
    );
    expect(repository.load('student-1').attempts['stormrider'].predictedIslandId).toBeNull();
  });

  it('falls back cleanly on unreadable storage', () => {
    localStorage.setItem('pbl-forge.dragon-genetics.island-expedition.v1.student-1', 'not json');
    expect(repository.load('student-1')).toEqual(emptyExpeditionAttempts('student-1'));
  });

  it('normalizes a blank student id to the device identity', () => {
    expect(emptyExpeditionAttempts('   ').studentId).toBe('local-student');
  });
});
