import {
  AlleleSwitchboardSceneInput,
  createAlleleSwitchboardScene,
} from '../../../../features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter';
import { DRAGON_PARENTS } from '../../../../features/dragon-genetics/simulation/domain/dragon-inheritance';
import { buildAlleleSwitchboardViewModel } from './allele-switchboard.view-model';

describe('Allele switchboard view model', () => {
  it('keeps both working alleles visible and preserves controller-owned heterozygous data', () => {
    const model = buildAlleleSwitchboardViewModel(scene('reveal', {
      workingAlleles: ['W', 'w'],
      predictedPhenotypeId: 'dominant',
      actualPhenotypeId: 'dominant',
      dominantSignalPresent: true,
      recessiveSignalPresent: true,
      genotypeClassId: 'heterozygous',
      carrierState: true,
      expressionRevealed: true,
    }));

    expect(model?.workingAlleles).toEqual(['W', 'w']);
    expect(model?.genotypeClassLabel).toBe('Heterozygous');
    expect(model?.carrierState).toBeTrue();
    expect(model?.recessiveSignalPresent).toBeTrue();
    expect(model?.summary).toContain('Both alleles remain visible');
  });

  it('does not reveal a lesson result before the expression trace', () => {
    const model = buildAlleleSwitchboardViewModel(scene('predict', {
      predictedPhenotypeId: 'dominant',
      actualPhenotypeId: null,
      genotypeClassId: null,
      expressionRevealed: false,
    }));

    expect(model?.expressionRevealed).toBeFalse();
    expect(model?.actualPhenotypeId).toBeNull();
    expect(model?.genotypeClassLabel).toBe('Unresolved');
    expect(model?.predictionEnabled).toBeTrue();
    expect(model?.summary).toContain('Expression result hidden');
  });

  it('maps the vial rack, assigned sample, chamber, and centered locus without revealing the target early', () => {
    const model = buildAlleleSwitchboardViewModel(scene('observe', {
      sampleCode: 'EX-W-104',
      sampleLabel: 'Ember wing-tissue extract',
      sampleVials: [
        { code: 'EX-W-104', label: 'Ember wing-tissue extract', selected: true, loaded: true },
        { code: 'EX-F-212', label: 'Moss fire-gland extract', selected: false, loaded: false },
      ],
      observeStep: 'locate-gene',
      chamberLocked: true,
      chromosomeNumber: 5,
      nearbyGeneIds: ['C', 'F', 'W', 'T'],
      centeredGeneId: 'F',
      geneLocationLocked: false,
      locatorHintVisible: false,
    }));

    expect(model?.sample.code).toBe('EX-W-104');
    expect(model?.hasLoadedVial).toBeTrue();
    expect(model?.chamberLocked).toBeTrue();
    expect(model?.loci.find(locus => locus.geneId === 'F')?.centered).toBeTrue();
    expect(model?.loci.find(locus => locus.geneId === 'W')?.targetVisible).toBeFalse();
    expect(model?.tokenEnabled).toBeFalse();
  });

  it('unlocks cartridges after locus lock and evidence only after interpretation lock', () => {
    const manipulate = buildAlleleSwitchboardViewModel(scene('manipulate', {
      geneLocationLocked: true,
      centeredGeneId: 'W',
    }));
    const beforeInterpretation = buildAlleleSwitchboardViewModel(scene('explain', {
      geneLocationLocked: true,
      expressionRevealed: true,
      interpretationLocked: false,
    }));
    const afterInterpretation = buildAlleleSwitchboardViewModel(scene('explain', {
      geneLocationLocked: true,
      expressionRevealed: true,
      interpretationLocked: true,
      interpretationGenotypeClassId: 'heterozygous',
    }));

    expect(manipulate?.tokenEnabled).toBeTrue();
    expect(manipulate?.slotEnabled).toBeTrue();
    expect(manipulate?.loci.find(locus => locus.geneId === 'W')?.locked).toBeTrue();
    expect(beforeInterpretation?.evidence.every(item => !item.enabled)).toBeTrue();
    expect(afterInterpretation?.evidence.every(item => item.enabled)).toBeTrue();
  });

  it('marks official state without adding renderer-owned correctness', () => {
    const model = buildAlleleSwitchboardViewModel(createAlleleSwitchboardScene(
      DRAGON_PARENTS[0],
      'module-4-official',
      'official',
      'predict',
      baseInput(),
    ));

    expect(model?.officialHidden).toBeTrue();
    expect(model?.evidence.some(item => item.enabled)).toBeFalse();
  });
});

function scene(
  phase: 'observe' | 'manipulate' | 'predict' | 'reveal' | 'explain' | 'review',
  overrides: Partial<AlleleSwitchboardSceneInput> = {},
) {
  return createAlleleSwitchboardScene(
    DRAGON_PARENTS[0],
    `module-4-${phase}`,
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
    observeStep: 'select-sample' as const,
    chamberLocked: false,
    sampleMismatch: false,
    chromosomeNumber: 5,
    nearbyGeneIds: ['C', 'F', 'W', 'T'],
    centeredGeneId: 'C',
    geneLocationLocked: false,
    locatorHintVisible: false,
    focusGeneId: 'W',
    dominantAllele: 'W',
    recessiveAllele: 'w',
    startingAlleles: ['w', 'w'] as const,
    requestedAlleles: ['W', 'w'] as const,
    workingAlleles: ['W', 'w'] as const,
    dominantPhenotypeId: 'Winged',
    recessivePhenotypeId: 'Wingless',
    predictedPhenotypeId: null,
    actualPhenotypeId: null,
    genotypeClassId: null,
    carrierState: false,
    expressionRevealed: false,
    interpretationLocked: false,
    evidenceMarks: [
      { id: 'recessive-remains-present', labelId: 'evidence.recessive-remains-present', anchorId: 'carrier-indicator' },
    ],
  };
}
