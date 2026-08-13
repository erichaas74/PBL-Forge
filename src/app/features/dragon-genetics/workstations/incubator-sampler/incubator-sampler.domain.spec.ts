import {
  DRAGON_PARENTS,
  breedLabClutch,
  breedLabOffspringProfiles,
  genotypeLabel,
} from '../../simulation/domain/dragon-inheritance';
import {
  buildIncubatorBatch,
  buildIncubatorPoolBatch,
  phenotypeOptions,
  rebuildIncubatorLineage,
} from './incubator-sampler.domain';
import { IncubatorSamplerSnapshot } from './incubator-sampler.models';

describe('Incubator Sampler domain', () => {
  it('derives bucket labels from the shared visible trait catalog', () => {
    expect(phenotypeOptions('wings').map((category) => category.label)).toEqual([
      'Winged',
      'Wingless',
    ]);
    expect(phenotypeOptions('scales').map((category) => category.label)).toEqual([
      'Spotted scales',
      'Solid scales',
    ]);
  });

  it('builds deterministic visible observations whose bucket counts cover the batch', () => {
    const first = buildIncubatorBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 'wings', 1, 42, 25);
    const second = buildIncubatorBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 'wings', 1, 42, 25);

    expect(first.record.offspring).toEqual(second.record.offspring);
    expect(first.record.results.reduce((sum, result) => sum + result.count, 0)).toBe(25);
    expect(
      Math.abs(first.record.results.reduce((sum, result) => sum + result.percentage, 0) - 100),
    ).toBeLessThanOrEqual(1);
    expect(
      first.record.offspring.every((observation) =>
        ['Winged', 'Wingless'].includes(observation.phenotypeLabel),
      ),
    ).toBeTrue();
  });

  it('uses the lightweight breeder without changing Hatchery offspring genetics', () => {
    const profiles = breedLabOffspringProfiles(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 11, 4);
    const clutch = breedLabClutch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 11, 4);

    expect(profiles.map((dragon) => dragon.genome)).toEqual(clutch.map((dragon) => dragon.genome));
    expect(profiles.map((dragon) => dragon.color)).toEqual(clutch.map((dragon) => dragon.color));
  });

  it('mixes a bucket pool evenly while hidden inheritance determines visible outcomes', () => {
    const source = buildIncubatorBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 'wings', 1, 14, 25);
    const pool = source.offspring.slice(0, 5);
    const mixed = buildIncubatorPoolBatch(pool, 'wings', 2, 15, 50);
    const contributions = new Map(pool.map((parent) => [parent.id, 0]));
    const pairCounts = new Map<string, number>();

    for (const offspring of mixed.offspring) {
      expect(offspring.parentIds[0]).not.toBe(offspring.parentIds[1]);
      const pairKey = [...offspring.parentIds].sort().join(':');
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
      for (const parentId of offspring.parentIds) {
        contributions.set(parentId, (contributions.get(parentId) ?? 0) + 1);
      }
    }

    const counts = [...contributions.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(pairCounts.size).toBe(10);
    expect(Math.max(...pairCounts.values()) - Math.min(...pairCounts.values())).toBeLessThanOrEqual(
      1,
    );
    expect(mixed.record.breedingPoolIds).toEqual(pool.map((parent) => parent.id));
    expect(mixed.record.results.reduce((sum, result) => sum + result.count, 0)).toBe(50);
  });

  it('preserves the exact hidden Ww × ww and Ww × Ww Punnett proportions', () => {
    const firstGeneration = buildIncubatorBatch(
      DRAGON_PARENTS[0],
      DRAGON_PARENTS[1],
      'wings',
      1,
      21,
      8,
    );
    const wingedIds = new Set(
      firstGeneration.record.results.find((result) => result.label === 'Winged')?.offspringIds,
    );
    const wingedPool = firstGeneration.offspring.filter((dragon) => wingedIds.has(dragon.id));

    expect(wingedPool.length).toBe(4);
    expect(wingedPool.every((dragon) => genotypeLabel(dragon.genome.wings) === 'Ww')).toBeTrue();

    const secondGeneration = buildIncubatorPoolBatch(wingedPool, 'wings', 2, 22, 12);
    const hiddenCounts = secondGeneration.offspring.reduce<Record<string, number>>(
      (counts, dragon) => {
        const label = genotypeLabel(dragon.genome.wings);
        counts[label] = (counts[label] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(hiddenCounts).toEqual({ WW: 3, Ww: 6, ww: 3 });
    expect(
      secondGeneration.record.results.map((result) => [
        result.label,
        result.count,
        result.percentage,
      ]),
    ).toEqual([
      ['Winged', 9, 75],
      ['Wingless', 3, 25],
    ]);
  });

  it('rebuilds later-generation parents from persisted offspring IDs', () => {
    const generationOne = buildIncubatorBatch(
      DRAGON_PARENTS[0],
      DRAGON_PARENTS[1],
      'horns',
      1,
      7,
      8,
    );
    const selected = generationOne.offspring.slice(0, 4);
    const generationTwo = buildIncubatorPoolBatch(selected, 'horns', 2, 8, 4);
    const snapshot: IncubatorSamplerSnapshot = {
      schemaVersion: 2,
      studentId: 'domain-spec',
      originalParentIds: [DRAGON_PARENTS[0].id, DRAGON_PARENTS[1].id],
      activeParentIds: [selected[0].id, selected[1].id],
      activeBreedingPoolIds: selected.map((dragon) => dragon.id),
      selectedTraitId: 'horns',
      sampleSize: 4,
      nextRunNumber: 9,
      batches: [
        {
          ...generationOne.record,
          selectedForLaterBreedingIds: [selected[0].id, selected[1].id],
        },
        generationTwo.record,
      ],
    };

    const rebuilt = rebuildIncubatorLineage(snapshot, DRAGON_PARENTS);

    expect(rebuilt.specimens.has(selected[0].id)).toBeTrue();
    expect(rebuilt.batches.get(generationTwo.record.id)?.offspring.length).toBe(4);
    expect(rebuilt.batches.get(generationTwo.record.id)?.record.breedingPoolIds).toEqual(
      selected.map((dragon) => dragon.id),
    );
  });
});
