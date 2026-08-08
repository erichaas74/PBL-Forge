import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
  GenotypeScannerInstrument,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { GenotypeScannerDisplayComponent } from './genotype-scanner-display.component';
import { GENOTYPE_SCANNER_THEME } from './genotype-scanner.theme';

const COPY = {
  'sample.scan-s11.caption': 'Intake 05-02 · records only.',
  'evidence.pair-open': 'The scan shows one W and one w.',
  'evidence.value-claim': 'Winged dragons fly better, so W is the stronger allele.',
};

function sample(id: string, label: string, alleles: readonly [string, string]): DragonAnalysisSample {
  return {
    id,
    sampleType: 'dragon',
    role: 'specimen',
    label,
    generation: 0,
    genes: [{
      traitId: 'wings',
      geneId: 'W',
      chromosomeModel: 1,
      allelePair: [
        { id: `${id}:0`, geneId: 'W', symbol: alleles[0], parentSource: 'none', expression: 'dominant' },
        { id: `${id}:1`, geneId: 'W', symbol: alleles[1], parentSource: 'none', expression: 'recessive' },
      ],
      phenotypeId: 'Winged',
    }],
  };
}

function scene(
  phase: DragonVisualPhase,
  overrides: Partial<GenotypeScannerInstrument> = {},
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId: 'scan-scene',
    stationId: 'genotype-reveal',
    kind: 'genotype-scanner',
    mode: 'learn',
    phase,
    seed: 'seed-3',
    samples: [sample('scan-s11', 'Specimen S-11', ['W', 'w'])],
    instrument: {
      kind: 'genotype-scanner',
      sampleId: 'scan-s11',
      focusGeneId: 'W',
      genotypeRevealed: false,
      concealed: 'genotype',
      optionKind: 'genotype',
      options: [
        { id: 'WW', kind: 'genotype', alleles: ['W', 'W'] },
        { id: 'Ww', kind: 'genotype', alleles: ['W', 'w'] },
        { id: 'ww', kind: 'genotype', alleles: ['w', 'w'] },
      ],
      selectedOptionIds: [],
      optionStatuses: [],
      selectionLocked: false,
      evidenceMarks: [
        { id: 'pair-open', labelId: 'evidence.pair-open', anchorId: 'allele-slot-a' },
        { id: 'value-claim', labelId: 'evidence.value-claim', anchorId: 'genotype-option' },
      ],
      showHints: true,
      ...overrides,
    },
    metrics: [],
    selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
  };
}

describe('GenotypeScannerDisplayComponent', () => {
  let fixture: ComponentFixture<GenotypeScannerDisplayComponent>;
  let bridge: DragonVisualBridge;
  let events: DragonVisualStageEvent[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GenotypeScannerDisplayComponent] });
    bridge = TestBed.inject(DragonVisualBridge);
    fixture = TestBed.createComponent(GenotypeScannerDisplayComponent);
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

  it('draws the shielded chromosome pair and one option card per genotype record', () => {
    render(scene('predict'));

    expect(host().querySelectorAll('.option').length).toBe(3);
    // Each option card carries its own chromosome graphic from the allele diagram.
    expect(host().querySelectorAll('.option app-chromosome-pair').length).toBe(3);
    expect(host().querySelector('[data-target="concealed-allele-pair"] .shield')).toBeTruthy();
    expect(host().querySelector('.genotype-chip')?.textContent).toContain('— — —');
    expect(host().querySelector('.option small')?.textContent).toContain('homozygous dominant');
  });

  it('reports a selected genotype record as a semantic allele-selected event', () => {
    render(scene('predict'));
    host().querySelectorAll<HTMLButtonElement>('.option')[1].click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'allele-selected',
      targetId: 'Ww',
      value: 'select',
    }));
  });

  it('keeps the scan sealed until the lesson locks the selection', () => {
    render(scene('predict'));
    const control = host().querySelector<HTMLButtonElement>('[data-target="scan-control"]');
    expect(control?.disabled).toBeTrue();

    render(scene('manipulate', { selectionLocked: true, selectedOptionIds: ['WW', 'Ww'] }));
    expect(host().querySelector<HTMLButtonElement>('[data-target="scan-control"]')?.disabled).toBeFalse();
    host().querySelector<HTMLButtonElement>('[data-target="scan-control"]')?.click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'reveal-requested',
      targetId: 'scan-control',
    }));
  });

  it('opens the allele slots and evidence marks after the scan is revealed', () => {
    render(scene('explain', {
      genotypeRevealed: true,
      selectionLocked: true,
      selectedOptionIds: ['WW', 'Ww'],
      optionStatuses: [
        { optionId: 'WW', status: 'correct' },
        { optionId: 'Ww', status: 'correct' },
        { optionId: 'ww', status: 'pending' },
      ],
    }));

    expect(host().querySelector('[data-target="concealed-allele-pair"] .shield')).toBeNull();
    expect(host().querySelector('[data-target="allele-slot-a"]')?.textContent).toContain('W');
    expect(host().querySelector('.genotype-chip')?.textContent).toContain('Ww');
    expect(host().querySelectorAll('.option.correct').length).toBe(2);

    const marks = host().querySelectorAll<HTMLButtonElement>('.mark');
    expect(marks.length).toBe(2);
    expect(marks[0].disabled).toBeFalse();
    marks[0].click();

    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'evidence-pinned',
      targetId: 'pair-open',
    }));
  });

  it('publishes a live summary and applies theme colours as CSS custom properties', () => {
    render(scene('predict'));

    expect(host().querySelector('.console')?.classList).toContain('reduced-motion');
    // Asserted against the theme, not a literal: the point is that the theme
    // reaches the DOM, and pinning the hex here makes every retheme a test
    // failure in a file that has no opinion about which colour brass is.
    expect(host().querySelector<HTMLElement>('.console')?.style.getPropertyValue('--gs-brass'))
      .toBe(GENOTYPE_SCANNER_THEME.palette.brass);
    expect(host().querySelector('[aria-live="polite"]')?.textContent)
      .toContain('Allele pair is shielded.');
  });

  it('renders a placeholder when the bridge holds another station scene', () => {
    fixture.detectChanges();

    expect(host().querySelector('.console')).toBeNull();
    expect(host().querySelector('.station-idle')).toBeTruthy();
  });
});
