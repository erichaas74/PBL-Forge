import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonVisualBridge, DragonVisualStageEvent } from '../../../shared/dragon-visuals';
import { AlleleWorkbenchMode } from '../simulation/domain/allele-workbench.models';
import { AlleleWorkbenchStationComponent } from './allele-workbench-station.component';

describe('AlleleWorkbenchStationComponent', () => {
  for (const mode of ['learn', 'practice', 'official', 'reteach'] as const) {
    it(`saves a constructed, predicted, traced, and supported record in ${mode} mode`, () => {
      const fixture = createFixture(mode);
      const component = fixture.componentInstance;
      const saved = jasmine.createSpy('saved');
      component.evidenceSaved.subscribe(saved);
      const task = component.activeTask();

      component.runPrimaryAction();
      component.onStageEvent(event('allele-moved', 'allele-slot-a', task.requestedAlleles[0]));
      component.onStageEvent(event('allele-moved', 'allele-slot-b', task.requestedAlleles[1]));
      component.runPrimaryAction();
      component.onStageEvent(event('prediction-locked', 'phenotype-readout', task.correctPrediction));
      component.onStageEvent(event('reveal-requested', 'expression-path', true));
      component.runPrimaryAction();
      component.onStageEvent(event('evidence-pinned', task.evidenceId, task.evidenceId));
      component.runPrimaryAction();

      expect(saved).toHaveBeenCalled();
      expect(saved.calls.mostRecent().args[0].constructionCorrect).toBeTrue();
      expect(saved.calls.mostRecent().args[0].predictionCorrect).toBeTrue();
      expect(saved.calls.mostRecent().args[0].evidenceCorrect).toBeTrue();
      fixture.destroy();
    });
  }

  it('does not advance to prediction until the assigned pair is built', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    component.runPrimaryAction();
    component.runPrimaryAction();
    expect(component.primaryAction().kind).toBe('lock-pair');
    expect(component.feedback()?.tone).toBe('warn');
    fixture.destroy();
  });
});

function createFixture(mode: AlleleWorkbenchMode): ComponentFixture<AlleleWorkbenchStationComponent> {
  TestBed.configureTestingModule({
    imports: [AlleleWorkbenchStationComponent],
    providers: [DragonVisualBridge],
  });
  const fixture = TestBed.createComponent(AlleleWorkbenchStationComponent);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('seed', `test-${mode}`);
  fixture.detectChanges();
  return fixture;
}

function event(
  type: DragonVisualStageEvent['type'],
  targetId: string,
  value?: string | boolean,
): DragonVisualStageEvent {
  return {
    sceneId: 'test',
    type,
    targetId,
    value,
    occurredAtIso: '2026-07-30T00:00:00.000Z',
  };
}
