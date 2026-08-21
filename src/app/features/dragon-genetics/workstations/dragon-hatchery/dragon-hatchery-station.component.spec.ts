import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubSpecimenViewportRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import {
  DragonHatcheryInstrument,
  DragonVisualBridge,
  DragonVisualStageEvent,
} from '../../../../shared/dragon-visuals';
import { breedLabClutch, DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { DragonOffspring } from '../../simulation/domain/dragon-lab.models';
import { HatcheryRunRecord } from './dragon-hatchery.models';
import { DragonHatcheryStationComponent } from './dragon-hatchery-station.component';

const CLUTCH = breedLabClutch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 1, 4);

function stageEvent(
  type: DragonVisualStageEvent['type'],
  targetId: string,
  value?: string | number,
): DragonVisualStageEvent {
  return {
    sceneId: 'module-6-dragon-hatchery-learn',
    type,
    targetId,
    value,
    occurredAtIso: '2026-01-01T00:00:00.000Z',
  };
}

describe('DragonHatcheryStationComponent', () => {
  let fixture: ComponentFixture<DragonHatcheryStationComponent>;
  let station: DragonHatcheryStationComponent;
  let bridge: DragonVisualBridge;
  let records: HatcheryRunRecord[];
  let hatched: (readonly DragonOffspring[])[];

  beforeEach(() => {
    stubSpecimenViewportRendering();
    TestBed.configureTestingModule({ imports: [DragonHatcheryStationComponent] });
    bridge = TestBed.inject(DragonVisualBridge);
    fixture = TestBed.createComponent(DragonHatcheryStationComponent);
    station = fixture.componentInstance;
    fixture.componentRef.setInput('clutch', CLUTCH);
    fixture.componentRef.setInput('parents', [DRAGON_PARENTS[0], DRAGON_PARENTS[1]]);
    fixture.componentRef.setInput('clutchId', 'clutch-1');
    fixture.componentRef.setInput('focusTraitId', 'wings');
    fixture.componentRef.setInput('moduleId', 'module-6');
    fixture.componentRef.setInput('hatchLimit', 2);
    records = [];
    hatched = [];
    station.recordSaved.subscribe((record) => records.push(record));
    station.hatchedDragons.subscribe((dragons) => hatched.push(dragons));
    fixture.detectChanges();
  });

  function instrument(): DragonHatcheryInstrument {
    const scene = bridge.scene();
    if (scene?.instrument.kind !== 'dragon-hatchery')
      throw new Error('No hatchery scene published.');
    return scene.instrument;
  }

  function advance(): void {
    station.runPrimaryAction();
    fixture.detectChanges();
  }

  function send(event: DragonVisualStageEvent): void {
    station.onStageEvent(event);
    fixture.detectChanges();
  }

  it('publishes a valid clutch scene with every egg sealed', () => {
    expect(instrument().eggs.length).toBe(4);
    expect(
      instrument().eggs.every((egg) => !egg.examined && !egg.sampled && !egg.hatched),
    ).toBeTrue();
    expect(instrument().parentSampleIds).toEqual(['ember', 'tide']);
    expect(station.phase()).toBe('observe');
  });

  it('requires a locked prediction before the tools open', () => {
    advance();
    expect(station.phase()).toBe('predict');
    expect(station.primaryAction().disabled).toBeTrue();

    station.setPrediction(3);
    fixture.detectChanges();
    advance();

    expect(station.predictionLocked()).toBeTrue();
    expect(station.phase()).toBe('manipulate');
  });

  function reachManipulate(): void {
    advance();
    station.setPrediction(3);
    fixture.detectChanges();
    advance();
  }

  it('records candling and sampling separately for each egg', () => {
    reachManipulate();
    send(stageEvent('reveal-requested', CLUTCH[0].id, 'examine'));

    expect(instrument().eggs[0].examined).toBeTrue();
    expect(instrument().eggs[0].sampled).toBeFalse();
    expect(station.examinedEggs().length).toBe(1);

    send(stageEvent('reveal-requested', CLUTCH[0].id, 'sample'));
    expect(instrument().eggs[0].sampled).toBeTrue();
    expect(station.sampledEggs().length).toBe(1);
    // The other eggs are untouched: opening one egg reveals nothing about the rest.
    expect(
      instrument()
        .eggs.slice(1)
        .every((egg) => !egg.examined && !egg.sampled),
    ).toBeTrue();
  });

  it('stops candling once the budget is spent', () => {
    fixture.componentRef.setInput('examineBudget', 1);
    fixture.detectChanges();
    reachManipulate();

    send(stageEvent('reveal-requested', CLUTCH[0].id, 'examine'));
    expect(station.examinesLeft()).toBe(0);

    send(stageEvent('reveal-requested', CLUTCH[1].id, 'examine'));
    expect(instrument().eggs[1].examined).toBeFalse();
    expect(station.feedback()?.tone).toBe('warn');
    // Sampling has its own budget and stays open.
    send(stageEvent('reveal-requested', CLUTCH[1].id, 'sample'));
    expect(instrument().eggs[1].sampled).toBeTrue();
  });

  it('refuses to stage more eggs than the hatch limit', () => {
    reachManipulate();
    send(stageEvent('egg-marked', CLUTCH[0].id, 'select'));
    send(stageEvent('egg-marked', CLUTCH[1].id, 'select'));
    send(stageEvent('egg-marked', CLUTCH[2].id, 'select'));

    expect(instrument().selectedEggIds).toEqual([CLUTCH[0].id, CLUTCH[1].id]);
    expect(station.feedback()?.headline).toContain('The tray holds 2 eggs');

    send(stageEvent('egg-marked', CLUTCH[0].id, 'deselect'));
    expect(instrument().selectedEggIds).toEqual([CLUTCH[1].id]);
  });

  it('hatches only the chosen eggs and compares the result with the prediction', () => {
    reachManipulate();
    send(stageEvent('egg-marked', CLUTCH[0].id, 'select'));
    send(stageEvent('egg-marked', CLUTCH[1].id, 'select'));
    advance();

    expect(station.phase()).toBe('reveal');
    send(stageEvent('hatch-committed', 'hatch-control', 2));

    expect(instrument().hatchCommitted).toBeTrue();
    expect(instrument().eggs.filter((egg) => egg.hatched).length).toBe(2);
    expect(hatched[0].map((dragon) => dragon.id)).toEqual([CLUTCH[0].id, CLUTCH[1].id]);
    // Hatching reveals what a dragon shows; the genotype stays sealed unless it was sampled.
    expect(instrument().eggs.filter((egg) => egg.sampled).length).toBe(0);
    expect(station.feedback()?.headline).toContain(`${station.actualDominantCount()}`);
  });

  it('saves a record carrying the prediction, the records read, and the pinned evidence', () => {
    reachManipulate();
    send(stageEvent('reveal-requested', CLUTCH[0].id, 'examine'));
    send(stageEvent('reveal-requested', CLUTCH[0].id, 'sample'));
    send(stageEvent('egg-marked', CLUTCH[0].id, 'select'));
    advance();
    send(stageEvent('hatch-committed', 'hatch-control', 1));
    advance();

    expect(station.phase()).toBe('explain');
    station.pinEvidence('genotype-record');
    fixture.detectChanges();
    advance();

    expect(records.length).toBe(1);
    const record = records[0];
    expect(record.moduleId).toBe('module-6');
    expect(record.focusGeneId).toBe('W');
    expect(record.clutchSize).toBe(4);
    expect(record.examinedEggIds).toEqual([CLUTCH[0].id]);
    expect(record.sampledEggIds).toEqual([CLUTCH[0].id]);
    expect(record.hatchedEggIds).toEqual([CLUTCH[0].id]);
    expect(record.predictedDominantCount).toBe(3);
    expect(record.actualDominantCount).toBe(station.actualDominantCount());
    expect(record.evidenceMarkId).toBe('genotype-record');
    expect(record.evidenceCorrect).toBeTrue();
    expect(record.misconception).toBeNull();
    expect(record.eggs.length).toBe(4);
    expect(station.finished()).toBeTrue();
  });

  it('flags the misconception behind an unsupported evidence mark', () => {
    reachManipulate();
    send(stageEvent('egg-marked', CLUTCH[0].id, 'select'));
    advance();
    send(stageEvent('hatch-committed', 'hatch-control', 1));
    advance();
    station.pinEvidence('hatch-record');
    fixture.detectChanges();

    expect(station.feedback()?.tone).toBe('warn');
    expect(station.openMisconceptions()[0].flag).toBe('hatching-shows-genotype');

    advance();
    expect(records[0].evidenceCorrect).toBeFalse();
    expect(records[0].misconception).toBe('hatching-shows-genotype');
  });

  it('runs an examine-only module without a prediction or a hatch', () => {
    fixture.componentRef.setInput('tools', ['examine']);
    fixture.componentRef.setInput('requirePrediction', false);
    fixture.detectChanges();

    advance();
    expect(station.phase()).toBe('manipulate');
    expect(instrument().availableToolIds).toEqual(['examine']);

    send(stageEvent('reveal-requested', CLUTCH[0].id, 'sample'));
    expect(instrument().eggs[0].sampled).toBeFalse();

    send(stageEvent('reveal-requested', CLUTCH[0].id, 'examine'));
    advance();

    expect(station.phase()).toBe('explain');
    station.pinEvidence('phenotype-record');
    fixture.detectChanges();
    advance();

    expect(records[0].hatchedEggIds).toEqual([]);
    expect(records[0].predictedDominantCount).toBeNull();
  });
});
