/**
 * Island Expedition — find a dragon by reasoning about where selection would have put it.
 *
 * Every island was colonized from the same founder stock, so every locus starts at the same
 * ancestral allele frequency. The islands differ only in **ecology** and in **how long selection
 * has been running**. Any divergence a student measures is therefore attributable to selection over
 * time, which is the whole point of the investigation.
 *
 * Nothing in this file states an allele frequency. Frequencies are computed in
 * `island-expedition.selection.ts` from these ecological factors, so a student who reasons from the
 * ecology and a student who surveys the population must arrive at the same answer.
 */

// ---------------------------------------------------------------------------
// Ecology
// ---------------------------------------------------------------------------

/**
 * The observable conditions of an island. Each is scored 0–3 and each is *visible to the student*
 * without a survey — this is the evidence they reason from before spending expedition budget.
 */
export interface IslandEcology {
  /** How heavily large predators hunt dragons here. */
  predatorPressure: number;
  /** How armoured or tough the available prey is. */
  preyToughness: number;
  /** Prevailing wind and updraft strength. */
  windExposure: number;
  /** Ambient heat load. */
  heatLoad: number;
  /** 0 = pale sand or chalk, 3 = black volcanic rock. Drives which colour is camouflaged. */
  substrateDarkness: number;
  /** How much foraging happens in darkness or underground. */
  nightActivity: number;
  /** 0 = dense cover and canopy, 3 = wide open ground. */
  openness: number;
  /** How hard food is to come by, which is what makes an expensive trait expensive. */
  foodScarcity: number;
}

export const ECOLOGY_FACTOR_LABELS: Readonly<Record<keyof IslandEcology, string>> = {
  predatorPressure: 'Predator pressure',
  preyToughness: 'Prey toughness',
  windExposure: 'Wind and updraft',
  heatLoad: 'Heat load',
  substrateDarkness: 'Ground darkness',
  nightActivity: 'Night foraging',
  openness: 'Open ground',
  foodScarcity: 'Food scarcity',
};

/** Reads a 0–3 factor back as words, for the map legend and field notes. */
export const FACTOR_SCALE_WORDS: readonly string[] = ['none', 'low', 'moderate', 'high'];

// ---------------------------------------------------------------------------
// Loci
// ---------------------------------------------------------------------------

export const EXPEDITION_LOCUS_IDS = [
  'scales',
  'wings',
  'fire',
  'color',
  'glow',
  'horns',
] as const;

export type ExpeditionLocusId = (typeof EXPEDITION_LOCUS_IDS)[number];

/** Complete dominance throughout, so a heterozygote shows the dominant form. */
export type ExpeditionGenotype = 'homozygous-dominant' | 'heterozygous' | 'homozygous-recessive';

export interface ExpeditionLocus {
  id: ExpeditionLocusId;
  name: string;
  dominantAllele: string;
  recessiveAllele: string;
  dominantForm: string;
  recessiveForm: string;
  /**
   * Relative fitness of each visible form under a given ecology. Heterozygotes share the dominant
   * form's fitness. Each function must describe a genuine trade-off: a trait that is good
   * everywhere would make every island identical and there would be nothing to reason about.
   */
  dominantFitness: (ecology: IslandEcology) => number;
  recessiveFitness: (ecology: IslandEcology) => number;
  /** What a student should be able to work out from the ecology alone. */
  ecologyHint: string;
}

/**
 * Fitness values are relative and get normalized before selection runs, so only the *ratio* between
 * the two forms on one island matters. The floor keeps a form from vanishing outright, because a
 * locus fixed at 0 or 1 gives a student nothing to find.
 */
const FITNESS_FLOOR = 0.45;

function fitness(value: number): number {
  return Math.max(FITNESS_FLOOR, value);
}

export const EXPEDITION_LOCI: readonly ExpeditionLocus[] = [
  {
    id: 'scales',
    name: 'Scale armour',
    dominantAllele: 'S',
    recessiveAllele: 's',
    dominantForm: 'Heavy plating',
    recessiveForm: 'Light scales',
    // Armour stops predators but costs heat shedding and food.
    dominantFitness: (e) =>
      fitness(1 + 0.07 * e.predatorPressure - 0.055 * e.heatLoad - 0.04 * e.foodScarcity),
    recessiveFitness: (e) => fitness(1 + 0.04 * e.heatLoad - 0.05 * e.predatorPressure),
    ecologyHint: 'Plating pays where predators are heavy, and costs where it is hot or food is thin.',
  },
  {
    id: 'wings',
    name: 'Wing span',
    dominantAllele: 'W',
    recessiveAllele: 'w',
    dominantForm: 'Broad wings',
    recessiveForm: 'Compact wings',
    // Long wings ride updrafts over open ground and snag in dense cover.
    dominantFitness: (e) =>
      fitness(1 + 0.06 * e.windExposure + 0.045 * e.openness - 0.04 * e.foodScarcity),
    recessiveFitness: (e) => fitness(1 + 0.055 * (3 - e.openness) + 0.02 * e.foodScarcity),
    ecologyHint: 'Broad wings need wind and open sky; tight cover rewards a compact wing.',
  },
  {
    id: 'fire',
    name: 'Fire strength',
    dominantAllele: 'F',
    recessiveAllele: 'f',
    dominantForm: 'Strong flame',
    recessiveForm: 'Weak flame',
    // Hot flame cracks armoured prey but burns calories the island may not have.
    dominantFitness: (e) => fitness(1 + 0.075 * e.preyToughness - 0.06 * e.foodScarcity),
    recessiveFitness: (e) => fitness(1 + 0.045 * e.foodScarcity - 0.035 * e.preyToughness),
    ecologyHint: 'Strong flame opens armoured prey, but it is expensive where food is scarce.',
  },
  {
    id: 'color',
    name: 'Body colour',
    dominantAllele: 'K',
    recessiveAllele: 'k',
    dominantForm: 'Dark hide',
    recessiveForm: 'Pale hide',
    // Camouflage only matters when something is hunting you.
    dominantFitness: (e) =>
      fitness(1 + 0.11 * (e.substrateDarkness / 3) * e.predatorPressure - 0.02 * e.heatLoad),
    recessiveFitness: (e) =>
      fitness(1 + 0.11 * ((3 - e.substrateDarkness) / 3) * e.predatorPressure + 0.02 * e.heatLoad),
    ecologyHint: 'Whichever hide matches the ground hides better — and only matters where predators hunt.',
  },
  {
    id: 'glow',
    name: 'Glow organs',
    dominantAllele: 'G',
    recessiveAllele: 'g',
    dominantForm: 'Glowing',
    recessiveForm: 'Dull',
    // Light helps you forage in the dark and tells predators exactly where you are.
    dominantFitness: (e) => fitness(1 + 0.075 * e.nightActivity - 0.06 * e.predatorPressure),
    recessiveFitness: (e) => fitness(1 + 0.03 * e.predatorPressure),
    ecologyHint: 'Glow earns its keep in the dark, unless something is hunting by sight.',
  },
  {
    id: 'horns',
    name: 'Horn length',
    dominantAllele: 'H',
    recessiveAllele: 'h',
    dominantForm: 'Long horns',
    recessiveForm: 'Short horns',
    // Defence and competition, against the cost of growing and carrying them.
    dominantFitness: (e) =>
      fitness(1 + 0.055 * e.predatorPressure + 0.04 * e.foodScarcity - 0.035 * e.heatLoad),
    recessiveFitness: (e) => fitness(1 + 0.035 * e.heatLoad - 0.025 * e.predatorPressure),
    ecologyHint: 'Horns defend and settle disputes; growing them costs a dragon that is already short of food.',
  },
];

export const EXPEDITION_LOCUS_BY_ID: Readonly<Record<ExpeditionLocusId, ExpeditionLocus>> =
  Object.fromEntries(EXPEDITION_LOCI.map((locus) => [locus.id, locus])) as Readonly<
    Record<ExpeditionLocusId, ExpeditionLocus>
  >;

// ---------------------------------------------------------------------------
// Islands
// ---------------------------------------------------------------------------

export const EXPEDITION_ISLAND_IDS = [
  'ashfall',
  'stormcrag',
  'palewind',
  'gloomroot',
  'ironmoor',
  'sunspire',
  'nightglass',
  'kelpreach',
] as const;

export type ExpeditionIslandId = (typeof EXPEDITION_ISLAND_IDS)[number];

export interface ExpeditionIsland {
  id: ExpeditionIslandId;
  name: string;
  /** One line of what a surveyor sees on approach. Never names a trait frequency. */
  approach: string;
  ecology: IslandEcology;
  /**
   * How long selection has been running here. Two islands can push the same direction and end up
   * very differently diverged, which is the "over time" half of the reasoning.
   */
  generationsSinceColonization: number;
  /** Position on the archipelago map, in a 0–100 viewBox. */
  mapX: number;
  mapY: number;
  accent: string;
}

export const EXPEDITION_ISLANDS: readonly ExpeditionIsland[] = [
  {
    id: 'ashfall',
    name: 'Ashfall',
    approach:
      'Black lava fields under a hot sky. Charred, hard-shelled grazers, and vent-scavengers that hunt by sight.',
    ecology: {
      predatorPressure: 2,
      preyToughness: 3,
      windExposure: 1,
      heatLoad: 3,
      substrateDarkness: 3,
      nightActivity: 1,
      openness: 2,
      foodScarcity: 1,
    },
    generationsSinceColonization: 45,
    mapX: 27,
    mapY: 66,
    accent: '#b4462a',
  },
  {
    id: 'stormcrag',
    name: 'Stormcrag',
    approach: 'Cold sea cliffs in a permanent gale. Great raptors work the updrafts.',
    ecology: {
      predatorPressure: 3,
      preyToughness: 1,
      windExposure: 3,
      heatLoad: 0,
      substrateDarkness: 2,
      nightActivity: 0,
      openness: 3,
      foodScarcity: 1,
    },
    generationsSinceColonization: 60,
    mapX: 62,
    mapY: 16,
    accent: '#4a6f92',
  },
  {
    id: 'palewind',
    name: 'Palewind',
    approach: 'Bright chalk flats, no shade, quick soft-bodied prey. Hawks quarter the open ground.',
    ecology: {
      predatorPressure: 2,
      preyToughness: 0,
      windExposure: 2,
      heatLoad: 3,
      substrateDarkness: 0,
      nightActivity: 0,
      openness: 3,
      foodScarcity: 2,
    },
    generationsSinceColonization: 50,
    mapX: 15,
    mapY: 30,
    accent: '#d8c48a',
  },
  {
    id: 'gloomroot',
    name: 'Gloomroot',
    approach: 'Closed canopy, little light reaches the floor. Ambush hunters wait in the roots.',
    ecology: {
      predatorPressure: 2,
      preyToughness: 1,
      windExposure: 0,
      heatLoad: 1,
      substrateDarkness: 2,
      nightActivity: 3,
      openness: 0,
      foodScarcity: 1,
    },
    generationsSinceColonization: 34,
    mapX: 44,
    mapY: 45,
    accent: '#3f6b4a',
  },
  {
    id: 'ironmoor',
    name: 'Ironmoor',
    approach: 'Cold peat bogs. The shelled bog-crawlers here are armoured like cooking pots.',
    ecology: {
      predatorPressure: 2,
      preyToughness: 3,
      windExposure: 1,
      heatLoad: 0,
      substrateDarkness: 2,
      nightActivity: 1,
      openness: 2,
      foodScarcity: 0,
    },
    generationsSinceColonization: 66,
    mapX: 78,
    mapY: 44,
    accent: '#6b6250',
  },
  {
    id: 'sunspire',
    name: 'Sunspire',
    approach: 'Bare sun-baked spires in a hard wind. Very little grows, and less of it is worth eating.',
    ecology: {
      predatorPressure: 1,
      preyToughness: 1,
      windExposure: 3,
      heatLoad: 3,
      substrateDarkness: 1,
      nightActivity: 0,
      openness: 3,
      foodScarcity: 3,
    },
    generationsSinceColonization: 40,
    mapX: 33,
    mapY: 14,
    accent: '#c98b3b',
  },
  {
    id: 'nightglass',
    name: 'Nightglass',
    approach:
      'Geothermal obsidian caves, warm year round and thick with blind prey. Nothing here hunts by sight.',
    ecology: {
      predatorPressure: 0,
      preyToughness: 0,
      windExposure: 0,
      // Warm caves with easy prey are the one place where growing horns is not worth the trouble.
      heatLoad: 2,
      substrateDarkness: 3,
      nightActivity: 3,
      openness: 0,
      foodScarcity: 1,
    },
    generationsSinceColonization: 48,
    mapX: 68,
    mapY: 74,
    accent: '#5b4a80',
  },
  {
    id: 'kelpreach',
    name: 'Kelpreach',
    approach: 'Mild coastal shelf. Everything here is unremarkable, which is its own kind of remarkable.',
    ecology: {
      predatorPressure: 1,
      preyToughness: 1,
      windExposure: 1,
      heatLoad: 1,
      substrateDarkness: 1,
      nightActivity: 1,
      openness: 1,
      foodScarcity: 1,
    },
    // Colonized late, and barely selected on either way.
    generationsSinceColonization: 16,
    mapX: 52,
    mapY: 88,
    accent: '#4f8f8a',
  },
];

export const EXPEDITION_ISLAND_BY_ID: Readonly<Record<ExpeditionIslandId, ExpeditionIsland>> =
  Object.fromEntries(EXPEDITION_ISLANDS.map((island) => [island.id, island])) as Readonly<
    Record<ExpeditionIslandId, ExpeditionIsland>
  >;

/**
 * The ancestral allele frequency every island started from. One shared value is what makes the
 * comparison fair: any difference a student finds was produced by selection, not by the founders.
 */
export const FOUNDER_DOMINANT_FREQUENCY = 0.5;

// ---------------------------------------------------------------------------
// Survey and quest records
// ---------------------------------------------------------------------------

export interface LocusFrequency {
  locusId: ExpeditionLocusId;
  /** Frequency of the dominant allele after selection. */
  dominantAllele: number;
  recessiveAllele: number;
  /** Hardy-Weinberg genotype frequencies at that allele frequency. */
  homozygousDominant: number;
  heterozygous: number;
  homozygousRecessive: number;
  /** Share of the population *showing* the dominant form. */
  dominantForm: number;
  recessiveForm: number;
}

export type IslandFrequencies = Readonly<Record<ExpeditionLocusId, LocusFrequency>>;

export interface SurveyedDragon {
  id: string;
  name: string;
  islandId: ExpeditionIslandId;
  sex: 'female' | 'male';
  genotypes: Readonly<Record<ExpeditionLocusId, ExpeditionGenotype>>;
  /** Loci whose genotype the student has paid to sequence. Others show phenotype only. */
  sequencedLoci: readonly ExpeditionLocusId[];
}

export type QuestTargetKind = 'phenotype' | 'genotype' | 'carrier';

export interface QuestTarget {
  locusId: ExpeditionLocusId;
  kind: QuestTargetKind;
  /** For `phenotype`: which visible form. For `genotype`/`carrier`: which genotype class. */
  form?: 'dominant' | 'recessive';
  genotype?: ExpeditionGenotype;
}

export interface ExpeditionQuest {
  id: string;
  title: string;
  /** Why the academy wants this animal. Never says which island. */
  brief: string;
  targets: readonly QuestTarget[];
  /** Surveys the student may run before the expedition is over. */
  surveyBudget: number;
  /** Sequencing runs available, for targets that phenotype alone cannot settle. */
  sequenceBudget: number;
  /** Dragons examined per survey. */
  sampleSize: number;
  teachingNote: string;
}

export interface SurveyRecord {
  id: string;
  questId: string;
  islandId: ExpeditionIslandId;
  atIso: string;
  dragons: readonly SurveyedDragon[];
  /** Whether the student had committed a written reason before running it. */
  reasonedFirst: boolean;
}

export interface ExpeditionAttempt {
  schemaVersion: 1;
  questId: string;
  studentId: string;
  /** The island the student argued for, recorded before any survey. */
  predictedIslandId: ExpeditionIslandId | null;
  prediction: string;
  surveys: readonly SurveyRecord[];
  sequencedDragonLoci: readonly { dragonId: string; locusId: ExpeditionLocusId }[];
  capturedDragonId: string | null;
  complete: boolean;
  startedAtIso: string;
  updatedAtIso: string;
}

export interface StoredExpeditionAttempts {
  schemaVersion: 1;
  studentId: string;
  attempts: Readonly<Record<string, ExpeditionAttempt>>;
}
