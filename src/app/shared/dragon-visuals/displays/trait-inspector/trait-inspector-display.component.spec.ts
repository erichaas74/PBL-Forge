import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonTraitPlacement,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { TraitInspectorDisplayComponent } from './trait-inspector-display.component';
import { TRAIT_INSPECTOR_THEME } from './trait-inspector.theme';

const COPY = {
  'observation.scar.label': 'Scar across the wing membrane',
  'observation.scar.detail': 'Absent in the hatch record, present at year two.',
  'observation.wing-shape.label': 'Wing shape',
  'clue.scar.evidence': 'Field log 14: caught on a thornbrush.',
  'clue.scar.alt-1': 'It is on the body, so it is inherited.',
  'tray.inherited.title': 'Inherited',
  'tray.learned.title': 'Learned',
  'tray.environmental.title': 'Environmental',
};

function scene(
  phase: DragonVisualPhase,
  placements: readonly DragonTraitPlacement[] = [],
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId: 'trait-scene',
    stationId: 'trait-detective',
    kind: 'trait-inspector',
    mode: 'learn',
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
      lockedPrediction: placements.length ? 'environmental' : null,
      showSourceHints: false,
    },
    metrics: [],
    selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
  };
}

describe('TraitInspectorDisplayComponent', () => {
  let fixture: ComponentFixture<TraitInspectorDisplayComponent>;
  let bridge: DragonVisualBridge;
  let events: DragonVisualStageEvent[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TraitInspectorDisplayComponent] });
    bridge = TestBed.inject(DragonVisualBridge);
    fixture = TestBed.createComponent(TraitInspectorDisplayComponent);
    fixture.componentRef.setInput('copy', COPY);
    fixture.componentRef.setInput('reducedMotionOverride', true);
    events = [];
    fixture.componentInstance.stageEvent.subscribe(event => events.push(event));
  });

  function render(next: DragonVisualScene): void {
    bridge.showScene(next);
    fixture.detectChanges();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('draws the console from the scene without any dragon anatomy', () => {
    render(scene('observe'));

    expect(host().querySelectorAll('.tray').length).toBe(3);
    expect(host().querySelectorAll('.queue-chip').length).toBe(2);
    expect(host().querySelector('.observation-card h3')?.textContent)
      .toContain('Scar across the wing membrane');
    expect(host().querySelector('[data-target="sample-record"]')).toBeTruthy();
    expect(host().textContent).not.toContain('environmental tray reveal');
  });

  it('reports an inspected observation as a semantic hotspot event', () => {
    render(scene('observe'));
    host().querySelectorAll<HTMLButtonElement>('.queue-chip')[0].click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'hotspot-selected',
      targetId: 'scar',
      sceneId: 'trait-scene',
    }));
  });

  it('locks a prediction before any tray accepts the record', () => {
    render(scene('observe'));
    const trays = host().querySelectorAll<HTMLButtonElement>('.tray');
    expect([...trays].every(tray => tray.disabled)).toBeTrue();

    render(scene('predict'));
    host().querySelectorAll<HTMLButtonElement>('.prediction-options button')[2].click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'prediction-locked',
      value: 'environmental',
    }));
  });

  it('places the record from a keyboard-reachable tray button', () => {
    render(scene('manipulate', []));
    const trays = host().querySelectorAll<HTMLButtonElement>('.tray');

    expect(trays[2].disabled).toBeFalse();
    expect(trays[2].getAttribute('aria-label')).toContain('Place Scar across the wing membrane');
    trays[2].click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'label-placed',
      targetId: 'scar',
      value: 'environmental',
    }));
  });

  it('opens the evidence path and clue pinning only after a placement is revealed', () => {
    const placement: DragonTraitPlacement = {
      observationId: 'scar',
      tray: 'environmental',
      status: 'correct',
      revealed: true,
    };
    render(scene('explain', [placement]));

    const clues = host().querySelectorAll<HTMLButtonElement>('.clue');
    expect(clues.length).toBe(2);
    expect([...clues].every(clue => clue.disabled)).toBeFalse();

    // Clues stay filed under the instrument that recorded them.
    const fieldClue = host()
      .querySelector<HTMLButtonElement>('[data-source="environment-log"] .clue');
    expect(fieldClue?.textContent).toContain('Field log 14');
    fieldClue?.click();
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'evidence-pinned',
      targetId: 'scar.evidence',
    }));
    expect(host().querySelector('.verdict')?.textContent).toContain('environmental');
  });

  it('publishes a live summary and honours reduced motion', () => {
    render(scene('predict'));

    expect(host().querySelector('.console')?.classList).toContain('reduced-motion');
    expect(host().querySelector('[aria-live="polite"]')?.textContent)
      .toContain('Observation 1 of 2: Scar across the wing membrane.');
  });

  it('applies theme colours as CSS custom properties so art changes stay in the theme', () => {
    render(scene('observe'));
    const console = host().querySelector<HTMLElement>('.console');

    // Against the theme, not a literal — see the note in the scanner spec.
    expect(console?.style.getPropertyValue('--tia-brass'))
      .toBe(TRAIT_INSPECTOR_THEME.palette.brass);
    expect(console?.style.getPropertyValue('--tia-trace-ms')).toBe('1500ms');
  });

  it('renders nothing but a placeholder when the bridge holds another station scene', () => {
    fixture.detectChanges();

    expect(host().querySelector('.console')).toBeNull();
    expect(host().querySelector('.station-idle')).toBeTruthy();
  });
});
