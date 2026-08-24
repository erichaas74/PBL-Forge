/**
 * Genetics of the domesticated mini dragon.
 *
 * A separate species from the four-gene lab dragon, with its own loci and — the
 * reason it exists — its own *inheritance patterns*. The lab dragon models one
 * relationship four times: one dominant allele is enough, and the heterozygote
 * is invisible. A breeding program that only ever replays that square teaches one
 * idea. These twenty-four genes cover four different relationships, so a student writing
 * a breed standard meets a different problem at each locus.
 *
 * Nothing here is ever rendered to a student as a symbol. The workstation shows
 * `MiniPhenotypeForm.label` and nothing else; allele letters exist so this module
 * can compute, not so the surface can display them.
 */

export type MiniGeneId =
  | 'coat'
  | 'plumage'
  | 'horns'
  | 'wings'
  | 'pattern'
  | 'ember'
  | 'size'
  | 'eyes'
  | 'ears'
  | 'muzzle'
  | 'legs'
  | 'tail'
  | 'crest'
  | 'frame'
  | 'brow'
  | 'whiskers'
  | 'chin'
  | 'dewlap'
  | 'ruff'
  | 'shoulders'
  | 'belly'
  | 'flank-fins'
  | 'hip-fins'
  | 'tail-sail';

/** Loci present in persisted genomes before the anatomy expansion. */
export const LEGACY_MINI_GENE_IDS = [
  'coat', 'plumage', 'horns', 'wings', 'pattern', 'ember', 'size', 'ears', 'muzzle',
  'legs', 'tail', 'crest', 'frame',
] as const satisfies readonly MiniGeneId[];

export type MiniInheritancePattern =
  'complete-dominance' | 'incomplete-dominance' | 'codominance' | 'multiple-alleles';

export type MiniGenotype = readonly [string, string];
export type MiniGenome = Readonly<Record<MiniGeneId, MiniGenotype>>;

export interface MiniPhenotypeForm {
  id: string;
  label: string;
}

export interface MiniGeneDefinition {
  id: MiniGeneId;
  name: string;
  pattern: MiniInheritancePattern;
  /**
   * Every allele at this locus, **most dominant first**. For a multiple-allele
   * series that order is the dominance hierarchy; for the two-allele genes it is
   * simply dominant then recessive.
   */
  alleles: readonly string[];
  /**
   * Visible forms, in the order the resolver produces them:
   * - complete dominance: [dominant form, recessive form]
   * - incomplete dominance / codominance: [homozygous first, heterozygous, homozygous second]
   * - multiple alleles: one form per allele, in dominance order
   */
  forms: readonly MiniPhenotypeForm[];
  /** What a breeder can observe about this trait, for the optional guide. */
  observation: string;
}

function form(id: string, label: string): MiniPhenotypeForm {
  return { id, label };
}

export const MINI_DRAGON_GENES: readonly MiniGeneDefinition[] = [
  {
    id: 'coat',
    name: 'Back scales',
    pattern: 'complete-dominance',
    alleles: ['F', 'f'],
    forms: [form('coat:sleek', 'Smooth scale rows'), form('coat:fluffy', 'Baby-bumpy spike rows')],
    observation:
      'A smooth-backed dragon can carry the baby-bumpy form without showing it, so two smooth-backed parents can produce bumpy young.',
  },
  {
    id: 'plumage',
    name: 'Feather coverage',
    pattern: 'incomplete-dominance',
    alleles: ['P', 'p'],
    forms: [
      form('plumage:full', 'Full feather mantle'),
      form('plumage:fringe', 'Feathered fringe'),
      form('plumage:bare', 'Scale-only coat'),
    ],
    observation:
      'Feather coverage blends: a mixed pair grows a lighter fringe between the full mantle and a scale-only coat.',
  },
  {
    id: 'horns',
    name: 'Horns',
    pattern: 'complete-dominance',
    alleles: ['C', 'c'],
    forms: [form('horns:curled', 'Curled horns'), form('horns:straight', 'Straight horns')],
    observation: 'Curled horns hide whether a dragon also carries the straight form.',
  },
  {
    id: 'wings',
    name: 'Wings',
    pattern: 'incomplete-dominance',
    alleles: ['W', 'w'],
    forms: [
      form('wings:broad', 'Broad wings'),
      form('wings:small', 'Small wings'),
      form('wings:vestigial', 'Vestigial wings'),
    ],
    observation:
      'Three visible forms, and the middle one breeds true to none of them: it is the only wing form whose parents can be told apart by looking.',
  },
  {
    id: 'pattern',
    name: 'Coat pattern',
    pattern: 'codominance',
    alleles: ['A', 'G'],
    forms: [
      form('pattern:ash', 'Ash coat'),
      form('pattern:ash-gold', 'Ash-and-gold coat'),
      form('pattern:gold', 'Gold coat'),
    ],
    observation:
      'A dragon carrying both forms shows both at once, in patches, rather than a colour in between.',
  },
  {
    id: 'ember',
    name: 'Ember',
    pattern: 'multiple-alleles',
    alleles: ['Er', 'Eb', 'ep'],
    forms: [
      form('ember:rose', 'Rose ember'),
      form('ember:blue', 'Blue ember'),
      form('ember:pale', 'Pale ember'),
    ],
    observation:
      'Three forms exist in the population, but any one dragon carries only two. A rose dragon may hide either of the others.',
  },
  {
    id: 'size',
    name: 'Size',
    pattern: 'complete-dominance',
    alleles: ['T', 't'],
    forms: [form('size:standard', 'Standard'), form('size:teacup', 'Teacup')],
    observation: 'Teacup is the hidden form: two standard parents can produce a teacup.',
  },
  {
    id: 'ears',
    name: 'Ears',
    pattern: 'incomplete-dominance',
    alleles: ['E', 'e'],
    forms: [
      form('ears:sail', 'Tall sail ears'),
      form('ears:petal', 'Petal ears'),
      form('ears:button', 'Tiny button ears'),
    ],
    observation: 'The middle combination grows petal ears between tall sails and tiny buttons.',
  },
  {
    id: 'muzzle',
    name: 'Muzzle',
    pattern: 'incomplete-dominance',
    alleles: ['M', 'm'],
    forms: [
      form('muzzle:long', 'Long storybook muzzle'),
      form('muzzle:medium', 'Round short muzzle'),
      form('muzzle:pug', 'Button-pug muzzle'),
    ],
    observation: 'Muzzle length blends into three clearly different face shapes.',
  },
  {
    id: 'legs',
    name: 'Leg length',
    pattern: 'incomplete-dominance',
    alleles: ['L', 'l'],
    forms: [
      form('legs:stilt', 'Long stilt legs'),
      form('legs:medium', 'Medium legs'),
      form('legs:waddler', 'Tiny waddler legs'),
    ],
    observation: 'The middle combination stands halfway between a tall runner and a low waddler.',
  },
  {
    id: 'tail',
    name: 'Tail form',
    pattern: 'multiple-alleles',
    alleles: ['Ts', 'Td', 'Tf', 'Tp'],
    forms: [
      form('tail:star', 'Round star club'),
      form('tail:split', 'Twin long tails'),
      form('tail:fork', 'Twin-fork paddle'),
      form('tail:pom', 'Soft pom tail'),
    ],
    observation:
      'Four tail forms circulate in the kennel. The twin-tail form grows one shared base before dividing into two complete tails.',
  },
  {
    id: 'crest',
    name: 'Head crest',
    pattern: 'codominance',
    alleles: ['K', 'R'],
    forms: [
      form('crest:crown', 'Crown bumps'),
      form('crest:crown-frill', 'Crown-and-frill crest'),
      form('crest:frill', 'Side petal frills'),
    ],
    observation: 'A dragon carrying both crest forms displays the crown and side frills together.',
  },
  {
    id: 'frame',
    name: 'Body frame',
    pattern: 'incomplete-dominance',
    alleles: ['B', 'b'],
    forms: [
      form('frame:long', 'Long noodle frame'),
      form('frame:balanced', 'Balanced frame'),
      form('frame:round', 'Round dumpling frame'),
    ],
    observation:
      'Body length and roundness blend, creating long, balanced, and dumpling silhouettes.',
  },
  {
    id: 'brow',
    name: 'Brow plates',
    pattern: 'incomplete-dominance',
    alleles: ['Q', 'q'],
    forms: [
      form('brow:crowned', 'Crowned brow plates'),
      form('brow:soft', 'Soft brow pads'),
      form('brow:smooth', 'Smooth brow'),
    ],
    observation: 'Brow armor blends from a pronounced crown through soft pads to a smooth face.',
  },
  {
    id: 'whiskers',
    name: 'Whiskers',
    pattern: 'incomplete-dominance',
    alleles: ['V', 'v'],
    forms: [
      form('whiskers:long', 'Long storybook whiskers'),
      form('whiskers:short', 'Short whiskers'),
      form('whiskers:none', 'Whiskerless'),
    ],
    observation: 'Whisker length produces a visible middle form in mixed young.',
  },
  {
    id: 'chin',
    name: 'Chin tuft',
    pattern: 'complete-dominance',
    alleles: ['J', 'j'],
    forms: [form('chin:plume', 'Feathered chin plume'), form('chin:smooth', 'Smooth chin')],
    observation: 'A chin plume can hide the smooth-chin form in a carrier.',
  },
  {
    id: 'dewlap',
    name: 'Dewlap',
    pattern: 'incomplete-dominance',
    alleles: ['D', 'd'],
    forms: [
      form('dewlap:full', 'Full velvet dewlap'),
      form('dewlap:half', 'Half dewlap'),
      form('dewlap:none', 'Clean throat'),
    ],
    observation: 'Throat-sail depth blends into full, half, and clean-throat forms.',
  },
  {
    id: 'ruff',
    name: 'Neck ruff',
    pattern: 'codominance',
    alleles: ['N', 'n'],
    forms: [
      form('ruff:mane', 'Soft mane ruff'),
      form('ruff:mane-petal', 'Mane-and-petal collar'),
      form('ruff:petal', 'Petal collar'),
    ],
    observation: 'Mixed dragons display both the mane and petal textures around the collar.',
  },
  {
    id: 'shoulders',
    name: 'Shoulder plates',
    pattern: 'complete-dominance',
    alleles: ['H', 'h'],
    forms: [form('shoulders:shield', 'Shield shoulder plates'), form('shoulders:soft', 'Soft shoulders')],
    observation: 'Shielded shoulders can carry the soft-shoulder form without showing it.',
  },
  {
    id: 'belly',
    name: 'Belly scutes',
    pattern: 'incomplete-dominance',
    alleles: ['U', 'u'],
    forms: [
      form('belly:plated', 'Broad belly scutes'),
      form('belly:pebbled', 'Pebbled belly scutes'),
      form('belly:soft', 'Soft unplated belly'),
    ],
    observation: 'Belly armor blends from broad plates through small pebbles to a soft belly.',
  },
  {
    id: 'flank-fins',
    name: 'Flank fins',
    pattern: 'incomplete-dominance',
    alleles: ['X', 'x'],
    forms: [
      form('flank-fins:sail', 'Tall flank sails'),
      form('flank-fins:petal', 'Petal flank fins'),
      form('flank-fins:none', 'Smooth flanks'),
    ],
    observation: 'Side fins have a petal-sized middle form between tall sails and smooth flanks.',
  },
  {
    id: 'hip-fins',
    name: 'Hip fins',
    pattern: 'incomplete-dominance',
    alleles: ['I', 'i'],
    forms: [
      form('hip-fins:sail', 'Broad hip sails'),
      form('hip-fins:petal', 'Petal hip fins'),
      form('hip-fins:none', 'Smooth hips'),
    ],
    observation: 'Hip-fin size blends into sail, petal, and smooth forms.',
  },
  {
    id: 'tail-sail',
    name: 'Tail sail',
    pattern: 'incomplete-dominance',
    alleles: ['Y', 'y'],
    forms: [
      form('tail-sail:ribbon', 'Ribbon tail sail'),
      form('tail-sail:ridge', 'Low tail ridge'),
      form('tail-sail:none', 'Smooth tail'),
    ],
    observation: 'Tail webbing blends from a high ribbon through a low ridge to a smooth tail.',
  },
  // Kept after the original 23 loci so adding this inherited trait does not
  // perturb the deterministic founder-stock streams used by older activities.
  {
    id: 'eyes',
    name: 'Eye size',
    pattern: 'incomplete-dominance',
    alleles: ['O', 'o'],
    forms: [
      form('eyes:large', 'Large storybook eyes'),
      form('eyes:medium', 'Medium bright eyes'),
      form('eyes:small', 'Small keen eyes'),
    ],
    observation: 'Eye size blends, so mixed young have eyes midway between the large and small forms.',
  },
];

/** Neutral forms applied when a persisted thirteen-gene dragon has no newer loci yet. */
export const MINI_DEFAULT_FORM_IDS: Readonly<Record<MiniGeneId, string>> = {
  coat: 'coat:sleek',
  plumage: 'plumage:bare',
  horns: 'horns:curled',
  wings: 'wings:small',
  pattern: 'pattern:ash-gold',
  ember: 'ember:pale',
  size: 'size:standard',
  eyes: 'eyes:medium',
  ears: 'ears:petal',
  muzzle: 'muzzle:medium',
  legs: 'legs:medium',
  tail: 'tail:pom',
  crest: 'crest:frill',
  frame: 'frame:balanced',
  brow: 'brow:soft',
  whiskers: 'whiskers:short',
  chin: 'chin:smooth',
  dewlap: 'dewlap:half',
  ruff: 'ruff:mane-petal',
  shoulders: 'shoulders:soft',
  belly: 'belly:pebbled',
  'flank-fins': 'flank-fins:petal',
  'hip-fins': 'hip-fins:petal',
  'tail-sail': 'tail-sail:ridge',
};

export const MINI_GENE_IDS: readonly MiniGeneId[] = MINI_DRAGON_GENES.map((gene) => gene.id);

export function miniGene(geneId: MiniGeneId): MiniGeneDefinition {
  const gene = MINI_DRAGON_GENES.find((candidate) => candidate.id === geneId);
  if (!gene) throw new Error(`Unknown mini dragon gene: ${geneId}`);
  return gene;
}

export function miniPhenotypeForms(geneId: MiniGeneId): readonly MiniPhenotypeForm[] {
  return miniGene(geneId).forms;
}

export function isMiniPhenotypeFormId(geneId: MiniGeneId, value: unknown): boolean {
  return typeof value === 'string' && miniGene(geneId).forms.some((f) => f.id === value);
}

/** Orders a genotype most-dominant allele first, so equivalent pairs compare equal. */
export function normalizeMiniGenotype(geneId: MiniGeneId, genotype: MiniGenotype): MiniGenotype {
  const order = miniGene(geneId).alleles;
  const rank = (allele: string): number => {
    const index = order.indexOf(allele);
    return index < 0 ? order.length : index;
  };
  return rank(genotype[0]) <= rank(genotype[1])
    ? [genotype[0], genotype[1]]
    : [genotype[1], genotype[0]];
}

/**
 * The one place a genotype becomes something a student can see.
 *
 * Incomplete dominance and codominance resolve through the same three-genotype
 * ladder — they differ in what the middle form *means*, not in how it is
 * computed — so they share a branch. The distinction is carried by
 * `MiniGeneDefinition.pattern` and by the form labels, which is where it belongs:
 * "Small wings" is a blend, "Ash-and-gold coat" is both alleles showing at once.
 */
export function expressMiniGene(geneId: MiniGeneId, genome: MiniGenome): MiniPhenotypeForm {
  const gene = miniGene(geneId);
  const [first, second] = normalizeMiniGenotype(geneId, miniGenomeGenotype(genome, geneId));

  switch (gene.pattern) {
    case 'complete-dominance':
      return first === gene.alleles[0] ? gene.forms[0] : gene.forms[1];

    case 'incomplete-dominance':
    case 'codominance': {
      if (first === gene.alleles[0] && second === gene.alleles[0]) return gene.forms[0];
      if (first === gene.alleles[1] && second === gene.alleles[1]) return gene.forms[2];
      return gene.forms[1];
    }

    case 'multiple-alleles': {
      // Normalization already put the most dominant allele first, and the forms
      // are declared in the same order, so the index carries straight across.
      const index = gene.alleles.indexOf(first);
      return gene.forms[index < 0 ? gene.forms.length - 1 : index];
    }
  }
}

export function expressMiniGenome(
  genome: MiniGenome,
): readonly { gene: MiniGeneDefinition; form: MiniPhenotypeForm }[] {
  return MINI_DRAGON_GENES.map((gene) => ({ gene, form: expressMiniGene(gene.id, genome) }));
}

export function miniPhenotypeFormId(geneId: MiniGeneId, genome: MiniGenome): string {
  return expressMiniGene(geneId, genome).id;
}

export function miniPhenotypeLabel(geneId: MiniGeneId, genome: MiniGenome): string {
  return expressMiniGene(geneId, genome).label;
}

/**
 * A genotype that produces the requested visible form.
 *
 * The inverse of {@link expressMiniGene}, and deliberately not a bijection: a
 * smooth-backed dragon may be `FF` or `Ff`, and this answers `FF`. That is the right
 * answer for the one caller that needs it — a bench where a form is chosen and
 * the animal drawn — because the genotype behind a *displayed* form is exactly
 * what a student cannot read off a dragon. Anything that needs carriers must
 * work from a genome, not from a form.
 */
export function miniGenotypeForForm(geneId: MiniGeneId, formId: string): MiniGenotype {
  const gene = miniGene(geneId);
  const index = gene.forms.findIndex((form) => form.id === formId);
  if (index < 0) throw new Error(`Unknown form ${formId} for mini dragon gene ${geneId}.`);

  switch (gene.pattern) {
    case 'complete-dominance':
      return index === 0 ? [gene.alleles[0], gene.alleles[0]] : [gene.alleles[1], gene.alleles[1]];

    case 'incomplete-dominance':
    case 'codominance':
      return index === 1
        ? [gene.alleles[0], gene.alleles[1]]
        : [gene.alleles[index === 0 ? 0 : 1], gene.alleles[index === 0 ? 0 : 1]];

    case 'multiple-alleles':
      return [gene.alleles[index], gene.alleles[index]];
  }
}

/** One genome per gene, using neutral defaults for any form the caller omits. */
export function miniGenomeFromForms(
  forms: Readonly<Partial<Record<MiniGeneId, string>>>,
): MiniGenome {
  return Object.fromEntries(
    MINI_DRAGON_GENES.map((gene) => [
      gene.id,
      miniGenotypeForForm(gene.id, forms[gene.id] ?? MINI_DEFAULT_FORM_IDS[gene.id]),
    ]),
  ) as MiniGenome;
}

/** Reads a newer locus safely from a legacy thirteen-gene persisted genome. */
export function miniGenomeGenotype(genome: MiniGenome, geneId: MiniGeneId): MiniGenotype {
  const value = (genome as Readonly<Partial<Record<MiniGeneId, MiniGenotype>>>)[geneId];
  return isValidMiniGenotype(geneId, value)
    ? value
    : miniGenotypeForForm(geneId, MINI_DEFAULT_FORM_IDS[geneId]);
}

// ---------------------------------------------------------------------------
// Breeding.
// ---------------------------------------------------------------------------

/**
 * One offspring genome. Each locus segregates independently: one allele is drawn
 * from each parent, and the draw is a hash of the seed so the same pairing and
 * the same clutch position always produce the same young.
 */
export function breedMiniGenomes(dam: MiniGenome, sire: MiniGenome, seed: string): MiniGenome {
  return Object.fromEntries(
    MINI_DRAGON_GENES.map((gene) => [
      gene.id,
      normalizeMiniGenotype(gene.id, [
        drawAllele(miniGenomeGenotype(dam, gene.id), `${seed}:${gene.id}:dam`),
        drawAllele(miniGenomeGenotype(sire, gene.id), `${seed}:${gene.id}:sire`),
      ]),
    ]),
  ) as MiniGenome;
}

function drawAllele(genotype: MiniGenotype, seed: string): string {
  return genotype[stableHash(seed) % 2];
}

export function cloneMiniGenome(genome: MiniGenome): MiniGenome {
  return Object.fromEntries(
    MINI_GENE_IDS.map((geneId) => {
      const pair = miniGenomeGenotype(genome, geneId);
      return [geneId, [pair[0], pair[1]]];
    }),
  ) as unknown as MiniGenome;
}

export function isMiniGenome(value: unknown): value is MiniGenome {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return MINI_DRAGON_GENES.every((gene) => {
    const pair = record[gene.id];
    const wasRequiredByLegacySchema = (LEGACY_MINI_GENE_IDS as readonly string[]).includes(gene.id);
    return pair === undefined && !wasRequiredByLegacySchema
      ? true
      : isValidMiniGenotype(gene.id, pair);
  });
}

function isValidMiniGenotype(geneId: MiniGeneId, value: unknown): value is MiniGenotype {
  const gene = miniGene(geneId);
  return Array.isArray(value)
    && value.length === 2
    && value.every((allele) => typeof allele === 'string' && gene.alleles.includes(allele));
}

// ---------------------------------------------------------------------------
// Appearance derived from the genome.
// ---------------------------------------------------------------------------

export interface MiniCoatPaint {
  /** Base coat colour. */
  color: string;
  /**
   * Second coat colour. Equal to `color` unless the specimen is codominant, in
   * which case both alleles' colours appear on the same animal.
   */
  patchColor: string;
  emberColor: string;
  /** High-contrast, non-inherited display colour used by ornaments and membranes. */
  accentColor: string;
  /** Stable non-inherited layout; it changes placement, never inherited coat identity. */
  patternStyle: string;
  /** The inherited back-scale form also owns the coat's tactile material family. */
  surfaceStyle: string;
}

const ASH_HUE = 24;
const GOLD_HUE = 44;

const EMBER_COLORS: Readonly<Record<string, string>> = {
  'ember:rose': '#ff6f91',
  'ember:blue': '#63c8ff',
  'ember:pale': '#ffe9c2',
};

/**
 * Saturated display colours deliberately span the whole wheel. They are
 * individual variation, like freckles, and are never used to identify an
 * inherited locus.
 */
const MINI_DISPLAY_ACCENTS = [
  '#00d9ff', '#2166ff', '#7047eb', '#bd3cff', '#ff3aa7', '#ff4057',
  '#ff681f', '#ffb000', '#f0e323', '#8edb28', '#00c875', '#00b7a8',
  '#ff78d1', '#7cf4ff', '#b9ff4a', '#ff8b63',
] as const;

const MINI_PATTERN_STYLES = [
  'saddle', 'blaze', 'bands', 'constellation', 'harlequin', 'freckles',
] as const;

/**
 * How a mini dragon is painted.
 *
 * Coat colour is a *trait* here, not identity — the codominant pattern locus owns
 * it, and a student must be able to sort a litter into ash, gold, and both by
 * eye. Individual variation therefore rides on saturation and lightness only:
 * two gold littermates differ, but neither can be mistaken for ash, and no
 * amount of jitter leaks a genotype.
 */
export function miniCoatPaint(genome: MiniGenome, individualId: string): MiniCoatPaint {
  const patternForm = miniPhenotypeFormId('pattern', genome);
  const emberForm = miniPhenotypeFormId('ember', genome);
  const coatForm = miniPhenotypeFormId('coat', genome);
  const lightness = 22 + (stableHash(`${individualId}:light`) % 35);
  const saturation = 20 + (stableHash(`${individualId}:sat`) % 45);

  const ash = `hsl(${ASH_HUE}, ${Math.round(saturation * 0.55)}%, ${Math.max(14, lightness - 8)}%)`;
  const gold = `hsl(${GOLD_HUE}, ${Math.min(100, saturation + 35)}%, ${Math.min(66, lightness + 10)}%)`;

  const color = patternForm === 'pattern:ash' ? ash : gold;
  const patchColor = patternForm === 'pattern:ash-gold' ? ash : color;

  const accentColor = MINI_DISPLAY_ACCENTS[
    stableHash(`${individualId}:display-accent`) % MINI_DISPLAY_ACCENTS.length
  ];
  const patternStyle = MINI_PATTERN_STYLES[
    stableHash(`${individualId}:marking-layout`) % MINI_PATTERN_STYLES.length
  ];
  const surfaceStyle = coatForm === 'coat:fluffy' ? 'bumpy' : 'sleek';

  return {
    color,
    patchColor,
    emberColor: EMBER_COLORS[emberForm] ?? '#ffe9c2',
    accentColor,
    patternStyle,
    surfaceStyle,
  };
}

/**
 * Characteristics that are *not* inherited in this model.
 *
 * Hashed off the individual's id, exactly like body size and temperament in the
 * lab dragon: stable for one animal, unpredictable from its parents. They exist
 * so littermates read as individuals, and the workstation labels them as such —
 * a student who could read inheritance out of an ear tuft would learn something
 * false.
 */
export interface MiniIndividualFeatures {
  earTuft: number;
  cheekTuft: number;
  plumeFan: number;
  toeCount: number;
}

export function miniIndividualFeatures(individualId: string): MiniIndividualFeatures {
  return {
    earTuft: 0.35 + (stableHash(`${individualId}:ear`) % 60) / 100,
    cheekTuft: 0.35 + (stableHash(`${individualId}:cheek`) % 55) / 100,
    plumeFan: 0.4 + (stableHash(`${individualId}:plume`) % 55) / 100,
    toeCount: 3 + (stableHash(`${individualId}:toes`) % 2),
  };
}

export function miniIndividualFeatureList(
  individualId: string,
): readonly { label: string; value: string }[] {
  const features = miniIndividualFeatures(individualId);
  return [
    { label: 'Ear tufts', value: band(features.earTuft, ['Short', 'Full', 'Long']) },
    { label: 'Cheek tufts', value: band(features.cheekTuft, ['Neat', 'Full', 'Rosy']) },
    { label: 'Tail plume', value: band(features.plumeFan, ['Narrow', 'Open', 'Sweeping']) },
    { label: 'Toes', value: `${features.toeCount} per paw` },
  ];
}

function band(value: number, labels: readonly [string, string, string]): string {
  return value < 0.55 ? labels[0] : value < 0.78 ? labels[1] : labels[2];
}

// ---------------------------------------------------------------------------
// The founding population.
// ---------------------------------------------------------------------------

export interface MiniFounderDefinition {
  id: string;
  name: string;
  title: string;
  genome: MiniGenome;
}

function genome(
  coat: MiniGenotype,
  horns: MiniGenotype,
  wings: MiniGenotype,
  pattern: MiniGenotype,
  ember: MiniGenotype,
  size: MiniGenotype,
  ears: MiniGenotype,
  muzzle: MiniGenotype,
  legs: MiniGenotype,
  tail: MiniGenotype,
  crest: MiniGenotype,
  frame: MiniGenotype,
  plumage: MiniGenotype,
  expanded: Readonly<Partial<Record<MiniGeneId, MiniGenotype>>> = {},
): MiniGenome {
  return {
    ...miniGenomeFromForms({}),
    coat,
    plumage,
    horns,
    wings,
    pattern,
    ember,
    size,
    ears,
    muzzle,
    legs,
    tail,
    crest,
    frame,
    ...expanded,
  };
}

function expandedGenotypes(
  form: 'first' | 'mixed' | 'second',
): Readonly<Partial<Record<MiniGeneId, MiniGenotype>>> {
  const legacy = new Set<string>(LEGACY_MINI_GENE_IDS);
  return Object.fromEntries(
    MINI_DRAGON_GENES
      .filter((gene) => !legacy.has(gene.id))
      .map((gene) => {
        const first = gene.alleles[0];
        const second = gene.alleles[1];
        const pair: MiniGenotype = form === 'first'
          ? [first, first]
          : form === 'second'
            ? [second, second]
            : [first, second];
        return [gene.id, pair];
      }),
  );
}

/**
 * Six founders released to every student.
 *
 * Chosen so the pool is a workable puzzle rather than a random draw: every
 * allele of every gene is present somewhere, all three ember forms and all three
 * wing forms are visible in the founders so the ladders can be discovered by
 * looking, and both the baby-bumpy scale rows and the teacup size are carried by smooth-backed
 * standard-sized founders — so the two recessive traits have to be bred out of
 * hiding rather than picked off a shelf.
 */
export const MINI_FOUNDERS: readonly MiniFounderDefinition[] = [
  {
    id: 'mini-biscuit',
    name: 'Biscuit',
    title: 'Gold founder · Royal Mini Dragon Society',
    genome: genome(
      ['F', 'f'],
      ['C', 'c'],
      ['W', 'w'],
      ['G', 'G'],
      ['Er', 'ep'],
      ['T', 't'],
      ['E', 'E'],
      ['M', 'M'],
      ['L', 'L'],
      ['Ts', 'Ts'],
      ['K', 'K'],
      ['B', 'B'],
      ['P', 'p'],
      expandedGenotypes('mixed'),
    ),
  },
  {
    id: 'mini-pepper',
    name: 'Pepper',
    title: 'Ash founder · teacup line',
    genome: genome(
      ['F', 'F'],
      ['c', 'c'],
      ['W', 'W'],
      ['A', 'A'],
      ['Eb', 'ep'],
      ['t', 't'],
      ['E', 'e'],
      ['M', 'm'],
      ['L', 'l'],
      ['Td', 'Td'],
      ['K', 'R'],
      ['B', 'b'],
      ['P', 'P'],
      expandedGenotypes('first'),
    ),
  },
  {
    id: 'mini-cinder',
    name: 'Cinder',
    title: 'Patterned founder · baby-bumpy scale line',
    genome: genome(
      ['f', 'f'],
      ['C', 'c'],
      ['W', 'w'],
      ['A', 'G'],
      ['Er', 'Eb'],
      ['T', 't'],
      ['e', 'e'],
      ['m', 'm'],
      ['l', 'l'],
      ['Tp', 'Tp'],
      ['R', 'R'],
      ['b', 'b'],
      ['p', 'p'],
      expandedGenotypes('second'),
    ),
  },
  {
    id: 'mini-nimbus',
    name: 'Nimbus',
    title: 'Gold founder · wingless line',
    genome: genome(
      ['F', 'f'],
      ['C', 'C'],
      ['w', 'w'],
      ['G', 'G'],
      ['ep', 'ep'],
      ['T', 'T'],
      ['E', 'E'],
      ['M', 'm'],
      ['l', 'l'],
      ['Tf', 'Tp'],
      ['K', 'R'],
      ['B', 'b'],
      ['P', 'p'],
      expandedGenotypes('mixed'),
    ),
  },
  {
    id: 'mini-sorrel',
    name: 'Sorrel',
    title: 'Ash founder · blue ember line',
    genome: genome(
      ['F', 'F'],
      ['C', 'c'],
      ['W', 'w'],
      ['A', 'A'],
      ['Eb', 'ep'],
      ['T', 't'],
      ['E', 'e'],
      ['M', 'M'],
      ['L', 'L'],
      ['Ts', 'Tp'],
      ['K', 'K'],
      ['b', 'b'],
      ['p', 'p'],
      expandedGenotypes('first'),
    ),
  },
  {
    id: 'mini-thistle',
    name: 'Thistle',
    title: 'Patterned founder · teacup line',
    genome: genome(
      ['f', 'f'],
      ['c', 'c'],
      ['W', 'W'],
      ['A', 'G'],
      ['ep', 'ep'],
      ['t', 't'],
      ['e', 'e'],
      ['m', 'm'],
      ['L', 'l'],
      ['Tp', 'Tp'],
      ['R', 'R'],
      ['B', 'B'],
      ['P', 'P'],
      expandedGenotypes('second'),
    ),
  },
];

export function miniFounder(id: string): MiniFounderDefinition | null {
  return MINI_FOUNDERS.find((founder) => founder.id === id) ?? null;
}

/**
 * FNV-1a with an avalanche finalizer.
 *
 * The finalizer is load-bearing, not decoration. Plain FNV-1a mixes its low bits
 * terribly — because the prime is odd, the lowest bit of the result is just the
 * parity of the low bits of the input — so `hash(seed) % 2`, which is how an
 * allele is drawn, does not segregate: seeds that differ only in a trailing
 * index alternate in lockstep instead. A twelve-pup litter from two
 * heterozygous parents came back twelve-for-twelve dominant before this was
 * added, which is not Mendelian inheritance, it is a counter.
 */
function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return hash >>> 0;
}
