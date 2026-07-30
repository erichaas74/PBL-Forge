import { FOUNDATION_DRAGON_VISUAL_PACK } from '../data/foundation-visual-pack';
import { ALLELE_EXPRESSION_SEQUENCE } from '../data/core-teaching-sequences';
import { DragonVisualBridge } from '../state/dragon-visual.bridge';
import { DRAGON_VISUAL_CONTRACT_VERSION, DragonVisualScene } from './dragon-visual.models';
import { teachingSequenceFrameAt } from './teaching-sequence.models';
import {
  validateDragonVisualPack,
  validateDragonVisualScene,
} from './visual-contract.validation';

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
    expect(pausedFrame.complete).toBeFalse();

    const resumedFrame = teachingSequenceFrameAt(
      ALLELE_EXPRESSION_SEQUENCE,
      2200,
      new Set(['expression-prediction']),
    );
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

  it('rejects a visual pack when an animation references a missing motion', () => {
    const errors = validateDragonVisualPack({
      ...FOUNDATION_DRAGON_VISUAL_PACK,
      motions: [],
    });
    expect(errors.some(error => error.includes('missing motion'))).toBeTrue();
  });
});
