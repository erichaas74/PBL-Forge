import { TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { buildIncubatorBatch } from './incubator-sampler.domain';
import { IncubatorSamplerRepository } from './incubator-sampler.repository';

describe('IncubatorSamplerRepository', () => {
  const studentId = 'incubator-repository-spec';
  const storageKey = `pbl-forge.dragon-genetics.incubator-sampler.v2.${studentId}`;
  const legacyStorageKey = `pbl-forge.dragon-genetics.incubator-sampler.v1.${studentId}`;
  let repository: IncubatorSamplerRepository;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
    TestBed.configureTestingModule({});
    repository = TestBed.inject(IncubatorSamplerRepository);
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
  });

  it('round-trips phenotype-only batch records and current lineage parents', () => {
    const batch = buildIncubatorBatch(
      DRAGON_PARENTS[0],
      DRAGON_PARENTS[2],
      'scales',
      1,
      3,
      12,
      '2026-08-13T12:00:00.000Z',
    );
    const selectedIds = [batch.offspring[0].id, batch.offspring[1].id] as const;
    repository.save({
      schemaVersion: 2,
      studentId,
      originalParentIds: [DRAGON_PARENTS[0].id, DRAGON_PARENTS[2].id],
      activeParentIds: selectedIds,
      activeBreedingPoolIds: batch.offspring.slice(0, 5).map((dragon) => dragon.id),
      selectedTraitId: 'scales',
      sampleSize: 12,
      nextRunNumber: 4,
      batches: [{ ...batch.record, selectedForLaterBreedingIds: selectedIds }],
    });

    const restored = repository.load(studentId);

    expect(restored.activeParentIds).toEqual(selectedIds);
    expect(restored.activeBreedingPoolIds.length).toBe(5);
    expect(restored.batches[0].results.reduce((sum, result) => sum + result.count, 0)).toBe(12);
    expect(restored.batches[0].offspring[0].phenotypeLabel).toBeTruthy();
  });

  it('falls back safely when stored data is corrupt', () => {
    localStorage.setItem(storageKey, '{not-json');
    expect(repository.load(studentId).batches).toEqual([]);
  });

  it('does not restore scientifically invalid v1 observations', () => {
    localStorage.setItem(legacyStorageKey, JSON.stringify({ schemaVersion: 1, batches: [{}] }));
    expect(repository.load(studentId).batches).toEqual([]);
  });
});
