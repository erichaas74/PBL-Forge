/**
 * Genetics of the domesticated mini dragon.
 *
 * A separate species from the four-gene lab dragon, with its own loci and — the
 * reason it exists — its own *inheritance patterns*. The lab dragon models one
 * relationship four times: one dominant allele is enough, and the heterozygote
 * is invisible. A breeding program that only ever replays that square teaches one
 * idea. These six genes cover five different relationships, so a student writing
 * a breed standard meets a different problem at each locus.
 *
 * Nothing here is ever rendered to a student as a symbol. The workstation shows
 * `MiniPhenotypeForm.label` and nothing else; allele letters exist so this module
 * can compute, not so the surface can display them.
 */

export type MiniGeneId = 'coat' | 'horns' | 'wings' | 'pattern' | 'ember' | 'size';

export type MiniInheritancePattern =
  | 'complete-dominance'
  | 'incomplete-dominance'
  | 'codominance'
  | 'multiple-alleles';

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
    name: 'Coat',
    pattern: 'complete-dominance',
    alleles: ['F', 'f'],
    forms: [form('coat:sleek', 'Sleek coat'), form('coat:fluffy', 'Fluffy coat')],
    observation:
      'A sleek dragon can carry the fluffy form without showing it, so two sleek parents can produce fluffy young.',
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
];

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
export function normalizeMiniGenotype(
  geneId: MiniGeneId,
  genotype: MiniGenotype,
): MiniGenotype {
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
  const [first, second] = normalizeMiniGenotype(geneId, genome[geneId]);

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

// ---------------------------------------------------------------------------
// Breeding.
// ---------------------------------------------------------------------------

/**
 * One offspring genome. Each locus segregates independently: one allele is drawn
 * from each parent, and the draw is a hash of the seed so the same pairing and
 * the same clutch position always produce the same young.
 */
export function breedMiniGenomes(
  dam: MiniGenome,
  sire: MiniGenome,
  seed: string,
): MiniGenome {
  return Object.fromEntries(
    MINI_DRAGON_GENES.map((gene) => [
      gene.id,
      normalizeMiniGenotype(gene.id, [
        drawAllele(dam[gene.id], `${seed}:${gene.id}:dam`),
        drawAllele(sire[gene.id], `${seed}:${gene.id}:sire`),
      ]),
    ]),
  ) as MiniGenome;
}

function drawAllele(genotype: MiniGenotype, seed: string): string {
  return genotype[stableHash(seed) % 2];
}

export function cloneMiniGenome(genome: MiniGenome): MiniGenome {
  return Object.fromEntries(
    MINI_GENE_IDS.map((geneId) => [geneId, [genome[geneId][0], genome[geneId][1]]]),
  ) as unknown as MiniGenome;
}

export function isMiniGenome(value: unknown): value is MiniGenome {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return MINI_DRAGON_GENES.every((gene) => {
    const pair = record[gene.id];
    return (
      Array.isArray(pair) &&
      pair.length === 2 &&
      pair.every((allele) => typeof allele === 'string' && gene.alleles.includes(allele))
    );
  });
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
}

const ASH_HUE = 24;
const GOLD_HUE = 44;

const EMBER_COLORS: Readonly<Record<string, string>> = {
  'ember:rose': '#ff6f91',
  'ember:blue': '#63c8ff',
  'ember:pale': '#ffe9c2',
};

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
  const lightness = 30 + (stableHash(`${individualId}:light`) % 13);
  const saturation = 34 + (stableHash(`${individualId}:sat`) % 22);

  const ash = `hsl(${ASH_HUE}, ${Math.round(saturation * 0.5)}%, ${lightness - 8}%)`;
  const gold = `hsl(${GOLD_HUE}, ${saturation + 24}%, ${lightness + 12}%)`;

  const color = patternForm === 'pattern:ash' ? ash : gold;
  const patchColor = patternForm === 'pattern:ash-gold' ? ash : color;

  return { color, patchColor, emberColor: EMBER_COLORS[emberForm] ?? '#ffe9c2' };
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
  eyeSize: number;
  snoutLength: number;
  plumeFan: number;
  toeCount: number;
}

export function miniIndividualFeatures(individualId: string): MiniIndividualFeatures {
  return {
    earTuft: 0.35 + (stableHash(`${individualId}:ear`) % 60) / 100,
    eyeSize: 0.45 + (stableHash(`${individualId}:eye`) % 50) / 100,
    snoutLength: 0.18 + (stableHash(`${individualId}:snout`) % 32) / 100,
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
    { label: 'Eyes', value: band(features.eyeSize, ['Round', 'Large', 'Enormous']) },
    { label: 'Snout', value: band(features.snoutLength, ['Stub', 'Short', 'Tapered']) },
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
): MiniGenome {
  return { coat, horns, wings, pattern, ember, size };
}

/**
 * Six founders released to every student.
 *
 * Chosen so the pool is a workable puzzle rather than a random draw: every
 * allele of every gene is present somewhere, all three ember forms and all three
 * wing forms are visible in the founders so the ladders can be discovered by
 * looking, and both the fluffy coat and the teacup size are carried by sleek
 * standard-sized founders — so the two recessive traits have to be bred out of
 * hiding rather than picked off a shelf.
 */
export const MINI_FOUNDERS: readonly MiniFounderDefinition[] = [
  {
    id: 'mini-biscuit',
    name: 'Biscuit',
    title: 'Gold founder · Royal Mini Dragon Society',
    genome: genome(['F', 'f'], ['C', 'c'], ['W', 'w'], ['G', 'G'], ['Er', 'ep'], ['T', 't']),
  },
  {
    id: 'mini-pepper',
    name: 'Pepper',
    title: 'Ash founder · teacup line',
    genome: genome(['F', 'F'], ['c', 'c'], ['W', 'W'], ['A', 'A'], ['Eb', 'ep'], ['t', 't']),
  },
  {
    id: 'mini-cinder',
    name: 'Cinder',
    title: 'Patterned founder · fluffy line',
    genome: genome(['f', 'f'], ['C', 'c'], ['W', 'w'], ['A', 'G'], ['Er', 'Eb'], ['T', 't']),
  },
  {
    id: 'mini-nimbus',
    name: 'Nimbus',
    title: 'Gold founder · wingless line',
    genome: genome(['F', 'f'], ['C', 'C'], ['w', 'w'], ['G', 'G'], ['ep', 'ep'], ['T', 'T']),
  },
  {
    id: 'mini-sorrel',
    name: 'Sorrel',
    title: 'Ash founder · blue ember line',
    genome: genome(['F', 'F'], ['C', 'c'], ['W', 'w'], ['A', 'A'], ['Eb', 'ep'], ['T', 't']),
  },
  {
    id: 'mini-thistle',
    name: 'Thistle',
    title: 'Patterned founder · teacup line',
    genome: genome(['f', 'f'], ['c', 'c'], ['W', 'W'], ['A', 'G'], ['ep', 'ep'], ['t', 't']),
  },
];

export function miniFounder(id: string): MiniFounderDefinition | null {
  return MINI_FOUNDERS.find((founder) => founder.id === id) ?? null;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
