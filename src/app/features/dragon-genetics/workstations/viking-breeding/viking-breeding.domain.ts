import {
  MINI_DRAGON_GENES,
  MiniGeneId,
  MiniGenome,
  MiniGenotype,
  breedMiniGenomes,
  expressMiniGene,
  miniGene,
  miniGenotypeForForm,
  miniPhenotypeFormId,
  normalizeMiniGenotype,
} from '../companion-show/mini-dragon.genetics';
import {
  FOUNDER_STOCK_SIZE,
  KennelDragon,
  LITTER_SIZE,
  RoleRequirement,
  WorkingRole,
} from './viking-breeding.models';

/**
 * The selection mathematics behind a settlement's breeding programme.
 *
 * Everything here is exact rather than sampled: for a given pairing the chance a pup meets the
 * commission is computed by enumerating the four equally likely allele combinations at each locus.
 * A student can therefore be told what a pairing *should* yield before breeding it, and then see
 * what it actually yielded — which is the prediction-before-result moment this workstation exists
 * for.
 *
 * The distinction the whole design turns on: a form that requires a heterozygote can be produced
 * reliably but can never be *fixed*. Selecting harder does not help, and the only route is to keep
 * two lines and cross them every season.
 */

/**
 * `expressMiniGene` reads only the locus it is asked about, so a one-locus object is enough and no
 * resolver logic has to be duplicated here.
 */
function expressPair(geneId: MiniGeneId, pair: MiniGenotype): string {
  return expressMiniGene(geneId, { [geneId]: pair } as unknown as MiniGenome).id;
}

/** Whether a form only ever appears in a heterozygote — the forms that cannot be fixed. */
export function requiresHeterozygote(geneId: MiniGeneId, formId: string): boolean {
  const gene = miniGene(geneId);
  if (gene.pattern !== 'incomplete-dominance' && gene.pattern !== 'codominance') return false;
  return gene.forms.findIndex((form) => form.id === formId) === 1;
}

/** Whether a line could ever be homozygous for this form, so that it breeds true. */
export function canBeFixed(geneId: MiniGeneId, formId: string): boolean {
  return !requiresHeterozygote(geneId, formId);
}

/**
 * Whether a dragon showing the form is guaranteed to be homozygous for it.
 *
 * False for a complete-dominance dominant form and for anything but the bottom of a
 * multiple-allele hierarchy: those animals may be carriers, and looking cannot tell you.
 */
export function formProvesGenotype(geneId: MiniGeneId, formId: string): boolean {
  const gene = miniGene(geneId);
  const index = gene.forms.findIndex((form) => form.id === formId);
  switch (gene.pattern) {
    case 'complete-dominance':
      return index === 1;
    case 'incomplete-dominance':
    case 'codominance':
      return true;
    case 'multiple-alleles':
      return index === gene.forms.length - 1;
  }
}

export function matchesRequirement(genome: MiniGenome, requirement: RoleRequirement): boolean {
  return miniPhenotypeFormId(requirement.geneId, genome) === requirement.formId;
}

export function matchesRole(genome: MiniGenome, role: WorkingRole): boolean {
  return role.requirements.every((requirement) => matchesRequirement(genome, requirement));
}

/** How many of a role's requirements a dragon meets. */
export function requirementsMet(genome: MiniGenome, role: WorkingRole): number {
  return role.requirements.filter((requirement) => matchesRequirement(genome, requirement)).length;
}

/**
 * Exact probability that one pup of this pairing shows the required form, by enumerating the four
 * equally likely allele combinations.
 */
export function requirementProbability(
  dam: MiniGenome,
  sire: MiniGenome,
  requirement: RoleRequirement,
): number {
  const damAlleles = dam[requirement.geneId];
  const sireAlleles = sire[requirement.geneId];
  let matches = 0;
  for (const fromDam of damAlleles) {
    for (const fromSire of sireAlleles) {
      const pair = normalizeMiniGenotype(requirement.geneId, [fromDam, fromSire]);
      if (expressPair(requirement.geneId, pair) === requirement.formId) matches += 1;
    }
  }
  return matches / 4;
}

/** Loci are unlinked, so the per-locus probabilities multiply. */
export function litterMatchRate(dam: MiniGenome, sire: MiniGenome, role: WorkingRole): number {
  return role.requirements.reduce(
    (product, requirement) => product * requirementProbability(dam, sire, requirement),
    1,
  );
}

export interface RequirementOdds {
  requirement: RoleRequirement;
  probability: number;
  geneName: string;
  formLabel: string;
}

/** Per-locus odds for a pairing, so a student can see which trait is holding the line back. */
export function pairingBreakdown(
  dam: MiniGenome,
  sire: MiniGenome,
  role: WorkingRole,
): readonly RequirementOdds[] {
  return role.requirements.map((requirement) => {
    const gene = miniGene(requirement.geneId);
    return {
      requirement,
      probability: requirementProbability(dam, sire, requirement),
      geneName: gene.name,
      formLabel:
        gene.forms.find((form) => form.id === requirement.formId)?.label ?? requirement.formId,
    };
  });
}

export type LineStrategy = 'single-line' | 'two-line-cross';

/**
 * Whether a line for this role can ever breed true.
 *
 * A commission asking for any heterozygous form condemns the settlement to keeping two lines
 * forever: the working animal is the cross, and the cross never reproduces itself.
 */
export function roleBreedsTrue(role: WorkingRole): boolean {
  return role.requirements.every((requirement) =>
    canBeFixed(requirement.geneId, requirement.formId),
  );
}

export function roleStrategy(role: WorkingRole): LineStrategy {
  return roleBreedsTrue(role) ? 'single-line' : 'two-line-cross';
}

export interface CrossLine {
  geneId: MiniGeneId;
  geneName: string;
  /** The two homozygous forms whose cross produces the required heterozygote. */
  parentFormLabels: readonly [string, string];
  requiredFormLabel: string;
}

/**
 * For a role that cannot breed true, the two parent lines the settlement must maintain. Crossing a
 * homozygote of each produces the wanted heterozygote in every pup — reliably, and never heritably.
 */
export function crossPlan(role: WorkingRole): readonly CrossLine[] {
  return role.requirements
    .filter((requirement) => requiresHeterozygote(requirement.geneId, requirement.formId))
    .map((requirement) => {
      const gene = miniGene(requirement.geneId);
      return {
        geneId: requirement.geneId,
        geneName: gene.name,
        parentFormLabels: [gene.forms[0].label, gene.forms[2].label] as const,
        requiredFormLabel:
          gene.forms.find((form) => form.id === requirement.formId)?.label ?? requirement.formId,
      };
    });
}

/**
 * The best litter rate any pairing could reach for this role.
 *
 * Always 1: even a heterozygous target reaches every pup, by crossing the two homozygous lines.
 * The ceiling is not what distinguishes the roles — whether the result *breeds true* is.
 */
export function bestAchievableLitterRate(role: WorkingRole): number {
  const idealPair = (requirement: RoleRequirement): [MiniGenotype, MiniGenotype] => {
    const gene = miniGene(requirement.geneId);
    if (requiresHeterozygote(requirement.geneId, requirement.formId)) {
      return [
        [gene.alleles[0], gene.alleles[0]],
        [gene.alleles[1], gene.alleles[1]],
      ];
    }
    const fixed = miniGenotypeForForm(requirement.geneId, requirement.formId);
    return [fixed, fixed];
  };
  return role.requirements.reduce((product, requirement) => {
    const [damPair, sirePair] = idealPair(requirement);
    let matches = 0;
    for (const fromDam of damPair) {
      for (const fromSire of sirePair) {
        const pair = normalizeMiniGenotype(requirement.geneId, [fromDam, fromSire]);
        if (expressPair(requirement.geneId, pair) === requirement.formId) matches += 1;
      }
    }
    return product * (matches / 4);
  }, 1);
}

// ---------------------------------------------------------------------------
// Programme measurements
// ---------------------------------------------------------------------------

export interface ProgramMetrics {
  /** Share of the current kennel meeting the whole commission. */
  matchRate: number;
  matchingCount: number;
  /** Distinct founder animals still represented — the cost of selecting narrowly. */
  foundersRepresented: number;
  diversityPercent: number;
  /**
   * Whether two matching animals in the kennel would produce an all-matching litter. False for
   * every heterozygous commission, however hard the student has selected.
   */
  breedsTrue: boolean;
  /** Best rate available from any pairing currently in the kennel. */
  bestPairingRate: number;
}

export function programMetrics(
  kennel: readonly KennelDragon[],
  role: WorkingRole,
  founderCount = FOUNDER_STOCK_SIZE,
): ProgramMetrics {
  const matching = kennel.filter((dragon) => matchesRole(dragon.genome, role));
  const founders = new Set(kennel.flatMap((dragon) => dragon.founderIds));

  let bestPairingRate = 0;
  let breedsTrue = false;
  for (const dam of kennel.filter((dragon) => dragon.sex === 'female')) {
    for (const sire of kennel.filter((dragon) => dragon.sex === 'male')) {
      const rate = litterMatchRate(dam.genome, sire.genome, role);
      bestPairingRate = Math.max(bestPairingRate, rate);
      if (
        rate === 1 &&
        matchesRole(dam.genome, role) &&
        matchesRole(sire.genome, role)
      ) {
        breedsTrue = true;
      }
    }
  }

  return {
    matchRate: kennel.length ? matching.length / kennel.length : 0,
    matchingCount: matching.length,
    foundersRepresented: founders.size,
    diversityPercent: founderCount ? Math.round((founders.size / founderCount) * 100) : 0,
    breedsTrue,
    bestPairingRate,
  };
}

// ---------------------------------------------------------------------------
// Stock and breeding
// ---------------------------------------------------------------------------

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function stream(seed: string): () => number {
  let state = hash(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const STOCK_NAMES = [
  'Hilda', 'Bragi', 'Sif', 'Kettil', 'Ranveig', 'Ottar', 'Gudrun', 'Sten',
  'Yrsa', 'Halvard', 'Ingrid', 'Torsten', 'Alfhild', 'Egil', 'Solveig', 'Rurik',
];

/**
 * Founder stock the settlement supplies.
 *
 * Every allele the commission needs is guaranteed present somewhere in the stock — otherwise the
 * programme would be impossible and the student could never know why — but it is deliberately
 * scattered, so no founder is already the answer.
 */
export function buildFounderStock(role: WorkingRole, seed: string): readonly KennelDragon[] {
  const random = stream(`${role.id}:${seed}`);

  const randomGenotype = (geneId: MiniGeneId): MiniGenotype => {
    const alleles = miniGene(geneId).alleles;
    return normalizeMiniGenotype(geneId, [
      alleles[Math.floor(random() * alleles.length)],
      alleles[Math.floor(random() * alleles.length)],
    ]);
  };

  const stock = Array.from({ length: FOUNDER_STOCK_SIZE }, (_, index) => {
    const genome = Object.fromEntries(
      MINI_DRAGON_GENES.map((gene) => [gene.id, randomGenotype(gene.id)]),
    ) as MiniGenome;
    return {
      id: `founder:${role.id}:${index}`,
      name: STOCK_NAMES[(hash(`${seed}:${index}`) + index) % STOCK_NAMES.length],
      // A workable starting kennel needs both sexes, so alternate rather than draw.
      sex: index % 2 === 0 ? ('female' as const) : ('male' as const),
      genome,
      generation: 0,
      parentIds: null,
      founderIds: [`founder:${role.id}:${index}`],
    } satisfies KennelDragon;
  });

  return breakFinishedAnimals(seedRequiredAlleles(stock, role, seed), role);
}

/**
 * Ensures no founder already satisfies the whole commission.
 *
 * Seeding the needed alleles can accidentally assemble the finished animal — especially for a
 * heterozygous target, where one seeded allele beside the right partner *is* the answer. Breaking
 * the match at a single locus keeps the settlement's stock raw material while leaving the allele
 * itself in the pool, which the founder-stock spec checks separately.
 */
function breakFinishedAnimals(
  stock: readonly KennelDragon[],
  role: WorkingRole,
): readonly KennelDragon[] {
  return stock.map((animal) => {
    if (!matchesRole(animal.genome, role)) return animal;
    const requirement = role.requirements[0];
    const alleles = miniGene(requirement.geneId).alleles;
    const needed = miniGenotypeForForm(requirement.geneId, requirement.formId);

    // Prefer a replacement that still carries a needed allele, so nothing leaves the gene pool.
    const candidates: MiniGenotype[] = [];
    for (const first of alleles) {
      for (const second of alleles) {
        candidates.push(normalizeMiniGenotype(requirement.geneId, [first, second]));
      }
    }
    const replacement =
      candidates.find(
        (pair) =>
          expressPair(requirement.geneId, pair) !== requirement.formId &&
          pair.some((allele) => needed.includes(allele)),
      ) ??
      candidates.find((pair) => expressPair(requirement.geneId, pair) !== requirement.formId);

    if (!replacement) return animal;
    return {
      ...animal,
      genome: { ...animal.genome, [requirement.geneId]: replacement } as MiniGenome,
    };
  });
}

/**
 * Makes sure every allele the commission needs exists in the founder pool, by writing it into one
 * copy of one founder per requirement. One copy, not two: the settlement supplies the raw material,
 * never the finished animal.
 */
function seedRequiredAlleles(
  stock: readonly KennelDragon[],
  role: WorkingRole,
  seed: string,
): readonly KennelDragon[] {
  const next = stock.map((dragon) => ({
    ...dragon,
    genome: { ...dragon.genome } as Record<MiniGeneId, MiniGenotype>,
  }));

  role.requirements.forEach((requirement, order) => {
    const needed = miniGenotypeForForm(requirement.geneId, requirement.formId);
    // Two carriers, of opposite sex, so the allele can actually be brought together.
    const damIndex = (hash(`${seed}:${requirement.geneId}:dam`) % (next.length / 2)) * 2;
    const sireIndex = (hash(`${seed}:${requirement.geneId}:sire`) % (next.length / 2)) * 2 + 1;
    for (const index of [damIndex, sireIndex]) {
      const current = next[index].genome[requirement.geneId];
      // Replace one allele, keeping the other, so the founder is a carrier rather than the answer.
      next[index].genome[requirement.geneId] = normalizeMiniGenotype(requirement.geneId, [
        needed[0],
        current[order % 2],
      ]);
    }
  });

  return next.map((dragon) => ({ ...dragon, genome: dragon.genome as MiniGenome }));
}

export interface BredLitter {
  pups: readonly KennelDragon[];
  predictedMatchRate: number;
}

export function breedLitter(
  dam: KennelDragon,
  sire: KennelDragon,
  role: WorkingRole,
  season: number,
  seed: string,
): BredLitter {
  const random = stream(`${seed}:names`);
  const pups = Array.from({ length: LITTER_SIZE }, (_, index) => {
    const pupSeed = `${seed}:${index}`;
    return {
      id: `pup:${pupSeed}`,
      name: STOCK_NAMES[Math.floor(random() * STOCK_NAMES.length)],
      sex: hash(`${pupSeed}:sex`) % 2 === 0 ? ('female' as const) : ('male' as const),
      genome: breedMiniGenomes(dam.genome, sire.genome, pupSeed),
      generation: Math.max(dam.generation, sire.generation) + 1,
      parentIds: [dam.id, sire.id] as const,
      founderIds: [...new Set([...dam.founderIds, ...sire.founderIds])],
    } satisfies KennelDragon;
  });

  return { pups, predictedMatchRate: litterMatchRate(dam.genome, sire.genome, role) };
}

/** Season-by-season match rate, which is the response-to-selection curve. */
export function selectionResponse(
  litters: readonly { season: number; pups: readonly KennelDragon[] }[],
  role: WorkingRole,
): readonly { season: number; matchRate: number; pups: number }[] {
  const bySeason = new Map<number, { matched: number; total: number }>();
  for (const litter of litters) {
    const entry = bySeason.get(litter.season) ?? { matched: 0, total: 0 };
    for (const pup of litter.pups) {
      entry.total += 1;
      if (matchesRole(pup.genome, role)) entry.matched += 1;
    }
    bySeason.set(litter.season, entry);
  }
  return [...bySeason.entries()]
    .sort((first, second) => first[0] - second[0])
    .map(([season, entry]) => ({
      season,
      matchRate: entry.total ? entry.matched / entry.total : 0,
      pups: entry.total,
    }));
}
