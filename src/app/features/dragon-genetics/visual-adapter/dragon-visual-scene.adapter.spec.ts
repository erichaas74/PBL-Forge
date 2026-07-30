import { validateDragonVisualScene } from '../../../shared/dragon-visuals';
import { DRAGON_PARENTS } from '../simulation/domain/dragon-inheritance';
import {
  TRAIT_EVIDENCE_SPECIMEN,
  traitEvidenceObservation,
} from '../simulation/data/trait-evidence-content';
import {
  createGenomeMicroscopeScene,
  createAlleleSwitchboardScene,
  createTraitInspectorScene,
  toDragonAnalysisSample,
  toVisualClues,
  toVisualObservations,
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

  it('carries curriculum observations into the scene as label IDs only', () => {
    const observations = [traitEvidenceObservation('scar')];
    const scene = createTraitInspectorScene(
      TRAIT_EVIDENCE_SPECIMEN,
      'module-1-trait-evidence-learn',
      'learn',
      'observe',
      {
        observations: toVisualObservations(observations),
        clues: toVisualClues(observations),
        activeObservationId: 'scar',
      },
    );

    expect(validateDragonVisualScene(scene)).toEqual([]);
    if (scene.instrument.kind !== 'trait-inspector') throw new Error('Wrong instrument.');
    expect(scene.instrument.observations[0].labelId).toBe('observation.scar.label');
    expect(scene.instrument.clues?.length).toBe(3);
    expect(JSON.stringify(scene.instrument)).not.toContain('thornbrush');
  });

  it('creates a valid Genome Microscope scene from a selected sample and focus gene', () => {
    const scene = createGenomeMicroscopeScene(
      DRAGON_PARENTS[0],
      'module-2-genome',
      'practice',
      'predict',
      {
        focusGeneId: 'W',
        requestedLevel: 'allele',
        taskId: 'find-allele-versions',
        lockedPrediction: null,
      },
    );

    expect(validateDragonVisualScene(scene)).toEqual([]);
    expect(scene.kind).toBe('genome-microscope');
    expect(scene.instrument.kind === 'genome-microscope'
      ? scene.instrument.focusGeneId
      : null).toBe('W');
    expect(scene.samples[0].genes.find(gene => gene.geneId === 'W')?.allelePair
      .map(allele => allele.symbol)).toEqual(['W', 'w']);
  });

  it('creates a valid Allele Workbench scene with data-driven allele symbols', () => {
    const scene = createAlleleSwitchboardScene(
      DRAGON_PARENTS[1],
      'module-4-alleles',
      'practice',
      'manipulate',
      {
        focusGeneId: 'H',
        dominantAllele: 'H',
        recessiveAllele: 'h',
        startingAlleles: ['H', 'h'],
        requestedAlleles: ['H', 'H'],
        workingAlleles: ['H', 'H'],
        dominantPhenotypeId: 'Horned',
        recessivePhenotypeId: 'Smooth-headed',
      },
    );

    expect(validateDragonVisualScene(scene)).toEqual([]);
    expect(scene.instrument.kind === 'allele-switchboard'
      ? scene.instrument.workingAlleles
      : null).toEqual(['H', 'H']);
  });
});
