import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonEggRecord,
  DragonEvidenceMark,
  DragonHatcheryToolId,
  DragonVisualAlleleState,
  DragonVisualGeneState,
  DragonVisualMetric,
  DragonVisualParentSource,
  DragonVisualScene,
  DragonVisualSelection,
} from '../../../../shared/dragon-visuals';
import { DRAGON_TRAITS, showsDominantPhenotype } from '../../simulation/domain/dragon-inheritance';
import { DragonParentProfile } from '../../simulation/domain/dragon-lab.models';

export type DragonHatcheryEggProfile = DragonParentProfile & {
  generation?: number;
  parentIds?: readonly [string, string];
};

export interface DragonHatcherySceneInput {
  clutchId: string;
  eggs: readonly DragonHatcheryEggProfile[];
  parents?: readonly [DragonParentProfile, DragonParentProfile] | null;
  examinedEggIds?: readonly string[];
  sampledEggIds?: readonly string[];
  hatchedEggIds?: readonly string[];
  lockedEggIds?: readonly string[];
  focusGeneId?: string;
  activeEggId?: string | null;
  selectedEggIds?: readonly string[];
  activeToolId?: DragonHatcheryToolId;
  availableToolIds?: readonly DragonHatcheryToolId[];
  examinesRemaining?: number | null;
  samplesRemaining?: number | null;
  hatchLimit?: number | null;
  hatchCommitted?: boolean;
  metrics?: readonly DragonVisualMetric[];
  evidenceMarks?: readonly DragonEvidenceMark[];
  evidenceMarkId?: string | null;
  showHints?: boolean;
  seed?: string;
  selection?: Partial<DragonVisualSelection>;
}

/** Maps the hatchery's lesson state to the renderer's stable visual contract. */
export function createDragonHatcheryScene(
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
  input: DragonHatcherySceneInput,
): DragonVisualScene {
  const examined = new Set(input.examinedEggIds ?? []);
  const sampled = new Set(input.sampledEggIds ?? []);
  const hatched = new Set(input.hatchedEggIds ?? []);
  const locked = new Set(input.lockedEggIds ?? []);
  const parents = input.parents ?? null;
  const eggs: readonly DragonEggRecord[] = input.eggs.map((egg, index) => ({
    eggId: egg.id,
    sampleId: egg.id,
    position: index + 1,
    examined: examined.has(egg.id),
    sampled: sampled.has(egg.id),
    hatched: hatched.has(egg.id),
    locked: locked.has(egg.id),
  }));

  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'dragon-hatchery',
    kind: 'dragon-hatchery',
    mode,
    phase,
    seed: input.seed ?? `${sceneId}:${input.clutchId}`,
    samples: [
      ...(parents
        ? [
            toDragonAnalysisSample(parents[0], 'parent-a'),
            toDragonAnalysisSample(parents[1], 'parent-b'),
          ]
        : []),
      ...input.eggs.map((egg) => toDragonAnalysisSample(egg, 'offspring', 'egg')),
    ],
    instrument: {
      kind: 'dragon-hatchery',
      clutchId: input.clutchId,
      parentSampleIds: parents ? [parents[0].id, parents[1].id] : undefined,
      focusGeneId: input.focusGeneId,
      eggs,
      activeEggId: input.activeEggId ?? null,
      selectedEggIds: input.selectedEggIds ?? [],
      activeToolId: input.activeToolId,
      availableToolIds: input.availableToolIds,
      examinesRemaining: input.examinesRemaining ?? null,
      samplesRemaining: input.samplesRemaining ?? null,
      hatchLimit: input.hatchLimit ?? null,
      hatchCommitted: input.hatchCommitted ?? false,
      evidenceMarks: input.evidenceMarks ?? [],
      evidenceMarkId: input.evidenceMarkId ?? null,
      showHints: input.showHints ?? false,
    },
    metrics: input.metrics ?? [],
    selection: {
      selectedIds: input.selection?.selectedIds ?? [],
      highlightedIds: input.selection?.highlightedIds ?? [],
      disabledIds: input.selection?.disabledIds ?? [],
    },
    focusGeneId: input.focusGeneId,
  };
}

export function toDragonAnalysisSample(
  profile: DragonHatcheryEggProfile,
  role: DragonAnalysisSample['role'],
  sampleType?: DragonAnalysisSample['sampleType'],
): DragonAnalysisSample {
  const parentSource = sourceForRole(role);
  const genes = DRAGON_TRAITS.map((trait) => {
    const genotype = profile.genome[trait.id];
    const dominant = showsDominantPhenotype(genotype, trait.id);
    const allele = (symbol: string, index: number): DragonVisualAlleleState => ({
      id: `${profile.id}:${trait.id}:${index}`,
      geneId: trait.geneSymbol,
      symbol,
      parentSource,
      expression: symbol === trait.dominantAllele ? 'dominant' : 'recessive',
    });
    const allelePair: DragonVisualGeneState['allelePair'] = [
      allele(genotype[0], 0),
      allele(genotype[1], 1),
    ];
    return {
      traitId: trait.id,
      geneId: trait.geneSymbol,
      chromosomeModel: trait.chromosomeModel,
      allelePair,
      phenotypeId: dominant ? trait.dominantPhenotype : trait.recessivePhenotype,
    };
  });

  return {
    id: profile.id,
    sampleType: sampleType ?? (role === 'offspring' ? 'offspring' : 'dragon'),
    role,
    label: profile.name,
    generation: profile.generation ?? 0,
    genes,
    parentIds: profile.parentIds,
  };
}

function sourceForRole(role: DragonAnalysisSample['role']): DragonVisualParentSource {
  if (role === 'parent-a') return 'parent-a';
  if (role === 'parent-b') return 'parent-b';
  return 'none';
}
