import {
  EXPEDITION_ISLAND_IDS,
  EXPEDITION_LOCUS_BY_ID,
  ExpeditionIslandId,
  ExpeditionQuest,
  QuestTarget,
} from './island-expedition.models';
import { formFrequencyOn, genotypeFrequencyOn } from './island-expedition.selection';

/**
 * Expedition briefs.
 *
 * A quest never names an island. It names an animal the academy needs, and the student works out
 * where selection would have made that animal common. Targets at different loci are independent, so
 * a two-target quest is a genuine compromise problem: the island that is best for one may be poor
 * for the other.
 *
 * Every quest here is checked against the selection model by `island-expedition.quests.spec.ts` —
 * if the ecology changes and a target stops being findable, the spec fails rather than the student.
 */

function phenotype(locusId: QuestTarget['locusId'], form: 'dominant' | 'recessive'): QuestTarget {
  return { locusId, kind: 'phenotype', form };
}

function carrier(locusId: QuestTarget['locusId']): QuestTarget {
  return { locusId, kind: 'carrier', genotype: 'heterozygous' };
}

function purebred(
  locusId: QuestTarget['locusId'],
  genotype: 'homozygous-dominant' | 'homozygous-recessive',
): QuestTarget {
  return { locusId, kind: 'genotype', genotype };
}

export const EXPEDITION_QUESTS: readonly ExpeditionQuest[] = [
  {
    id: 'stormrider',
    title: 'The Stormrider',
    brief:
      'The courier service needs a dragon that can hold a line against a headwind. Bring back one with broad wings.',
    targets: [phenotype('wings', 'dominant')],
    surveyBudget: 2,
    sequenceBudget: 0,
    sampleSize: 8,
    teachingNote:
      'The gentlest start: one visible trait, and several islands would serve. The point is to read the ecology at all.',
  },
  {
    id: 'ashwalker',
    title: 'The Ashwalker',
    brief:
      'A survey team needs a dragon that will not be spotted against black rock. Bring back a dark-hided animal.',
    targets: [phenotype('color', 'dominant')],
    surveyBudget: 2,
    sequenceBudget: 0,
    sampleSize: 8,
    teachingNote:
      'Camouflage only pays where something is hunting. A dark island with no predators would not select for dark hides.',
  },
  {
    id: 'shellcracker',
    title: 'The Shellcracker',
    brief:
      'The forge needs sustained flame. Bring back a dragon with strong fire — and one that is purebred for it, so the trait breeds true.',
    targets: [purebred('fire', 'homozygous-dominant')],
    surveyBudget: 2,
    sequenceBudget: 3,
    sampleSize: 8,
    teachingNote:
      'Phenotype cannot separate FF from Ff. The sequencing budget is the whole difficulty.',
  },
  {
    id: 'palescout',
    title: 'The Pale Scout',
    brief:
      'A desert expedition needs a dragon that will not cook under open sun and will not stand out on chalk. Pale hide, light scales.',
    targets: [phenotype('color', 'recessive'), phenotype('scales', 'recessive')],
    surveyBudget: 2,
    sequenceBudget: 0,
    sampleSize: 10,
    teachingNote:
      'Two recessive forms at once. Both are common in the same conditions, so this one rewards noticing that heat drives both.',
  },
  {
    id: 'lantern',
    title: 'The Lantern',
    brief: 'The cave survey needs a dragon that makes its own light.',
    targets: [phenotype('glow', 'dominant')],
    surveyBudget: 2,
    sequenceBudget: 0,
    sampleSize: 8,
    teachingNote:
      'Glow is favoured in darkness and punished where sighted predators hunt. Two islands are dark; only one is safe.',
  },
  {
    id: 'hidden-line',
    title: 'The Hidden Line',
    brief:
      'The breeding programme wants the light-scale allele back in the stock, but it must come inside a heavy-plated animal — a carrier, not a light-scaled one.',
    targets: [carrier('scales')],
    surveyBudget: 3,
    sequenceBudget: 4,
    sampleSize: 10,
    teachingNote:
      'The counterintuitive one. Carriers are commonest where the allele frequency sits near half — not where the recessive form is commonest. An island where light scales dominate has few carriers, because most light-scale alleles are sitting in light-scaled animals.',
  },
  {
    id: 'twin-recessive',
    title: 'The Understorey Runner',
    brief:
      'A forest survey needs a compact-winged dragon that also carries the weak-flame allele without showing it.',
    targets: [phenotype('wings', 'recessive'), carrier('fire')],
    surveyBudget: 3,
    sequenceBudget: 4,
    sampleSize: 12,
    teachingNote:
      'A real compromise: the best island for compact wings is not the best for fire carriers. The student must weigh the two.',
  },
  {
    id: 'founder-stock',
    title: 'Founder Stock',
    brief:
      'The archive wants an animal close to the ancestral population: carrying both alleles at scale armour, fire, and glow.',
    targets: [carrier('scales'), carrier('fire'), carrier('glow')],
    surveyBudget: 3,
    sequenceBudget: 6,
    sampleSize: 12,
    teachingNote:
      'The capstone. Only a weakly-selected, recently-colonized island keeps three loci near their founder frequencies at once.',
  },
];

export const EXPEDITION_QUEST_BY_ID: Readonly<Record<string, ExpeditionQuest>> =
  Object.fromEntries(EXPEDITION_QUESTS.map((quest) => [quest.id, quest]));

/** Probability that one randomly drawn dragon on an island satisfies a single target. */
export function targetProbability(
  islandId: ExpeditionIslandId,
  target: QuestTarget,
): number {
  if (target.kind === 'phenotype') {
    return formFrequencyOn(islandId, target.locusId, target.form ?? 'dominant');
  }
  return genotypeFrequencyOn(
    islandId,
    target.locusId,
    target.genotype ?? 'heterozygous',
  );
}

/**
 * Probability that one dragon satisfies every target. Loci are unlinked and the population is at
 * Hardy-Weinberg equilibrium, so the per-locus probabilities multiply.
 */
export function questProbability(
  islandId: ExpeditionIslandId,
  quest: ExpeditionQuest,
): number {
  return quest.targets.reduce(
    (product, target) => product * targetProbability(islandId, target),
    1,
  );
}

/** Expected number of matching dragons in one survey of this island. */
export function expectedFinds(islandId: ExpeditionIslandId, quest: ExpeditionQuest): number {
  return questProbability(islandId, quest) * quest.sampleSize;
}

/** Chance of finding at least one match across the whole survey budget. */
export function chanceOfSuccess(islandId: ExpeditionIslandId, quest: ExpeditionQuest): number {
  const perDragon = questProbability(islandId, quest);
  const draws = quest.sampleSize * quest.surveyBudget;
  return 1 - Math.pow(1 - perDragon, draws);
}

export interface QuestIslandRanking {
  islandId: ExpeditionIslandId;
  probability: number;
  expectedFinds: number;
  chanceOfSuccess: number;
}

export function rankIslandsForQuest(quest: ExpeditionQuest): readonly QuestIslandRanking[] {
  return EXPEDITION_ISLAND_IDS.map((islandId) => ({
    islandId,
    probability: questProbability(islandId, quest),
    expectedFinds: expectedFinds(islandId, quest),
    chanceOfSuccess: chanceOfSuccess(islandId, quest),
  })).sort((first, second) => second.probability - first.probability);
}

export type ChoiceTier = 'best' | 'viable' | 'poor';

export interface ChoiceEvaluation {
  tier: ChoiceTier;
  islandId: ExpeditionIslandId;
  probability: number;
  bestIslandId: ExpeditionIslandId;
  bestProbability: number;
  rank: number;
  explanation: string;
}

/**
 * Grades an island choice on **reasoning**, not on the draw.
 *
 * Several islands are often near-equally good, and picking any of them is sound. A choice counts as
 * viable when it is within reach of the best rather than only when it is the single top-ranked one,
 * because a student who reasoned correctly to a joint-best island should not be marked down for a
 * two-point difference they could not have measured.
 */
export function evaluateIslandChoice(
  quest: ExpeditionQuest,
  islandId: ExpeditionIslandId,
): ChoiceEvaluation {
  const ranking = rankIslandsForQuest(quest);
  const best = ranking[0];
  const chosen = ranking.find((entry) => entry.islandId === islandId) ?? best;
  const rank = ranking.findIndex((entry) => entry.islandId === islandId) + 1;
  const ratio = best.probability > 0 ? chosen.probability / best.probability : 0;

  const tier: ChoiceTier = ratio >= 0.85 ? 'best' : ratio >= 0.4 ? 'viable' : 'poor';
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const explanation =
    tier === 'best'
      ? `About ${percent(chosen.probability)} of dragons there match. That is as good as the archipelago offers.`
      : tier === 'viable'
        ? `About ${percent(chosen.probability)} match there, against ${percent(best.probability)} at the strongest option. Workable, but it will cost you surveys.`
        : `Only about ${percent(chosen.probability)} match there. The ecology points somewhere else.`;

  return {
    tier,
    islandId,
    probability: chosen.probability,
    bestIslandId: best.islandId,
    bestProbability: best.probability,
    rank,
    explanation,
  };
}

/** The trait-by-trait reason an island does or does not suit a quest, for the debrief. */
export function questTargetBreakdown(
  quest: ExpeditionQuest,
  islandId: ExpeditionIslandId,
): readonly { label: string; probability: number }[] {
  return quest.targets.map((target) => {
    const locus = EXPEDITION_LOCUS_BY_ID[target.locusId];
    const label =
      target.kind === 'phenotype'
        ? target.form === 'recessive'
          ? locus.recessiveForm
          : locus.dominantForm
        : target.kind === 'carrier'
          ? `${locus.name} carrier`
          : target.genotype === 'homozygous-recessive'
            ? `Purebred ${locus.recessiveForm.toLowerCase()}`
            : `Purebred ${locus.dominantForm.toLowerCase()}`;
    return { label, probability: targetProbability(islandId, target) };
  });
}
