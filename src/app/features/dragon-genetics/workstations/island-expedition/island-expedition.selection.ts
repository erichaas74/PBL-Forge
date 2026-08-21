import {
  EXPEDITION_ISLAND_BY_ID,
  EXPEDITION_LOCI,
  EXPEDITION_LOCUS_BY_ID,
  ExpeditionGenotype,
  ExpeditionIsland,
  ExpeditionIslandId,
  ExpeditionLocus,
  ExpeditionLocusId,
  FOUNDER_DOMINANT_FREQUENCY,
  IslandEcology,
  IslandFrequencies,
  LocusFrequency,
} from './island-expedition.models';

/**
 * The selection engine.
 *
 * This is ordinary one-locus population genetics, not a lookup table: ecology sets the relative
 * fitness of each visible form, and allele frequency is advanced one generation at a time from the
 * shared founder value. Two consequences matter for teaching.
 *
 * A student who reasons *"heavy predators and a cold climate, so plating should be common"* and a
 * student who runs a survey have to reach the same answer, because the survey samples the
 * distribution this file computes. And because the frequencies are derived rather than authored,
 * nobody can quietly tune an island to make a lesson come out nicely.
 *
 * Dominance is complete at every locus, so selection acts on the *phenotype*: heterozygotes are
 * shielded, which is why a recessive allele never disappears entirely and why carriers are worth
 * hunting for.
 */

/** Relative fitness of the two visible forms, normalized so the fitter form sits at 1. */
export interface FormFitness {
  dominantForm: number;
  recessiveForm: number;
}

export function formFitness(locus: ExpeditionLocus, ecology: IslandEcology): FormFitness {
  const dominant = locus.dominantFitness(ecology);
  const recessive = locus.recessiveFitness(ecology);
  const best = Math.max(dominant, recessive);
  return { dominantForm: dominant / best, recessiveForm: recessive / best };
}

/**
 * One generation of selection on a locus with complete dominance.
 *
 * `p` is the dominant allele frequency. Both `AA` and `Aa` show the dominant form and therefore
 * share its fitness; only `aa` is exposed to selection against the recessive form.
 */
export function advanceOneGeneration(p: number, fitness: FormFitness): number {
  const q = 1 - p;
  const homozygousDominant = p * p * fitness.dominantForm;
  const heterozygous = 2 * p * q * fitness.dominantForm;
  const homozygousRecessive = q * q * fitness.recessiveForm;
  const meanFitness = homozygousDominant + heterozygous + homozygousRecessive;
  if (meanFitness <= 0) return p;
  // Each heterozygote contributes half a dominant allele to the next generation's gene pool.
  return (homozygousDominant + heterozygous / 2) / meanFitness;
}

/** Allele frequency after `generations` of selection from the shared founder frequency. */
export function selectedFrequency(
  locus: ExpeditionLocus,
  ecology: IslandEcology,
  generations: number,
  startingFrequency = FOUNDER_DOMINANT_FREQUENCY,
): number {
  const fitness = formFitness(locus, ecology);
  let p = startingFrequency;
  for (let generation = 0; generation < generations; generation += 1) {
    p = advanceOneGeneration(p, fitness);
    // A locus pinned hard against 0 or 1 stops being findable, and real populations keep a trickle
    // of variation through mutation and migration. This floor stands in for that.
    p = Math.min(0.97, Math.max(0.03, p));
  }
  return p;
}

/** Hardy-Weinberg genotype frequencies for a dominant allele frequency. */
export function genotypeFrequencies(p: number): {
  homozygousDominant: number;
  heterozygous: number;
  homozygousRecessive: number;
} {
  const q = 1 - p;
  return {
    homozygousDominant: p * p,
    heterozygous: 2 * p * q,
    homozygousRecessive: q * q,
  };
}

export function locusFrequency(
  locus: ExpeditionLocus,
  island: ExpeditionIsland,
): LocusFrequency {
  const p = selectedFrequency(locus, island.ecology, island.generationsSinceColonization);
  const genotypes = genotypeFrequencies(p);
  return {
    locusId: locus.id,
    dominantAllele: p,
    recessiveAllele: 1 - p,
    ...genotypes,
    dominantForm: genotypes.homozygousDominant + genotypes.heterozygous,
    recessiveForm: genotypes.homozygousRecessive,
  };
}

const CACHE = new Map<ExpeditionIslandId, IslandFrequencies>();

/** Every locus on one island. Deterministic, so it is computed once and reused. */
export function islandFrequencies(islandId: ExpeditionIslandId): IslandFrequencies {
  const cached = CACHE.get(islandId);
  if (cached) return cached;
  const island = EXPEDITION_ISLAND_BY_ID[islandId];
  const frequencies = Object.fromEntries(
    EXPEDITION_LOCI.map((locus) => [locus.id, locusFrequency(locus, island)]),
  ) as IslandFrequencies;
  CACHE.set(islandId, frequencies);
  return frequencies;
}

/** How common a genotype class is on an island. */
export function genotypeFrequencyOn(
  islandId: ExpeditionIslandId,
  locusId: ExpeditionLocusId,
  genotype: ExpeditionGenotype,
): number {
  const frequency = islandFrequencies(islandId)[locusId];
  switch (genotype) {
    case 'homozygous-dominant':
      return frequency.homozygousDominant;
    case 'heterozygous':
      return frequency.heterozygous;
    case 'homozygous-recessive':
      return frequency.homozygousRecessive;
  }
}

/** How common a visible form is on an island. */
export function formFrequencyOn(
  islandId: ExpeditionIslandId,
  locusId: ExpeditionLocusId,
  form: 'dominant' | 'recessive',
): number {
  const frequency = islandFrequencies(islandId)[locusId];
  return form === 'dominant' ? frequency.dominantForm : frequency.recessiveForm;
}

/**
 * Which direction the ecology pushes a locus, and how hard — the qualitative claim a student should
 * be able to make from the map before spending any budget.
 */
export type SelectionDirection = 'toward-dominant' | 'toward-recessive' | 'balanced';

export interface SelectionPressure {
  locusId: ExpeditionLocusId;
  direction: SelectionDirection;
  /** 0–1. How lopsided the fitness of the two forms is. */
  strength: number;
}

export function selectionPressure(
  locus: ExpeditionLocus,
  ecology: IslandEcology,
): SelectionPressure {
  const fitness = formFitness(locus, ecology);
  const difference = fitness.dominantForm - fitness.recessiveForm;
  const strength = Math.abs(difference);
  return {
    locusId: locus.id,
    // Below a few percent the two forms are close enough that drift would swamp the difference,
    // and the honest answer to "which is favoured here" is neither.
    direction:
      strength < 0.04 ? 'balanced' : difference > 0 ? 'toward-dominant' : 'toward-recessive',
    strength,
  };
}

export function islandPressures(islandId: ExpeditionIslandId): readonly SelectionPressure[] {
  const island = EXPEDITION_ISLAND_BY_ID[islandId];
  return EXPEDITION_LOCI.map((locus) => selectionPressure(locus, island.ecology));
}

/**
 * Islands ranked by how common a target is, best first. This backs the debrief — a student who
 * picked third-best should be shown what they missed and why the ecology pointed elsewhere.
 */
export interface IslandRanking {
  islandId: ExpeditionIslandId;
  frequency: number;
}

export function rankIslandsForGenotype(
  locusId: ExpeditionLocusId,
  genotype: ExpeditionGenotype,
  islandIds: readonly ExpeditionIslandId[],
): readonly IslandRanking[] {
  return islandIds
    .map((islandId) => ({
      islandId,
      frequency: genotypeFrequencyOn(islandId, locusId, genotype),
    }))
    .sort((first, second) => second.frequency - first.frequency);
}

export function rankIslandsForForm(
  locusId: ExpeditionLocusId,
  form: 'dominant' | 'recessive',
  islandIds: readonly ExpeditionIslandId[],
): readonly IslandRanking[] {
  return islandIds
    .map((islandId) => ({ islandId, frequency: formFrequencyOn(islandId, locusId, form) }))
    .sort((first, second) => second.frequency - first.frequency);
}

/** A short, honest sentence about what the ecology does to one locus. For field notes. */
export function pressureSummary(
  islandId: ExpeditionIslandId,
  locusId: ExpeditionLocusId,
): string {
  const locus = EXPEDITION_LOCUS_BY_ID[locusId];
  const island = EXPEDITION_ISLAND_BY_ID[islandId];
  const pressure = selectionPressure(locus, island.ecology);
  if (pressure.direction === 'balanced') {
    return `${island.name} favours neither ${locus.dominantForm.toLowerCase()} nor ${locus.recessiveForm.toLowerCase()}.`;
  }
  const favoured =
    pressure.direction === 'toward-dominant' ? locus.dominantForm : locus.recessiveForm;
  const degree = pressure.strength > 0.25 ? 'strongly' : 'mildly';
  return `${island.name} ${degree} favours ${favoured.toLowerCase()}.`;
}
