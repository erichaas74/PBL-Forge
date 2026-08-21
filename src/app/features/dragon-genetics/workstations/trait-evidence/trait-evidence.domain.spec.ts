import { TRAIT_EVIDENCE_DRAGONS, liveEvidence, recordsForObservation, } from './trait-evidence.content';
import { supportsTraitEvidenceClaim, traitEvidenceStatus, upsertTraitEvidenceClaim, } from './trait-evidence.domain';
import { TraitEvidenceSnapshot, TraitEvidenceTrial } from './trait-evidence.models';
import { emptyTraitEvidenceSnapshot } from './trait-evidence.repository';

describe('Trait Evidence investigation', () => {
    it('supports an inherited claim from observation and a hatch record', () => {
        const dragon = TRAIT_EVIDENCE_DRAGONS[0];
        const evidenceIds = [
            liveEvidence(dragon, 'wings').id,
            recordsForObservation(dragon, 'wings')[0].id,
        ];

        expect(supportsTraitEvidenceClaim(emptyTraitEvidenceSnapshot('student'), dragon.id, 'wings', 'inherited', evidenceIds)).toBe(true);
    });

    it('requires a cue trial and training record for a learned response', () => {
        const dragon = TRAIT_EVIDENCE_DRAGONS[0];
        const trial = cueTrial(dragon.id, 'guard-command');
        const snapshot: TraitEvidenceSnapshot = {
            ...emptyTraitEvidenceSnapshot('student'),
            trials: [trial],
        };
        const training = recordsForObservation(dragon, 'guard-command')[0];

        expect(supportsTraitEvidenceClaim(snapshot, dragon.id, 'guard-command', 'learned', [training.id])).toBe(false);
        expect(supportsTraitEvidenceClaim(snapshot, dragon.id, 'guard-command', 'learned', [
            training.id,
            `trial:${trial.id}`,
        ])).toBe(true);
    });

    it('supports an innate reflex claim from a trial and pre-training record', () => {
        const dragon = TRAIT_EVIDENCE_DRAGONS[0];
        const trial = reflexTrial(dragon.id);
        const snapshot: TraitEvidenceSnapshot = {
            ...emptyTraitEvidenceSnapshot('student'),
            trials: [trial],
        };

        expect(supportsTraitEvidenceClaim(snapshot, dragon.id, 'fire-reflex', 'innate', [
            recordsForObservation(dragon, 'fire-reflex')[0].id,
            `trial:${trial.id}`,
        ])).toBe(true);
    });

    it('completes only after supported inherited, innate, and learned claims', () => {
        const aster = TRAIT_EVIDENCE_DRAGONS[0];
        const commandTrial = cueTrial(aster.id, 'guard-command');
        const fireTrial = reflexTrial(aster.id);
        let snapshot: TraitEvidenceSnapshot = {
            ...emptyTraitEvidenceSnapshot('student'),
            trials: [commandTrial, fireTrial],
        };

        snapshot = upsertTraitEvidenceClaim(snapshot, {
            specimenId: aster.id,
            observationId: 'wings',
            classification: 'inherited',
            evidenceIds: [liveEvidence(aster, 'wings').id, recordsForObservation(aster, 'wings')[0].id],
        });
        snapshot = upsertTraitEvidenceClaim(snapshot, {
            specimenId: aster.id,
            observationId: 'guard-command',
            classification: 'learned',
            evidenceIds: [
                recordsForObservation(aster, 'guard-command')[0].id,
                `trial:${commandTrial.id}`,
            ],
        });
        expect(traitEvidenceStatus(snapshot)).toBe('in-progress');

        snapshot = upsertTraitEvidenceClaim(snapshot, {
            specimenId: aster.id,
            observationId: 'fire-reflex',
            classification: 'innate',
            evidenceIds: [recordsForObservation(aster, 'fire-reflex')[0].id, `trial:${fireTrial.id}`],
        });

        expect(traitEvidenceStatus(snapshot)).toBe('complete');
    });
});

function cueTrial(specimenId: string, observationId: 'guard-command' | 'tail-strike-command' | 'target-touch'): TraitEvidenceTrial {
    return {
        id: 'trial-1',
        specimenId,
        observationId,
        kind: 'command',
        responded: true,
        result: 'Responded after the cue.',
        testedAtIso: '2026-08-14T00:00:00.000Z',
    };
}

function reflexTrial(specimenId: string): TraitEvidenceTrial {
    return {
        id: 'reflex-1',
        specimenId,
        observationId: 'fire-reflex',
        kind: 'reflex',
        responded: true,
        reactionTimeMs: 184,
        result: 'Closed eyelids and nostrils in 184 ms.',
        testedAtIso: '2026-08-14T00:00:00.000Z',
    };
}
