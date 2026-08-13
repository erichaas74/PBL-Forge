import { TestBed } from '@angular/core/testing';
import { ProteinRescueCaseRecord } from './protein-rescue.models';
import { ProteinRescueRepository } from './protein-rescue.repository';

describe('ProteinRescueRepository', () => {
  let repository: ProteinRescueRepository;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(ProteinRescueRepository);
  });

  it('persists case records under the current student identity', () => {
    repository.save('student-a', caseRecord('case-a'));

    expect(repository.load('student-a').map((record) => record.id)).toEqual(['case-a']);
    expect(repository.load('student-b')).toEqual([]);
  });

  it('restores a complete evidence record after creating a fresh repository', () => {
    repository.save('student-a', caseRecord('case-a'));
    const restored = new ProteinRescueRepository().load('student-a')[0];

    expect(restored.claimedGenotype).toBe('dd');
    expect(restored.sampleEvidence.length).toBe(2);
    expect(restored.digestionTrials[0].result).toBe('undigested');
  });
});

function caseRecord(id: string): ProteinRescueCaseRecord {
  return {
    id,
    patientId: 'tide',
    patientName: 'Tide',
    chartSummary: 'Digestive distress',
    observations: ['Symptoms after Moonmilk.'],
    sampleEvidence: ['CHR4-A', 'CHR4-B'].map((sampleCode) => ({
      sampleCode,
      codingDna: 'ATGTTTTAGAAACCT',
      templateDna: 'TACAAAATCTTTGGA',
      mrna: 'AUGUUUUAGAAACCU',
      aminoAcids: ['Methionine', 'Phenylalanine'],
      stoppedEarly: true,
      enzymeWorks: false,
    })),
    digestionTrials: [
      {
        id: 'moonmilk:trial',
        foodId: 'moonmilk',
        foodName: 'Moonmilk custard',
        result: 'undigested',
        sugarSplit: false,
        energy: 'reduced',
        symptoms: 'Bloating.',
        explanation: 'Dracose stayed intact.',
        testedAtIso: '2026-08-13T00:00:00.000Z',
      },
    ],
    claimedGenotype: 'dd',
    recommendedFoodIds: ['fermented-moonmilk'],
    explanation: 'Both proteins stopped early, so fermented food avoids intact Dracose.',
    savedAtIso: '2026-08-13T00:02:00.000Z',
  };
}
