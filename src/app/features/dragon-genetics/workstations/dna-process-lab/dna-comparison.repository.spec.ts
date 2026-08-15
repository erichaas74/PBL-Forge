import { TestBed } from '@angular/core/testing';
import { DnaComparisonRepository } from './dna-comparison.repository';

describe('DnaComparisonRepository', () => {
  const studentId = 'dna-comparison-repository-spec';
  const storageKey = `pbl-forge.dragon-genetics.dna-comparison-lab.v2:${studentId}`;
  let repository: DnaComparisonRepository;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    repository = TestBed.inject(DnaComparisonRepository);
  });

  afterEach(() => localStorage.removeItem(storageKey));

  it('round-trips one student comparison record', () => {
    repository.save(studentId, {
      scope: 'chromosome',
      specimenAId: 'a',
      specimenBId: 'b',
      workingSequences: { case: 'ATGC' },
      evidence: [],
    });

    expect(repository.load(studentId)).toEqual({
      scope: 'chromosome',
      specimenAId: 'a',
      specimenBId: 'b',
      workingSequences: { case: 'ATGC' },
      evidence: [],
    });
  });

  it('ignores malformed device data', () => {
    localStorage.setItem(storageKey, '{not-json');
    expect(repository.load(studentId)).toEqual({});
  });
});
