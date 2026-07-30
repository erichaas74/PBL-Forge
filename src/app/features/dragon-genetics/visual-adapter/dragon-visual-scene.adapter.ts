import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  DragonAnalysisSample,
  DragonVisualAlleleState,
  DragonVisualParentSource,
  DragonVisualScene,
  DragonVisualGeneState,
} from '../../../shared/dragon-visuals';
import {
  DRAGON_TRAITS,
  showsDominantPhenotype,
} from '../simulation/domain/dragon-inheritance';
import { DragonParentProfile } from '../simulation/domain/dragon-lab.models';

export function createTraitInspectorScene(
  profile: DragonParentProfile,
  sceneId: string,
  mode: DragonVisualScene['mode'],
  phase: DragonVisualScene['phase'],
): DragonVisualScene {
  return {
    contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
    sceneId,
    stationId: 'trait-detective',
    kind: 'trait-inspector',
    mode,
    phase,
    seed: `${sceneId}:${profile.id}`,
    samples: [toDragonAnalysisSample(profile, 'specimen')],
    instrument: {
      kind: 'trait-inspector',
      sampleId: profile.id,
      observations: [],
    },
    metrics: [],
    selection: {
      selectedIds: [],
      highlightedIds: [],
      disabledIds: [],
    },
  };
}

export function toDragonAnalysisSample(
  profile: DragonParentProfile & { generation?: number; parentIds?: readonly [string, string] },
  role: DragonAnalysisSample['role'],
): DragonAnalysisSample {
  const parentSource = sourceForRole(role);
  const traits = DRAGON_TRAITS.map(trait => {
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
    sampleType: role === 'offspring' ? 'offspring' : 'dragon',
    role,
    label: profile.name,
    generation: profile.generation ?? 0,
    genes: traits,
    parentIds: profile.parentIds,
  };
}

function sourceForRole(role: DragonAnalysisSample['role']): DragonVisualParentSource {
  if (role === 'parent-a') return 'parent-a';
  if (role === 'parent-b') return 'parent-b';
  return 'none';
}
