import { DRAGON_VISUAL_CONTRACT_VERSION, DragonVisualScene } from '../../domain/dragon-visual.models';
import { buildGenomeMicroscopeViewModel } from './genome-microscope.view-model';

const COPY = {
  'sample.dragon.caption': 'Genome extract',
  'level.cell.title': 'Cell nucleus',
  'level.cell.caption': 'Holds chromosome pairs',
  'level.chromosome.title': 'Chromosome',
  'level.chromosome.caption': 'Packages DNA',
  'level.dna.title': 'DNA',
  'level.dna.caption': 'Genetic material',
  'level.gene.title': 'Gene locus',
  'level.gene.caption': 'A section of DNA',
  'level.allele.title': 'Allele pair',
  'level.allele.caption': 'Versions of a gene',
};

describe('Genome Microscope view model', () => {
  it('keeps the sample allele pair hidden until lesson state reveals the allele level', () => {
    const hidden = buildGenomeMicroscopeViewModel(scene(), COPY);
    const revealed = buildGenomeMicroscopeViewModel(scene({
      revealedLevelIds: ['cell', 'chromosome', 'dna', 'gene', 'allele'],
    }), COPY);

    expect(hidden?.summary).toContain('Alleles hidden');
    expect(revealed?.summary).toContain('Alleles W and w');
    expect(revealed?.gene?.allelePair).toEqual(['W', 'w']);
  });

  it('draws lesson-owned placement status without grading it in the renderer', () => {
    const model = buildGenomeMicroscopeViewModel(scene({
      labelPlacements: [{
        labelId: 'gene',
        levelId: 'dna',
        status: 'incorrect',
        revealed: true,
      }],
    }), COPY);

    const dna = model?.levels.find(level => level.id === 'dna');
    expect(dna?.placedLabel).toBe('Gene locus');
    expect(dna?.placement?.status).toBe('incorrect');
  });

  it('maps the five levels in the required containment order', () => {
    const model = buildGenomeMicroscopeViewModel(scene(), COPY);
    expect(model?.levels.map(level => level.id)).toEqual([
      'cell', 'chromosome', 'dna', 'gene', 'allele',
    ]);
  });
});

function scene(overrides: Partial<DragonVisualScene['instrument']> = {}): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId: 'genome-test',
    stationId: 'genome-decoder',
    kind: 'genome-microscope',
    mode: 'learn',
    phase: 'observe',
    seed: 'genome-test:ember',
    samples: [{
      id: 'ember',
      sampleType: 'dragon',
      role: 'specimen',
      label: 'Ember',
      generation: 0,
      genes: [{
        traitId: 'wings',
        geneId: 'W',
        chromosomeModel: 1,
        phenotypeId: 'Winged',
        allelePair: [
          { id: 'w-0', geneId: 'W', symbol: 'W', parentSource: 'none', expression: 'dominant' },
          { id: 'w-1', geneId: 'W', symbol: 'w', parentSource: 'none', expression: 'recessive' },
        ],
      }],
    }],
    instrument: {
      kind: 'genome-microscope',
      sampleId: 'ember',
      focusLevel: 'cell',
      focusGeneId: 'W',
      ...overrides,
    },
    metrics: [],
    selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
  } as DragonVisualScene;
}
