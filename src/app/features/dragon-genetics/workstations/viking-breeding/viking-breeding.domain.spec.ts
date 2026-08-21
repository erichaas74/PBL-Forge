import {
  MiniGenome,
  miniGene,
  miniGenomeFromForms,
  miniGenotypeForForm,
  MINI_DRAGON_GENES,
  MiniGeneId,
} from '../companion-show/mini-dragon.genetics';
import {
  FOUNDER_STOCK_SIZE,
  KennelDragon,
  WORKING_ROLES,
  WORKING_ROLE_BY_ID,
  WorkingRole,
} from './viking-breeding.models';
import {
  bestAchievableLitterRate,
  breedLitter,
  buildFounderStock,
  canBeFixed,
  crossPlan,
  formProvesGenotype,
  litterMatchRate,
  matchesRole,
  pairingBreakdown,
  programMetrics,
  requirementProbability,
  requiresHeterozygote,
  roleBreedsTrue,
  roleStrategy,
  selectionResponse,
} from './viking-breeding.domain';

/** A genome fixed to a single visible form at every locus, for building test animals. */
function genomeShowing(overrides: Partial<Record<MiniGeneId, string>> = {}): MiniGenome {
  const forms = Object.fromEntries(
    MINI_DRAGON_GENES.map((gene) => [gene.id, overrides[gene.id] ?? gene.forms[0].id]),
  ) as Record<MiniGeneId, string>;
  return miniGenomeFromForms(forms);
}

function dragon(id: string, genome: MiniGenome, sex: 'female' | 'male'): KennelDragon {
  return { id, name: id, sex, genome, generation: 1, parentIds: null, founderIds: [id] };
}

describe('viking breeding — zygosity', () => {
  it('knows which forms only ever appear in a heterozygote', () => {
    // Incomplete dominance and codominance both put the blend or the both-at-once form in the
    // middle slot, and that form has no homozygous genotype to fix.
    expect(requiresHeterozygote('ears', 'ears:petal')).toBe(true);
    expect(requiresHeterozygote('crest', 'crest:crown-frill')).toBe(true);
    expect(requiresHeterozygote('frame', 'frame:balanced')).toBe(true);

    expect(requiresHeterozygote('ears', 'ears:sail')).toBe(false);
    expect(requiresHeterozygote('ears', 'ears:button')).toBe(false);
    expect(requiresHeterozygote('size', 'size:teacup')).toBe(false);
    expect(requiresHeterozygote('ember', 'ember:blue')).toBe(false);
  });

  it('knows when a visible form proves the genotype', () => {
    // A smooth back may be either homozygote; a bumpy back can only be the recessive.
    expect(formProvesGenotype('coat', 'coat:sleek')).toBe(false);
    expect(formProvesGenotype('coat', 'coat:fluffy')).toBe(true);
    // Blends and codominant forms are unambiguous.
    expect(formProvesGenotype('ears', 'ears:petal')).toBe(true);
    // Only the bottom of a dominance series proves itself.
    expect(formProvesGenotype('ember', 'ember:rose')).toBe(false);
    expect(formProvesGenotype('ember', 'ember:pale')).toBe(true);
  });

  it('agrees with canBeFixed', () => {
    for (const gene of MINI_DRAGON_GENES) {
      for (const form of gene.forms) {
        expect(canBeFixed(gene.id, form.id)).toBe(!requiresHeterozygote(gene.id, form.id));
      }
    }
  });
});

describe('viking breeding — pairing odds', () => {
  it('gives every pup the form when both parents are fixed for it', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const fixed = genomeShowing({
      size: 'size:teacup',
      legs: 'legs:waddler',
      ears: 'ears:sail',
    });
    expect(litterMatchRate(fixed, fixed, role)).toBe(1);
  });

  it('reproduces the three-to-one ratio for a recessive target', () => {
    const gene = miniGene('size');
    const carrier = genomeShowing();
    const carrierGenome = {
      ...carrier,
      size: [gene.alleles[0], gene.alleles[1]] as const,
    } as MiniGenome;
    const requirement = { geneId: 'size' as const, formId: 'size:teacup', reason: '' };
    // Two carriers: one pup in four is the recessive homozygote.
    expect(requirementProbability(carrierGenome, carrierGenome, requirement)).toBeCloseTo(0.25, 10);
  });

  it('reproduces the one-in-two ratio when two heterozygotes are crossed', () => {
    const gene = miniGene('ears');
    const base = genomeShowing();
    const het = { ...base, ears: [gene.alleles[0], gene.alleles[1]] as const } as MiniGenome;
    const requirement = { geneId: 'ears' as const, formId: 'ears:petal', reason: '' };
    expect(requirementProbability(het, het, requirement)).toBeCloseTo(0.5, 10);
  });

  it('gets every pup right by crossing the two homozygous lines instead', () => {
    // The F1 trick: hom × hom produces the wanted blend in every pup, and none of them breed true.
    const gene = miniGene('ears');
    const base = genomeShowing();
    const sail = { ...base, ears: [gene.alleles[0], gene.alleles[0]] as const } as MiniGenome;
    const button = { ...base, ears: [gene.alleles[1], gene.alleles[1]] as const } as MiniGenome;
    const requirement = { geneId: 'ears' as const, formId: 'ears:petal', reason: '' };
    expect(requirementProbability(sail, button, requirement)).toBe(1);
  });

  it('multiplies independent loci', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const base = genomeShowing({ size: 'size:teacup', legs: 'legs:waddler', ears: 'ears:sail' });
    const sizeGene = miniGene('size');
    const halfSize = {
      ...base,
      size: [sizeGene.alleles[0], sizeGene.alleles[1]] as const,
    } as MiniGenome;
    const breakdown = pairingBreakdown(halfSize, halfSize, role);
    const product = breakdown.reduce((total, entry) => total * entry.probability, 1);
    expect(litterMatchRate(halfSize, halfSize, role)).toBeCloseTo(product, 10);
    expect(litterMatchRate(halfSize, halfSize, role)).toBeCloseTo(0.25, 10);
  });
});

describe('viking breeding — what a line can and cannot become', () => {
  it('separates commissions that can be fixed from ones that never can', () => {
    expect(roleBreedsTrue(WORKING_ROLE_BY_ID['granary-mouser'])).toBe(true);
    expect(roleBreedsTrue(WORKING_ROLE_BY_ID['bilge-ratter'])).toBe(true);
    expect(roleBreedsTrue(WORKING_ROLE_BY_ID['forge-tender'])).toBe(true);

    // Both of these ask for a heterozygous form, so no amount of selection fixes them.
    expect(roleBreedsTrue(WORKING_ROLE_BY_ID['hall-trickster'])).toBe(false);
    expect(roleBreedsTrue(WORKING_ROLE_BY_ID['message-flier'])).toBe(false);
  });

  it('names the two lines a settlement must keep when a commission cannot be fixed', () => {
    const plan = crossPlan(WORKING_ROLE_BY_ID['hall-trickster']);
    expect(plan.length).toBe(2);
    for (const line of plan) {
      expect(line.parentFormLabels[0]).not.toBe(line.parentFormLabels[1]);
      expect(line.requiredFormLabel).toBeTruthy();
    }
    expect(crossPlan(WORKING_ROLE_BY_ID['granary-mouser'])).toEqual([]);
  });

  it('reaches every pup for every commission, fixable or not', () => {
    // The ceiling is never what distinguishes these roles — whether the result breeds true is.
    for (const role of WORKING_ROLES) {
      expect(bestAchievableLitterRate(role), role.id).toBe(1);
    }
  });

  it('reports a matched pair as breeding true only when the commission allows it', () => {
    const fixable = WORKING_ROLE_BY_ID['granary-mouser'];
    const fixed = genomeShowing({
      size: 'size:teacup',
      legs: 'legs:waddler',
      ears: 'ears:sail',
    });
    const fixedKennel = [dragon('a', fixed, 'female'), dragon('b', fixed, 'male')];
    expect(programMetrics(fixedKennel, fixable).breedsTrue).toBe(true);

    // Two perfect trickster dragons still throw off-type pups, because both are heterozygotes.
    const trickster = WORKING_ROLE_BY_ID['hall-trickster'];
    const blended = genomeShowing({ crest: 'crest:crown-frill', ears: 'ears:petal' });
    const blendedKennel = [dragon('c', blended, 'female'), dragon('d', blended, 'male')];
    expect(matchesRole(blended, trickster)).toBe(true);
    expect(programMetrics(blendedKennel, trickster).breedsTrue).toBe(false);
    expect(litterMatchRate(blended, blended, trickster)).toBeCloseTo(0.25, 10);
  });
});

describe('viking breeding — founder stock', () => {
  it('supplies every allele each commission needs', () => {
    // Otherwise the programme would be impossible and the student could never find out why.
    for (const role of WORKING_ROLES) {
      const stock = buildFounderStock(role, 'seed-1');
      for (const requirement of role.requirements) {
        const needed = miniGenotypeForForm(requirement.geneId, requirement.formId)[0];
        const carriers = stock.filter((animal) =>
          animal.genome[requirement.geneId].includes(needed),
        );
        expect(carriers.length, `${role.id}/${requirement.geneId}`).toBeGreaterThan(0);
      }
    }
  });

  it('never hands the settlement a finished animal', () => {
    for (const role of WORKING_ROLES) {
      const stock = buildFounderStock(role, 'seed-1');
      expect(stock.some((animal) => matchesRole(animal.genome, role)), role.id).toBe(false);
    }
  });

  it('supplies both sexes so the stock can actually be bred', () => {
    for (const role of WORKING_ROLES) {
      const stock = buildFounderStock(role, 'seed-1');
      expect(stock.length).toBe(FOUNDER_STOCK_SIZE);
      expect(stock.some((animal) => animal.sex === 'female'), role.id).toBe(true);
      expect(stock.some((animal) => animal.sex === 'male'), role.id).toBe(true);
    }
  });

  it('is reachable within the seasons the settlement allows', () => {
    // A commission nobody could complete is a broken brief, not a hard one.
    for (const role of WORKING_ROLES) {
      const stock = buildFounderStock(role, 'seed-1');
      expect(reachableWithin(stock, role, role.seasons), role.id).toBe(true);
    }
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    expect(buildFounderStock(role, 'a')).toEqual(buildFounderStock(role, 'a'));
    expect(JSON.stringify(buildFounderStock(role, 'b'))).not.toBe(
      JSON.stringify(buildFounderStock(role, 'a')),
    );
  });
});

describe('viking breeding — running a programme', () => {
  it('predicts a litter before it is bred, and the litter follows the prediction', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const fixed = genomeShowing({
      size: 'size:teacup',
      legs: 'legs:waddler',
      ears: 'ears:sail',
    });
    const litter = breedLitter(
      dragon('dam', fixed, 'female'),
      dragon('sire', fixed, 'male'),
      role,
      1,
      'litter-1',
    );
    expect(litter.predictedMatchRate).toBe(1);
    expect(litter.pups.every((pup) => matchesRole(pup.genome, role))).toBe(true);
  });

  it('carries founder ancestry through the generations', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const stock = buildFounderStock(role, 'seed-1');
    const dam = stock.find((animal) => animal.sex === 'female')!;
    const sire = stock.find((animal) => animal.sex === 'male')!;
    const litter = breedLitter(dam, sire, role, 1, 'litter-1');
    for (const pup of litter.pups) {
      expect(pup.founderIds).toContain(dam.founderIds[0]);
      expect(pup.founderIds).toContain(sire.founderIds[0]);
      expect(pup.generation).toBe(1);
    }
  });

  it('shows diversity falling when a line is bred from one pair', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const stock = buildFounderStock(role, 'seed-1');
    const startMetrics = programMetrics(stock, role);
    expect(startMetrics.foundersRepresented).toBe(FOUNDER_STOCK_SIZE);

    const dam = stock.find((animal) => animal.sex === 'female')!;
    const sire = stock.find((animal) => animal.sex === 'male')!;
    const litter = breedLitter(dam, sire, role, 1, 'litter-1');
    const narrowed = programMetrics(litter.pups, role);
    expect(narrowed.foundersRepresented).toBe(2);
    expect(narrowed.diversityPercent).toBeLessThan(startMetrics.diversityPercent);
  });

  it('reports the response to selection season by season', () => {
    const role = WORKING_ROLE_BY_ID['granary-mouser'];
    const fixed = genomeShowing({
      size: 'size:teacup',
      legs: 'legs:waddler',
      ears: 'ears:sail',
    });
    const off = genomeShowing();
    const response = selectionResponse(
      [
        { season: 1, pups: [dragon('p1', off, 'female'), dragon('p2', fixed, 'male')] },
        { season: 2, pups: [dragon('p3', fixed, 'female'), dragon('p4', fixed, 'male')] },
      ],
      role,
    );
    expect(response.map((entry) => entry.matchRate)).toEqual([0.5, 1]);
    expect(response.map((entry) => entry.season)).toEqual([1, 2]);
  });

  it('names the strategy each settlement is really being asked for', () => {
    expect(roleStrategy(WORKING_ROLE_BY_ID['granary-mouser'])).toBe('single-line');
    expect(roleStrategy(WORKING_ROLE_BY_ID['hall-trickster'])).toBe('two-line-cross');
  });
});

/**
 * Breadth-first check that some sequence of pairings inside the season limit reaches the
 * commission. Deliberately generous about *which* pairings: the question is whether the alleles are
 * present and combinable at all, not whether a student would find the route.
 */
function reachableWithin(
  stock: readonly KennelDragon[],
  role: WorkingRole,
  seasons: number,
): boolean {
  let pool = [...stock];
  for (let season = 1; season <= seasons; season += 1) {
    const dams = pool.filter((animal) => animal.sex === 'female');
    const sires = pool.filter((animal) => animal.sex === 'male');
    let best: { rate: number; dam: KennelDragon; sire: KennelDragon } | null = null;
    for (const dam of dams) {
      for (const sire of sires) {
        const rate = litterMatchRate(dam.genome, sire.genome, role);
        if (!best || rate > best.rate) best = { rate, dam, sire };
      }
    }
    if (!best) return false;
    if (best.rate >= 1) return true;
    const litter = breedLitter(best.dam, best.sire, role, season, `reach:${role.id}:${season}`);
    if (litter.pups.some((pup) => matchesRole(pup.genome, role))) {
      // Keep the whole litter plus the parents; the next season pairs from a wider pool.
      pool = [...pool, ...litter.pups];
      if (
        pool.filter((animal) => matchesRole(animal.genome, role)).length >= 1 &&
        bestRate(pool, role) >= 1
      ) {
        return true;
      }
    } else {
      pool = [...pool, ...litter.pups];
    }
  }
  return bestRate(pool, role) >= 1 || pool.some((animal) => matchesRole(animal.genome, role));
}

function bestRate(pool: readonly KennelDragon[], role: WorkingRole): number {
  let best = 0;
  for (const dam of pool.filter((animal) => animal.sex === 'female')) {
    for (const sire of pool.filter((animal) => animal.sex === 'male')) {
      best = Math.max(best, litterMatchRate(dam.genome, sire.genome, role));
    }
  }
  return best;
}
