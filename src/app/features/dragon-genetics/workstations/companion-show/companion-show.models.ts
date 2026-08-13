import { MiniGeneId, MiniGenome } from './mini-dragon.genetics';

export const COMPANION_LITTER_SIZES = [4, 6, 8, 12] as const;
export type CompanionLitterSize = (typeof COMPANION_LITTER_SIZES)[number];

/**
 * One line of a student-authored breed standard: "this trait should look like
 * this."
 *
 * The target names a *visible form*, never a genotype. A breeder writing a
 * standard is describing an animal they can see, and the whole investigation
 * rests on the fact that two dragons meeting the same visible standard can still
 * produce off-standard young.
 */
export interface BreedStandardTarget {
  geneId: MiniGeneId;
  formId: string;
}

/**
 * A mini dragon living in the student's kennel.
 *
 * No colours are stored. Coat and ember colour are consequences of the pattern
 * and ember loci, so they are derived from the genome wherever they are needed —
 * a stored copy would be a second, drifting answer to a question the genome
 * already settles.
 */
export interface CompanionDragon {
  id: string;
  name: string;
  title: string;
  genome: MiniGenome;
  origin: 'founder' | 'bred';
  generation: number;
  parentIds: readonly [string, string] | null;
  litterId: string | null;
}

/**
 * A whelped litter, stored as the inputs that produced it rather than as its
 * young.
 *
 * Breeding is deterministic on `(damId, sireId, runNumber, index)`, so replaying
 * these fields rebuilds identical young. Storing the young themselves would put
 * a second copy of every genome on the device and let a saved record drift away
 * from the inheritance model that made it.
 */
export interface LitterRecord {
  id: string;
  runNumber: number;
  generation: number;
  parentIds: readonly [string, string];
  size: CompanionLitterSize;
  /** The standard in force when this litter was whelped, so history stays judged on its own terms. */
  targets: readonly BreedStandardTarget[];
  keptPupIds: readonly string[];
  whelpedAtIso: string;
}

/** A breed the student submitted to the registry, with the evidence they cited. */
export interface RegistryEntry {
  id: string;
  breedName: string;
  targets: readonly BreedStandardTarget[];
  championId: string;
  championName: string;
  citedLitterIds: readonly string[];
  claim: string;
  generations: number;
  consistencyPercent: number;
  pupsObserved: number;
  inbreedingPercent: number;
  ribbons: number;
  submittedAtIso: string;
}

export interface CompanionShowSnapshot {
  schemaVersion: 2;
  studentId: string;
  breedName: string;
  targets: readonly BreedStandardTarget[];
  /** Society founders the student brought into the kennel, in adoption order. */
  kennelFounderIds: readonly string[];
  pairIds: readonly [string | null, string | null];
  litterSize: CompanionLitterSize;
  litters: readonly LitterRecord[];
  nextRunNumber: number;
  championId: string | null;
  citedLitterIds: readonly string[];
  claim: string;
  registry: readonly RegistryEntry[];
  updatedAtIso: string;
}

export const COMPANION_DRAGON_DRAG_TYPE = 'application/x-pbl-genetics-companion-dragon';

export function parseCompanionDragonDragPayload(value: string): string | null {
  try {
    const candidate = JSON.parse(value) as { id?: unknown };
    return typeof candidate.id === 'string' ? candidate.id : null;
  } catch {
    // Native drag payloads are untrusted browser input; an invalid payload is simply ignored.
    return null;
  }
}
