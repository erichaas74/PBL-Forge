import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  CONSERVATION_LOCI,
  ConservationGenome,
  ConservationLocusId,
  GenotypePair,
  GenerationRecord,
  ISLAND_DEFINITIONS,
  IslandDefinition,
  IslandDiversityWorld,
  IslandId,
  IslandMetrics,
  IslandPopulation,
  PopulationDragon,
} from './island-diversity.models';

interface PopulationProfile {
  size: number;
  upperFrequency: Readonly<Record<ConservationLocusId, number>>;
  lineageCount: number;
}

const POPULATION_PROFILES: Readonly<Record<IslandId, PopulationProfile>> = {
  'founders-isle': {
    size: 15,
    upperFrequency: { horn: 0.18, heat: 0.72, moonfade: 0.84 },
    lineageCount: 3,
  },
  stormbreak: {
    size: 12,
    upperFrequency: { horn: 0.78, heat: 0.22, moonfade: 0.88 },
    lineageCount: 2,
  },
  moonmist: {
    size: 18,
    upperFrequency: { horn: 0.55, heat: 0.62, moonfade: 0.55 },
    lineageCount: 3,
  },
  'twin-horn-west': {
    size: 16,
    upperFrequency: { horn: 0.25, heat: 0.78, moonfade: 0.9 },
    lineageCount: 4,
  },
  'twin-horn-east': {
    size: 16,
    upperFrequency: { horn: 0.8, heat: 0.35, moonfade: 0.76 },
    lineageCount: 4,
  },
  'ash-island': {
    size: 19,
    upperFrequency: { horn: 0.62, heat: 0.64, moonfade: 0.9 },
    lineageCount: 5,
  },
  sanctuary: {
    size: 10,
    upperFrequency: { horn: 0.5, heat: 0.5, moonfade: 0.84 },
    lineageCount: 6,
  },
};

const DRAGON_NAMES = [
  'Aster',
  'Bracken',
  'Cirrus',
  'Dune',
  'Echo',
  'Fennel',
  'Gale',
  'Harbor',
  'Iris',
  'Juniper',
  'Kelp',
  'Lumen',
  'Mica',
  'Nettle',
  'Oriel',
  'Pebble',
  'Quill',
  'Reef',
  'Sable',
  'Thistle',
  'Umber',
  'Vale',
  'Wisp',
  'Yarrow',
];

const DRAGON_COLORS = ['#385e68', '#756081', '#6c774d', '#80574e', '#496785', '#7b6d3f'];
const DRAGON_ACCENTS = ['#8dd9d0', '#d1a6e4', '#c5d879', '#eba27d', '#82bdea', '#e6cc78'];

export interface AccountConservationCandidate {
  id: string;
  name: string;
  color: string;
  accentColor: string;
}

export function createInitialWorld(studentId: string): IslandDiversityWorld {
  const seed = `archipelago:${normalizeWorkstationStudentId(studentId)}`;
  const islands = Object.fromEntries(
    ISLAND_DEFINITIONS.map((definition) => {
      const population = createPopulation(definition, POPULATION_PROFILES[definition.id], seed);
      return [definition.id, population];
    }),
  ) as Record<IslandId, IslandPopulation>;
  return {
    schemaVersion: 1,
    seed,
    researchCredits: 14,
    scannedDragonIds: [],
    admittedAccountDragonIds: [],
    islands,
    relocations: [],
    notes: {},
    updatedAtIso: new Date().toISOString(),
  };
}

export function metricsForIsland(population: IslandPopulation): IslandMetrics {
  const populationSize = population.dragons.length;
  const alleleFrequencies = (Object.keys(CONSERVATION_LOCI) as ConservationLocusId[]).map(
    (locusId) => {
      const locus = CONSERVATION_LOCI[locusId];
      const alleles = population.dragons.flatMap((dragon) => dragon.genome[locusId]);
      const upperCount = alleles.filter((allele) => allele === locus.upperAllele).length;
      const upperFrequency = alleles.length ? upperCount / alleles.length : 0;
      return {
        locusId,
        locusName: locus.name,
        upperAllele: locus.upperAllele,
        lowerAllele: locus.lowerAllele,
        upperFrequency,
        lowerFrequency: alleles.length ? 1 - upperFrequency : 0,
      };
    },
  );
  const observedHeterozygosity = populationSize
    ? population.dragons.reduce(
        (sum, dragon) =>
          sum +
          (Object.keys(CONSERVATION_LOCI) as ConservationLocusId[]).filter(
            (locusId) => dragon.genome[locusId][0] !== dragon.genome[locusId][1],
          ).length,
        0,
      ) /
      (populationSize * 3)
    : 0;
  const retainedAlleleShare =
    alleleFrequencies.reduce(
      (count, record) =>
        count + Number(record.upperFrequency > 0) + Number(record.lowerFrequency > 0),
      0,
    ) / 6;
  const diversityPercent = Math.round(
    100 * Math.min(1, observedHeterozygosity * 1.4 * 0.7 + retainedAlleleShare * 0.3),
  );
  const lineageCounts = population.dragons.reduce<Record<string, number>>((counts, dragon) => {
    counts[dragon.lineageId] = (counts[dragon.lineageId] ?? 0) + 1;
    return counts;
  }, {});
  const largestLineageShare = populationSize
    ? Math.max(0, ...Object.values(lineageCounts)) / populationSize
    : 1;
  const relatedness =
    largestLineageShare >= 0.5 ? 'High' : largestLineageShare >= 0.32 ? 'Moderate' : 'Low';
  const rareAlleles = alleleFrequencies.reduce(
    (count, record) =>
      count +
      Number(record.upperFrequency > 0 && record.upperFrequency <= 0.15) +
      Number(record.lowerFrequency > 0 && record.lowerFrequency <= 0.15),
    0,
  );
  const affectedDragons = population.dragons.filter((dragon) => isMoonfadeAffected(dragon)).length;
  const heatTolerant = population.dragons.filter((dragon) => hasAllele(dragon, 'heat', 'H')).length;
  const blueHorned = population.dragons.filter((dragon) =>
    isHomozygous(dragon, 'horn', 'b'),
  ).length;
  const difference = populationSize - population.previousPopulation;
  return {
    population: populationSize,
    breedingAdults: population.dragons.filter(isBreedingAdult).length,
    diversityPercent,
    relatedness,
    rareAlleles,
    affectedDragons,
    heatTolerantPercent: populationSize ? Math.round((100 * heatTolerant) / populationSize) : 0,
    blueHornPercent: populationSize ? Math.round((100 * blueHorned) / populationSize) : 0,
    trend: difference > 1 ? 'Rising' : difference < -1 ? 'Falling' : 'Stable',
    alleleFrequencies,
  };
}

export function genotypeLabel(dragon: PopulationDragon, locusId: ConservationLocusId): string {
  return dragon.genome[locusId].join('');
}

export function phenotypeEvidence(dragon: PopulationDragon): readonly string[] {
  return [
    isHomozygous(dragon, 'horn', 'b') ? 'Blue horns' : 'Earth-tone horns',
    hasAllele(dragon, 'heat', 'H') ? 'Heat-tolerant scales' : 'Standard heat response',
  ];
}

export function healthEvidence(dragon: PopulationDragon, islandId: IslandId): string {
  if (isMoonfadeAffected(dragon)) return 'Moonfade symptoms';
  if (isMoonfadeCarrier(dragon)) return 'No visible disorder';
  if (islandId === 'ash-island' && !hasAllele(dragon, 'heat', 'H')) return 'Heat-stressed';
  return 'Healthy field exam';
}

export function isMoonfadeCarrier(dragon: PopulationDragon): boolean {
  return genotypeLabel(dragon, 'moonfade') === 'Dd';
}

export function isMoonfadeAffected(dragon: PopulationDragon): boolean {
  return isHomozygous(dragon, 'moonfade', 'd');
}

export function isBreedingAdult(dragon: PopulationDragon): boolean {
  return dragon.ageGenerations >= 1 && dragon.ageGenerations <= 4;
}

export function scanDragon(world: IslandDiversityWorld, dragonId: string): IslandDiversityWorld {
  if (world.researchCredits <= 0 || world.scannedDragonIds.includes(dragonId)) return world;
  if (!findDragon(world, dragonId)) return world;
  return {
    ...world,
    researchCredits: world.researchCredits - 1,
    scannedDragonIds: [...world.scannedDragonIds, dragonId],
    updatedAtIso: new Date().toISOString(),
  };
}

export function relocateDragon(
  world: IslandDiversityWorld,
  dragonId: string,
  destinationId: IslandId,
): IslandDiversityWorld {
  const found = findDragon(world, dragonId);
  if (!found || found.islandId === destinationId) return world;
  const source = world.islands[found.islandId];
  const destination = world.islands[destinationId];
  const nextSource = {
    ...source,
    previousPopulation: source.dragons.length,
    dragons: source.dragons.filter((dragon) => dragon.id !== dragonId),
    protectedPair: [
      source.protectedPair[0] === dragonId ? null : source.protectedPair[0],
      source.protectedPair[1] === dragonId ? null : source.protectedPair[1],
    ] as const,
  };
  const nextDestination = {
    ...destination,
    previousPopulation: destination.dragons.length,
    dragons: [...destination.dragons, found.dragon],
  };
  return {
    ...world,
    islands: {
      ...world.islands,
      [found.islandId]: nextSource,
      [destinationId]: nextDestination,
    },
    relocations: [
      {
        id: `${dragonId}:${destinationId}:${world.relocations.length + 1}`,
        dragonId,
        dragonName: found.dragon.name,
        fromIslandId: found.islandId,
        toIslandId: destinationId,
        generation: destination.generation,
        recordedAtIso: new Date().toISOString(),
      },
      ...world.relocations,
    ].slice(0, 40),
    updatedAtIso: new Date().toISOString(),
  };
}

export function placeProtectedParent(
  world: IslandDiversityWorld,
  islandId: IslandId,
  dragonId: string,
  berth: 0 | 1,
): IslandDiversityWorld {
  const population = world.islands[islandId];
  const dragon = population.dragons.find((candidate) => candidate.id === dragonId);
  if (!dragon || !isBreedingAdult(dragon)) return world;
  const pair = [...population.protectedPair] as [string | null, string | null];
  const otherBerth = berth === 0 ? 1 : 0;
  if (pair[otherBerth] === dragonId) pair[otherBerth] = null;
  pair[berth] = dragonId;
  return {
    ...world,
    islands: { ...world.islands, [islandId]: { ...population, protectedPair: pair } },
    updatedAtIso: new Date().toISOString(),
  };
}

export function clearProtectedPair(
  world: IslandDiversityWorld,
  islandId: IslandId,
): IslandDiversityWorld {
  const population = world.islands[islandId];
  return {
    ...world,
    islands: {
      ...world.islands,
      [islandId]: { ...population, protectedPair: [null, null] },
    },
    updatedAtIso: new Date().toISOString(),
  };
}

export function advanceIslandGeneration(
  world: IslandDiversityWorld,
  islandId: IslandId,
): IslandDiversityWorld {
  const population = world.islands[islandId];
  const nextGeneration = population.generation + 1;
  const random = seededRandom(`${world.seed}:${islandId}:generation:${nextGeneration}`);
  const eventIndex = stableHash(`${world.seed}:${islandId}:event:${nextGeneration}`) % 5;
  const event = generationEvent(islandId, eventIndex);
  const aged = population.dragons
    .map((dragon) => ({ ...dragon, ageGenerations: dragon.ageGenerations + 1 }))
    .filter((dragon) => dragon.ageGenerations <= 5)
    .filter((dragon) => survivesSelection(dragon, islandId, eventIndex, random));
  let birthCount = Math.max(2, Math.round(population.dragons.length * 0.28));
  if (eventIndex === 0) birthCount = Math.max(1, birthCount - 2);
  if (eventIndex === 1) birthCount += 2;
  const adults = aged.filter(isBreedingAdult);
  const females = adults.filter((dragon) => dragon.sex === 'female');
  const males = adults.filter((dragon) => dragon.sex === 'male');
  const protectedParents = population.protectedPair.map((id) =>
    id ? (adults.find((dragon) => dragon.id === id) ?? null) : null,
  );
  const protectedPairValid =
    protectedParents[0] &&
    protectedParents[1] &&
    protectedParents[0].sex !== protectedParents[1].sex;
  if (protectedPairValid) birthCount = Math.max(3, birthCount);
  const offspring: PopulationDragon[] = [];
  for (let index = 0; index < birthCount && females.length && males.length; index += 1) {
    const useProtectedPair = Boolean(protectedPairValid && index < 2);
    const parentA = useProtectedPair
      ? protectedParents[0]!
      : females[Math.floor(random() * females.length)];
    const parentB = useProtectedPair
      ? protectedParents[1]!
      : males[Math.floor(random() * males.length)];
    offspring.push(createOffspring(islandId, nextGeneration, index, parentA, parentB, random));
  }
  const dragons = [...aged, ...offspring];
  const retainedIds = new Set(dragons.map((dragon) => dragon.id));
  const protectedPair = [
    population.protectedPair[0] && retainedIds.has(population.protectedPair[0])
      ? population.protectedPair[0]
      : null,
    population.protectedPair[1] && retainedIds.has(population.protectedPair[1])
      ? population.protectedPair[1]
      : null,
  ] as const;
  const provisional: IslandPopulation = {
    ...population,
    generation: nextGeneration,
    previousPopulation: population.dragons.length,
    dragons,
    protectedPair,
  };
  const metrics = metricsForIsland(provisional);
  const record: GenerationRecord = {
    generation: nextGeneration,
    population: metrics.population,
    diversityPercent: metrics.diversityPercent,
    affectedDragons: metrics.affectedDragons,
    rareAlleles: metrics.rareAlleles,
    event,
    recordedAtIso: new Date().toISOString(),
  };
  return {
    ...world,
    researchCredits: Math.min(20, world.researchCredits + 1),
    islands: {
      ...world.islands,
      [islandId]: { ...provisional, timeline: [...population.timeline, record].slice(-12) },
    },
    updatedAtIso: new Date().toISOString(),
  };
}

export function admitAccountDragon(
  world: IslandDiversityWorld,
  candidate: AccountConservationCandidate,
): IslandDiversityWorld {
  if (world.admittedAccountDragonIds.includes(candidate.id)) return world;
  const random = seededRandom(`${world.seed}:account:${candidate.id}`);
  const genome: ConservationGenome = {
    horn: randomPair('B', 'b', 0.5, random),
    heat: randomPair('H', 'h', 0.5, random),
    moonfade: randomPair('D', 'd', 0.82, random),
  };
  const dragon: PopulationDragon = {
    id: `account:${candidate.id}`,
    name: candidate.name,
    sex: random() < 0.5 ? 'female' : 'male',
    ageGenerations: 2,
    lineageId: `account-${candidate.id}`,
    parents: [],
    genome,
    color: candidate.color,
    accentColor: candidate.accentColor,
    accountDragonId: candidate.id,
  };
  const sanctuary = world.islands.sanctuary;
  return {
    ...world,
    admittedAccountDragonIds: [...world.admittedAccountDragonIds, candidate.id],
    islands: {
      ...world.islands,
      sanctuary: {
        ...sanctuary,
        previousPopulation: sanctuary.dragons.length,
        dragons: [...sanctuary.dragons, dragon],
      },
    },
    updatedAtIso: new Date().toISOString(),
  };
}

export function findDragon(
  world: IslandDiversityWorld,
  dragonId: string,
): { islandId: IslandId; dragon: PopulationDragon } | null {
  for (const islandId of Object.keys(world.islands) as IslandId[]) {
    const dragon = world.islands[islandId].dragons.find((candidate) => candidate.id === dragonId);
    if (dragon) return { islandId, dragon };
  }
  return null;
}

function createPopulation(
  definition: IslandDefinition,
  profile: PopulationProfile,
  seed: string,
): IslandPopulation {
  const random = seededRandom(`${seed}:${definition.id}:initial`);
  const dragons = Array.from({ length: profile.size }, (_, index) => {
    const genome: ConservationGenome = {
      horn: randomPair('B', 'b', profile.upperFrequency.horn, random),
      heat: randomPair('H', 'h', profile.upperFrequency.heat, random),
      moonfade: randomPair('D', 'd', profile.upperFrequency.moonfade, random),
    };
    return {
      id: `${definition.fieldCode.toLowerCase()}-${String(index + 1).padStart(2, '0')}`,
      name: DRAGON_NAMES[(index + stableHash(definition.id)) % DRAGON_NAMES.length],
      sex: index % 2 === 0 ? ('female' as const) : ('male' as const),
      ageGenerations: 1 + (index % 4),
      lineageId: `${definition.fieldCode}-L${(index % profile.lineageCount) + 1}`,
      parents: [],
      genome,
      color: DRAGON_COLORS[(index + profile.lineageCount) % DRAGON_COLORS.length],
      accentColor: DRAGON_ACCENTS[(index + profile.lineageCount) % DRAGON_ACCENTS.length],
      accountDragonId: null,
    };
  });
  const provisional: IslandPopulation = {
    islandId: definition.id,
    generation: 0,
    previousPopulation: dragons.length,
    dragons,
    protectedPair: [null, null],
    timeline: [],
  };
  const metrics = metricsForIsland(provisional);
  return {
    ...provisional,
    timeline: [
      {
        generation: 0,
        population: metrics.population,
        diversityPercent: metrics.diversityPercent,
        affectedDragons: metrics.affectedDragons,
        rareAlleles: metrics.rareAlleles,
        event: initialEvent(definition.id),
        recordedAtIso: new Date().toISOString(),
      },
    ],
  };
}

function createOffspring(
  islandId: IslandId,
  generation: number,
  index: number,
  parentA: PopulationDragon,
  parentB: PopulationDragon,
  random: () => number,
): PopulationDragon {
  const inherit = (locusId: ConservationLocusId): GenotypePair =>
    normalizedPair(
      parentA.genome[locusId][Math.floor(random() * 2)],
      parentB.genome[locusId][Math.floor(random() * 2)],
    );
  return {
    id: `${islandId}:g${generation}:${index + 1}`,
    name: DRAGON_NAMES[stableHash(`${islandId}:${generation}:${index}`) % DRAGON_NAMES.length],
    sex: random() < 0.5 ? 'female' : 'male',
    ageGenerations: 0,
    lineageId: parentA.lineageId,
    parents: [parentA.id, parentB.id],
    genome: { horn: inherit('horn'), heat: inherit('heat'), moonfade: inherit('moonfade') },
    color: parentA.color,
    accentColor: parentB.accentColor,
    accountDragonId: null,
  };
}

function survivesSelection(
  dragon: PopulationDragon,
  islandId: IslandId,
  eventIndex: number,
  random: () => number,
): boolean {
  if (isMoonfadeAffected(dragon) && random() < 0.12) return false;
  if (islandId === 'ash-island' && eventIndex === 2 && !hasAllele(dragon, 'heat', 'H')) {
    return random() >= 0.45;
  }
  return true;
}

function generationEvent(islandId: IslandId, eventIndex: number): string {
  if (islandId === 'ash-island' && eventIndex === 2) {
    return 'Wildfire: heat-stressed dragons had lower survival in this generation.';
  }
  return [
    'Food shortage: fewer hatchlings survived to the field census.',
    'Breeding boom: a larger wild cohort joined the population.',
    'Stable season: survival and reproduction followed the baseline model.',
    'Coastal storm: mortality was unrelated to horn color.',
    'New nesting ground: wild matings continued across available lineages.',
  ][eventIndex];
}

function initialEvent(islandId: IslandId): string {
  const events: Record<IslandId, string> = {
    'founders-isle': 'Three founding lineages established the modern population.',
    stormbreak: 'Post-hurricane census: twelve survivors remained after the bottleneck.',
    moonmist: 'Field clinic reported multiple hatchlings with Moonfade symptoms.',
    'twin-horn-west': 'Western population survey established the separation baseline.',
    'twin-horn-east': 'Eastern population survey established the separation baseline.',
    'ash-island': 'Volcanic habitat survey began tracking heat-response phenotypes.',
    sanctuary: 'Conservation reserve opened with a mixed founding population.',
  };
  return events[islandId];
}

function randomPair(
  upper: string,
  lower: string,
  upperFrequency: number,
  random: () => number,
): GenotypePair {
  return normalizedPair(
    random() < upperFrequency ? upper : lower,
    random() < upperFrequency ? upper : lower,
  );
}

function normalizedPair(first: string, second: string): GenotypePair {
  return first === first.toUpperCase()
    ? [first, second]
    : second === second.toUpperCase()
      ? [second, first]
      : [first, second];
}

function hasAllele(
  dragon: PopulationDragon,
  locusId: ConservationLocusId,
  allele: string,
): boolean {
  return dragon.genome[locusId].includes(allele);
}

function isHomozygous(
  dragon: PopulationDragon,
  locusId: ConservationLocusId,
  allele: string,
): boolean {
  return dragon.genome[locusId][0] === allele && dragon.genome[locusId][1] === allele;
}

function seededRandom(seed: string): () => number {
  let state = stableHash(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
