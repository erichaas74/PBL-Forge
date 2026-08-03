import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonVisualBridge, DragonVisualStageEvent } from '../../../shared/dragon-visuals';
import {
  AlleleWorkbenchMode,
} from '../simulation/domain/allele-workbench.models';
import { AlleleWorkbenchStationComponent } from './allele-workbench-station.component';

describe('AlleleWorkbenchStationComponent', () => {
  for (const mode of ['learn', 'practice', 'official', 'reteach'] as const) {
    it(`saves a complete laboratory investigation in ${mode} mode`, () => {
      const fixture = createFixture(mode);
      const component = fixture.componentInstance;
      const saved = jasmine.createSpy('saved');
      component.evidenceSaved.subscribe(saved);

      completeInvestigation(component);

      expect(saved).toHaveBeenCalled();
      const record = saved.calls.mostRecent().args[0];
      expect(record).toEqual(jasmine.objectContaining({
        sampleCode: 'EX-W-104',
        focusGeneId: 'W',
        chromosomeNumber: 5,
        workingAlleles: ['W', 'w'],
        constructionCorrect: true,
        predictionCorrect: true,
        genotypeClassId: 'heterozygous',
        carrierState: true,
        interpretedRecessiveRetained: true,
        interpretationCorrect: true,
        evidenceCorrect: true,
        sampleSelectionCorrect: true,
        geneLocationCorrect: true,
      }));
      expect(record.machineActions).toContain('sample-chamber-locked');
      expect(record.machineActions).toContain('gene-location-locked:W');
      fixture.destroy();
    });
  }

  it('reports a vial mismatch and requires ejection before another sample can load', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    const wrongVial = component.vials().find(vial => vial.code !== component.activeTask().sampleCode)!;

    send(component, 'specimen-selected', wrongVial.code, 'select');
    send(component, 'hotspot-selected', 'sample-chamber', 'load');

    expect(component.loadedVialCode()).toBe(wrongVial.code);
    expect(component.chamberLocked()).toBeFalse();
    expect(component.feedback()?.headline).toBe('Sample identifier mismatch.');
    expect(component.feedback()?.detail).toContain(component.activeTask().sampleCode);

    send(component, 'hotspot-selected', 'sample-lock', 'lock');
    expect(component.chamberLocked()).toBeFalse();
    send(component, 'hotspot-selected', 'sample-chamber', 'eject');
    expect(component.loadedVialCode()).toBeNull();
    expect(component.currentObserveStep()).toBe('select-sample');
    fixture.destroy();
  });

  it('keeps the chromosome stage offline until the correct chamber is locked', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    expect(component.centeredGeneId()).toBe('C');

    send(component, 'hotspot-selected', 'chromosome-stage', 'next');
    expect(component.centeredGeneId()).toBe('C');

    loadAndLockAssignedSample(component);
    send(component, 'hotspot-selected', 'chromosome-stage', 'next');
    expect(component.centeredGeneId()).toBe('F');
    fixture.destroy();
  });

  it('does not unlock allele cartridges until the requested gene is centered and locked', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    loadAndLockAssignedSample(component);

    send(component, 'hotspot-selected', 'gene-locator', 'lock');
    expect(component.geneLocationLocked()).toBeFalse();
    expect(component.feedback()?.headline).toContain('does not match');

    locateAssignedGene(component);
    expect(component.geneLocationLocked()).toBeTrue();
    expect(component.scene().phase).toBe('manipulate');
    expect(component.scene().instrument.kind).toBe('allele-switchboard');
    fixture.destroy();
  });

  it('requires both sockets and required predictions before the analyzer can run', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    prepareCartridgeBay(component);
    const task = component.activeTask();

    send(component, 'allele-moved', 'allele-slot-a', task.requestedAlleles[0]);
    send(component, 'allele-moved', 'allele-slot-b', task.requestedAlleles[1]);
    component.runPrimaryAction();
    expect(component.scene().phase).toBe('manipulate');
    expect(component.feedback()?.headline).toContain('Both allele sockets');

    secureBothSockets(component);
    component.runPrimaryAction();
    expect(component.scene().phase).toBe('predict');
    expect(component.primaryAction().disabled).toBeTrue();

    send(component, 'prediction-locked', 'phenotype-readout', task.correctPrediction);
    expect(component.primaryAction().disabled).toBeTrue();
    send(component, 'prediction-locked', 'recessive-prediction', 'yes');
    expect(component.primaryAction().disabled).toBeFalse();
    fixture.destroy();
  });

  it('requires interpretation before evidence and evidence before saving', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    reachInterpretation(component);
    const saved = jasmine.createSpy('saved');
    component.evidenceSaved.subscribe(saved);

    send(component, 'evidence-pinned', component.activeTask().evidenceId, component.activeTask().evidenceId);
    expect(component.currentEvidence()).toBe('Not pinned');
    expect(component.primaryAction().disabled).toBeTrue();

    send(component, 'hotspot-selected', 'genotype-interpretation', 'heterozygous');
    send(component, 'hotspot-selected', 'recessive-interpretation', 'yes');
    component.runPrimaryAction();
    expect(component.primaryAction().kind).toBe('save');
    expect(component.primaryAction().disabled).toBeTrue();

    send(component, 'evidence-pinned', component.activeTask().evidenceId, component.activeTask().evidenceId);
    component.runPrimaryAction();
    expect(saved).toHaveBeenCalled();
    fixture.destroy();
  });

  it('keeps correctness feedback hidden during an official investigation', () => {
    const fixture = createFixture('official');
    const component = fixture.componentInstance;
    reachInterpretation(component);
    send(component, 'hotspot-selected', 'genotype-interpretation', 'homozygous-dominant');
    send(component, 'hotspot-selected', 'recessive-interpretation', 'no');
    component.runPrimaryAction();

    expect(component.feedback()?.tone).toBe('neutral');
    expect(component.feedback()?.headline).toBe('Interpretation locked.');
    fixture.destroy();
  });
});

function completeInvestigation(component: AlleleWorkbenchStationComponent): void {
  reachInterpretation(component);
  const task = component.activeTask();
  send(component, 'hotspot-selected', 'genotype-interpretation', task.correctGenotypeClass);
  send(component, 'hotspot-selected', 'recessive-interpretation',
    task.requestedAlleles.some(allele => allele === allele.toLowerCase()) ? 'yes' : 'no');
  component.runPrimaryAction();
  send(component, 'evidence-pinned', task.evidenceId, task.evidenceId);
  component.runPrimaryAction();
}

function reachInterpretation(component: AlleleWorkbenchStationComponent): void {
  prepareCartridgeBay(component);
  const task = component.activeTask();
  send(component, 'allele-moved', 'allele-slot-a', task.requestedAlleles[0]);
  send(component, 'allele-moved', 'allele-slot-b', task.requestedAlleles[1]);
  secureBothSockets(component);
  component.runPrimaryAction();
  send(component, 'prediction-locked', 'phenotype-readout', task.correctPrediction);
  if (task.correctGenotypeClass === 'heterozygous') {
    send(component, 'prediction-locked', 'recessive-prediction', 'yes');
  }
  component.runPrimaryAction();
  send(component, 'reveal-requested', 'expression-path', true);
  component.runPrimaryAction();
  expect(component.scene().phase).toBe('explain');
}

function prepareCartridgeBay(component: AlleleWorkbenchStationComponent): void {
  loadAndLockAssignedSample(component);
  locateAssignedGene(component);
}

function loadAndLockAssignedSample(component: AlleleWorkbenchStationComponent): void {
  const task = component.activeTask();
  send(component, 'specimen-selected', task.sampleCode, 'select');
  send(component, 'hotspot-selected', 'sample-chamber', 'load');
  send(component, 'hotspot-selected', 'sample-lock', 'lock');
}

function locateAssignedGene(component: AlleleWorkbenchStationComponent): void {
  const task = component.activeTask();
  for (let index = 0; index < task.nearbyGeneIds.length && component.centeredGeneId() !== task.targetGeneId; index += 1) {
    send(component, 'hotspot-selected', 'chromosome-stage', 'next');
  }
  send(component, 'hotspot-selected', 'gene-locator', 'lock');
}

function secureBothSockets(component: AlleleWorkbenchStationComponent): void {
  send(component, 'hotspot-selected', 'socket-lock-a', 'secure');
  send(component, 'hotspot-selected', 'socket-lock-b', 'secure');
}

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

function send(
  component: AlleleWorkbenchStationComponent,
  type: DragonVisualStageEvent['type'],
  targetId: string,
  value?: string | boolean,
): void {
  component.onStageEvent({
    sceneId: 'test',
    type,
    targetId,
    value,
    occurredAtIso: '2026-08-03T00:00:00.000Z',
  });
}
