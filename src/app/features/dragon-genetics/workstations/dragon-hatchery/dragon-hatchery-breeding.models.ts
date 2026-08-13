import { DragonLabGenome, DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { SelectedMeiosisGamete } from './meiosis-gamete.models';

export interface HatcheryFertilizationRecord {
  id: string;
  eggParentId: string;
  spermParentId: string;
  targetTraitId: DragonTraitId;
  eggSelection: SelectedMeiosisGamete;
  spermSelection: SelectedMeiosisGamete;
  offspringId: string;
  offspringGenome: DragonLabGenome;
  createdAtIso: string;
}

export interface DragonHatcheryBreedingSnapshot {
  schemaVersion: 1;
  studentId: string;
  eggParentId: string | null;
  spermParentId: string | null;
  targetTraitId: DragonTraitId;
  pendingEggSelection: SelectedMeiosisGamete | null;
  pendingSpermSelection: SelectedMeiosisGamete | null;
  fertilizations: readonly HatcheryFertilizationRecord[];
}
