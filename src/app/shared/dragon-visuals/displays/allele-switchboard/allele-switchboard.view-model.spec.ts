import { createAlleleSwitchboardScene } from '../../../../features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter';
import { DRAGON_PARENTS } from '../../../../features/dragon-genetics/simulation/domain/dragon-inheritance';
import { buildAlleleSwitchboardViewModel } from './allele-switchboard.view-model';

describe('Allele switchboard view model', () => {
  it('keeps both working alleles visible while using lesson-owned expression state', () => {
    const scene = createAlleleSwitchboardScene(
      DRAGON_PARENTS[0],
      'module-4-test',
      'practice',
      'reveal',
      {
        focusGeneId: 'W',
        dominantAllele: 'W',
        recessiveAllele: 'w',
        startingAlleles: ['w', 'w'],
        requestedAlleles: ['W', 'w'],
        workingAlleles: ['W', 'w'],
        dominantPhenotypeId: 'Winged',
        recessivePhenotypeId: 'Wingless',
        predictedPhenotypeId: 'dominant',
        actualPhenotypeId: 'dominant',
        genotypeClassId: 'heterozygous',
        carrierState: true,
        expressionRevealed: true,
      },
    );

    const model = buildAlleleSwitchboardViewModel(scene);

    expect(model?.workingAlleles).toEqual(['W', 'w']);
    expect(model?.genotypeClassLabel).toBe('Heterozygous');
    expect(model?.carrierState).toBeTrue();
    expect(model?.summary).toContain('Both alleles remain visible');
  });

  it('does not reveal a lesson result before the expression trace', () => {
    const scene = createAlleleSwitchboardScene(
      DRAGON_PARENTS[2],
      'module-4-hidden',
      'learn',
      'predict',
      {
        focusGeneId: 'F',
        dominantAllele: 'F',
        recessiveAllele: 'f',
        startingAlleles: ['F', 'f'],
        requestedAlleles: ['f', 'f'],
        workingAlleles: ['f', 'f'],
        dominantPhenotypeId: 'Breathes fire',
        recessivePhenotypeId: 'Does not breathe fire',
      },
    );

    const model = buildAlleleSwitchboardViewModel(scene);
    expect(model?.expressionRevealed).toBeFalse();
    expect(model?.actualPhenotypeId).toBeNull();
    expect(model?.predictionEnabled).toBeTrue();
  });
});
