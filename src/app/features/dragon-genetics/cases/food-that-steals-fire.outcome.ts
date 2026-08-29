import { ProteinRescueEvidenceDraft } from '../orchestration/dragon-lesson-evidence.models';
import { DracaseGenotype } from '../workstations/protein-rescue/protein-rescue.models';
import { DragonCaseOutcome, DragonCasePlan } from './dragon-case.models';

export function evaluateFoodThatStealsFirePlan(
  plan: DragonCasePlan,
  evidence: ProteinRescueEvidenceDraft,
  nowIso = new Date().toISOString(),
): DragonCaseOutcome {
  const inferredGenotype = genotypeFromSamples(evidence);
  const genotypeSupported = inferredGenotype === evidence.claimedGenotype;
  const supportedDiet = evidence.recommendedFoodIds.some((foodId) =>
    evidence.digestionTrials.some(
      (trial) =>
        trial.foodId === foodId &&
        trial.energy === 'steady' &&
        trial.result !== 'undigested',
    ),
  );
  const rejectsRepairClaim = plan.claimReview === 'contradicted';
  const compatible = genotypeSupported && supportedDiet && rejectsRepairClaim;
  const missing: string[] = [];
  if (!genotypeSupported) missing.push(`the sample evidence supports ${inferredGenotype}`);
  if (!supportedDiet) missing.push('the recommended diet lacks a steady-energy trial');
  if (!rejectsRepairClaim) missing.push('the food trial does not show that DNA was repaired');

  return {
    id: `${plan.id}:outcome`,
    caseId: plan.caseId,
    planId: plan.id,
    reasoning: compatible ? 'supported' : 'unsupported',
    patientOutcome: compatible ? 'recovering' : 'diet-paused',
    compatible,
    explanation: compatible
      ? `${evidence.patientName}'s two chromosome records support ${inferredGenotype}. The recorded diet trial keeps energy steady by reducing or pre-splitting Dracose; it manages exposure without changing the gene.`
      : `Fen preserves the record but requests a revision: ${missing.join('; ')}. The laboratory evidence remains attached.`,
    resolvedAtIso: nowIso,
  };
}

function genotypeFromSamples(evidence: ProteinRescueEvidenceDraft): DracaseGenotype {
  const workingCopies = evidence.sampleEvidence.filter((sample) => sample.enzymeWorks).length;
  if (workingCopies === 2) return 'DD';
  if (workingCopies === 1) return 'Dd';
  return 'dd';
}
