import {
  TRAIT_EVIDENCE_DRAGONS,
  liveEvidence,
  recordsForObservation,
} from './trait-evidence.content';
import {
  supportsTraitEvidenceClaim,
  traitEvidenceStatus,
  upsertTraitEvidenceClaim,
} from './trait-evidence.domain';
import { TraitEvidenceSnapshot, TraitEvidenceTrial } from './trait-evidence.models';
import { emptyTraitEvidenceSnapshot } from './trait-evidence.repository';

describe('Trait Evidence investigation', () => {
  it('supports an inherited claim from observation and a hatch record', () => {
    const dragon = TRAIT_EVIDENCE_DRAGONS[0];
    const evidenceIds = [
      liveEvidence(dragon, 'wings').id,
      recordsForObservation(dragon, 'wings')[0].id,
    ];

    expect(
      supportsTraitEvidenceClaim(
        emptyTraitEvidenceSnapshot('student'),
        dragon.id,
        'wings',
        'inherited',
        evidenceIds,
      ),
    ).toBeTrue();
  });

  it('requires a cue trial and training record for a learned response', () => {
    const dragon = TRAIT_EVIDENCE_DRAGONS[0];
    const trial = cueTrial(dragon.id, 'bell-bow');
    const snapshot: TraitEvidenceSnapshot = {
      ...emptyTraitEvidenceSnapshot('student'),
      trials: [trial],
    };
    const training = recordsForObservation(dragon, 'bell-bow')[0];

    expect(
      supportsTraitEvidenceClaim(snapshot, dragon.id, 'bell-bow', 'learned', [training.id]),
    ).toBeFalse();
    expect(
      supportsTraitEvidenceClaim(snapshot, dragon.id, 'bell-bow', 'learned', [
        training.id,
        `trial:${trial.id}`,
      ]),
    ).toBeTrue();
  });

  it('completes only after supported inherited, learned, and environmental claims', () => {
    const aster = TRAIT_EVIDENCE_DRAGONS[0];
    const brine = TRAIT_EVIDENCE_DRAGONS[1];
    const trial = cueTrial(aster.id, 'bell-bow');
    let snapshot: TraitEvidenceSnapshot = {
      ...emptyTraitEvidenceSnapshot('student'),
      trials: [trial],
    };

    snapshot = upsertTraitEvidenceClaim(snapshot, {
      specimenId: aster.id,
      observationId: 'wings',
      classification: 'inherited',
      evidenceIds: [liveEvidence(aster, 'wings').id, recordsForObservation(aster, 'wings')[0].id],
    });
    snapshot = upsertTraitEvidenceClaim(snapshot, {
      specimenId: aster.id,
      observationId: 'bell-bow',
      classification: 'learned',
      evidenceIds: [recordsForObservation(aster, 'bell-bow')[0].id, `trial:${trial.id}`],
    });
    expect(traitEvidenceStatus(snapshot)).toBe('in-progress');

    snapshot = upsertTraitEvidenceClaim(snapshot, {
      specimenId: brine.id,
      observationId: 'soot-mark',
      classification: 'environmental',
      evidenceIds: [
        liveEvidence(brine, 'soot-mark').id,
        recordsForObservation(brine, 'soot-mark')[1].id,
      ],
    });

    expect(traitEvidenceStatus(snapshot)).toBe('complete');
  });
});

function cueTrial(
  specimenId: string,
  behaviorId: TraitEvidenceTrial['behaviorId'],
): TraitEvidenceTrial {
  return {
    id: 'trial-1',
    specimenId,
    behaviorId,
    responded: true,
    result: 'Responded after the cue.',
    testedAtIso: '2026-08-14T00:00:00.000Z',
  };
}
