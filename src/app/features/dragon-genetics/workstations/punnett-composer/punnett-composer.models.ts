import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';

export type PunnettParentSide = 'parent1' | 'parent2';
export type PunnettGameteSlots = readonly [string | null, string | null];

export interface PunnettSavedCross {
  id: string;
  parent1Id: string;
  parent1Name: string;
  parent2Id: string;
  parent2Name: string;
  traitId: DragonTraitId;
  traitName: string;
  genotypeCounts: Readonly<Record<string, number>>;
  phenotypeCounts: Readonly<Record<string, number>>;
  savedAtIso: string;
}

export interface PunnettComposerSnapshot {
  schemaVersion: 1;
  studentId: string;
  parent1Id: string | null;
  parent2Id: string | null;
  traitId: DragonTraitId;
  parent1Gametes: PunnettGameteSlots;
  parent2Gametes: PunnettGameteSlots;
  savedCrosses: readonly PunnettSavedCross[];
  updatedAtIso: string;
}

export interface PunnettOffspringCellModel {
  index: number;
  row: number;
  column: number;
  parent1Allele: string | null;
  parent2Allele: string | null;
  genotype: string | null;
  phenotype: string | null;
}

export interface PendingPunnettGamete {
  parent: PunnettParentSide;
  sourceIndex: number;
  allele: string;
}

export const PUNNETT_GAMETE_DRAG_TYPE = 'application/x-pbl-punnett-gamete';

export function createEmptyPunnettSnapshot(studentId: string): PunnettComposerSnapshot {
  return {
    schemaVersion: 1,
    studentId,
    parent1Id: null,
    parent2Id: null,
    traitId: 'wings',
    parent1Gametes: [null, null],
    parent2Gametes: [null, null],
    savedCrosses: [],
    updatedAtIso: new Date(0).toISOString(),
  };
}
