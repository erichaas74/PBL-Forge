import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlleleWorkbenchMode } from '../simulation/domain/allele-workbench.models';
import { AlleleWorkbenchStationComponent } from './allele-workbench-station.component';

describe('AlleleWorkbenchStationComponent', () => {
  for (const mode of ['learn', 'practice', 'official', 'reteach'] as const) {
    it(`saves a confirmed gene notebook record in ${mode} mode`, () => {
      const fixture = createFixture(mode);
      const component = fixture.componentInstance;
      const saved = jasmine.createSpy('saved');
      component.evidenceSaved.subscribe(saved);

      completeActiveInvestigation(component);

      expect(saved).toHaveBeenCalled();
      expect(saved.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
        sampleCode: 'EX-W-104',
        focusGeneId: 'W',
        workingAlleles: ['W', 'w'],
        genotypeClassId: 'heterozygous',
        predictedPhenotypeId: 'dominant',
        dominantAlleleSymbol: 'W',
        dominantPhenotype: 'Winged',
        recessiveAlleleSymbol: 'w',
        recessivePhenotype: 'Wingless',
        confirmedBy: 'Team Wyvern',
        confirmed: true,
      }));
      fixture.destroy();
    });
  }

  it('starts with an unknown reference key and reveals it only after discovery is confirmed', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;

    expect(component.step()).toBe('reference');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Phenotype A');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Reference confirmed');

    confirmReference(component);
    fixture.detectChanges();

    expect(component.step()).toBe('samples');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reference confirmed');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('W allele');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Winged');
    fixture.destroy();
  });

  it('renders reusable SVG patterns in a label-neutral draggable allele bank', () => {
    const fixture = createFixture('learn');
    const host = fixture.nativeElement as HTMLElement;
    const bank = host.querySelector<HTMLElement>('.allele-bank')!;
    const options = bank.querySelectorAll<HTMLElement>('.draggable-item');

    expect(host.querySelector('#allele-pattern-a')).toBeTruthy();
    expect(host.querySelector('#allele-pattern-b')).toBeTruthy();
    expect(options.length).toBe(2);
    expect(Array.from(options).every(option => option.draggable)).toBeTrue();
    expect(bank.textContent).not.toContain('Dominant');
    expect(bank.textContent).not.toContain('Recessive');
    expect(bank.textContent).not.toContain('(W)');
    fixture.destroy();
  });

  it('supports select-and-place as an accessible alternative to drag and drop', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;

    component.selectReferencePattern('allele-pattern-a');
    component.placeSelectedReferencePattern(0);
    component.selectReferencePattern('allele-pattern-b');
    component.placeSelectedReferencePattern(1);

    expect(component.referenceDrops()).toEqual(['allele-pattern-a', 'allele-pattern-b']);
    expect(component.referenceReady()).toBeFalse();
    fixture.destroy();
  });

  it('requires a mixed-pair expression test before dominance deductions unlock', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    const host = fixture.nativeElement as HTMLElement;
    const deductionButtons = host.querySelectorAll<HTMLButtonElement>('.question-group button');

    expect(Array.from(deductionButtons).every(button => button.disabled)).toBeTrue();
    expect(component.mixedPairTested()).toBeFalse();

    testMixedPair(component);
    fixture.detectChanges();

    expect(component.expressionTestResult()).toBe('allele-pattern-a');
    expect(component.expressionTestPhenotype()).toBe('Winged');
    expect(component.mixedPairTested()).toBeTrue();
    expect(Array.from(deductionButtons).every(button => button.disabled)).toBeFalse();
    fixture.destroy();
  });

  it('does not confirm an incorrect reference relationship', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    component.selectReferencePattern('allele-pattern-b');
    component.placeSelectedReferencePattern(0);
    component.selectReferencePattern('allele-pattern-a');
    component.placeSelectedReferencePattern(1);
    testMixedPair(component);
    component.selectReferenceExpression('a', 'recessive');
    component.selectReferenceExpression('b', 'dominant');
    component.checkReference();

    expect(component.step()).toBe('reference');
    expect(component.feedback()?.tone).toBe('warn');
    fixture.destroy();
  });

  it('requires both allele samples to match their reference fingerprints', () => {
    const fixture = createFixture('practice');
    const component = fixture.componentInstance;
    confirmReference(component);
    const task = component.activeTask();

    component.selectSampleAllele(0, task.requestedAlleles[1]);
    component.selectSampleAllele(1, task.requestedAlleles[0]);
    component.checkSamples();

    expect(component.step()).toBe('samples');
    expect(component.feedback()?.headline).toContain('another look');

    identifySamples(component);
    expect(component.step()).toBe('analyze');
    fixture.destroy();
  });

  it('keeps the outcome hidden until all comparison reasoning is correct', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    confirmReference(component);
    identifySamples(component);

    component.selectAnalysis('comparison', 'same');
    component.selectAnalysis('genotypeType', 'homozygous');
    component.selectAnalysis('combination', 'two-recessive');
    component.selectAnalysis('phenotype', 'recessive');
    component.checkAnalysis();

    expect(component.step()).toBe('analyze');
    expect(component.feedback()?.tone).toBe('warn');

    analyzePair(component);
    expect(component.step()).toBe('reveal');
    expect(component.activePhenotypeLabel()).toBe('Winged');
    fixture.destroy();
  });

  it('requires a student or team name before saving a confirmed record', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    reachNotebook(component);

    expect(component.notebookReady()).toBeFalse();
    component.saveRecord();
    expect(component.records().length).toBe(0);

    setTeamName(component, 'Evidence Crew');
    component.saveRecord();
    expect(component.records()[0].confirmedBy).toBe('Evidence Crew');
    fixture.destroy();
  });

  it('builds a four-gene breeding reference notebook', () => {
    const fixture = createFixture('learn');
    const component = fixture.componentInstance;
    const completed = jasmine.createSpy('completed');
    component.setCompleted.subscribe(completed);

    while (component.step() !== 'review') completeActiveInvestigation(component);

    expect(component.records().length).toBe(4);
    expect(component.records().map(record => record.focusGeneId)).toEqual(['W', 'F', 'H', 'S']);
    expect(completed).toHaveBeenCalledWith(jasmine.objectContaining({ correct: 4, total: 4 }));
    fixture.destroy();
  });
});

function completeActiveInvestigation(component: AlleleWorkbenchStationComponent): void {
  reachNotebook(component);
  setTeamName(component, 'Team Wyvern');
  component.saveRecord();
}

function reachNotebook(component: AlleleWorkbenchStationComponent): void {
  confirmReference(component);
  identifySamples(component);
  analyzePair(component);
  component.openNotebook();
}

function confirmReference(component: AlleleWorkbenchStationComponent): void {
  component.selectReferencePattern('allele-pattern-a');
  component.placeSelectedReferencePattern(0);
  component.selectReferencePattern('allele-pattern-b');
  component.placeSelectedReferencePattern(1);
  testMixedPair(component);
  component.selectReferenceExpression('a', 'dominant');
  component.selectReferenceExpression('b', 'recessive');
  component.checkReference();
}

function testMixedPair(component: AlleleWorkbenchStationComponent): void {
  component.selectReferencePattern('allele-pattern-a');
  component.placeSelectedExpressionTestAllele(0);
  component.selectReferencePattern('allele-pattern-b');
  component.placeSelectedExpressionTestAllele(1);
  component.runExpressionTest();
}

function identifySamples(component: AlleleWorkbenchStationComponent): void {
  const task = component.activeTask();
  component.selectSampleAllele(0, task.requestedAlleles[0]);
  component.selectSampleAllele(1, task.requestedAlleles[1]);
  component.checkSamples();
}

function analyzePair(component: AlleleWorkbenchStationComponent): void {
  component.selectAnalysis('comparison', component.sampleComparison());
  component.selectAnalysis('genotypeType', component.genotypeType());
  component.selectAnalysis('combination', component.alleleCombination());
  component.selectAnalysis('phenotype', component.actualPrediction());
  component.checkAnalysis();
}

function setTeamName(component: AlleleWorkbenchStationComponent, value: string): void {
  component.updateTeamName({ target: { value } } as unknown as Event);
}

function createFixture(mode: AlleleWorkbenchMode): ComponentFixture<AlleleWorkbenchStationComponent> {
  TestBed.configureTestingModule({ imports: [AlleleWorkbenchStationComponent] });
  const fixture = TestBed.createComponent(AlleleWorkbenchStationComponent);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('seed', `test-${mode}`);
  fixture.detectChanges();
  return fixture;
}
