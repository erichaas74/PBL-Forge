import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonScannerOptionStatus,
  DragonVisualPhase,
  DragonVisualScene,
  GenotypeScannerInstrument,
} from '../../domain/dragon-visual.models';
import { buildGenotypeScannerViewModel } from './genotype-scanner.view-model';

const COPY = {
  'sample.scan-s11.caption': 'Intake 05-02 · records only.',
  'phenotype.wings.dominant': 'Winged',
  'evidence.pair-open': 'The scan shows one W and one w.',
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

function sceneWith(
  phase: DragonVisualPhase,
  overrides: Partial<GenotypeScannerInstrument> = {},
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId: 'scan-scene',
    stationId: 'genotype-reveal',
    kind: 'genotype-scanner',
    mode: 'practice',
    phase,
    seed: 'seed-3',
    samples: [sample('scan-s11', 'Specimen S-11', ['W', 'w']), sample('scan-s13', 'Specimen S-13', ['W', 'W'])],
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
      evidenceMarks: [{ id: 'pair-open', labelId: 'evidence.pair-open', anchorId: 'allele-slot-a' }],
      showHints: false,
      ...overrides,
    },
    metrics: [],
    selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
  };
}

describe('Genotype scanner view model', () => {
  it('keeps the scanned allele pair out of the view model until the lesson opens the scan', () => {
    const model = buildGenotypeScannerViewModel(sceneWith('predict'), COPY);

    expect(model?.genotypeConcealed).toBeTrue();
    expect(model?.sample.allelePair).toBeNull();
    expect(model?.sample.genotypeLabel).toBe('— — —');
    expect(model?.summary).toContain('Allele pair is shielded.');
    // The selectable records may name Ww; the sample's own scan must not.
    expect(JSON.stringify(model?.sample)).not.toContain('Ww');
  });

  it('publishes the allele pair and the lesson verdicts once the scan is open', () => {
    const statuses: DragonScannerOptionStatus[] = [
      { optionId: 'WW', status: 'correct' },
      { optionId: 'Ww', status: 'missed' },
      { optionId: 'ww', status: 'incorrect' },
    ];
    const model = buildGenotypeScannerViewModel(
      sceneWith('reveal', {
        genotypeRevealed: true,
        selectedOptionIds: ['WW', 'ww'],
        optionStatuses: statuses,
        selectionLocked: true,
      }),
      COPY,
    );

    expect(model?.sample.allelePair).toEqual(['W', 'w']);
    expect(model?.sample.genotypeLabel).toBe('Ww');
    expect(model?.options.map(option => option.status)).toEqual(['correct', 'missed', 'incorrect']);
    expect(model?.selectedCount).toBe(2);
  });

  it('seals the readout instead of the scan for genotype-first tasks', () => {
    const model = buildGenotypeScannerViewModel(
      sceneWith('predict', {
        concealed: 'phenotype',
        optionKind: 'phenotype',
        options: [
          { id: 'dominant-readout', kind: 'phenotype', labelId: 'phenotype.wings.dominant' },
        ],
      }),
      COPY,
    );

    expect(model?.phenotypeConcealed).toBeTrue();
    expect(model?.phenotypeText).toBe('— — —');
    expect(model?.sample.allelePair).toEqual(['W', 'w']);
    expect(model?.options[0].label).toBe('Winged');
  });

  it('opens selection only while predicting and evidence only while explaining', () => {
    const predict = buildGenotypeScannerViewModel(sceneWith('predict'), COPY);
    expect(predict?.options.every(option => option.enabled)).toBeTrue();
    expect(predict?.scanEnabled).toBeFalse();
    expect(predict?.evidenceMarks.every(mark => !mark.enabled)).toBeTrue();

    const locked = buildGenotypeScannerViewModel(sceneWith('predict', { selectionLocked: true }), COPY);
    expect(locked?.options.every(option => !option.enabled)).toBeTrue();

    const manipulate = buildGenotypeScannerViewModel(sceneWith('manipulate', { selectionLocked: true }), COPY);
    expect(manipulate?.scanEnabled).toBeTrue();

    const explain = buildGenotypeScannerViewModel(
      sceneWith('explain', { genotypeRevealed: true, selectionLocked: true }),
      COPY,
    );
    expect(explain?.evidenceMarks.every(mark => mark.enabled)).toBeTrue();
    expect(explain?.scanEnabled).toBeFalse();
  });

  it('shows zygosity hints only when the mode allows them', () => {
    const plain = buildGenotypeScannerViewModel(sceneWith('predict'), COPY);
    expect(plain?.options.every(option => option.zygosity === '')).toBeTrue();

    const guided = buildGenotypeScannerViewModel(sceneWith('predict', { showHints: true }), COPY);
    expect(guided?.options.map(option => option.zygosity))
      .toEqual(['homozygous dominant', 'heterozygous', 'homozygous recessive']);
  });

  it('maps the comparison sample so equal readouts can be compared', () => {
    const model = buildGenotypeScannerViewModel(
      sceneWith('reveal', { genotypeRevealed: true, comparisonSampleId: 'scan-s13' }),
      COPY,
    );

    expect(model?.comparison?.label).toBe('Specimen S-13');
    expect(model?.comparison?.genotypeLabel).toBe('WW');
    expect(model?.summary).toContain('Comparison sample Specimen S-13 shows Winged with genotype WW.');
  });
});
