import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../../../features/dragon-genetics/simulation/domain/dragon-inheritance';
import {
  AlleleSwitchboardSceneInput,
  createAlleleSwitchboardScene,
} from '../../../../features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter';
import { DragonVisualPhase, DragonVisualScene, DragonVisualStageEvent } from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { AlleleSwitchboardDisplayComponent } from './allele-switchboard-display.component';

describe('AlleleSwitchboardDisplayComponent', () => {
  let fixture: ComponentFixture<AlleleSwitchboardDisplayComponent>;
  let bridge: DragonVisualBridge;
  let events: DragonVisualStageEvent[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AlleleSwitchboardDisplayComponent] });
    bridge = TestBed.inject(DragonVisualBridge);
    fixture = TestBed.createComponent(AlleleSwitchboardDisplayComponent);
    fixture.componentRef.setInput('reducedMotionOverride', true);
    fixture.componentRef.setInput('copy', {
      'evidence.recessive-remains-present': 'A heterozygous pair keeps the recessive allele even when the dominant phenotype is expressed.',
    });
    events = [];
    fixture.componentInstance.stageEvent.subscribe(event => events.push(event));
  });

  it('emits semantic sample, chamber, stage, and locus operations', () => {
    render(scene('observe'));
    host().querySelector<HTMLButtonElement>('.vial')!.click();
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'specimen-selected',
      targetId: 'EX-W-104',
    }));

    fixture.componentInstance.operateChamber('load');
    fixture.componentInstance.lockChamber();
    render(scene('observe', {
      observeStep: 'locate-gene',
      chamberLocked: true,
      centeredGeneId: 'F',
    }));
    fixture.componentInstance.moveStage('next');
    fixture.componentInstance.lockGene();

    expect(events.map(event => `${event.type}:${event.targetId}:${event.value}`)).toContain('hotspot-selected:sample-chamber:load');
    expect(events.map(event => `${event.type}:${event.targetId}:${event.value}`)).toContain('hotspot-selected:sample-lock:lock');
    expect(events.map(event => `${event.type}:${event.targetId}:${event.value}`)).toContain('hotspot-selected:chromosome-stage:next');
    expect(events.map(event => `${event.type}:${event.targetId}:${event.value}`)).toContain('hotspot-selected:gene-locator:lock');
  });

  it('places allele cartridges by click and by drag-and-drop', () => {
    render(scene('manipulate', { geneLocationLocked: true, centeredGeneId: 'W' }));
    const token = host().querySelector<HTMLButtonElement>('.allele-token.dominant')!;
    const slotA = host().querySelector<HTMLButtonElement>('[data-target="allele-slot-a"]')!;
    token.click();
    slotA.click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'allele-moved',
      targetId: 'allele-slot-a',
      value: 'W',
    }));

    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'w');
    fixture.componentInstance.onSlotDrop('allele-slot-b', new DragEvent('drop', { dataTransfer: transfer }));
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'allele-moved',
      targetId: 'allele-slot-b',
      value: 'w',
    }));
  });

  it('keeps the scientific result shielded until the analyzer emits a reveal request', () => {
    render(scene('predict', { geneLocationLocked: true }));
    expect(host().querySelector('.phenotype-readout')?.textContent).toContain('RESULT SHIELDED');
    expect(host().textContent).not.toContain('WINGED');

    render(scene('reveal', {
      geneLocationLocked: true,
      predictedPhenotypeId: 'dominant',
      expressionRevealed: false,
    }));
    host().querySelector<HTMLButtonElement>('.energize')!.click();
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'reveal-requested',
      targetId: 'expression-path',
    }));
  });

  it('requires lesson-owned interpretation lock before evidence controls enable', () => {
    render(scene('explain', {
      geneLocationLocked: true,
      expressionRevealed: true,
      actualPhenotypeId: 'dominant',
      dominantSignalPresent: true,
      recessiveSignalPresent: true,
      genotypeClassId: 'heterozygous',
      interpretationLocked: false,
    }));
    expect(host().querySelector<HTMLButtonElement>('.evidence-options button')?.disabled).toBeTrue();

    render(scene('explain', {
      geneLocationLocked: true,
      expressionRevealed: true,
      actualPhenotypeId: 'dominant',
      dominantSignalPresent: true,
      recessiveSignalPresent: true,
      genotypeClassId: 'heterozygous',
      interpretationGenotypeClassId: 'heterozygous',
      interpretedRecessiveRetained: true,
      interpretationLocked: true,
    }));
    const evidence = host().querySelector<HTMLButtonElement>('.evidence-options button')!;
    expect(evidence.disabled).toBeFalse();
    evidence.click();
    expect(events.at(-1)?.type).toBe('evidence-pinned');
  });

  it('provides keyboard-native controls, accessible names, live status, and reduced motion', () => {
    render(scene('observe'));
    expect(host().querySelector('.workbench')?.classList).toContain('reduced-motion');
    expect(host().querySelector<HTMLButtonElement>('.vial')?.getAttribute('aria-label')).toContain('Select vial EX-W-104');
    expect(host().querySelector<HTMLButtonElement>('[aria-label="Move chromosome stage to next locus"]')).toBeTruthy();
    expect(host().querySelector('[aria-live="polite"]')?.textContent).toContain('sample EX-W-104');
    expect(Array.from(host().querySelectorAll('button')).every(control => control instanceof HTMLButtonElement)).toBeTrue();
  });

  function render(next: DragonVisualScene): void {
    bridge.showScene(next);
    fixture.detectChanges();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});

function scene(
  phase: DragonVisualPhase,
  overrides: Partial<AlleleSwitchboardSceneInput> = {},
): DragonVisualScene {
  return createAlleleSwitchboardScene(
    DRAGON_PARENTS[0],
    `allele-display-${phase}`,
    'learn',
    phase,
    { ...baseInput(), ...overrides },
  );
}

function baseInput(): AlleleSwitchboardSceneInput {
  return {
    sampleCode: 'EX-W-104',
    sampleLabel: 'Ember wing-tissue extract',
    sampleVials: [
      { code: 'EX-W-104', label: 'Ember wing-tissue extract', selected: false, loaded: false },
      { code: 'EX-F-212', label: 'Moss fire-gland extract', selected: false, loaded: false },
      { code: 'EX-S-330', label: 'Quartz scale-bed extract', selected: false, loaded: false },
    ],
    observeStep: 'select-sample',
    chamberLocked: false,
    chromosomeNumber: 5,
    nearbyGeneIds: ['C', 'F', 'W', 'T'],
    centeredGeneId: 'C',
    geneLocationLocked: false,
    focusGeneId: 'W',
    dominantAllele: 'W',
    recessiveAllele: 'w',
    startingAlleles: ['w', 'w'],
    requestedAlleles: ['W', 'w'],
    workingAlleles: ['W', 'w'],
    dominantPhenotypeId: 'Winged',
    recessivePhenotypeId: 'Wingless',
    requiresRecessivePrediction: true,
    evidenceMarks: [
      { id: 'recessive-remains-present', labelId: 'evidence.recessive-remains-present', anchorId: 'carrier-indicator' },
    ],
  };
}
