import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DragonVisualBridge,
  DragonVisualEventType,
  TraitInspectorInstrument,
  validateDragonVisualScene,
} from '../../../shared/dragon-visuals';
import {
  TraitEvidenceCategory,
  TraitEvidenceMisconception,
  TraitEvidenceObservation,
  TraitEvidenceRecord,
  TraitEvidenceSetResult,
} from '../simulation/domain/trait-evidence.models';
import { TraitEvidenceStationComponent } from './trait-evidence-station.component';

describe('TraitEvidenceStationComponent', () => {
  let fixture: ComponentFixture<TraitEvidenceStationComponent>;
  let station: TraitEvidenceStationComponent;
  let records: TraitEvidenceRecord[];
  let results: TraitEvidenceSetResult[];
  let reteachFlags: TraitEvidenceMisconception[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TraitEvidenceStationComponent] });
    fixture = TestBed.createComponent(TraitEvidenceStationComponent);
    station = fixture.componentInstance;
    records = [];
    results = [];
    reteachFlags = [];
    station.evidenceSaved.subscribe(record => records.push(record));
    station.setCompleted.subscribe(result => results.push(result));
    station.reteachTriggered.subscribe(flag => reteachFlags.push(flag));
  });

  function emit(type: DragonVisualEventType, targetId: string, value?: string): void {
    station.onStageEvent({
      sceneId: station.scene().sceneId,
      type,
      targetId,
      value,
      occurredAtIso: new Date().toISOString(),
    });
  }

  function instrument(): TraitInspectorInstrument {
    const active = station.scene().instrument;
    if (active.kind !== 'trait-inspector') throw new Error('Wrong instrument kind.');
    return active;
  }

  function completeActiveItem(options: {
    place?: (item: TraitEvidenceObservation) => TraitEvidenceCategory;
    pinCorrect?: boolean;
  } = {}): TraitEvidenceObservation {
    const item = station.activeItem();
    if (!item) throw new Error('No active observation.');
    const category = options.place?.(item) ?? item.category;

    if (station.primaryAction().kind === 'begin-prediction') station.runPrimaryAction();
    emit('prediction-locked', item.id, category);
    emit('label-placed', item.id, category);
    if (station.primaryAction().kind === 'open-explain') station.runPrimaryAction();
    emit('evidence-pinned', options.pinCorrect === false ? item.clues[1].id : item.correctClueId);
    station.runPrimaryAction();
    return item;
  }

  it('opens Learn mode on a solved worked example before the student classifies anything', () => {
    fixture.detectChanges();

    expect(station.activeItem()?.id).toBe('worked-ash-stain');
    expect(instrument().placements?.[0]).toEqual(jasmine.objectContaining({
      observationId: 'worked-ash-stain',
      revealed: true,
      status: 'correct',
    }));
    expect(station.primaryAction().label).toBe('Start the investigation');
    expect(records.length).toBe(0);
  });

  it('runs observe, predict, place, reveal, explain, and save for one observation', () => {
    fixture.detectChanges();
    station.runPrimaryAction();

    const item = station.activeItem();
    expect(item?.id).toBe('scale-pattern');
    expect(station.primaryAction().kind).toBe('begin-prediction');

    station.runPrimaryAction();
    expect(station.scene().phase).toBe('predict');
    expect(instrument().placements?.some(placement => placement.observationId === item?.id)).toBeFalse();

    emit('prediction-locked', 'scale-pattern', 'inherited');
    expect(station.scene().phase).toBe('manipulate');
    expect(instrument().lockedPrediction).toBe('inherited');

    emit('label-placed', 'scale-pattern', 'inherited');
    expect(station.scene().phase).toBe('reveal');
    expect(instrument().placements?.find(placement => placement.observationId === 'scale-pattern'))
      .toEqual(jasmine.objectContaining({ tray: 'inherited', revealed: true, status: 'correct' }));

    station.runPrimaryAction();
    expect(station.scene().phase).toBe('explain');
    expect(station.primaryAction().disabled).toBeTrue();

    emit('evidence-pinned', 'scale-pattern.evidence');
    expect(station.primaryAction().disabled).toBeFalse();

    station.runPrimaryAction();
    expect(records.length).toBe(1);
    expect(records[0]).toEqual(jasmine.objectContaining({
      observationId: 'scale-pattern',
      predictedCategory: 'inherited',
      placedCategory: 'inherited',
      actualCategory: 'inherited',
      correct: true,
      clueCorrect: true,
      misconception: null,
    }));
    expect(records[0].sceneId).toBe('module-1-trait-evidence-learn');
  });

  it('names the misconception when a body feature acquired during life is called inherited', () => {
    fixture.detectChanges();
    station.runPrimaryAction();

    while (station.activeItem()?.id !== 'scar') completeActiveItem();
    completeActiveItem({ place: () => 'inherited', pinCorrect: false });

    const record = records.at(-1);
    expect(record?.observationId).toBe('scar');
    expect(record?.correct).toBeFalse();
    expect(record?.misconception).toBe('acquired-marked-inherited');
    expect(station.openMisconceptions().some(entry => entry.flag === 'acquired-marked-inherited'))
      .toBeTrue();
  });

  it('answers a repeated misconception with fresh examples instead of a replay', () => {
    fixture.detectChanges();
    station.runPrimaryAction();

    const before = station.items().length;
    const seen = new Set(station.items().map(item => item.id));
    while (!reteachFlags.length && station.activeItem()) {
      const item = station.activeItem();
      if (!item) break;
      completeActiveItem({
        place: candidate => candidate.category === 'inherited' ? 'learned' : 'inherited',
        pinCorrect: false,
      });
      if (station.finished()) break;
    }

    expect(reteachFlags.length).toBeGreaterThan(0);
    expect(station.items().length).toBeGreaterThan(before);
    expect(station.reteachNotice()).toContain('fresh example');
    const added = station.items().slice(before);
    expect(added.every(item => !seen.has(item.id))).toBeTrue();
  });

  it('varies practice order and turns off the source hints Learn mode shows', () => {
    fixture.componentRef.setInput('mode', 'practice');
    fixture.detectChanges();

    expect(instrument().showSourceHints).toBeFalse();
    expect(station.items().some(item => item.id === 'worked-ash-stain')).toBeFalse();
    expect(station.items().length).toBe(8);
    expect(station.items().map(item => item.id))
      .not.toEqual(['scale-pattern', 'fire-breathing', 'horn-shape', 'wing-shape',
        'flight-route', 'training-command', 'scar', 'nest-dust']);
  });

  it('locks official reveals until the whole set is submitted', () => {
    fixture.componentRef.setInput('mode', 'official');
    fixture.detectChanges();

    const first = station.activeItem();
    expect(first).toBeTruthy();
    station.runPrimaryAction();
    emit('prediction-locked', first!.id, 'inherited');
    emit('label-placed', first!.id, 'inherited');

    expect(station.scene().phase).toBe('explain');
    expect(instrument().placements?.[0]).toEqual(jasmine.objectContaining({
      revealed: false,
      status: 'pending',
    }));

    emit('evidence-pinned', first!.clues[0].id);
    station.runPrimaryAction();
    while (station.primaryAction().kind !== 'submit') completeActiveItem();

    expect(records.length).toBe(station.items().length);
    expect(results.length).toBe(0);

    station.runPrimaryAction();
    expect(station.finished()).toBeTrue();
    expect(instrument().placements?.every(placement => placement.revealed)).toBeTrue();
    expect(results.at(-1)?.mode).toBe('official');
  });

  it('loads a reteach bundle targeted at the diagnosed misconception', () => {
    fixture.componentRef.setInput('mode', 'reteach');
    fixture.componentRef.setInput('reteachFlag', 'inherited-marked-acquired');
    fixture.detectChanges();

    expect(station.items().map(item => item.id))
      .toEqual(['late-bloom-crest', 'tail-spike-count', 'wing-membrane-tone']);
    expect(instrument().showSourceHints).toBeTrue();
  });

  it('publishes a valid scene to the bridge at every step of the loop', () => {
    const bridge = TestBed.inject(DragonVisualBridge);
    fixture.detectChanges();
    station.runPrimaryAction();

    completeActiveItem();
    fixture.detectChanges();

    expect(validateDragonVisualScene(station.scene())).toEqual([]);
    expect(bridge.scene()?.sceneId).toBe('module-1-trait-evidence-learn');
    expect(bridge.scene()?.kind).toBe('trait-inspector');
  });

  it('reports set results and a classification for every graded trait-sort card', () => {
    const classifications: string[] = [];
    station.classified.subscribe(event => classifications.push(event.sortCardId));
    fixture.detectChanges();
    station.runPrimaryAction();

    while (!station.finished()) completeActiveItem();

    expect(classifications.length).toBe(8);
    expect(results.at(-1)).toEqual(jasmine.objectContaining({ mode: 'learn', correct: 8 }));
  });
});
