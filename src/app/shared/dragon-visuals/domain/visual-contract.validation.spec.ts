import { FOUNDATION_DRAGON_VISUAL_PACK } from '../data/foundation-visual-pack';
import { ALLELE_EXPRESSION_SEQUENCE } from '../data/core-teaching-sequences';
import { DragonVisualBridge } from '../state/dragon-visual.bridge';
import { DRAGON_VISUAL_CONTRACT_VERSION, DragonVisualScene } from './dragon-visual.models';
import { teachingSequenceFrameAt } from './teaching-sequence.models';
import { validateDragonVisualPack, validateDragonVisualScene, } from './visual-contract.validation';

describe('Dragon visual contract', () => {
    const scene: DragonVisualScene = {
        contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
        sceneId: 'scene-one',
        stationId: 'trait-detective',
        kind: 'trait-inspector',
        mode: 'learn',
        phase: 'observe',
        seed: 'scene-one:ember',
        samples: [
            {
                id: 'sample-one',
                sampleType: 'dragon',
                role: 'specimen',
                label: 'Sample One',
                generation: 0,
                genes: [],
            },
        ],
        instrument: {
            kind: 'trait-inspector',
            sampleId: 'sample-one',
            observations: [],
        },
        metrics: [],
        selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
    };

    it('accepts a versioned semantic scene without lesson dependencies', () => {
        expect(validateDragonVisualScene(scene)).toEqual([]);
    });

    it('accepts the foundation pack and its declarative teaching sequences', () => {
        expect(validateDragonVisualPack(FOUNDATION_DRAGON_VISUAL_PACK)).toEqual([]);
    });

    it('pauses a sequence until the prediction checkpoint is complete', () => {
        const pausedFrame = teachingSequenceFrameAt(ALLELE_EXPRESSION_SEQUENCE, 2200);
        expect(pausedFrame.elapsedMs).toBe(900);
        expect(pausedFrame.awaitingCheckpointId).toBe('expression-prediction');
        expect(pausedFrame.complete).toBe(false);

        const resumedFrame = teachingSequenceFrameAt(ALLELE_EXPRESSION_SEQUENCE, 2200, new Set(['expression-prediction']));
        expect(resumedFrame.elapsedMs).toBe(2200);
        expect(resumedFrame.awaitingCheckpointId).toBeNull();
    });

    it('publishes scenes, sequences, and semantic events through signals', () => {
        const bridge = new DragonVisualBridge();
        bridge.showScene(scene);
        bridge.playSequence(ALLELE_EXPRESSION_SEQUENCE, 'cutscene');
        bridge.receiveStageEvent({
            sceneId: scene.sceneId,
            type: 'hotspot-selected',
            targetId: 'sample-gene-wings',
            occurredAtIso: '2026-07-29T00:00:00.000Z',
        });

        expect(bridge.scene()).toBe(scene);
        expect(bridge.sequence()).toBe(ALLELE_EXPRESSION_SEQUENCE);
        expect(bridge.surface()).toBe('cutscene');
        expect(bridge.lastEvent()?.targetId).toBe('sample-gene-wings');
    });

    it('rejects trait inspector state that references records the scene does not contain', () => {
        const errors = validateDragonVisualScene({
            ...scene,
            instrument: {
                kind: 'trait-inspector',
                sampleId: 'sample-one',
                observations: [
                    {
                        id: 'scar',
                        labelId: 'observation.scar.label',
                        category: 'environmental',
                        sourceId: 'environment-log',
                        clueIds: ['scar.evidence', 'missing-clue'],
                    },
                ],
                clues: [
                    { id: 'scar.evidence', labelId: 'clue.scar.evidence', sourceId: 'environment-log' },
                ],
                placements: [
                    { observationId: 'not-in-scene', tray: 'inherited', status: 'pending', revealed: false },
                ],
                activeObservationId: 'also-missing',
            },
        });

        expect(errors).toContain('Observation scar references missing clue missing-clue.');
        expect(errors).toContain('Placement references missing observation not-in-scene.');
        expect(errors).toContain('Active observation also-missing is not in the scene.');
    });

    it('rejects hatchery state that references eggs or genes the scene does not contain', () => {
        const errors = validateDragonVisualScene({
            ...scene,
            kind: 'dragon-hatchery',
            instrument: {
                kind: 'dragon-hatchery',
                clutchId: 'clutch-1',
                focusGeneId: 'W',
                eggs: [
                    { eggId: 'egg-1', sampleId: 'sample-one', position: 1, examined: false, sampled: false, hatched: false },
                    { eggId: 'egg-1', sampleId: 'missing-sample', position: 2, examined: false, sampled: false, hatched: false },
                ],
                activeEggId: 'egg-9',
                selectedEggIds: ['egg-1', 'egg-8'],
                hatchLimit: 1,
                evidenceMarks: [{ id: 'record', labelId: 'evidence.record' }],
                evidenceMarkId: 'not-pinned-here',
            },
        });

        expect(errors).toContain('Hatchery egg IDs must be unique.');
        expect(errors).toContain('Instrument references missing analysis sample missing-sample.');
        expect(errors).toContain('Active egg egg-9 is not in the clutch.');
        expect(errors).toContain('Hatch tray references missing egg egg-8.');
        expect(errors).toContain('Hatch tray holds more than the 1-egg limit.');
        expect(errors).toContain('Hatchery focus gene W is missing from egg egg-1.');
        expect(errors).toContain('Pinned hatchery evidence not-pinned-here is not in the scene.');
    });

    it('rejects a visual pack when an animation references a missing motion', () => {
        const errors = validateDragonVisualPack({
            ...FOUNDATION_DRAGON_VISUAL_PACK,
            motions: [],
        });
        expect(errors.some(error => error.includes('missing motion'))).toBe(true);
    });
});
