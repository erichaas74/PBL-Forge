import { ARENA_BUILD_TRAITS } from './dragon-inheritance';
import {
  DragonLabGenome,
  DragonTraitDefinition,
  DragonTraitGenotype,
} from './dragon-lab.models';

export type DragonBodyTypeId =
  | 'regal-dragon'
  | 'bulwark-dragon'
  | 'sky-courser-dragon'
  | 'marsh-prowler-dragon'
  | 'double-wing-dragon'
  | 'long-serpent-dragon';

export type DragonBodyGeneId =
  | 'body-type'
  | 'secondary-wings'
  | 'tail-length'
  | 'armor';

type DragonBodyPresetGeneId = DragonBodyGeneId | 'wings' | 'horns' | 'tail';

export interface DragonBodyTypeDefinition {
  readonly id: DragonBodyTypeId;
  readonly name: string;
  readonly description: string;
  readonly genotypes: Readonly<Record<DragonBodyPresetGeneId, DragonTraitGenotype>>;
}

const BODY_GENE_IDS: readonly DragonBodyGeneId[] = [
  'body-type',
  'secondary-wings',
  'tail-length',
  'armor',
];

export const DRAGON_BODY_GENES: readonly DragonTraitDefinition<DragonBodyGeneId>[] =
  BODY_GENE_IDS.map((id) => {
    const trait = ARENA_BUILD_TRAITS.find((candidate) => candidate.id === id);
    if (!trait) throw new Error(`Missing Arena body gene: ${id}`);
    return trait as DragonTraitDefinition<DragonBodyGeneId>;
  });

/**
 * The six classic body types expressed by the Arena build genome.
 *
 * These are genetic starting points, not locked art presets. D, M, Q and T select the chassis;
 * W controls wings, while H and K give the starting types different horn and tail terminals. Every
 * gene remains editable, so a teacher can start with a recognizable type and then test a hybrid.
 */
export const DRAGON_BODY_TYPES: readonly DragonBodyTypeDefinition[] = [
  bodyType(
    'regal-dragon',
    'Regal Dragon',
    'High-chested and armored, with one classic wing pair.',
    ['D', 'd'], ['q', 'q'], ['t', 't'], ['M', 'm'], ['W', 'w'], ['H', 'h'], ['K', 'k'],
  ),
  bodyType(
    'bulwark-dragon',
    'Bulwark Dragon',
    'Low, broad, and heavily armored for a load-bearing silhouette.',
    ['d', 'd'], ['q', 'q'], ['t', 't'], ['M', 'm'], ['W', 'w'], ['H', 'H'], ['K', 'K'],
  ),
  bodyType(
    'sky-courser-dragon',
    'Sky Courser Dragon',
    'High-chested and lightly armored for a narrow flying frame.',
    ['D', 'd'], ['q', 'q'], ['t', 't'], ['m', 'm'], ['W', 'w'], ['H', 'h'], ['K', 'k'],
  ),
  bodyType(
    'marsh-prowler-dragon',
    'Marsh Prowler Dragon',
    'Low-slung, short-tailed, and lightly armored for a crouched frame.',
    ['d', 'd'], ['q', 'q'], ['t', 't'], ['m', 'm'], ['W', 'w'], ['h', 'h'], ['k', 'k'],
  ),
  bodyType(
    'double-wing-dragon',
    'Double-Wing Dragon',
    'Expresses a real second pair of independently joined wings.',
    ['D', 'd'], ['Q', 'q'], ['t', 't'], ['m', 'm'], ['W', 'w'], ['H', 'H'], ['K', 'k'],
  ),
  bodyType(
    'long-serpent-dragon',
    'Long Serpent Dragon',
    'Wingless and long-tailed, with six legs and a stinger on a serpentine chassis.',
    ['d', 'd'], ['q', 'q'], ['T', 't'], ['m', 'm'], ['w', 'w'], ['H', 'h'], ['k', 'k'],
  ),
];

export function bodyGenomeForType(
  genome: DragonLabGenome,
  typeId: DragonBodyTypeId,
): DragonLabGenome {
  const type = dragonBodyType(typeId);
  return {
    ...genome,
    ...cloneGenotypes(type.genotypes),
  };
}

export function isDragonBodyType(genome: DragonLabGenome, typeId: DragonBodyTypeId): boolean {
  const expected = dragonBodyType(typeId).genotypes;
  return (Object.entries(expected) as [DragonBodyPresetGeneId, DragonTraitGenotype][])
    .every(([traitId, genotype]) => sameGenotype(genome[traitId], genotype));
}

function bodyType(
  id: DragonBodyTypeId,
  name: string,
  description: string,
  bodyPlan: DragonTraitGenotype,
  secondaryWings: DragonTraitGenotype,
  tailLength: DragonTraitGenotype,
  armor: DragonTraitGenotype,
  wings: DragonTraitGenotype,
  horns: DragonTraitGenotype,
  tail: DragonTraitGenotype,
): DragonBodyTypeDefinition {
  return {
    id,
    name,
    description,
    genotypes: {
      'body-type': bodyPlan,
      'secondary-wings': secondaryWings,
      'tail-length': tailLength,
      armor,
      wings,
      horns,
      tail,
    },
  };
}

function dragonBodyType(typeId: DragonBodyTypeId): DragonBodyTypeDefinition {
  const type = DRAGON_BODY_TYPES.find((candidate) => candidate.id === typeId);
  if (!type) throw new Error(`Unknown dragon body type: ${typeId}`);
  return type;
}

function cloneGenotypes(
  genotypes: Readonly<Record<DragonBodyPresetGeneId, DragonTraitGenotype>>,
): Record<DragonBodyPresetGeneId, DragonTraitGenotype> {
  return Object.fromEntries(
    Object.entries(genotypes).map(([traitId, genotype]) => [traitId, [...genotype]]),
  ) as Record<DragonBodyPresetGeneId, DragonTraitGenotype>;
}

function sameGenotype(
  actual: DragonTraitGenotype | undefined,
  expected: DragonTraitGenotype,
): boolean {
  return actual?.join('|') === expected.join('|');
}
