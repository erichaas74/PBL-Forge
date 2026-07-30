import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonTraitPlacement,
  DragonVisualPhase,
  DragonVisualScene,
} from '../../domain/dragon-visual.models';
import { buildTraitInspectorViewModel } from './trait-inspector.view-model';

const COPY = {
  'observation.scar.label': 'Scar across the wing membrane',
  'observation.scar.detail': 'Absent in the hatch record, present at year two.',
  'observation.wing-shape.label': 'Wing shape',
  'clue.scar.evidence': 'Field log 14: caught on a thornbrush.',
  'clue.scar.alt-1': 'It is on the body, so it is inherited.',
  'source.environment-log.title': 'Field and environment log',
  'tray.environmental.title': 'Environmental',
};

function sceneWith(
  phase: DragonVisualPhase,
  placements: readonly DragonTraitPlacement[] = [],
  showSourceHints = false,
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId: 'trait-scene',
    stationId: 'trait-detective',
    kind: 'trait-inspector',
    mode: 'practice',
    phase,
    seed: 'seed-1',
    samples: [{
      id: 'specimen-h7',
      sampleType: 'dragon',
      role: 'specimen',
      label: 'Specimen H-7',
      generation: 1,
      genes: [],
    }],
    instrument: {
      kind: 'trait-inspector',
      sampleId: 'specimen-h7',
      observations: [
        {
          id: 'scar',
          labelId: 'observation.scar.label',
          detailLabelId: 'observation.scar.detail',
          category: 'environmental',
          sourceId: 'environment-log',
          clueIds: ['scar.evidence', 'scar.alt-1'],
        },
        {
          id: 'wing-shape',
          labelId: 'observation.wing-shape.label',
          category: 'inherited',
          sourceId: 'gene-record',
          clueIds: [],
        },
      ],
      clues: [
        { id: 'scar.evidence', labelId: 'clue.scar.evidence', sourceId: 'environment-log' },
        { id: 'scar.alt-1', labelId: 'clue.scar.alt-1', sourceId: 'gene-record' },
      ],
      placements,
      activeObservationId: 'scar',
      lockedPrediction: placements.length ? 'inherited' : null,
      showSourceHints,
    },
    metrics: [],
    selection: { selectedIds: [], highlightedIds: ['scar'], disabledIds: ['wing-shape'] },
  };
}

describe('Trait inspector view model', () => {
  it('keeps the answer and the source path hidden until the lesson reveals a placement', () => {
    const model = buildTraitInspectorViewModel(sceneWith('predict'), COPY);
    const card = model?.cards.find(item => item.id === 'scar');

    expect(card?.title).toBe('Scar across the wing membrane');
    expect(card?.revealedCategory).toBeNull();
    expect(card?.sourceId).toBeNull();
    expect(model?.trace).toBeNull();
  });

  it('shows the recording instrument before placement only when the mode allows hints', () => {
    const model = buildTraitInspectorViewModel(sceneWith('predict', [], true), COPY);

    expect(model?.showSourceHints).toBeTrue();
    expect(model?.cards.find(item => item.id === 'scar')?.sourceId).toBe('environment-log');
  });

  it('reveals the category, source instrument, and trace only after the lesson says so', () => {
    const placement: DragonTraitPlacement = {
      observationId: 'scar',
      tray: 'inherited',
      status: 'incorrect',
      revealed: true,
      pinnedClueId: 'scar.alt-1',
      clueStatus: 'incorrect',
    };
    const model = buildTraitInspectorViewModel(sceneWith('reveal', [placement]), COPY);
    const card = model?.cards.find(item => item.id === 'scar');

    expect(card?.revealedCategory).toBe('environmental');
    expect(card?.status).toBe('incorrect');
    expect(model?.trace).toEqual(jasmine.objectContaining({
      observationId: 'scar',
      sourceId: 'environment-log',
      tray: 'inherited',
    }));
    expect(model?.sources.find(source => source.id === 'environment-log')?.active).toBeTrue();
  });

  it('opens trays only during the placement step and clues only during the explain step', () => {
    const manipulate = buildTraitInspectorViewModel(sceneWith('manipulate'), COPY);
    expect(manipulate?.trays.every(tray => tray.enabled)).toBeTrue();
    expect(manipulate?.sources.flatMap(source => source.clues).every(clue => !clue.selectable)).toBeTrue();

    const placement: DragonTraitPlacement = {
      observationId: 'scar',
      tray: 'environmental',
      status: 'correct',
      revealed: true,
    };
    const explain = buildTraitInspectorViewModel(sceneWith('explain', [placement]), COPY);
    expect(explain?.trays.every(tray => !tray.enabled)).toBeTrue();
    expect(explain?.sources.flatMap(source => source.clues).every(clue => clue.selectable)).toBeTrue();
    expect(explain?.trays.find(tray => tray.id === 'environmental')?.count).toBe(1);
  });

  it('reports progress and a screen-reader summary that matches the visible state', () => {
    const placement: DragonTraitPlacement = {
      observationId: 'scar',
      tray: 'environmental',
      status: 'correct',
      revealed: true,
      pinnedClueId: 'scar.evidence',
    };
    const model = buildTraitInspectorViewModel(sceneWith('explain', [placement]), COPY);

    expect(model?.placedCount).toBe(1);
    expect(model?.totalCount).toBe(2);
    expect(model?.progressPercent).toBe(50);
    expect(model?.summary).toContain('Observation 1 of 2: Scar across the wing membrane.');
    expect(model?.summary).toContain('Placed in the environmental tray.');
    expect(model?.summary).toContain('An evidence clue is pinned.');
  });

  it('marks queued cards the lesson locked and keeps the active card draggable when placing', () => {
    const model = buildTraitInspectorViewModel(sceneWith('manipulate'), COPY);

    expect(model?.cards.find(card => card.id === 'wing-shape')?.disabled).toBeTrue();
    expect(model?.cards.find(card => card.id === 'scar')?.draggable).toBeTrue();
    expect(model?.cards.find(card => card.id === 'scar')?.highlighted).toBeTrue();
  });

  it('falls back to a readable label when curriculum copy is missing', () => {
    const model = buildTraitInspectorViewModel(sceneWith('observe'), {});

    expect(model?.cards[0].title).toBe('Scar');
    expect(model?.trays[0].title).toBe('Inherited');
  });
});
