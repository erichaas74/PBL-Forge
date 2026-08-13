import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonHatcheryInstrument,
  DragonVisualPhase,
  DragonVisualScene,
} from '../../../../shared/dragon-visuals/domain/dragon-visual.models';
import { buildDragonHatcheryViewModel } from './dragon-hatchery.view-model';

const COPY = {
  'clutch.clutch-1.label': 'Ember × Tide · run 1',
  'sample.egg-1.caption': 'Incubation record only.',
  'trait.wings.name': 'Wings',
  'trait.fire.name': 'Fire breathing',
  'evidence.genotype-record': 'The DNA sample showed the allele pair.',
};

function egg(
  id: string,
  wings: readonly [string, string],
  fire: readonly [string, string],
): DragonAnalysisSample {
  return {
    id,
    sampleType: 'egg',
    role: 'offspring',
    label: `Hatchling ${id.slice(-1)}`,
    generation: 1,
    genes: [
      gene(id, 'wings', 'W', 1, wings, wings.includes('W') ? 'Winged' : 'Wingless'),
      gene(
        id,
        'fire',
        'F',
        2,
        fire,
        fire.includes('F') ? 'Breathes fire' : 'Does not breathe fire',
      ),
    ],
  };
}

function gene(
  sampleId: string,
  traitId: string,
  geneId: string,
  chromosomeModel: number,
  alleles: readonly [string, string],
  phenotypeId: string,
) {
  return {
    traitId,
    geneId,
    chromosomeModel,
    allelePair: [
      {
        id: `${sampleId}:${traitId}:0`,
        geneId,
        symbol: alleles[0],
        parentSource: 'parent-a' as const,
        expression: 'dominant' as const,
      },
      {
        id: `${sampleId}:${traitId}:1`,
        geneId,
        symbol: alleles[1],
        parentSource: 'parent-b' as const,
        expression: 'recessive' as const,
      },
    ] as const,
    phenotypeId,
  };
}

function sceneWith(
  phase: DragonVisualPhase,
  overrides: Partial<DragonHatcheryInstrument> = {},
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId: 'hatchery-scene',
    stationId: 'dragon-hatchery',
    kind: 'dragon-hatchery',
    mode: 'learn',
    phase,
    seed: 'seed-h',
    samples: [
      egg('egg-1', ['W', 'w'], ['F', 'f']),
      egg('egg-2', ['w', 'w'], ['f', 'f']),
      egg('egg-3', ['W', 'W'], ['F', 'F']),
    ],
    instrument: {
      kind: 'dragon-hatchery',
      clutchId: 'clutch-1',
      focusGeneId: 'W',
      eggs: [
        {
          eggId: 'egg-1',
          sampleId: 'egg-1',
          position: 1,
          examined: false,
          sampled: false,
          hatched: false,
        },
        {
          eggId: 'egg-2',
          sampleId: 'egg-2',
          position: 2,
          examined: false,
          sampled: false,
          hatched: false,
        },
        {
          eggId: 'egg-3',
          sampleId: 'egg-3',
          position: 3,
          examined: false,
          sampled: false,
          hatched: false,
        },
      ],
      activeEggId: 'egg-1',
      selectedEggIds: [],
      hatchLimit: 2,
      ...overrides,
    },
    metrics: [],
    selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
  };
}

describe('Dragon hatchery view model', () => {
  it('keeps every trait out of the view model until an egg is examined', () => {
    const model = buildDragonHatcheryViewModel(sceneWith('manipulate'), COPY);
    const first = model?.eggs[0];

    expect(first?.status).toBe('intact');
    expect(first?.traits).toEqual([]);
    expect(first?.phenotypeSummary).toBe('');
    expect(first?.genotypeLabel).toBeNull();
    // The sample carries "Winged"; an unopened egg must not publish it.
    expect(JSON.stringify(model?.eggs)).not.toContain('Winged');
    expect(model?.summary).toContain('Traits are unread until this egg is examined.');
  });

  it('publishes the trait readout after examining, and the allele pair only after sampling', () => {
    const examined = buildDragonHatcheryViewModel(
      sceneWith('manipulate', {
        eggs: [
          {
            eggId: 'egg-1',
            sampleId: 'egg-1',
            position: 1,
            examined: true,
            sampled: false,
            hatched: false,
          },
        ],
      }),
      COPY,
    );

    expect(examined?.eggs[0].status).toBe('examined');
    expect(examined?.eggs[0].traits.map((trait) => trait.phenotype)).toEqual([
      'Winged',
      'Breathes fire',
    ]);
    expect(examined?.eggs[0].traits.every((trait) => trait.genotype === null)).toBeTrue();
    expect(examined?.eggs[0].genotypeLabel).toBeNull();

    const sampled = buildDragonHatcheryViewModel(
      sceneWith('manipulate', {
        eggs: [
          {
            eggId: 'egg-1',
            sampleId: 'egg-1',
            position: 1,
            examined: true,
            sampled: true,
            hatched: false,
          },
        ],
      }),
      COPY,
    );

    expect(sampled?.eggs[0].status).toBe('sampled');
    expect(sampled?.eggs[0].genotypeLabel).toBe('Ww');
    expect(sampled?.eggs[0].focusTrait?.allelePair).toEqual(['W', 'w']);
    // The focus gene leads the readout so the module's gene is the one being reasoned about.
    expect(sampled?.eggs[0].focusTrait?.traitId).toBe('wings');
  });

  it('reveals what a hatched dragon shows without revealing its alleles', () => {
    const model = buildDragonHatcheryViewModel(
      sceneWith('reveal', {
        eggs: [
          {
            eggId: 'egg-1',
            sampleId: 'egg-1',
            position: 1,
            examined: false,
            sampled: false,
            hatched: true,
          },
        ],
        selectedEggIds: ['egg-1'],
        hatchCommitted: true,
      }),
      COPY,
    );

    expect(model?.eggs[0].status).toBe('hatched');
    expect(model?.eggs[0].phenotypeSummary).toBe('Winged · Breathes fire');
    expect(model?.eggs[0].genotypeLabel).toBeNull();
    expect(model?.hatchedEggs.length).toBe(1);
    expect(model?.hatchEnabled).toBeFalse();
  });

  it('opens the tools only while manipulating and the hatch only while revealing', () => {
    const observe = buildDragonHatcheryViewModel(sceneWith('observe'), COPY);
    expect(observe?.eggs.every((item) => !item.canExamine && !item.canSample)).toBeTrue();
    expect(observe?.eggs.every((item) => !item.canStage)).toBeTrue();

    const manipulate = buildDragonHatcheryViewModel(sceneWith('manipulate'), COPY);
    expect(manipulate?.eggs.every((item) => item.canExamine && item.canSample)).toBeTrue();
    expect(manipulate?.eggs.every((item) => item.canStage)).toBeTrue();
    expect(manipulate?.hatchEnabled).toBeFalse();

    const reveal = buildDragonHatcheryViewModel(
      sceneWith('reveal', { selectedEggIds: ['egg-1'] }),
      COPY,
    );
    expect(reveal?.eggs.every((item) => !item.canExamine)).toBeTrue();
    expect(reveal?.hatchEnabled).toBeTrue();
  });

  it('closes a tool when its budget is spent and stops staging at the hatch limit', () => {
    const spent = buildDragonHatcheryViewModel(
      sceneWith('manipulate', { examinesRemaining: 0, samplesRemaining: 1 }),
      COPY,
    );
    expect(spent?.eggs.every((item) => !item.canExamine)).toBeTrue();
    expect(spent?.eggs.every((item) => item.canSample)).toBeTrue();
    expect(spent?.tools.find((tool) => tool.id === 'examine')?.remaining).toBe(0);

    const full = buildDragonHatcheryViewModel(
      sceneWith('manipulate', { selectedEggIds: ['egg-1', 'egg-2'], hatchLimit: 2 }),
      COPY,
    );
    expect(full?.hatchSlotsLeft).toBe(0);
    expect(full?.tools.find((tool) => tool.id === 'hatch')?.remaining).toBe(0);
    // Staged eggs stay removable; unstaged ones are closed off.
    expect(full?.eggs.find((item) => item.id === 'egg-1')?.canStage).toBeTrue();
    expect(full?.eggs.find((item) => item.id === 'egg-3')?.canStage).toBeFalse();
  });

  it('offers only the tools the hosting module enabled', () => {
    const model = buildDragonHatcheryViewModel(
      sceneWith('manipulate', { availableToolIds: ['examine'] }),
      COPY,
    );

    expect(model?.tools.map((tool) => tool.id)).toEqual(['examine']);
    expect(model?.eggs.every((item) => item.canExamine)).toBeTrue();
    expect(model?.eggs.every((item) => !item.canSample && !item.canStage)).toBeTrue();
    expect(model?.stagingEnabled).toBeFalse();
  });

  it('locks an egg the module withheld', () => {
    const model = buildDragonHatcheryViewModel(
      sceneWith('manipulate', {
        eggs: [
          {
            eggId: 'egg-1',
            sampleId: 'egg-1',
            position: 1,
            examined: false,
            sampled: false,
            hatched: false,
            locked: true,
          },
        ],
      }),
      COPY,
    );

    expect(model?.eggs[0].locked).toBeTrue();
    expect(model?.eggs[0].canExamine).toBeFalse();
    expect(model?.eggs[0].canStage).toBeFalse();
    expect(model?.counts.available).toBe(0);
  });

  it('counts the clutch and describes it for a screen reader', () => {
    const model = buildDragonHatcheryViewModel(
      sceneWith('manipulate', {
        eggs: [
          {
            eggId: 'egg-1',
            sampleId: 'egg-1',
            position: 1,
            examined: true,
            sampled: true,
            hatched: false,
          },
          {
            eggId: 'egg-2',
            sampleId: 'egg-2',
            position: 2,
            examined: true,
            sampled: false,
            hatched: false,
          },
          {
            eggId: 'egg-3',
            sampleId: 'egg-3',
            position: 3,
            examined: false,
            sampled: false,
            hatched: false,
          },
        ],
        selectedEggIds: ['egg-2'],
      }),
      COPY,
    );

    expect(model?.counts).toEqual({
      total: 3,
      examined: 2,
      sampled: 1,
      hatched: 0,
      staged: 1,
      available: 3,
    });
    expect(model?.clutchLabel).toBe('Ember × Tide · run 1');
    expect(model?.summary).toContain('Clutch of 3 eggs: 2 examined, 1 sampled, 0 hatched.');
    expect(model?.summary).toContain('Allele pair for the focus gene: Ww.');
    expect(model?.summary).toContain('Hatch tray holds egg 2 of 2 allowed.');
  });

  it('returns null for a scene belonging to another instrument', () => {
    const other: DragonVisualScene = {
      ...sceneWith('observe'),
      kind: 'punnett-composer',
      instrument: {
        kind: 'punnett-composer',
        parentSampleIds: ['egg-1', 'egg-2'],
        focusGeneId: 'W',
        offspringCells: [],
      },
    };

    expect(buildDragonHatcheryViewModel(other, COPY)).toBeNull();
  });
});
