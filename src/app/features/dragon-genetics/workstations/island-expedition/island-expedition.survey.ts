import {
  EXPEDITION_LOCI,
  EXPEDITION_LOCUS_BY_ID,
  ExpeditionGenotype,
  ExpeditionIslandId,
  ExpeditionLocusId,
  ExpeditionQuest,
  QuestTarget,
  SurveyedDragon,
} from './island-expedition.models';
import { islandFrequencies } from './island-expedition.selection';

/**
 * Field surveying.
 *
 * A survey draws dragons from the island's Hardy-Weinberg genotype distribution — the same
 * distribution the selection model computes — so what a student finds in the field always agrees
 * with what the ecology predicted. The draw is deterministic in its seed, so a survey can be
 * replayed and a teacher can see exactly what a student saw.
 *
 * Sampling is genuinely random within the distribution. A student who picks the right island can
 * still come up empty on a small sample, which is the same lesson the Incubator Sampler teaches
 * about ratios: a good decision is not a guaranteed outcome.
 */

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomStream(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Vetch', 'Skarn', 'Pell', 'Norra', 'Bracken', 'Quill', 'Marrow', 'Sedge',
  'Fen', 'Thrall', 'Cinder', 'Wisp', 'Gale', 'Torrin', 'Hale', 'Bryn',
  'Ossa', 'Rume', 'Kettle', 'Drift', 'Lorn', 'Vane', 'Ember', 'Slate',
];

function drawGenotype(random: () => number, frequencies: {
  homozygousDominant: number;
  heterozygous: number;
}): ExpeditionGenotype {
  const roll = random();
  if (roll < frequencies.homozygousDominant) return 'homozygous-dominant';
  if (roll < frequencies.homozygousDominant + frequencies.heterozygous) return 'heterozygous';
  return 'homozygous-recessive';
}

/** Draws one survey's worth of dragons from an island. */
export function surveyIsland(
  islandId: ExpeditionIslandId,
  sampleSize: number,
  seed: string,
): readonly SurveyedDragon[] {
  const random = randomStream(`${islandId}:${seed}`);
  const frequencies = islandFrequencies(islandId);
  return Array.from({ length: sampleSize }, (_, index) => {
    const genotypes = Object.fromEntries(
      EXPEDITION_LOCI.map((locus) => [locus.id, drawGenotype(random, frequencies[locus.id])]),
    ) as Record<ExpeditionLocusId, ExpeditionGenotype>;

    const name = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    return {
      id: `${islandId}:${seed}:${index}`,
      name: `${name}-${String(hashSeed(`${seed}:${index}`) % 900 + 100)}`,
      islandId,
      sex: random() < 0.5 ? 'female' : 'male',
      genotypes,
      sequencedLoci: [],
    } satisfies SurveyedDragon;
  });
}

/** The visible form of a dragon at a locus. Heterozygotes show the dominant form. */
export function visibleForm(
  dragon: SurveyedDragon,
  locusId: ExpeditionLocusId,
): 'dominant' | 'recessive' {
  return dragon.genotypes[locusId] === 'homozygous-recessive' ? 'recessive' : 'dominant';
}

export function visibleFormLabel(dragon: SurveyedDragon, locusId: ExpeditionLocusId): string {
  const locus = EXPEDITION_LOCUS_BY_ID[locusId];
  return visibleForm(dragon, locusId) === 'recessive' ? locus.recessiveForm : locus.dominantForm;
}

/**
 * What the student is allowed to know about a locus right now: the genotype once sequenced,
 * otherwise only the visible form.
 */
export function knownGenotype(
  dragon: SurveyedDragon,
  locusId: ExpeditionLocusId,
): ExpeditionGenotype | null {
  return dragon.sequencedLoci.includes(locusId) ? dragon.genotypes[locusId] : null;
}

/** Whether a target needs sequencing, or can be settled by looking. */
export function targetNeedsSequencing(target: QuestTarget): boolean {
  if (target.kind === 'phenotype') return false;
  // A recessive phenotype already proves the homozygous-recessive genotype.
  return !(target.kind === 'genotype' && target.genotype === 'homozygous-recessive');
}

export type TargetStatus = 'met' | 'failed' | 'unknown';

/** Whether one dragon satisfies one target, given only what the student has established. */
export function targetStatus(dragon: SurveyedDragon, target: QuestTarget): TargetStatus {
  const form = visibleForm(dragon, target.locusId);

  if (target.kind === 'phenotype') {
    return form === (target.form ?? 'dominant') ? 'met' : 'failed';
  }

  const wanted = target.genotype ?? 'heterozygous';
  if (wanted === 'homozygous-recessive') {
    return form === 'recessive' ? 'met' : 'failed';
  }
  // A recessive-form animal cannot be a carrier or a dominant homozygote, and that is visible.
  if (form === 'recessive') return 'failed';

  const known = knownGenotype(dragon, target.locusId);
  if (!known) return 'unknown';
  return known === wanted ? 'met' : 'failed';
}

export interface DragonMatch {
  dragon: SurveyedDragon;
  statuses: readonly { target: QuestTarget; status: TargetStatus }[];
  /** Every target met with nothing outstanding. */
  confirmed: boolean;
  /** No target failed, but something still needs sequencing. */
  candidate: boolean;
}

export function evaluateDragon(dragon: SurveyedDragon, quest: ExpeditionQuest): DragonMatch {
  const statuses = quest.targets.map((target) => ({
    target,
    status: targetStatus(dragon, target),
  }));
  const failed = statuses.some((entry) => entry.status === 'failed');
  const unknown = statuses.some((entry) => entry.status === 'unknown');
  return {
    dragon,
    statuses,
    confirmed: !failed && !unknown,
    candidate: !failed && unknown,
  };
}

/**
 * Dragons still worth sequencing: nothing has ruled them out, but they are not yet confirmed.
 * Spending a sequencing run on a dragon already ruled out by sight is the waste the budget teaches
 * students to avoid.
 */
export function sequencingCandidates(
  dragons: readonly SurveyedDragon[],
  quest: ExpeditionQuest,
): readonly SurveyedDragon[] {
  return dragons.filter((dragon) => evaluateDragon(dragon, quest).candidate);
}

/** Applies a sequencing run to one locus of one dragon. */
export function sequenceLocus(
  dragon: SurveyedDragon,
  locusId: ExpeditionLocusId,
): SurveyedDragon {
  if (dragon.sequencedLoci.includes(locusId)) return dragon;
  return { ...dragon, sequencedLoci: [...dragon.sequencedLoci, locusId] };
}
