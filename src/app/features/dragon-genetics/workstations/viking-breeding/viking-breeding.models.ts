import { MiniGeneId, MiniGenome } from '../companion-show/mini-dragon.genetics';

/**
 * Viking settlement breeding — artificial selection for work.
 *
 * The companion to Island Expedition. There the environment does the selecting and the student
 * *finds* an animal; here a settlement does the selecting and the student *builds* a line over
 * generations. Same mechanism, different selective agent — which is the pair of ideas the standards
 * actually ask for.
 *
 * The mini dragon is the right species for this because its twenty-four genes cover four inheritance
 * patterns. A working role that wants a heterozygous form can never breed true, no matter how hard
 * a settlement selects, and no amount of effort changes that. Discovering which of your traits can
 * be fixed and which cannot is the whole lesson.
 */

export type WorkingRoleId =
  | 'granary-mouser'
  | 'hall-trickster'
  | 'bilge-ratter'
  | 'message-flier'
  | 'forge-tender'
  | 'herd-watcher'
  | 'root-finder';

/** One trait the job requires, and the settlement's own reason for wanting it. */
export interface RoleRequirement {
  geneId: MiniGeneId;
  formId: string;
  /** Why the work needs it. Never mentions zygosity or whether it can be fixed. */
  reason: string;
}

export interface WorkingRole {
  id: WorkingRoleId;
  settlement: string;
  /** What the settlement calls the animal it wants. */
  title: string;
  /** The job, in the settlement's own words. */
  commission: string;
  requirements: readonly RoleRequirement[];
  /** Litters per breeding season, which is what limits how fast a line can respond. */
  littersPerSeason: number;
  /** How many dragons the settlement can feed over winter. */
  kennelCap: number;
  /** Seasons before the settlement expects a working animal. */
  seasons: number;
}

export interface KennelDragon {
  id: string;
  name: string;
  sex: 'female' | 'male';
  genome: MiniGenome;
  /** 0 for stock the settlement supplied. */
  generation: number;
  parentIds: readonly [string, string] | null;
  /** Founder animals this dragon descends from, for the diversity reading. */
  founderIds: readonly string[];
}

export interface LitterRecord {
  id: string;
  season: number;
  damId: string;
  sireId: string;
  pupIds: readonly string[];
  /** What the pairing was expected to yield, recorded before the litter was bred. */
  predictedMatchRate: number | null;
  bredAtIso: string;
}

export interface BreedingProgram {
  schemaVersion: 1;
  roleId: WorkingRoleId;
  studentId: string;
  season: number;
  kennel: readonly KennelDragon[];
  litters: readonly LitterRecord[];
  /** Dragons the student has retired from the line, kept for the record. */
  releasedIds: readonly string[];
  /** The student's own account of the strategy. Recorded, never required. */
  plan: string;
  deliveredDragonId: string | null;
  startedAtIso: string;
  updatedAtIso: string;
}

export interface StoredBreedingPrograms {
  schemaVersion: 1;
  studentId: string;
  programs: Readonly<Record<string, BreedingProgram>>;
}

// ---------------------------------------------------------------------------
// The settlements
// ---------------------------------------------------------------------------

function need(geneId: MiniGeneId, formId: string, reason: string): RoleRequirement {
  return { geneId, formId, reason };
}

/**
 * Seven settlements, chosen so that between them they cover all four inheritance patterns and both
 * possible outcomes: lines that can be fixed, and lines that can never be.
 */
export const WORKING_ROLES: readonly WorkingRole[] = [
  {
    id: 'granary-mouser',
    settlement: 'Grainmoot',
    title: 'Granary mouser',
    commission:
      'Something is in the seed-corn. We need a dragon small enough to follow a mouse into the wall cavity, low enough to work under the floor boards, and sharp-eared enough to find them in the dark.',
    requirements: [
      need('size', 'size:teacup', 'It must fit where the mice fit.'),
      need('legs', 'legs:waddler', 'It works under the granary floor, not over it.'),
      need('ears', 'ears:sail', 'It hunts by sound in a dark store.'),
    ],
    littersPerSeason: 2,
    kennelCap: 8,
    seasons: 6,
  },
  {
    id: 'hall-trickster',
    settlement: 'Skaldhall',
    title: 'Hall trickster',
    commission:
      'The jarl wants a dragon for the winter feasts — one with the half-crest the southern traders prize, and the folded petal ear that makes it look like it is listening to the skald.',
    requirements: [
      need('crest', 'crest:crown-frill', 'The half-and-half crest is what the traders pay for.'),
      need('ears', 'ears:petal', 'The folded ear is the look the hall wants.'),
    ],
    littersPerSeason: 2,
    kennelCap: 10,
    seasons: 8,
  },
  {
    id: 'bilge-ratter',
    settlement: 'Bilgewatch',
    title: 'Longship ratter',
    commission:
      'Rats are eating the stores on the crossing. We need a long, low dragon that can work the bilge under the deck boards, with a smooth back that will not snag on the strakes.',
    requirements: [
      need('frame', 'frame:long', 'It must work the length of the bilge.'),
      need('legs', 'legs:waddler', 'There is no headroom under a deck.'),
      need('coat', 'coat:sleek', 'A bumpy back catches on every plank.'),
    ],
    littersPerSeason: 2,
    kennelCap: 8,
    seasons: 6,
  },
  {
    id: 'message-flier',
    settlement: 'Windmere',
    title: 'Message flier',
    commission:
      'We need word carried along the fjord in weather. A broad wing to hold a line in wind, on a balanced body that can sit a whole day on a post without going lame.',
    requirements: [
      need('wings', 'wings:broad', 'It must hold a line against a headwind.'),
      need('frame', 'frame:balanced', 'Neither long nor round survives a season of perching.'),
    ],
    littersPerSeason: 2,
    kennelCap: 10,
    seasons: 8,
  },
  {
    id: 'forge-tender',
    settlement: 'Emberforge',
    title: 'Forge tender',
    commission:
      'The smith wants a dragon that will hold a blue ember through a night shift. Rose burns too hot and pale goes out before dawn.',
    requirements: [need('ember', 'ember:blue', 'Blue is the only ember that holds a forge overnight.')],
    littersPerSeason: 2,
    kennelCap: 8,
    seasons: 6,
  },
  {
    id: 'herd-watcher',
    settlement: 'Fellgard',
    title: 'Herd watcher',
    commission:
      'Our goats are on the fell all summer and something is taking the kids. We want a full-sized dragon with a proper feather mantle for the weather, and the curled horn that shows it will stand its ground.',
    requirements: [
      need('size', 'size:standard', 'A teacup cannot face down what takes a goat kid.'),
      need('plumage', 'plumage:full', 'It stands out in weather all summer.'),
      need('horns', 'horns:curled', 'The curled horn is what the herders trust.'),
    ],
    littersPerSeason: 2,
    kennelCap: 8,
    seasons: 6,
  },
  {
    id: 'root-finder',
    settlement: 'Rootdelve',
    title: 'Root finder',
    commission:
      'We dig winter roots out of frozen ground. A long muzzle to work a hole, short legs to stay over it, and a soft pom tail so it does not knock the basket over behind it.',
    requirements: [
      need('muzzle', 'muzzle:long', 'It works its whole head into the hole.'),
      need('legs', 'legs:waddler', 'It must stay over the dig, not above it.'),
      need('tail', 'tail:pom', 'A club tail costs us a basket a day.'),
    ],
    littersPerSeason: 2,
    kennelCap: 8,
    seasons: 8,
  },
];

export const WORKING_ROLE_BY_ID: Readonly<Record<string, WorkingRole>> = Object.fromEntries(
  WORKING_ROLES.map((role) => [role.id, role]),
);

/** Pups per litter. Small enough that selection takes seasons, large enough to show a ratio. */
export const LITTER_SIZE = 6;

/** Dragons the settlement supplies to start a programme. */
export const FOUNDER_STOCK_SIZE = 6;
