import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DragonGenomeLevelId,
  DragonVisualBridge,
  DragonVisualStageEvent,
  GENOME_LEVEL_ORDER,
} from '../../../shared/dragon-visuals';
import { GenomeMicroscopeMode } from '../simulation/domain/genome-microscope.models';
import { GenomeMicroscopeStationComponent } from './genome-microscope-station.component';

describe('GenomeMicroscopeStationComponent', () => {
  for (const mode of ['learn', 'practice', 'official', 'reteach'] as const) {
    it(`completes a prediction-map-reveal-evidence path in ${mode} mode`, () => {
      const fixture = createFixture(mode);
      const component = fixture.componentInstance;
      const saved = jasmine.createSpy('saved');
      component.evidenceSaved.subscribe(saved);

      component.runPrimaryAction();
      component.onStageEvent(event('prediction-locked', component.activeTask()!.targetLevel));
      for (const level of GENOME_LEVEL_ORDER) {
        component.onStageEvent(event('label-placed', level, level));
      }
      component.runPrimaryAction();
      component.runPrimaryAction();
      component.onStageEvent(event('evidence-pinned', component.activeTask()!.evidenceLevel));
      component.runPrimaryAction();

      expect(saved).toHaveBeenCalled();
      expect(saved.calls.mostRecent().args[0].hierarchyCorrect).toBeTrue();
      expect(saved.calls.mostRecent().args[0].predictionCorrect).toBeTrue();
      expect(saved.calls.mostRecent().args[0].evidenceCorrect).toBeTrue();
      fixture.destroy();
    });
  }

  it('keeps incorrect map status lesson-owned and allows retry', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    component.runPrimaryAction();
    component.onStageEvent(event('prediction-locked', component.activeTask()!.targetLevel));
    const reversed = [...GENOME_LEVEL_ORDER].reverse();
    GENOME_LEVEL_ORDER.forEach((label, index) =>
      component.onStageEvent(event('label-placed', label, reversed[index])));
    component.runPrimaryAction();

    expect(component.primaryAction().kind).toBe('reset-map');
    component.runPrimaryAction();
    expect(component.placedLabelCount()).toBe(1);
    fixture.destroy();
  });

  it('keeps the selected dragon connected to the trait file and chromosome locator', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    component.selectSample('quartz');
    component.focusJourney(6);
    component.locateChromosome(component.focusTrait().chromosomeModel);

    expect(component.selectedSample().id).toBe('quartz');
    expect(component.journeyStep()).toBe(6);
    expect(component.chromosomeCorrect()).toBeTrue();
    expect(component.investigationQuestion()).toContain('Quartz');
    fixture.destroy();
  });
});

function createFixture(mode: GenomeMicroscopeMode): ComponentFixture<GenomeMicroscopeStationComponent> {
  TestBed.configureTestingModule({
    imports: [GenomeMicroscopeStationComponent],
    providers: [DragonVisualBridge],
  });
  const fixture = TestBed.createComponent(GenomeMicroscopeStationComponent);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('seed', `test-${mode}`);
  fixture.detectChanges();
  return fixture;
}

function event(
  type: DragonVisualStageEvent['type'],
  targetId: DragonGenomeLevelId,
  value?: DragonGenomeLevelId,
): DragonVisualStageEvent {
  return {
    sceneId: 'test',
    type,
    targetId,
    value: value ?? (type === 'prediction-locked' ? targetId : undefined),
    occurredAtIso: '2026-07-30T00:00:00.000Z',
  };
}
