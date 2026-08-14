import { DRAGON_PARENTS, fertilizeLabGametes } from '../../simulation/domain/dragon-inheritance';
import { AccountDragonRecord } from '../../workstations/shared/account-genetics-library.models';
import { DragonHatcheryBreedingSnapshot } from '../../workstations/dragon-hatchery/dragon-hatchery-breeding.models';
import {
  coreGameteGenome,
  generateMeiosisRun,
} from '../../workstations/dragon-hatchery/meiosis-gamete.domain';
import { buildArenaChampionRoster } from './dragon-arena-champions';

describe('arena champion roster', () => {
  it('reconstructs the exact student-bred hatchling from its saved gametes', () => {
    const eggParent = accountDragon(0, 'female');
    const spermParent = accountDragon(1, 'male');
    const eggRun = generateMeiosisRun(eggParent, 'female', 'arena:egg', 'fire');
    const spermRun = generateMeiosisRun(spermParent, 'male', 'arena:sperm', 'fire');
    const expected = fertilizeLabGametes(
      eggParent,
      spermParent,
      coreGameteGenome(eggRun.gametes[1]),
      coreGameteGenome(spermRun.gametes[2]),
      'student-fighter',
      1,
      'Hatchling 1',
      1,
    );
    const hatchery: DragonHatcheryBreedingSnapshot = {
      schemaVersion: 1,
      studentId: 'student-1',
      eggParentId: eggParent.id,
      spermParentId: spermParent.id,
      targetTraitId: 'fire',
      pendingEggSelection: null,
      pendingSpermSelection: null,
      fertilizations: [
        {
          id: 'fertilization-1',
          eggParentId: eggParent.id,
          spermParentId: spermParent.id,
          targetTraitId: 'fire',
          eggSelection: {
            run: eggRun,
            gamete: eggRun.gametes[1],
            reason: '',
            selectedAtIso: '2026-08-14T00:00:00.000Z',
          },
          spermSelection: {
            run: spermRun,
            gamete: spermRun.gametes[2],
            reason: '',
            selectedAtIso: '2026-08-14T00:00:00.000Z',
          },
          offspringId: expected.id,
          offspringGenome: expected.genome,
          createdAtIso: '2026-08-14T00:00:00.000Z',
        },
      ],
    };

    const champions = buildArenaChampionRoster(hatchery, {
      studentId: 'student-1',
      dragons: [eggParent, spermParent],
      chromosomes: [],
    });

    expect(champions).toHaveSize(1);
    expect(champions[0].id).toBe('student-fighter');
    expect(champions[0].genome).toEqual(expected.genome);
    expect(champions[0].parentIds).toEqual([eggParent.id, spermParent.id]);
  });
});

function accountDragon(index: number, sex: AccountDragonRecord['sex']): AccountDragonRecord {
  return {
    ...DRAGON_PARENTS[index],
    kind: 'dragon',
    sex,
    source: 'foundation',
    storedAtIso: '2026-01-01T00:00:00.000Z',
  };
}

