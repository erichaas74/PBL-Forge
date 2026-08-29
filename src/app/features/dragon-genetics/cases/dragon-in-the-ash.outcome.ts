import { BloodTestEvidenceDraft } from '../orchestration/dragon-lesson-evidence.models';
import {
  BLOOD_TYPE_DEFINITIONS,
  BloodMarker,
} from '../workstations/blood-compatibility/blood-compatibility.models';
import { DragonCaseOutcome, DragonCasePlan } from './dragon-case.models';

export function evaluateDragonInTheAshPlan(
  plan: DragonCasePlan,
  patient: BloodTestEvidenceDraft,
  donor: BloodTestEvidenceDraft,
  nowIso = new Date().toISOString(),
): DragonCaseOutcome {
  const patientMarkers = new Set(markersFor(patient.phenotypeId));
  const unfamiliarMarkers = markersFor(donor.phenotypeId).filter(
    (marker) => !patientMarkers.has(marker),
  );
  const compatible = unfamiliarMarkers.length === 0;
  return {
    id: `${plan.id}:outcome`,
    caseId: plan.caseId,
    planId: plan.id,
    reasoning: compatible ? 'supported' : 'unsupported',
    patientOutcome: compatible ? 'stable' : 'treatment-paused',
    compatible,
    explanation: compatible
      ? `${donor.dragonName}'s ${donor.phenotypeName} cells introduce no unfamiliar A, B, or D markers. Treatment begins and the foundling stabilizes.`
      : `${donor.dragonName}'s cells carry unfamiliar ${unfamiliarMarkers.map((marker) => marker.toUpperCase()).join(' and ')} markers. Bryn pauses treatment and returns the case for revision.`,
    resolvedAtIso: nowIso,
  };
}

function markersFor(phenotypeId: BloodTestEvidenceDraft['phenotypeId']): readonly BloodMarker[] {
  return BLOOD_TYPE_DEFINITIONS.find((definition) => definition.id === phenotypeId)?.markers ?? [];
}
