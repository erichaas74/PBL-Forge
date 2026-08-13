import {
  DRAGON_TRAITS,
  buildPunnettCells,
  breedLabOffspringProfiles,
  genotypeLabel,
  phenotypeLabel,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonBredProfile,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import {
  VisiblePhenotypeForm,
  visiblePhenotypeFormId,
  visiblePhenotypeForms,
} from '../shared/visible-phenotype';
import {
  IncubatorBatchRecord,
  IncubatorOffspringObservation,
  IncubatorPhenotypeResult,
  IncubatorSamplerSnapshot,
} from './incubator-sampler.models';

export type IncubatorPhenotypeOption = VisiblePhenotypeForm;

export interface MaterializedIncubatorBatch {
  record: IncubatorBatchRecord;
  offspring: readonly DragonBredProfile[];
}

export interface RebuiltIncubatorLineage {
  specimens: ReadonlyMap<string, DragonParentProfile>;
  batches: ReadonlyMap<string, MaterializedIncubatorBatch>;
}

/** Visible categories come from the shared trait catalog, never from workstation copy. */
export function phenotypeOptions(traitId: DragonTraitId): readonly IncubatorPhenotypeOption[] {
  return visiblePhenotypeForms(traitId);
}

export function visiblePhenotypeId(dragon: DragonParentProfile, traitId: DragonTraitId): string {
  return visiblePhenotypeFormId(dragon.genome, traitId);
}

export function buildIncubatorBatch(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  traitId: DragonTraitId,
  generation: number,
  runNumber: number,
  size: number,
  createdAtIso = new Date().toISOString(),
): MaterializedIncubatorBatch {
  return buildIncubatorPoolBatch(
    [parentA, parentB],
    traitId,
    generation,
    runNumber,
    size,
    createdAtIso,
  );
}

/**
 * Breeds a population without favoring two representatives. Parent slots cycle through the
 * complete pool, so contribution counts differ by at most one. Shared Punnett cells allocate the
 * selected trait's hidden inheritance as closely as the clutch size permits; this instrument
 * records only the resulting visible forms.
 */
export function buildIncubatorPoolBatch(
  breedingPool: readonly DragonParentProfile[],
  traitId: DragonTraitId,
  generation: number,
  runNumber: number,
  size: number,
  createdAtIso = new Date().toISOString(),
): MaterializedIncubatorBatch {
  if (breedingPool.length < 2) {
    throw new Error('An incubator breeding pool requires at least two dragons.');
  }
  const id = `incubator-g${generation}-r${runNumber}`;
  const offspring = breedBalancedPunnettPool(breedingPool, traitId, runNumber, size).map(
    (dragon, index) => ({
      ...dragon,
      id: `${id}-offspring-${index + 1}`,
      name: `Hatchling ${index + 1}`,
      title: `Generation ${generation}`,
      generation,
    }),
  );
  const observations = offspring.map((dragon) => observationFor(dragon, traitId));
  const record: IncubatorBatchRecord = {
    id,
    generation,
    runNumber,
    parentIds: [breedingPool[0].id, breedingPool[1].id],
    breedingPoolIds: breedingPool.map((parent) => parent.id),
    inheritanceModel: 'balanced-punnett-v2',
    traitId,
    size,
    offspring: observations,
    results: summarizePhenotypes(observations, traitId),
    selectedForLaterBreedingIds: [],
    createdAtIso,
  };
  return { record, offspring };
}

export function materializeIncubatorBatch(
  record: IncubatorBatchRecord,
  breedingPool: readonly DragonParentProfile[],
): MaterializedIncubatorBatch {
  const regenerated = buildIncubatorPoolBatch(
    breedingPool,
    record.traitId,
    record.generation,
    record.runNumber,
    record.size,
    record.createdAtIso,
  );
  return {
    record,
    offspring: regenerated.offspring.map((dragon, index) => ({
      ...dragon,
      id: record.offspring[index]?.id ?? dragon.id,
    })),
  };
}

export function rebuildIncubatorLineage(
  snapshot: IncubatorSamplerSnapshot,
  founders: readonly DragonParentProfile[],
): RebuiltIncubatorLineage {
  const specimens = new Map(founders.map((dragon) => [dragon.id, dragon]));
  const batches = new Map<string, MaterializedIncubatorBatch>();

  for (const record of snapshot.batches) {
    const poolIds = record.breedingPoolIds.length ? record.breedingPoolIds : record.parentIds;
    const breedingPool = poolIds
      .map((id) => specimens.get(id))
      .filter((parent): parent is DragonParentProfile => Boolean(parent));
    if (breedingPool.length !== poolIds.length || breedingPool.length < 2) continue;
    const materialized = materializeIncubatorBatch(record, breedingPool);
    batches.set(record.id, materialized);
    for (const offspring of materialized.offspring) specimens.set(offspring.id, offspring);
  }

  return { specimens, batches };
}

function breedBalancedPunnettPool(
  breedingPool: readonly DragonParentProfile[],
  traitId: DragonTraitId,
  runNumber: number,
  size: number,
): readonly DragonBredProfile[] {
  const groupPositions = new Map<string, number>();
  const groupCells = new Map<string, ReturnType<typeof buildPunnettCells>>();
  const pairs = createEvenMixingPairs(breedingPool, runNumber, size);

  return pairs.map(([parentA, parentB], index) => {
    const dragon = breedLabOffspringProfiles(parentA, parentB, runNumber * 1000 + index, 1)[0];
    const groupKey = [
      genotypeLabel(parentA.genome[traitId]),
      genotypeLabel(parentB.genome[traitId]),
    ]
      .sort()
      .join(':');
    const cells = groupCells.get(groupKey) ?? buildPunnettCells(parentA, parentB, traitId);
    groupCells.set(groupKey, cells);
    const position = groupPositions.get(groupKey) ?? 0;
    const rotation = stableHash(`${groupKey}:${runNumber}`) % cells.length;
    const inheritedGenotype = cells[(position + rotation) % cells.length].genotype;
    groupPositions.set(groupKey, position + 1);

    return {
      ...dragon,
      genome: {
        ...dragon.genome,
        [traitId]: inheritedGenotype,
      },
    };
  });
}

/**
 * Chooses distinct mate pairs so individual contributions stay balanced first and every possible
 * pair is used as evenly as the clutch size permits second.
 */
function createEvenMixingPairs(
  breedingPool: readonly DragonParentProfile[],
  runNumber: number,
  size: number,
): readonly (readonly [DragonParentProfile, DragonParentProfile])[] {
  const candidates: (readonly [DragonParentProfile, DragonParentProfile])[] = [];
  for (let left = 0; left < breedingPool.length; left += 1) {
    for (let right = left + 1; right < breedingPool.length; right += 1) {
      candidates.push([breedingPool[left], breedingPool[right]]);
    }
  }

  const contributions = new Map(breedingPool.map((parent) => [parent.id, 0]));
  const pairUses = new Map(candidates.map((pair) => [pairKey(pair), 0]));
  const rotation =
    stableHash(`${breedingPool.map((parent) => parent.id).join(':')}:${runNumber}:pairs`) %
    candidates.length;
  const selected: (readonly [DragonParentProfile, DragonParentProfile])[] = [];

  for (let offspringIndex = 0; offspringIndex < size; offspringIndex += 1) {
    const ranked = candidates.map((pair, candidateIndex) => {
      const nextContributions = breedingPool.map((parent) => {
        const increment = pair.some((member) => member.id === parent.id) ? 1 : 0;
        return (contributions.get(parent.id) ?? 0) + increment;
      });
      return {
        pair,
        spread: Math.max(...nextContributions) - Math.min(...nextContributions),
        uses: pairUses.get(pairKey(pair)) ?? 0,
        contributionTotal:
          (contributions.get(pair[0].id) ?? 0) + (contributions.get(pair[1].id) ?? 0),
        order: (candidateIndex - rotation + candidates.length) % candidates.length,
      };
    });
    ranked.sort(
      (left, right) =>
        left.uses - right.uses ||
        left.spread - right.spread ||
        left.contributionTotal - right.contributionTotal ||
        left.order - right.order,
    );
    const pair = ranked[0].pair;
    selected.push(pair);
    contributions.set(pair[0].id, (contributions.get(pair[0].id) ?? 0) + 1);
    contributions.set(pair[1].id, (contributions.get(pair[1].id) ?? 0) + 1);
    pairUses.set(pairKey(pair), (pairUses.get(pairKey(pair)) ?? 0) + 1);
  }

  return selected;
}

function pairKey(pair: readonly [DragonParentProfile, DragonParentProfile]): string {
  return [pair[0].id, pair[1].id].sort().join(':');
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function parentVisibleTraits(
  dragon: DragonParentProfile,
): readonly { label: string; value: string }[] {
  return DRAGON_TRAITS.map((trait) => ({
    label: trait.name,
    value: phenotypeLabel(dragon, trait.id),
  }));
}

function observationFor(
  dragon: DragonBredProfile,
  traitId: DragonTraitId,
): IncubatorOffspringObservation {
  return {
    id: dragon.id,
    phenotypeId: visiblePhenotypeId(dragon, traitId),
    phenotypeLabel: phenotypeLabel(dragon, traitId),
  };
}

function summarizePhenotypes(
  offspring: readonly IncubatorOffspringObservation[],
  traitId: DragonTraitId,
): readonly IncubatorPhenotypeResult[] {
  return phenotypeOptions(traitId).map((option) => {
    const matching = offspring.filter((dragon) => dragon.phenotypeId === option.id);
    return {
      ...option,
      count: matching.length,
      percentage: offspring.length ? Math.round((matching.length / offspring.length) * 100) : 0,
      offspringIds: matching.map((dragon) => dragon.id),
    };
  });
}
