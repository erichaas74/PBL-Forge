import {
  ExpressiveDragonTraitId,
  DragonSex,
} from '../../simulation/domain/dragon-expressive-genome';
import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';

export type MeiosisChromosomeLabel = 'Chr 1' | 'Chr 2' | 'Chr 3' | 'Chr 4' | 'Chr X';
export type MeiosisHomologOrigin = 'homolog-a' | 'homolog-b';

export interface MeiosisLocusAllele {
  traitId: ExpressiveDragonTraitId;
  traitName: string;
  geneSymbol: string;
  allele: string;
  position: number;
  origin: MeiosisHomologOrigin;
  dominance: 'dominant' | 'recessive';
}

export interface MeiosisChromatid {
  id: string;
  chromosome: MeiosisChromosomeLabel;
  origin: MeiosisHomologOrigin;
  recombinant: boolean;
  sexChromosome: 'X' | 'Y' | null;
  loci: readonly MeiosisLocusAllele[];
}

export interface MeiosisChromosomePair {
  chromosome: MeiosisChromosomeLabel;
  length: number;
  crossoverAfterLocusIndex: number | null;
  crossoverPosition: number | null;
  chromatids: readonly [
    MeiosisChromatid,
    MeiosisChromatid,
    MeiosisChromatid,
    MeiosisChromatid,
  ];
}

export interface MeiosisGameteChromosome {
  chromosome: MeiosisChromosomeLabel;
  sourceChromatidId: string;
  recombinant: boolean;
  sexChromosome: 'X' | 'Y' | null;
  loci: readonly MeiosisLocusAllele[];
}

export interface MeiosisGamete {
  id: string;
  index: number;
  parentId: string;
  sex: DragonSex;
  chromosomes: readonly MeiosisGameteChromosome[];
  alleleByTrait: Partial<Record<ExpressiveDragonTraitId, string>>;
  targetAllelePresent: boolean;
}

export interface MeiosisRun {
  schemaVersion: 1;
  seed: string;
  parentId: string;
  parentName: string;
  sex: DragonSex;
  targetTraitId: DragonTraitId;
  targetAllele: string;
  chromosomePairs: readonly MeiosisChromosomePair[];
  gametes: readonly [MeiosisGamete, MeiosisGamete, MeiosisGamete, MeiosisGamete];
  createdAtIso: string;
}

export interface SelectedMeiosisGamete {
  run: MeiosisRun;
  gamete: MeiosisGamete;
  reason: string;
  selectedAtIso: string;
}

export const MEIOSIS_GAMETE_DRAG_TYPE = 'application/x-pbl-meiosis-gamete';
