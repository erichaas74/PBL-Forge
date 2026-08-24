import { TestBed } from '@angular/core/testing';
import { MicroscopeLevelEvidenceRepository } from './microscope-level-evidence.repository';

describe('MicroscopeLevelEvidenceRepository', () => {
  const studentId = 'focused-microscope-student';
  let repository: MicroscopeLevelEvidenceRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = TestBed.inject(MicroscopeLevelEvidenceRepository);
  });

  it('persists and deduplicates exploration evidence by student and level', () => {
    const evidence = {
      level: 'gene' as const,
      dragonId: 'dragon-a',
      chromosome: 'Chr 2',
      geneId: 'scales',
      alleleCopy: 0 as const,
    };

    repository.record(studentId, evidence);
    repository.record(studentId, evidence);

    expect(repository.load(studentId, 'gene')).toEqual([
      expect.objectContaining(evidence),
    ]);
    expect(repository.load(studentId, 'chromosome')).toEqual([]);
  });
});
