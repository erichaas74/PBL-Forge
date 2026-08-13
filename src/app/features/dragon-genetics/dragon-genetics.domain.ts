import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  breedLabClutch,
  createEducationalAssembly,
  createVisualGenome,
} from './simulation/domain/dragon-inheritance';
import {
  DragonOffspring,
  DragonParentProfile,
  DragonTraitId,
} from './simulation/domain/dragon-lab.models';
import { BatchObservation, StudentDragonRecord } from './dragon-genetics.models';

export function findParent(parentId: string): DragonParentProfile {
  return DRAGON_PARENTS.find((parent) => parent.id === parentId) ?? DRAGON_PARENTS[0];
}

export function runDragonBatch(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  run: number,
  size: number,
): BatchObservation {
  const offspring = breedLabClutch(parentA, parentB, run, size);
  const dominantCounts = Object.fromEntries(
    DRAGON_TRAITS.map((trait) => [
      trait.id,
      offspring.filter((dragon) => dragon.genome[trait.id].includes(trait.dominantAllele)).length,
    ]),
  ) as Record<DragonTraitId, number>;

  return {
    size,
    run,
    dominantCounts,
    sample: offspring.slice(0, 12).map(toStudentDragonRecord),
  };
}

export function toStudentDragonRecord(dragon: DragonOffspring): StudentDragonRecord {
  return {
    id: dragon.id,
    name: dragon.name,
    title: dragon.title,
    color: dragon.color,
    accentColor: dragon.accentColor,
    genome: dragon.genome,
    parentIds: dragon.parentIds,
    generation: dragon.generation,
  };
}

export function materializeDragon(record: StudentDragonRecord): DragonOffspring {
  const identity = { color: record.color, accentColor: record.accentColor };
  const engineGenome = createVisualGenome(record.id, record.genome, record.generation, identity);
  const build = createEducationalAssembly(record.genome, engineGenome, identity);
  return {
    ...record,
    engineGenome,
    assembly: build.assembly,
    combatProfile: build.combatProfile,
  };
}
