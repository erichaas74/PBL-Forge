import { validateDragonVisualScene } from '../../../shared/dragon-visuals';
import { DRAGON_PARENTS } from '../simulation/domain/dragon-inheritance';
import {
  createTraitInspectorScene,
  toDragonAnalysisSample,
} from './dragon-visual-scene.adapter';

describe('Dragon visual scene adapter', () => {
  it('maps genetics data into a renderer-owned analysis sample', () => {
    const sample = toDragonAnalysisSample(DRAGON_PARENTS[0], 'parent-a');

    expect(sample.id).toBe('ember');
    expect(sample.genes.length).toBe(4);
    expect(sample.genes.find(gene => gene.traitId === 'wings')?.allelePair
      .map(allele => allele.symbol)).toEqual(['W', 'w']);
    expect(sample.genes.every(gene =>
      gene.allelePair.every(allele => allele.parentSource === 'parent-a'),
    )).toBeTrue();
  });

  it('creates a valid scene without exposing the lesson store to graphics', () => {
    const scene = createTraitInspectorScene(
      DRAGON_PARENTS[0],
      'module-1-observation',
      'learn',
      'observe',
    );

    expect(validateDragonVisualScene(scene)).toEqual([]);
    expect(scene.kind).toBe('trait-inspector');
    expect(scene.samples[0].genes.find(gene => gene.traitId === 'wings')?.phenotypeId)
      .toBe('Winged');
    expect(scene.instrument.kind).toBe('trait-inspector');
  });
});
