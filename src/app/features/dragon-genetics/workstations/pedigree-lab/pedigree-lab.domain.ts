import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { PedigreeDeduction, observedPhenotypeOf, truePhenotype } from './pedigree-deduction';
import {
  ARCHIVE_YEAR,
  BloodlineInvestigation,
  PEDIGREE_GENE_IDS,
  PedigreeDragon,
  PedigreeGenome,
  PedigreeHatchRecord,
  PedigreePopulation,
  pedigreeGene,
} from './pedigree-lab.models';
import { normalizePair, stableHash, transmissibleAlleles } from './pedigree-population';

/** Descendants of one dragon, excluding the dragon itself. */
export function descendantIds(
  population: PedigreePopulation,
  ancestorId: string,
): ReadonlySet<string> {
  const byId = new Map(population.map((dragon) => [dragon.id, dragon]));
  const found = new Set<string>();
  const queue = [ancestorId];
  while (queue.length) {
    const current = byId.get(queue.shift() as string);
    if (!current) continue;
    for (const childId of current.offspringIds) {
      if (found.has(childId)) continue;
      found.add(childId);
      queue.push(childId);
    }
  }
  return found;
}

/** Ancestors of one dragon, excluding the dragon itself. */
export function ancestorIds(
  population: PedigreePopulation,
  dragonId: string,
): ReadonlySet<string> {
  const byId = new Map(population.map((dragon) => [dragon.id, dragon]));
  const found = new Set<string>();
  const queue = [dragonId];
  while (queue.length) {
    const current = byId.get(queue.shift() as string);
    if (!current) continue;
    for (const parentId of [current.motherId, current.fatherId]) {
      if (!parentId || found.has(parentId)) continue;
      found.add(parentId);
      queue.push(parentId);
    }
  }
  return found;
}

/**
 * The shortest recorded line of descent from a dragon back to an ancestor.
 *
 * Returned oldest-first so the display reads the way the story does: legendary
 * dragon at the top, the dragon in front of the student at the bottom.
 */
export function lineToAncestor(
  population: PedigreePopulation,
  dragonId: string,
  ancestorId: string,
): readonly string[] {
  const byId = new Map(population.map((dragon) => [dragon.id, dragon]));
  const cameFrom = new Map<string, string>();
  const seen = new Set([dragonId]);
  const queue = [dragonId];

  while (queue.length) {
    const currentId = queue.shift() as string;
    if (currentId === ancestorId) {
      const path = [currentId];
      let cursor = currentId;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor) as string;
        path.push(cursor);
      }
      return path;
    }
    const current = byId.get(currentId);
    if (!current) continue;
    for (const parentId of [current.motherId, current.fatherId]) {
      if (!parentId || seen.has(parentId)) continue;
      seen.add(parentId);
      cameFrom.set(parentId, currentId);
      queue.push(parentId);
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Relatedness
// ---------------------------------------------------------------------------

export type RelatednessLevel = 'unrelated' | 'distant' | 'close' | 'very-close';

export interface RelatednessAssessment {
  /** Kinship of the pair, which is the inbreeding coefficient of any clutch they produce. */
  coefficient: number;
  percent: number;
  level: RelatednessLevel;
  label: string;
  detail: string;
}

/**
 * Kinship: the chance that an allele drawn from each dragon at the same locus is
 * a copy of one ancestral allele.
 *
 * The standard recursion, walking the younger dragon up to its parents until the
 * two lines meet. It is the number the breeding board needs, because the kinship
 * of a pair *is* the inbreeding coefficient of their offspring.
 */
export function kinshipCoefficient(
  population: PedigreePopulation,
  firstId: string,
  secondId: string,
): number {
  const byId = new Map(population.map((dragon) => [dragon.id, dragon]));
  const memo = new Map<string, number>();

  const kinship = (leftId: string | null, rightId: string | null): number => {
    if (!leftId || !rightId) return 0;
    const left = byId.get(leftId);
    const right = byId.get(rightId);
    if (!left || !right) return 0;

    const cacheKey = leftId < rightId ? `${leftId}|${rightId}` : `${rightId}|${leftId}`;
    const cached = memo.get(cacheKey);
    if (cached !== undefined) return cached;

    let value: number;
    if (leftId === rightId) {
      value = 0.5 * (1 + kinship(left.motherId, left.fatherId));
    } else {
      // Always recurse on the younger dragon, so the walk terminates at founders.
      const [younger, older] =
        left.generation >= right.generation ? [left, right] : [right, left];
      value = 0.5 * (kinship(younger.motherId, older.id) + kinship(younger.fatherId, older.id));
    }
    memo.set(cacheKey, value);
    return value;
  };

  return kinship(firstId, secondId);
}

export function assessRelatedness(
  population: PedigreePopulation,
  firstId: string,
  secondId: string,
): RelatednessAssessment {
  const coefficient = kinshipCoefficient(population, firstId, secondId);
  const percent = Math.round(coefficient * 1000) / 10;

  if (coefficient >= 0.125) {
    return {
      coefficient,
      percent,
      level: 'very-close',
      label: 'Very close relatives',
      detail:
        'These two share recent ancestors on both sides. A clutch from this pair is strongly inbred: every rare recessive in the line, wanted or not, gets a second chance to pair up.',
    };
  }
  if (coefficient >= 0.0625) {
    return {
      coefficient,
      percent,
      level: 'close',
      label: 'Close relatives',
      detail:
        'Roughly first-cousin territory. It raises the chance of recovering the traced allele and the chance of exposing a harmful one at the same rate.',
    };
  }
  if (coefficient > 0) {
    return {
      coefficient,
      percent,
      level: 'distant',
      label: 'Distant relatives',
      detail: 'A shared ancestor several generations back. Modest effect on genetic diversity.',
    };
  }
  return {
    coefficient,
    percent,
    level: 'unrelated',
    label: 'No shared recorded ancestor',
    detail: 'Nothing in the register links these two lines.',
  };
}

// ---------------------------------------------------------------------------
// Bloodline readouts
// ---------------------------------------------------------------------------

export interface BloodlineStats {
  ancestorId: string;
  /** The last year the archive records the lost appearance, or null if never. */
  lastObservedYear: number | null;
  yearsSinceObserved: number | null;
  lastObservedDragonId: string | null;
  recordedDescendants: number;
  livingDescendants: number;
  confirmedCarriers: number;
  possibleCarriers: number;
  eliminated: number;
  sequenced: number;
}

export function bloodlineStats(
  population: PedigreePopulation,
  investigation: BloodlineInvestigation,
  deduction: PedigreeDeduction | null,
): BloodlineStats {
  const descendants = descendantIds(population, investigation.ancestorId);
  const lineage = population.filter(
    (dragon) => descendants.has(dragon.id) || dragon.id === investigation.ancestorId,
  );

  let lastObservedYear: number | null = null;
  let lastObservedDragonId: string | null = null;
  for (const dragon of population) {
    if (observedPhenotypeOf(dragon, investigation.geneId) !== investigation.lostPhenotype) continue;
    const year = dragon.deathYear ?? ARCHIVE_YEAR;
    if (lastObservedYear === null || year > lastObservedYear) {
      lastObservedYear = year;
      lastObservedDragonId = dragon.id;
    }
  }

  let confirmedCarriers = 0;
  let possibleCarriers = 0;
  let eliminated = 0;
  let sequenced = 0;
  for (const dragon of lineage) {
    const state = deduction?.states.get(dragon.id);
    if (!state) continue;
    if (state.sequenced) sequenced += 1;
    if (state.status === 'confirmed-carrier') confirmedCarriers += 1;
    if (state.status === 'possible-carrier') possibleCarriers += 1;
    if (state.status === 'eliminated') eliminated += 1;
  }

  return {
    ancestorId: investigation.ancestorId,
    lastObservedYear,
    yearsSinceObserved: lastObservedYear === null ? null : ARCHIVE_YEAR - lastObservedYear,
    lastObservedDragonId,
    recordedDescendants: descendants.size,
    livingDescendants: lineage.filter((dragon) => dragon.alive && dragon.id !== investigation.ancestorId)
      .length,
    confirmedCarriers,
    possibleCarriers,
    eliminated,
    sequenced,
  };
}

/**
 * Folds student-hatched dragons back into the archive.
 *
 * A hatchling that is not linked into its parents' `offspringIds` is invisible
 * to every pedigree walk in this module — it would not appear under its parents
 * on the canvas, would not count as a descendant of the legendary ancestor, and
 * would not affect a later relatedness calculation. Linking it here is what
 * makes a recovered dragon genuinely part of the bloodline.
 */
export function mergeHatchlings(
  archive: PedigreePopulation,
  hatchlings: readonly PedigreeDragon[],
): PedigreePopulation {
  if (!hatchlings.length) return archive;

  const byId = new Map<string, PedigreeDragon>();
  for (const dragon of [...archive, ...hatchlings]) {
    byId.set(dragon.id, {
      ...dragon,
      mateIds: [...dragon.mateIds],
      offspringIds: [...dragon.offspringIds],
    });
  }

  for (const hatchling of hatchlings) {
    const mother = hatchling.motherId ? byId.get(hatchling.motherId) : undefined;
    const father = hatchling.fatherId ? byId.get(hatchling.fatherId) : undefined;
    for (const parent of [mother, father]) {
      if (!parent || parent.offspringIds.includes(hatchling.id)) continue;
      byId.set(parent.id, {
        ...parent,
        offspringIds: [...parent.offspringIds, hatchling.id],
      });
    }
    if (mother && father) {
      linkMates(byId, mother.id, father.id);
      linkMates(byId, father.id, mother.id);
    }
  }

  return [...byId.values()].sort(
    (left, right) => left.generation - right.generation || left.birthYear - right.birthYear,
  );
}

function linkMates(byId: Map<string, PedigreeDragon>, dragonId: string, mateId: string): void {
  const dragon = byId.get(dragonId);
  if (!dragon || dragon.mateIds.includes(mateId)) return;
  byId.set(dragonId, { ...dragon, mateIds: [...dragon.mateIds, mateId] });
}

// ---------------------------------------------------------------------------
// Breeding
// ---------------------------------------------------------------------------

export interface BreedingRequest {
  investigationId: string;
  investigation: BloodlineInvestigation;
  population: PedigreePopulation;
  mother: PedigreeDragon;
  father: PedigreeDragon;
  attempt: number;
  clutchSize: number;
  predictedPercent: number;
}

export interface BreedingOutcome {
  hatchlings: readonly PedigreeDragon[];
  record: PedigreeHatchRecord;
}

const HATCHLING_NAMES = [
  'Ylva',
  'Sten',
  'Rask',
  'Nari',
  'Odd',
  'Vike',
  'Sif',
  'Bram',
  'Kori',
  'Tove',
  'Hrut',
  'Eira',
] as const;

/**
 * One clutch, hatched egg by egg.
 *
 * Every egg samples the parents independently, which is the entire reason this
 * exists as a simulation rather than a ratio: a 25% cross can and does produce
 * four eggs with nothing in them. Students who expected the prediction to be a
 * guarantee find out here, and can try the same pair again.
 */
export function breedClutch(request: BreedingRequest): BreedingOutcome {
  const { investigation, mother, father, attempt, clutchSize } = request;
  const hatchlings: PedigreeDragon[] = [];

  for (let index = 0; index < clutchSize; index += 1) {
    const id = `hatch-${request.investigationId}-${attempt}-${index + 1}`;
    const sex: DragonSex = stableHash(`${id}:sex`) % 2 === 0 ? 'female' : 'male';
    const genome = Object.fromEntries(
      PEDIGREE_GENE_IDS.map((geneId) => {
        const maternal = transmissibleAlleles(geneId, mother, sex, 'mother');
        const paternal = transmissibleAlleles(geneId, father, sex, 'father');
        return [
          geneId,
          normalizePair(geneId, [
            maternal[stableHash(`${id}:${geneId}:m`) % maternal.length],
            paternal[stableHash(`${id}:${geneId}:p`) % paternal.length],
          ]),
        ];
      }),
    ) as PedigreeGenome;

    hatchlings.push({
      id,
      name: HATCHLING_NAMES[stableHash(`${id}:name`) % HATCHLING_NAMES.length],
      epithet: `of clutch ${attempt}`,
      sex,
      bloodline: mother.bloodline,
      breed: father.breed,
      generation: Math.max(mother.generation, father.generation) + 1,
      birthYear: ARCHIVE_YEAR + attempt,
      deathYear: null,
      alive: true,
      motherId: mother.id,
      fatherId: father.id,
      mateIds: [],
      offspringIds: [],
      genome,
      dnaAvailable: true,
      recordedGeneIds: [...PEDIGREE_GENE_IDS],
      legendary: false,
      historicalNote: null,
      achievements: [],
      origin: 'hatched',
    });
  }

  const recovered = hatchlings.filter(
    (hatchling) =>
      truePhenotype(investigation.geneId, hatchling.genome[investigation.geneId]) ===
      investigation.lostPhenotype,
  );
  const riskGeneId = investigation.riskGeneId;
  const riskPhenotype = riskGeneId ? pedigreeGene(riskGeneId).recessivePhenotype : null;
  const affectedByRisk =
    riskGeneId && riskPhenotype
      ? hatchlings.filter(
          (hatchling) =>
            truePhenotype(riskGeneId, hatchling.genome[riskGeneId]) === riskPhenotype,
        ).length
      : 0;

  return {
    hatchlings,
    record: {
      id: `clutch-${request.investigationId}-${attempt}`,
      investigationId: request.investigationId,
      motherId: mother.id,
      motherName: mother.name,
      fatherId: father.id,
      fatherName: father.name,
      attempt,
      inbreedingCoefficient: kinshipCoefficient(request.population, mother.id, father.id),
      predictedPercent: request.predictedPercent,
      observedPercent: Math.round((100 * recovered.length) / Math.max(clutchSize, 1)),
      recoveredCount: recovered.length,
      affectedByRiskCount: affectedByRisk,
      hatchlingIds: hatchlings.map((hatchling) => hatchling.id),
      hatchedAtIso: new Date().toISOString(),
    },
  };
}
