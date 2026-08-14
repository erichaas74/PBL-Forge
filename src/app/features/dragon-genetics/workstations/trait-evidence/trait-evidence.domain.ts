import {
  TRAIT_EVIDENCE_DRAGONS,
  liveEvidence,
  observationDefinition,
  recordsForObservation,
  trialEvidence,
} from './trait-evidence.content';
import {
  TraitEvidenceClaim,
  TraitEvidenceClassification,
  TraitEvidenceKind,
  TraitEvidenceObservationId,
  TraitEvidenceSnapshot,
} from './trait-evidence.models';

export type TraitEvidenceStatus = 'not-started' | 'in-progress' | 'complete';

export function evidenceKindsForClaim(
  snapshot: TraitEvidenceSnapshot,
  specimenId: string,
  observationId: TraitEvidenceObservationId,
  evidenceIds: readonly string[],
): ReadonlySet<TraitEvidenceKind> {
  const dragon = TRAIT_EVIDENCE_DRAGONS.find((candidate) => candidate.id === specimenId);
  if (!dragon) return new Set();
  const records = [
    liveEvidence(dragon, observationId),
    ...recordsForObservation(dragon, observationId),
    ...snapshot.trials
      .filter((trial) => trial.specimenId === specimenId && trial.behaviorId === observationId)
      .map(trialEvidence),
  ];
  const selected = new Set(evidenceIds);
  return new Set(records.filter((record) => selected.has(record.id)).map((record) => record.kind));
}

export function supportsTraitEvidenceClaim(
  snapshot: TraitEvidenceSnapshot,
  specimenId: string,
  observationId: TraitEvidenceObservationId,
  classification: TraitEvidenceClassification,
  evidenceIds: readonly string[],
): boolean {
  const expected = observationDefinition(observationId).expectedClassification;
  if (classification === 'insufficient' || classification !== expected) return false;
  const kinds = evidenceKindsForClaim(snapshot, specimenId, observationId, evidenceIds);

  if (classification === 'inherited') {
    return (
      kinds.has('live-observation') && (kinds.has('hatch-record') || kinds.has('family-record'))
    );
  }
  if (classification === 'learned') {
    return kinds.has('cue-trial') && kinds.has('training-record');
  }
  return kinds.has('live-observation') && kinds.has('environment-record');
}

export function upsertTraitEvidenceClaim(
  snapshot: TraitEvidenceSnapshot,
  draft: Omit<TraitEvidenceClaim, 'supported' | 'updatedAtIso'>,
  nowIso = new Date().toISOString(),
): TraitEvidenceSnapshot {
  const claim: TraitEvidenceClaim = {
    ...draft,
    evidenceIds: [...new Set(draft.evidenceIds)],
    supported: supportsTraitEvidenceClaim(
      snapshot,
      draft.specimenId,
      draft.observationId,
      draft.classification,
      draft.evidenceIds,
    ),
    updatedAtIso: nowIso,
  };
  return {
    ...snapshot,
    claims: [
      ...snapshot.claims.filter(
        (existing) =>
          !(
            existing.specimenId === claim.specimenId &&
            existing.observationId === claim.observationId
          ),
      ),
      claim,
    ],
    updatedAtIso: nowIso,
  };
}

export function traitEvidenceStatus(snapshot: TraitEvidenceSnapshot): TraitEvidenceStatus {
  const supported = snapshot.claims.filter((claim) => claim.supported);
  if (
    supported.some((claim) => claim.classification === 'inherited') &&
    supported.some((claim) => claim.classification === 'learned') &&
    supported.some((claim) => claim.classification === 'environmental')
  ) {
    return 'complete';
  }
  return snapshot.observedCharacteristicIds.length ||
    snapshot.trials.length ||
    snapshot.claims.length
    ? 'in-progress'
    : 'not-started';
}

export function supportedClaimCount(snapshot: TraitEvidenceSnapshot): number {
  return snapshot.claims.filter((claim) => claim.supported).length;
}
