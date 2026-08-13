export const ISLAND_IDS = [
  'founders-isle',
  'stormbreak',
  'moonmist',
  'twin-horn-west',
  'twin-horn-east',
  'ash-island',
  'sanctuary',
] as const;

export type IslandId = (typeof ISLAND_IDS)[number];
export type ConservationLocusId = 'horn' | 'heat' | 'moonfade';
export type DragonSex = 'female' | 'male';
export type GenotypePair = readonly [string, string];

export interface ConservationGenome {
  horn: GenotypePair;
  heat: GenotypePair;
  moonfade: GenotypePair;
}

export interface IslandDefinition {
  id: IslandId;
  name: string;
  fieldCode: string;
  habitat: string;
  caseStudy: string;
  summary: string;
  accent: string;
  mapX: number;
  mapY: number;
}

export interface PopulationDragon {
  id: string;
  name: string;
  sex: DragonSex;
  ageGenerations: number;
  lineageId: string;
  parents: readonly string[];
  genome: ConservationGenome;
  color: string;
  accentColor: string;
  accountDragonId: string | null;
}

export interface AlleleFrequencyRecord {
  locusId: ConservationLocusId;
  locusName: string;
  upperAllele: string;
  lowerAllele: string;
  upperFrequency: number;
  lowerFrequency: number;
}

export interface IslandMetrics {
  population: number;
  breedingAdults: number;
  diversityPercent: number;
  relatedness: 'Low' | 'Moderate' | 'High';
  rareAlleles: number;
  affectedDragons: number;
  heatTolerantPercent: number;
  blueHornPercent: number;
  trend: 'Rising' | 'Stable' | 'Falling';
  alleleFrequencies: readonly AlleleFrequencyRecord[];
}

export interface GenerationRecord {
  generation: number;
  population: number;
  diversityPercent: number;
  affectedDragons: number;
  rareAlleles: number;
  event: string;
  recordedAtIso: string;
}

export interface IslandPopulation {
  islandId: IslandId;
  generation: number;
  previousPopulation: number;
  dragons: readonly PopulationDragon[];
  protectedPair: readonly [string | null, string | null];
  timeline: readonly GenerationRecord[];
}

export interface RelocationRecord {
  id: string;
  dragonId: string;
  dragonName: string;
  fromIslandId: IslandId;
  toIslandId: IslandId;
  generation: number;
  recordedAtIso: string;
}

export interface IslandFieldNote {
  islandId: IslandId;
  text: string;
  savedAtIso: string;
}

export interface IslandDiversityWorld {
  schemaVersion: 1;
  seed: string;
  researchCredits: number;
  scannedDragonIds: readonly string[];
  admittedAccountDragonIds: readonly string[];
  islands: Readonly<Record<IslandId, IslandPopulation>>;
  relocations: readonly RelocationRecord[];
  notes: Readonly<Partial<Record<IslandId, IslandFieldNote>>>;
  updatedAtIso: string;
}

export interface StoredIslandDiversityWorld {
  schemaVersion: 1;
  studentId: string;
  world: IslandDiversityWorld;
}

export const CONSERVATION_LOCI: Readonly<
  Record<
    ConservationLocusId,
    {
      id: ConservationLocusId;
      name: string;
      upperAllele: string;
      lowerAllele: string;
      evidence: string;
    }
  >
> = {
  horn: {
    id: 'horn',
    name: 'Horn pigment',
    upperAllele: 'B',
    lowerAllele: 'b',
    evidence: 'bb produces blue horns; neither horn state changes survival in this model.',
  },
  heat: {
    id: 'heat',
    name: 'Heat response',
    upperAllele: 'H',
    lowerAllele: 'h',
    evidence: 'HH and Hh show heat-tolerant scales; hh is less likely to survive Ash wildfires.',
  },
  moonfade: {
    id: 'moonfade',
    name: 'Moonfade disorder',
    upperAllele: 'D',
    lowerAllele: 'd',
    evidence: 'dd is affected; Dd is an unaffected carrier.',
  },
};

export const ISLAND_DEFINITIONS: readonly IslandDefinition[] = [
  {
    id: 'founders-isle',
    name: "Founder's Isle",
    fieldCode: 'FI',
    habitat: 'Sheltered sea cliffs',
    caseStudy: 'Founder effect',
    summary: 'A small founding group left chance-driven horn frequencies and few lineages.',
    accent: '#e6b566',
    mapX: 18,
    mapY: 25,
  },
  {
    id: 'stormbreak',
    name: 'Stormbreak Island',
    fieldCode: 'SB',
    habitat: 'Wind-cut basalt shelf',
    caseStudy: 'Bottleneck recovery',
    summary: 'Twelve hurricane survivors retain only part of the former allele pool.',
    accent: '#78a9d8',
    mapX: 47,
    mapY: 14,
  },
  {
    id: 'moonmist',
    name: 'Moonmist Island',
    fieldCode: 'MM',
    habitat: 'Cool luminous forest',
    caseStudy: 'Recessive disorder',
    summary: 'Related matings hide Moonfade alleles in healthy carriers.',
    accent: '#b69ad9',
    mapX: 77,
    mapY: 28,
  },
  {
    id: 'twin-horn-west',
    name: 'Twin Horn West',
    fieldCode: 'TW',
    habitat: 'Western grass terraces',
    caseStudy: 'Population divergence',
    summary: 'Long separation produced a different allele balance from its eastern neighbor.',
    accent: '#63c6a9',
    mapX: 25,
    mapY: 58,
  },
  {
    id: 'twin-horn-east',
    name: 'Twin Horn East',
    fieldCode: 'TE',
    habitat: 'Eastern cedar ridges',
    caseStudy: 'Gene-flow decision',
    summary: 'Migration could restore variation while moving hidden alleles between populations.',
    accent: '#52b8c5',
    mapX: 45,
    mapY: 67,
  },
  {
    id: 'ash-island',
    name: 'Ash Island',
    fieldCode: 'AI',
    habitat: 'Active volcanic slopes',
    caseStudy: 'Natural selection',
    summary: 'Wildfires make heat-response variation consequential across generations.',
    accent: '#eb765d',
    mapX: 73,
    mapY: 62,
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary Island',
    fieldCode: 'SN',
    habitat: 'Managed coastal reserve',
    caseStudy: 'Conservation reserve',
    summary: 'Rescued and account dragons can establish a deliberately varied population.',
    accent: '#80d090',
    mapX: 52,
    mapY: 88,
  },
];
