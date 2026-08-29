import { BloodTestEvidenceDraft } from '../orchestration/dragon-lesson-evidence.models';
import { DragonCasePlan } from './dragon-case.models';
import { evaluateDragonInTheAshPlan } from './dragon-in-the-ash.outcome';

describe('Dragon in the Ash outcome', () => {
  const plan: DragonCasePlan = {
    id: 'plan-1',
    caseId: 'dragon-in-the-ash',
    patientEvidenceId: 'patient',
    donorEvidenceId: 'donor',
    citedEvidenceIds: ['patient', 'donor'],
    diagnosis: 'The patient has B markers and should not receive unfamiliar A markers.',
    recommendation: 'Use the supported donor.',
    lockedAtIso: '2026-08-23T12:00:00.000Z',
  };

  it('stabilizes a patient when donor markers are a compatible subset', () => {
    const outcome = evaluateDragonInTheAshPlan(
      plan,
      evidence('patient', 'b-positive', 'Moss'),
      evidence('donor', 'o-positive', 'Cinder'),
      '2026-08-23T12:01:00.000Z',
    );

    expect(outcome.compatible).toBe(true);
    expect(outcome.reasoning).toBe('supported');
    expect(outcome.patientOutcome).toBe('stable');
    expect(outcome.resolvedAtIso > plan.lockedAtIso).toBe(true);
  });

  it('pauses treatment when donor cells introduce an unfamiliar marker', () => {
    const outcome = evaluateDragonInTheAshPlan(
      plan,
      evidence('patient', 'o-positive', 'Quartz'),
      evidence('donor', 'a-positive', 'Maris'),
    );

    expect(outcome.compatible).toBe(false);
    expect(outcome.patientOutcome).toBe('treatment-paused');
    expect(outcome.explanation).toContain('A markers');
  });

  it('pauses treatment when Rh-positive donor cells introduce D to an Rh-negative patient', () => {
    const outcome = evaluateDragonInTheAshPlan(
      plan,
      evidence('patient', 'b-negative', 'Moss'),
      evidence('donor', 'o-positive', 'Cinder'),
    );

    expect(outcome.compatible).toBe(false);
    expect(outcome.explanation).toContain('D markers');
  });
});

function evidence(
  role: BloodTestEvidenceDraft['specimenRole'],
  phenotypeId: BloodTestEvidenceDraft['phenotypeId'],
  dragonName: string,
): BloodTestEvidenceDraft {
  return {
    evidenceType: 'blood-test',
    workstationId: 'blood-type-lab',
    specimenId: `${role}:${dragonName}`,
    sampleCode: role === 'patient' ? 'PT-01' : 'DN-01',
    dragonId: dragonName.toLowerCase(),
    dragonName,
    specimenRole: role,
    phenotypeId,
    phenotypeName: phenotypeId,
    antiA: phenotypeId.startsWith('a-') || phenotypeId.startsWith('ab-'),
    antiB: phenotypeId.startsWith('b-') || phenotypeId.startsWith('ab-'),
    antiD: phenotypeId.endsWith('-positive'),
  };
}
