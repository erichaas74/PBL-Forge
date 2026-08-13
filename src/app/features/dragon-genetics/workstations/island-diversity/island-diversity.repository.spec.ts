import { scanDragon } from './island-diversity.domain';
import { IslandDiversityRepository } from './island-diversity.repository';

describe('IslandDiversityRepository', () => {
  let repository: IslandDiversityRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new IslandDiversityRepository();
  });

  it('persists one complete archipelago under the current student identity', () => {
    const initial = repository.load('student-a');
    const dragon = initial.islands.stormbreak.dragons[0];
    const changed = scanDragon(initial, dragon.id);
    repository.save('student-a', changed);

    expect(repository.load('student-a').scannedDragonIds).toContain(dragon.id);
    expect(repository.load('student-b').scannedDragonIds).not.toContain(dragon.id);
  });

  it('restores the released mock archipelago when device data are malformed', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.island-diversity.v1.student-a',
      JSON.stringify({ schemaVersion: 1, world: { islands: {} } }),
    );

    expect(repository.load('student-a').islands.stormbreak.dragons.length).toBe(12);
  });
});
