import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { DragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonCardGenomeView } from './dragon-card-genome';
import { DragonCardBloodType, DragonFlipCardView } from './dragon-flip-card.component';

export type GeneticsProgramId = DragonPathContextId;

/** Opaque specimen data supplied by a genetics program to shared workstations. */
export interface GeneticsSpecimen<G = unknown> {
  id: string;
  name: string;
  title: string;
  sex: 'female' | 'male' | null;
  generation: number;
  genome: G;
  renderSource: SpecimenSource | null;
}

export interface GeneticsGeneDefinition {
  id: string;
  name: string;
  chromosomeId: string;
  sampleCode: string;
  inheritanceLabel: string;
  phenotypeForms: readonly { id: string; label: string }[];
}

/** Everything the shared card/deck needs; no component inspects the genome. */
export interface GeneticsCardBundle<S extends GeneticsSpecimen = GeneticsSpecimen> {
  id: string;
  specimen: S;
  card: DragonFlipCardView;
  genome: DragonCardGenomeView;
  footerLeft: string;
  footerRight?: string;
  bloodType?: DragonCardBloodType | null;
}

export interface GeneticsOffspringBucket {
  id: string;
  label: string;
  count: number;
  percentage: number;
  offspringIds: readonly string[];
}

export interface GeneticsBreedingBatch<S extends GeneticsSpecimen = GeneticsSpecimen> {
  id: string;
  parentIds: readonly [string, string];
  geneId: string;
  size: number;
  offspring: readonly S[];
  buckets: readonly GeneticsOffspringBucket[];
}

export interface GeneticsGamete {
  id: string;
  parentId: string;
  label: string;
  alleleByGene: Readonly<Record<string, string>>;
}

/**
 * Species boundary for shared workstations. Concrete genomes remain inside an adapter;
 * workstations operate on opaque specimen IDs and presentation contracts.
 */
export interface GeneticsProgram<S extends GeneticsSpecimen = GeneticsSpecimen> {
  readonly id: GeneticsProgramId;
  readonly displayName: string;
  readonly genes: readonly GeneticsGeneDefinition[];
  /** Restore program-owned student state before a workstation reads specimens. */
  prepare?(studentId: string): void;
  specimens(studentId: string): readonly S[];
  cardBundle(specimen: S): GeneticsCardBundle<S>;
  breed(
    first: S,
    second: S,
    geneId: string,
    size: number,
    seed: string,
  ): GeneticsBreedingBatch<S>;
  meiosis(specimen: S, seed: string): readonly GeneticsGamete[];
  fertilize(
    first: S,
    second: S,
    firstGamete: GeneticsGamete,
    secondGamete: GeneticsGamete,
    seed: string,
  ): S;
}
