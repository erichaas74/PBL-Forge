import { ProteinRescueEvidenceDraft } from '../orchestration/dragon-lesson-evidence.models';
import { DragonCasePlan } from './dragon-case.models';
import { evaluateFoodThatStealsFirePlan } from './food-that-steals-fire.outcome';

describe('Food That Steals Fire outcome', () => {
  const plan: DragonCasePlan = {
    id: 'food-plan-1',
    caseId: 'food-that-steals-fire',
    rescueEvidenceId: 'molecular-record',
    citedEvidenceIds: ['molecular-record'],
    diagnosis: 'Both copies stop early, so the patient makes no working Dracase.',
    recommendation: 'Use Emberroot stew and avoid intact Dracose.',
    claimReview: 'contradicted',
    lockedAtIso: '2026-08-23T12:00:00.000Z',
  };

  it('starts recovery when the molecular claim and tested diet agree', () => {
    const outcome = evaluateFoodThatStealsFirePlan(
      plan,
      evidence(),
      '2026-08-23T12:01:00.000Z',
    );

    expect(outcome.compatible).toBe(true);
    expect(outcome.patientOutcome).toBe('recovering');
    expect(outcome.explanation).toContain('without changing the gene');
  });

  it('requests revision when a recommended diet has no supporting trial', () => {
    const unsupported = {
      ...evidence(),
      recommendedFoodIds: ['moonmilk'] as const,
    };

    const outcome = evaluateFoodThatStealsFirePlan(plan, unsupported);

    expect(outcome.compatible).toBe(false);
    expect(outcome.patientOutcome).toBe('diet-paused');
    expect(outcome.explanation).toContain('steady-energy trial');
  });
});

function evidence(): ProteinRescueEvidenceDraft {
  return {
    evidenceType: 'protein-rescue',
    workstationId: 'protein-rescue',
    recordId: 'record-1',
    patientId: 'tide',
    patientName: 'Tide',
    sampleEvidence: [
      {
        sampleCode: 'CHR4-A',
        codingDna: 'ATGTTTTAGAAACCT',
        templateDna: 'TACAAAATCTTTGGA',
        mrna: 'AUGUUUUAGAAACCU',
        aminoAcids: ['Met', 'Phe'],
        stoppedEarly: true,
        enzymeWorks: false,
      },
      {
        sampleCode: 'CHR4-B',
        codingDna: 'ATGTTTTAGAAACCT',
        templateDna: 'TACAAAATCTTTGGA',
        mrna: 'AUGUUUUAGAAACCU',
        aminoAcids: ['Met', 'Phe'],
        stoppedEarly: true,
        enzymeWorks: false,
      },
    ],
    digestionTrials: [
      {
        id: 'trial-1',
        foodId: 'emberroot-stew',
        foodName: 'Emberroot meat stew',
        result: 'no-dracose',
        sugarSplit: false,
        energy: 'steady',
        symptoms: 'No symptoms.',
        explanation: 'No Dracose enters the gut.',
        testedAtIso: '2026-08-23T11:59:00.000Z',
      },
    ],
    claimedGenotype: 'dd',
    recommendedFoodIds: ['emberroot-stew'],
    explanation: 'Both early stops prevent working Dracase, so remove Dracose exposure.',
  };
}
