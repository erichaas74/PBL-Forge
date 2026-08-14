import { BloodEmergencyRecord } from './blood-compatibility.models';
import { BloodCompatibilityRepository } from './blood-compatibility.repository';

describe('BloodCompatibilityRepository', () => {
  let repository: BloodCompatibilityRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new BloodCompatibilityRepository();
  });

  it('persists complete emergency evidence under the current student identity', () => {
    const record = emergencyRecord('record-one');

    repository.save('student-a', record);

    expect(repository.load('student-a')).toEqual([record]);
    expect(repository.load('student-b')).toEqual([]);
  });

  it('ignores malformed device data instead of breaking the workstation', () => {
    localStorage.setItem(
      'pbl-forge.dragon-genetics.blood-emergencies.v1.student-a',
      JSON.stringify({ schemaVersion: 1, records: [{ id: 'incomplete' }] }),
    );

    expect(repository.load('student-a')).toEqual([]);
  });
});

function emergencyRecord(id: string): BloodEmergencyRecord {
  const testedAtIso = '2026-08-13T12:00:00.000Z';
  return {
    id,
    patientId: 'ember',
    patientName: 'Ember',
    patientSampleCode: 'PT-01',
    patientPhenotype: 'ab-positive',
    patientPossibleGenotypes: ['AB'],
    donorId: 'clinic-cinder',
    donorName: 'Cinder',
    donorSampleCode: 'DN-01',
    donorPhenotype: 'o-positive',
    donorPossibleGenotypes: ['OO'],
    patientTest: {
      specimenId: 'patient:ember',
      sampleCode: 'PT-01',
      antiA: true,
      antiB: true,
      testedAtIso,
    },
    donorTest: {
      specimenId: 'clinic-cinder',
      sampleCode: 'DN-01',
      antiA: false,
      antiB: false,
      testedAtIso,
    },
    transfusionTrials: [
      {
        id: 'trial-one',
        donorId: 'clinic-cinder',
        donorName: 'Cinder',
        compatible: true,
        unfamiliarMarkers: [],
        mode: 'standard',
        unitConsumed: false,
        testedAtIso,
      },
    ],
    mode: 'standard',
    supplyNote: 'Reusable teaching supply.',
    codominantAlleles: ['A', 'B'],
    explanation: 'The donor cells add no unfamiliar markers to the patient circulation.',
    savedAtIso: testedAtIso,
  };
}
