import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import {
  ARCHIVE_YEAR,
  BloodlineInvestigation,
  PEDIGREE_GENE_IDS,
  PedigreeAllelePair,
  PedigreeDragon,
  PedigreeGeneId,
  PedigreeGenome,
  PedigreePopulation,
  pedigreeGene,
} from './pedigree-lab.models';

/**
 * The historical dragon archive.
 *
 * Only the eight oldest dragons and the outsiders who married into the lines
 * carry a written genotype. Everyone else is *bred* here, allele by allele, from
 * the two dragons the records name as their parents — so no dragon in this
 * archive can hold an allele neither parent could have transmitted, and a
 * student who reasons correctly from the pedigree can never be contradicted by
 * the data.
 *
 * `require` pins the outcome a family's written history depends on (a dragon the
 * chronicle describes as solid-scaled must actually be homozygous for it). The
 * builder satisfies it by *choosing which parental allele was transmitted*,
 * never by inventing one, and `pedigree-population.spec.ts` fails if a pin is
 * unsatisfiable from the parents.
 */

interface DragonSpec {
  id: string;
  name: string;
  epithet?: string;
  sex: DragonSex;
  breed?: string;
  bloodline?: string;
  birthYear: number;
  deathYear: number | null;
  dnaAvailable?: boolean;
  /** Loci whose phenotype the record lost — a damaged sample, a vague chronicle. */
  unrecordedGeneIds?: readonly PedigreeGeneId[];
  legendary?: boolean;
  note?: string;
  achievements?: readonly string[];
}

interface FounderSpec extends DragonSpec {
  bloodline: string;
  breed: string;
  /** Which row of the register this dragon married into. The oldest recorded dragons are 1. */
  generation?: number;
  /** Written in catalog letters: `Ss`, `bb`, `eY`. Unlisted loci take the common allele. */
  genotypes?: Partial<Record<PedigreeGeneId, string>>;
}

interface ChildSpec extends DragonSpec {
  /** Pins a genotype the written history depends on. Must be reachable from the parents. */
  require?: Partial<Record<PedigreeGeneId, string>>;
}

export interface PedigreeUnionSpec {
  motherId: string;
  fatherId: string;
  children: readonly PedigreeChildSpec[];
}

export type PedigreeChildSpec = ChildSpec;
type UnionSpec = PedigreeUnionSpec;

const WINTERWYRM = 'Northern winterwyrm';
const EMBERFALL_DRAKE = 'Emberfall drake';
const NIGHTWING = 'Duskmere nightwing';
const RIDGEBACK = 'Stonewake ridgeback';
const COASTAL = 'Coastal wyvern';

const NORTHERN_STORM = 'Northern Storm';
const EMBERFALL = 'Emberfall';
const DUSKMERE = 'Duskmere';
const STONEWAKE = 'Stonewake';
const OUTLAND = 'Unrecorded line';

const FOUNDERS: readonly FounderSpec[] = [
  {
    id: 'vyrak',
    name: 'Vyrak',
    epithet: 'the Frost King',
    sex: 'male',
    bloodline: NORTHERN_STORM,
    breed: WINTERWYRM,
    birthYear: 186,
    deathYear: 244,
    legendary: true,
    dnaAvailable: false,
    genotypes: { scales: 'ss' },
    note: 'The chronicles describe him as pale and unbroken — no banding anywhere on the body.',
    achievements: [
      'Held the northern passes for thirty-one winters',
      'Sired the first recorded Northern Storm clutch',
      'No preserved tissue survives; the barrow was flooded in 268',
    ],
  },
  {
    id: 'halvora',
    name: 'Halvora',
    epithet: 'of the Long Sound',
    sex: 'female',
    bloodline: NORTHERN_STORM,
    breed: WINTERWYRM,
    birthYear: 190,
    deathYear: 251,
    note: 'Vyrak’s mate. Described as heavily banded across flank and tail.',
  },
  {
    id: 'sable',
    name: 'Sable',
    epithet: 'of Emberfall',
    sex: 'female',
    bloodline: EMBERFALL,
    breed: EMBERFALL_DRAKE,
    birthYear: 192,
    deathYear: 259,
    legendary: true,
    genotypes: { 'body-color': 'bb', wings: 'Ww' },
    note: 'The last dragon the Emberfall chronicle records as sea-coloured rather than bronze.',
    achievements: [
      'Mapped the Emberfall coast in a single season',
      'Preserved scale samples survive in the archive vault',
    ],
  },
  {
    id: 'torvald',
    name: 'Torvald',
    sex: 'male',
    bloodline: EMBERFALL,
    breed: EMBERFALL_DRAKE,
    birthYear: 188,
    deathYear: 247,
    genotypes: { wings: 'Ww' },
  },
  {
    id: 'ilira',
    name: 'Ilira',
    epithet: 'the Duskmere Queen',
    sex: 'female',
    bloodline: DUSKMERE,
    breed: NIGHTWING,
    birthYear: 195,
    deathYear: 256,
    legendary: true,
    genotypes: { 'eye-color': 'ee' },
    note: 'Every surviving portrait of the queen gives her the same cold pale-blue eye.',
    achievements: [
      'Founded the Duskmere night watch',
      'Her clutch records are complete — unusually, every hatchling was described',
    ],
  },
  {
    id: 'ghest',
    name: 'Ghest',
    sex: 'male',
    bloodline: DUSKMERE,
    breed: NIGHTWING,
    birthYear: 191,
    deathYear: 250,
  },
  {
    id: 'korrak',
    name: 'Korrak',
    epithet: 'Stonewake',
    sex: 'male',
    bloodline: STONEWAKE,
    breed: RIDGEBACK,
    birthYear: 184,
    deathYear: 239,
    legendary: true,
    genotypes: { tail: 'kk' },
    note: 'Chronicled with a smooth, unspiked tail end — the Stonewake “quiet tail”.',
    achievements: ['Broke the Stonewake siege of 231', 'Tail casting held in the archive'],
  },
  {
    id: 'ondra',
    name: 'Ondra',
    sex: 'female',
    bloodline: STONEWAKE,
    breed: RIDGEBACK,
    birthYear: 189,
    deathYear: 248,
  },

  // Generation 2 outsiders. Their own ancestry is not in the archive, which is
  // exactly why one of them can be a carrier without a traceable source.
  {
    id: 'orsa',
    name: 'Orsa',
    sex: 'female',
    bloodline: OUTLAND,
    breed: COASTAL,
    generation: 2,
    birthYear: 230,
    deathYear: 293,
    genotypes: { scales: 'Ss' },
    note: 'Married into the Northern Storm line. Her own parents are not recorded.',
  },
  { id: 'beorn', name: 'Beorn', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 235, deathYear: 298 },
  { id: 'nessa', name: 'Nessa', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 234, deathYear: 297 },
  { id: 'rhogar', name: 'Rhogar', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 228, deathYear: 290 },
  {
    id: 'astrid',
    name: 'Astrid',
    sex: 'female',
    bloodline: OUTLAND,
    breed: COASTAL,
    generation: 2,
    birthYear: 232,
    deathYear: 295,
    genotypes: { wings: 'Ww' },
  },
  { id: 'garrick', name: 'Garrick', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 230, deathYear: 292 },
  { id: 'saskia', name: 'Saskia', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 236, deathYear: 299 },
  { id: 'una', name: 'Una', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 233, deathYear: 296 },
  { id: 'orvar', name: 'Orvar', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 2, birthYear: 229, deathYear: 291 },

  // Generation 3 outsiders.
  { id: 'frida', name: 'Frida', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 3, birthYear: 270, deathYear: 332 },
  { id: 'ulf', name: 'Ulf', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 3, birthYear: 268, deathYear: 330 },
  { id: 'signy', name: 'Signy', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 3, birthYear: 274, deathYear: 337 },
  {
    id: 'arvid',
    name: 'Arvid',
    sex: 'male',
    bloodline: OUTLAND,
    breed: COASTAL,
    generation: 3,
    birthYear: 272,
    deathYear: 335,
  },
  { id: 'brenna', name: 'Brenna', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 3, birthYear: 277, deathYear: 339 },
  { id: 'hakr', name: 'Hakr', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 3, birthYear: 273, deathYear: 336 },

  // Generation 4 outsiders.
  { id: 'gunnar', name: 'Gunnar', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 4, birthYear: 306, deathYear: null },
  { id: 'dagny', name: 'Dagny', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 4, birthYear: 310, deathYear: null },
  { id: 'ivar', name: 'Ivar', sex: 'male', bloodline: OUTLAND, breed: COASTAL, generation: 4, birthYear: 308, deathYear: null },
  { id: 'lisbet', name: 'Lisbet', sex: 'female', bloodline: OUTLAND, breed: COASTAL, generation: 4, birthYear: 312, deathYear: null },
];

const UNIONS: readonly UnionSpec[] = [
  // ---- Generation 2 -------------------------------------------------------
  {
    motherId: 'halvora',
    fatherId: 'vyrak',
    children: [
      { id: 'kaenor', name: 'Kaenor', sex: 'male', birthYear: 224, deathYear: 288 },
      { id: 'sylvi', name: 'Sylvi', sex: 'female', birthYear: 227, deathYear: 291 },
      {
        id: 'brandt',
        name: 'Brandt',
        sex: 'male',
        birthYear: 231,
        deathYear: 284,
        dnaAvailable: false,
        unrecordedGeneIds: ['tail'],
        note: 'The Brandt clutch record was burned; his tail description does not survive.',
      },
    ],
  },
  {
    motherId: 'sable',
    fatherId: 'torvald',
    children: [
      {
        id: 'ryska',
        name: 'Ryska',
        sex: 'female',
        birthYear: 226,
        deathYear: 290,
        require: { wings: 'Ww' },
      },
      {
        id: 'emberic',
        name: 'Emberic',
        sex: 'male',
        birthYear: 229,
        deathYear: 285,
        require: { wings: 'ww' },
        note: 'Recorded as flightless from hatching. The Emberfall wardens kept him at the eyrie.',
      },
    ],
  },
  {
    motherId: 'ilira',
    fatherId: 'ghest',
    children: [
      { id: 'nyra', name: 'Nyra', sex: 'female', birthYear: 225, deathYear: 289 },
      { id: 'vandel', name: 'Vandel', sex: 'male', birthYear: 228, deathYear: 287 },
    ],
  },
  {
    motherId: 'ondra',
    fatherId: 'korrak',
    children: [
      { id: 'hakon', name: 'Hakon', sex: 'male', birthYear: 222, deathYear: 281 },
      { id: 'selka', name: 'Selka', sex: 'female', birthYear: 226, deathYear: 288 },
    ],
  },

  // ---- Generation 3 -------------------------------------------------------
  {
    motherId: 'orsa',
    fatherId: 'kaenor',
    children: [
      {
        id: 'ivrid',
        name: 'Ivrid',
        epithet: 'the Pale',
        sex: 'male',
        birthYear: 266,
        deathYear: 301,
        require: { scales: 'ss' },
        note: 'The last dragon the archive records without banding. Died in the winter of 301.',
        achievements: ['A preserved wing membrane survives and can still be sequenced'],
      },
      { id: 'halgrim', name: 'Halgrim', sex: 'male', birthYear: 269, deathYear: 329, require: { scales: 'Ss' } },
      { id: 'aster', name: 'Aster', sex: 'female', birthYear: 272, deathYear: 334, require: { scales: 'SS' } },
    ],
  },
  {
    motherId: 'sylvi',
    fatherId: 'beorn',
    children: [
      {
        id: 'revna',
        name: 'Revna',
        sex: 'female',
        birthYear: 268,
        deathYear: 331,
        require: { scales: 'Ss' },
      },
    ],
  },
  {
    motherId: 'nessa',
    fatherId: 'brandt',
    children: [
      { id: 'sindri', name: 'Sindri', sex: 'male', birthYear: 273, deathYear: 336, require: { scales: 'Ss' } },
    ],
  },
  {
    motherId: 'ryska',
    fatherId: 'rhogar',
    children: [
      { id: 'lorne', name: 'Lorne', sex: 'male', birthYear: 265, deathYear: 322, require: { 'body-color': 'Bb' } },
      {
        id: 'veya',
        name: 'Veya',
        sex: 'female',
        birthYear: 270,
        deathYear: 333,
        require: { 'body-color': 'Bb', wings: 'Ww' },
      },
    ],
  },
  {
    motherId: 'astrid',
    fatherId: 'emberic',
    children: [
      { id: 'dagon', name: 'Dagon', sex: 'male', birthYear: 267, deathYear: 328, require: { 'body-color': 'Bb' } },
      {
        id: 'isolde',
        name: 'Isolde',
        sex: 'female',
        birthYear: 271,
        deathYear: 333,
        require: { 'body-color': 'BB' },
      },
    ],
  },
  {
    motherId: 'nyra',
    fatherId: 'garrick',
    children: [
      { id: 'elva', name: 'Elva', sex: 'female', birthYear: 264, deathYear: 327, require: { 'eye-color': 'Ee' } },
      {
        id: 'hedin',
        name: 'Hedin',
        sex: 'male',
        birthYear: 269,
        deathYear: 330,
        require: { 'eye-color': 'eY' },
        note: 'The Duskmere watch lists his eye as “winter blue”.',
      },
    ],
  },
  {
    motherId: 'saskia',
    fatherId: 'vandel',
    children: [
      { id: 'alvi', name: 'Alvi', sex: 'female', birthYear: 266, deathYear: 329 },
      { id: 'karr', name: 'Karr', sex: 'male', birthYear: 270, deathYear: 331 },
    ],
  },
  {
    motherId: 'una',
    fatherId: 'hakon',
    children: [
      { id: 'bresk', name: 'Bresk', sex: 'male', birthYear: 263, deathYear: 325, require: { tail: 'Kk' } },
    ],
  },
  {
    motherId: 'selka',
    fatherId: 'orvar',
    children: [
      { id: 'tila', name: 'Tila', sex: 'female', birthYear: 267, deathYear: 330, require: { tail: 'Kk' } },
    ],
  },

  // ---- Generation 4 -------------------------------------------------------
  {
    motherId: 'frida',
    fatherId: 'ivrid',
    children: [
      {
        id: 'hesper',
        name: 'Hesper',
        sex: 'female',
        birthYear: 299,
        deathYear: null,
        note: 'Ivrid’s only recorded hatchling, and the oldest living dragon in the register.',
      },
    ],
  },
  {
    motherId: 'frida',
    fatherId: 'halgrim',
    children: [
      { id: 'sten', name: 'Sten', sex: 'male', birthYear: 304, deathYear: null, require: { scales: 'Ss' } },
      { id: 'runa', name: 'Runa', sex: 'female', birthYear: 307, deathYear: 371, require: { scales: 'SS' } },
    ],
  },
  {
    motherId: 'revna',
    fatherId: 'ulf',
    children: [
      { id: 'orik', name: 'Orik', sex: 'male', birthYear: 303, deathYear: null, require: { scales: 'Ss' } },
      { id: 'hallr', name: 'Hallr', sex: 'male', birthYear: 306, deathYear: 369, require: { scales: 'SS' } },
    ],
  },
  {
    motherId: 'signy',
    fatherId: 'sindri',
    children: [
      { id: 'vigdis', name: 'Vigdis', sex: 'female', birthYear: 308, deathYear: null, require: { scales: 'Ss' } },
      { id: 'eirik', name: 'Eirik', sex: 'male', birthYear: 311, deathYear: null, require: { scales: 'Ss' } },
    ],
  },
  {
    motherId: 'brenna',
    fatherId: 'lorne',
    children: [
      { id: 'astra', name: 'Astra', sex: 'female', birthYear: 302, deathYear: null, require: { 'body-color': 'Bb' } },
      { id: 'torin', name: 'Torin', sex: 'male', birthYear: 305, deathYear: 368, require: { 'body-color': 'BB' } },
    ],
  },
  {
    motherId: 'veya',
    fatherId: 'arvid',
    children: [
      {
        id: 'kelvar',
        name: 'Kelvar',
        sex: 'male',
        birthYear: 306,
        deathYear: null,
        require: { 'body-color': 'Bb', wings: 'Ww' },
      },
      {
        id: 'sunniva',
        name: 'Sunniva',
        sex: 'female',
        birthYear: 309,
        deathYear: null,
        require: { 'body-color': 'Bb', wings: 'Ww' },
      },
    ],
  },
  {
    motherId: 'tila',
    fatherId: 'dagon',
    children: [
      {
        id: 'rurik',
        name: 'Rurik',
        sex: 'male',
        birthYear: 304,
        deathYear: null,
        require: { 'body-color': 'Bb', wings: 'Ww', tail: 'Kk' },
      },
      { id: 'liv', name: 'Liv', sex: 'female', birthYear: 307, deathYear: null, require: { wings: 'Ww', tail: 'Kk' } },
    ],
  },
  {
    motherId: 'elva',
    fatherId: 'bresk',
    children: [
      {
        id: 'saga',
        name: 'Saga',
        sex: 'female',
        birthYear: 303,
        deathYear: null,
        require: { 'eye-color': 'Ee', tail: 'Kk' },
      },
      {
        id: 'bjorn',
        name: 'Bjorn',
        sex: 'male',
        birthYear: 306,
        deathYear: 380,
        require: { 'eye-color': 'eY' },
        note: 'The last dragon the watch recorded with a pale blue eye. Died four winters ago.',
      },
    ],
  },
  {
    motherId: 'alvi',
    fatherId: 'hakr',
    children: [
      {
        id: 'ingrid',
        name: 'Ingrid',
        sex: 'female',
        birthYear: 305,
        deathYear: null,
        require: { 'eye-color': 'Ee' },
      },
      { id: 'sivert', name: 'Sivert', sex: 'male', birthYear: 309, deathYear: 372 },
    ],
  },
  {
    motherId: 'isolde',
    fatherId: 'karr',
    children: [
      { id: 'thora', name: 'Thora', sex: 'female', birthYear: 308, deathYear: null, require: { wings: 'Ww' } },
    ],
  },

  // ---- Generation 5, the living register ----------------------------------
  {
    motherId: 'hesper',
    fatherId: 'gunnar',
    children: [
      {
        id: 'arkon',
        name: 'Arkon',
        sex: 'male',
        birthYear: 344,
        deathYear: null,
        require: { scales: 'Ss' },
        note: 'Ranges the northern passes his ancestors held.',
      },
      { id: 'signe', name: 'Signe', sex: 'female', birthYear: 348, deathYear: null, require: { scales: 'Ss' } },
    ],
  },
  {
    motherId: 'dagny',
    fatherId: 'eirik',
    children: [
      { id: 'sylva', name: 'Sylva', sex: 'female', birthYear: 348, deathYear: null, require: { scales: 'Ss' } },
      { id: 'ragna', name: 'Ragna', sex: 'female', birthYear: 352, deathYear: null, require: { scales: 'SS' } },
    ],
  },
  {
    motherId: 'vigdis',
    fatherId: 'ivar',
    children: [
      { id: 'kaelen', name: 'Kaelen', sex: 'male', birthYear: 346, deathYear: null },
      { id: 'hilde', name: 'Hilde', sex: 'female', birthYear: 350, deathYear: null },
    ],
  },
  {
    motherId: 'astra',
    fatherId: 'sten',
    children: [
      {
        id: 'nissa',
        name: 'Nissa',
        sex: 'female',
        birthYear: 345,
        deathYear: null,
        require: { 'body-color': 'Bb', scales: 'Ss' },
      },
      { id: 'osk', name: 'Osk', sex: 'male', birthYear: 349, deathYear: null },
    ],
  },
  {
    motherId: 'liv',
    fatherId: 'kelvar',
    children: [
      {
        id: 'hrafn',
        name: 'Hrafn',
        sex: 'male',
        birthYear: 347,
        deathYear: null,
        require: { 'body-color': 'Bb', wings: 'Ww' },
      },
      {
        id: 'edda',
        name: 'Edda',
        sex: 'female',
        birthYear: 351,
        deathYear: null,
        require: { wings: 'ww' },
        note: 'Flightless. The wardens keep her in the low eyries with Emberic’s old lineage.',
      },
    ],
  },
  {
    motherId: 'sunniva',
    fatherId: 'rurik',
    children: [
      {
        id: 'bjarke',
        name: 'Bjarke',
        sex: 'male',
        birthYear: 346,
        deathYear: null,
        require: { 'body-color': 'Bb', tail: 'Kk' },
      },
      {
        id: 'yrsa',
        name: 'Yrsa',
        sex: 'female',
        birthYear: 350,
        deathYear: null,
        require: { 'body-color': 'Bb', wings: 'Ww' },
      },
    ],
  },
  {
    motherId: 'saga',
    fatherId: 'torin',
    children: [
      {
        id: 'vela',
        name: 'Vela',
        sex: 'female',
        birthYear: 347,
        deathYear: null,
        require: { 'eye-color': 'Ee', tail: 'Kk' },
      },
      {
        id: 'nikolas',
        name: 'Nikolas',
        sex: 'male',
        birthYear: 352,
        deathYear: null,
        require: { tail: 'Kk', 'eye-color': 'EY' },
      },
    ],
  },
  {
    motherId: 'ingrid',
    fatherId: 'bjorn',
    children: [
      {
        id: 'mira',
        name: 'Mira',
        sex: 'female',
        birthYear: 349,
        deathYear: null,
        require: { 'eye-color': 'Ee' },
      },
      { id: 'ulric', name: 'Ulric', sex: 'male', birthYear: 353, deathYear: null, require: { 'eye-color': 'EY' } },
    ],
  },
  {
    motherId: 'thora',
    fatherId: 'hallr',
    children: [
      { id: 'frey', name: 'Frey', sex: 'male', birthYear: 351, deathYear: null, require: { wings: 'Ww' } },
      { id: 'brynja', name: 'Brynja', sex: 'female', birthYear: 356, deathYear: null },
    ],
  },
  {
    motherId: 'lisbet',
    fatherId: 'orik',
    children: [
      { id: 'torv', name: 'Torv', sex: 'male', birthYear: 350, deathYear: null, require: { scales: 'Ss' } },
      { id: 'aud', name: 'Aud', sex: 'female', birthYear: 354, deathYear: null },
    ],
  },
];

/** The authored lineage, exported so the archive's own tests can check its pins. */
export const PEDIGREE_UNIONS: readonly PedigreeUnionSpec[] = UNIONS;

export const BLOODLINE_INVESTIGATIONS: readonly BloodlineInvestigation[] = [
  {
    id: 'frost-scale',
    geneId: 'scales',
    ancestorId: 'vyrak',
    bloodline: NORTHERN_STORM,
    lostPhenotype: pedigreeGene('scales').recessivePhenotype,
    archiveTitle: 'VYRAK THE FROST KING',
    brief:
      'No dragon has been recorded without scale banding since Ivrid the Pale died in 301. The northern wardens believe the pale form still moves through Vyrak’s descendants without being seen. Find it.',
    riskGeneId: null,
    dnaTestBudget: 5,
  },
  {
    id: 'emberfall-teal',
    geneId: 'body-color',
    ancestorId: 'sable',
    bloodline: EMBERFALL,
    lostPhenotype: pedigreeGene('body-color').recessivePhenotype,
    archiveTitle: 'SABLE OF EMBERFALL',
    brief:
      'Every living Emberfall dragon is bronze. Sable was sea-coloured, and no hatchling has been since. The same eyries also record flightless hatchlings in every other generation — check what else the line is carrying before you breed it.',
    riskGeneId: 'wings',
    dnaTestBudget: 5,
  },
  {
    id: 'duskmere-eye',
    geneId: 'eye-color',
    ancestorId: 'ilira',
    bloodline: DUSKMERE,
    lostPhenotype: pedigreeGene('eye-color').recessivePhenotype,
    archiveTitle: 'ILIRA THE DUSKMERE QUEEN',
    brief:
      'The Duskmere blue eye appeared in every generation until Bjorn died in 380, and the watch has never recorded it in a hatchling whose mother did not descend from Ilira. Nothing in the living register shows it now.',
    riskGeneId: null,
    dnaTestBudget: 5,
  },
  {
    id: 'stonewake-tail',
    geneId: 'tail',
    ancestorId: 'korrak',
    bloodline: STONEWAKE,
    lostPhenotype: pedigreeGene('tail').recessivePhenotype,
    archiveTitle: 'KORRAK STONEWAKE',
    brief:
      'Korrak’s quiet tail has not been cast in stone since he died in 239. The Stonewake register describes three different tail ends among his descendants, which is one more than most bloodline hunts have to account for.',
    riskGeneId: null,
    dnaTestBudget: 4,
  },
];

export function buildPedigreeArchive(): PedigreeDragon[] {
  const built = new Map<string, MutableDragon>();

  for (const founder of FOUNDERS) {
    built.set(founder.id, {
      ...baseDragon(founder, founder.bloodline, founder.breed, founder.generation ?? 1),
      motherId: null,
      fatherId: null,
      genome: founderGenome(founder),
    });
  }

  for (const union of UNIONS) {
    const mother = required(built, union.motherId);
    const father = required(built, union.fatherId);
    addMate(mother, father.id);
    addMate(father, mother.id);

    for (const child of union.children) {
      const bloodline = child.bloodline ?? inheritedBloodline(mother, father);
      const breed = child.breed ?? (father.breed === COASTAL ? mother.breed : father.breed);
      const generation = Math.max(mother.generation, father.generation) + 1;
      built.set(child.id, {
        ...baseDragon(child, bloodline, breed, generation),
        motherId: mother.id,
        fatherId: father.id,
        genome: childGenome(child, mother, father),
      });
      mother.offspringIds = [...mother.offspringIds, child.id];
      father.offspringIds = [...father.offspringIds, child.id];
    }
  }

  return [...built.values()]
    .map((dragon) => ({ ...dragon }))
    .sort((left, right) => left.generation - right.generation || left.birthYear - right.birthYear);
}

export const PEDIGREE_ARCHIVE: PedigreePopulation = buildPedigreeArchive();

export function archiveDragon(id: string): PedigreeDragon | null {
  return PEDIGREE_ARCHIVE.find((dragon) => dragon.id === id) ?? null;
}

export function investigationById(id: string): BloodlineInvestigation {
  const investigation = BLOODLINE_INVESTIGATIONS.find((candidate) => candidate.id === id);
  if (!investigation) throw new Error(`Unknown bloodline investigation: ${id}`);
  return investigation;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

interface MutableDragon extends Omit<PedigreeDragon, 'mateIds' | 'offspringIds'> {
  mateIds: readonly string[];
  offspringIds: readonly string[];
}

function baseDragon(
  spec: DragonSpec,
  bloodline: string,
  breed: string,
  generation: number,
): Omit<MutableDragon, 'motherId' | 'fatherId' | 'genome'> {
  const unrecorded = new Set(spec.unrecordedGeneIds ?? []);
  return {
    id: spec.id,
    name: spec.name,
    epithet: spec.epithet ?? '',
    sex: spec.sex,
    bloodline,
    breed,
    generation,
    birthYear: spec.birthYear,
    deathYear: spec.deathYear,
    alive: spec.deathYear === null,
    mateIds: [],
    offspringIds: [],
    dnaAvailable: spec.dnaAvailable ?? true,
    recordedGeneIds: PEDIGREE_GENE_IDS.filter((geneId) => !unrecorded.has(geneId)),
    legendary: spec.legendary ?? false,
    historicalNote: spec.note ?? null,
    achievements: spec.achievements ?? [],
    origin: 'archive',
  };
}

function founderGenome(founder: FounderSpec): PedigreeGenome {
  const genome = defaultGenome(founder.sex);
  for (const geneId of PEDIGREE_GENE_IDS) {
    const code = founder.genotypes?.[geneId];
    if (code) genome[geneId] = parseGenotypeCode(geneId, code, founder.sex);
  }
  return genome;
}

function childGenome(child: ChildSpec, mother: MutableDragon, father: MutableDragon): PedigreeGenome {
  const genome = defaultGenome(child.sex);
  for (const geneId of PEDIGREE_GENE_IDS) {
    const maternal = transmissibleAlleles(geneId, mother, child.sex, 'mother');
    const paternal = transmissibleAlleles(geneId, father, child.sex, 'father');
    const requiredCode = child.require?.[geneId];
    const pinned = requiredCode
      ? matchRequirement(geneId, child.sex, requiredCode, maternal, paternal)
      : null;
    genome[geneId] =
      pinned ??
      normalizePair(geneId, [
        pick(maternal, `${child.id}:${geneId}:maternal`),
        pick(paternal, `${child.id}:${geneId}:paternal`),
      ]);
  }
  return genome;
}

/**
 * Which alleles this parent can pass for this locus.
 *
 * The X-linked case is the reason this is a function rather than a spread: a
 * father hands his single X to every daughter and a Y to every son, so an
 * X-linked trait cannot travel father-to-son at all — which is the pattern the
 * Duskmere investigation asks students to notice.
 */
export function transmissibleAlleles(
  geneId: PedigreeGeneId,
  parent: { sex: DragonSex; genome: PedigreeGenome },
  childSex: DragonSex,
  side: 'mother' | 'father',
): readonly string[] {
  const gene = pedigreeGene(geneId);
  const pair = parent.genome[geneId];
  if (gene.inheritance !== 'x-linked') return [pair[0], pair[1]];
  if (side === 'mother') return [pair[0], pair[1]];
  return childSex === 'male' ? ['Y'] : [pair[0]];
}

function matchRequirement(
  geneId: PedigreeGeneId,
  sex: DragonSex,
  code: string,
  maternal: readonly string[],
  paternal: readonly string[],
): PedigreeAllelePair | null {
  const target = normalizePair(geneId, parseGenotypeCode(geneId, code, sex));
  for (const fromMother of maternal) {
    for (const fromFather of paternal) {
      const candidate = normalizePair(geneId, [fromMother, fromFather]);
      if (candidate[0] === target[0] && candidate[1] === target[1]) return candidate;
    }
  }
  return null;
}

export function defaultGenome(sex: DragonSex): PedigreeGenome {
  return Object.fromEntries(
    PEDIGREE_GENE_IDS.map((geneId) => {
      const gene = pedigreeGene(geneId);
      const dominant = gene.dominantAllele;
      return [
        geneId,
        gene.inheritance === 'x-linked' && sex === 'male'
          ? ([dominant, 'Y'] as PedigreeAllelePair)
          : ([dominant, dominant] as PedigreeAllelePair),
      ];
    }),
  ) as PedigreeGenome;
}

/** Reads an authored code such as `Ss`, `bb`, or `eY` into an allele pair. */
export function parseGenotypeCode(
  geneId: PedigreeGeneId,
  code: string,
  sex: DragonSex,
): PedigreeAllelePair {
  const gene = pedigreeGene(geneId);
  const letters = [...code];
  if (letters.length !== 2) {
    throw new Error(`Genotype code "${code}" for ${geneId} must name two alleles.`);
  }
  const valid = new Set([gene.dominantAllele, gene.recessiveAllele, 'Y']);
  for (const letter of letters) {
    if (!valid.has(letter)) {
      throw new Error(`Allele "${letter}" is not part of the ${gene.name} locus.`);
    }
  }
  if (gene.inheritance === 'x-linked' && sex === 'male' && letters[1] !== 'Y') {
    throw new Error(`Male ${geneId} genotype "${code}" must be hemizygous, for example eY.`);
  }
  return normalizePair(geneId, [letters[0], letters[1]]);
}

/** Dominant allele first, then recessive, then `Y` — so pairs compare as strings. */
export function normalizePair(geneId: PedigreeGeneId, pair: PedigreeAllelePair): PedigreeAllelePair {
  const gene = pedigreeGene(geneId);
  const order = (allele: string): number =>
    allele === gene.dominantAllele ? 0 : allele === gene.recessiveAllele ? 1 : 2;
  return [...pair].sort((left, right) => order(left) - order(right)) as unknown as PedigreeAllelePair;
}

function inheritedBloodline(mother: MutableDragon, father: MutableDragon): string {
  if (father.bloodline !== OUTLAND) return father.bloodline;
  if (mother.bloodline !== OUTLAND) return mother.bloodline;
  return OUTLAND;
}

function addMate(dragon: MutableDragon, mateId: string): void {
  if (!dragon.mateIds.includes(mateId)) dragon.mateIds = [...dragon.mateIds, mateId];
}

function required(built: Map<string, MutableDragon>, id: string): MutableDragon {
  const dragon = built.get(id);
  if (!dragon) throw new Error(`Union names ${id} before the archive records it.`);
  return dragon;
}

function pick(options: readonly string[], seed: string): string {
  return options[stableHash(seed) % options.length];
}

/**
 * FNV-1a plus an avalanche, because the bit this is used for is the lowest one.
 *
 * Raw FNV-1a's low bit is only the parity of the input bytes: multiplying by an
 * odd prime never changes it. Two seeds that differ by one character therefore
 * land on *opposite* low bits every time, so `hash(seed + ':m') % 2` and
 * `hash(seed + ':p') % 2` were perfectly anti-correlated — a carrier × carrier
 * cross drew one allele from each parent's opposite slot and could not produce a
 * homozygote at all. The recessive form would have been unrecoverable, which is
 * the one thing this laboratory exists to do.
 *
 * The murmur3 finalizer below mixes the high bits down so every bit depends on
 * the whole string. `pedigree-lab.domain.spec.ts` holds the ratchet: a
 * heterozygous pair must hatch close to a quarter homozygous recessive.
 */
export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Living dragons, oldest first — the register a student can actually breed from. */
export function livingRegister(population: PedigreePopulation): readonly PedigreeDragon[] {
  return population.filter((dragon) => dragon.alive).sort((a, b) => a.birthYear - b.birthYear);
}

export function yearsSince(year: number): number {
  return ARCHIVE_YEAR - year;
}
