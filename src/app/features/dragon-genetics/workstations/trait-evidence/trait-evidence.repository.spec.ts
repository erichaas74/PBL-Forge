import { TestBed } from '@angular/core/testing';
import { TraitEvidenceRepository, emptyTraitEvidenceSnapshot } from './trait-evidence.repository';

describe('TraitEvidenceRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
  });

  it('keeps separate device records for separate students', () => {
    const repository = TestBed.inject(TraitEvidenceRepository);
    repository.save({
      ...emptyTraitEvidenceSnapshot('student-a'),
      observedCharacteristicIds: ['wings'],
      updatedAtIso: '2026-08-14T00:00:00.000Z',
    });

    expect(repository.load('student-a').observedCharacteristicIds).toEqual(['wings']);
    expect(repository.load('student-b').observedCharacteristicIds).toEqual([]);
  });
});
