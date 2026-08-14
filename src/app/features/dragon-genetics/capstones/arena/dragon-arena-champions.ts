import { toStudentDragonRecord } from '../../dragon-genetics.domain';
import { StudentDragonRecord } from '../../dragon-genetics.models';
import { fertilizeLabGametes } from '../../simulation/domain/dragon-inheritance';
import { AccountGeneticsLibrarySnapshot } from '../../workstations/shared/account-genetics-library.models';
import { DragonHatcheryBreedingSnapshot } from '../../workstations/dragon-hatchery/dragon-hatchery-breeding.models';
import { coreGameteGenome } from '../../workstations/dragon-hatchery/meiosis-gamete.domain';

export function buildArenaChampionRoster(
  hatchery: DragonHatcheryBreedingSnapshot,
  account: AccountGeneticsLibrarySnapshot,
): StudentDragonRecord[] {
  return hatchery.fertilizations.flatMap((record, index) => {
    const eggParent = account.dragons.find((dragon) => dragon.id === record.eggParentId);
    const spermParent = account.dragons.find((dragon) => dragon.id === record.spermParentId);
    if (!eggParent || !spermParent) return [];
    try {
      const offspring = fertilizeLabGametes(
        eggParent,
        spermParent,
        coreGameteGenome(record.eggSelection.gamete),
        coreGameteGenome(record.spermSelection.gamete),
        record.offspringId,
        1,
        `Hatchling ${index + 1}`,
        index + 1,
      );
      return [toStudentDragonRecord(offspring)];
    } catch {
      return [];
    }
  });
}

