import { EXPEDITION_ISLAND_IDS, EXPEDITION_LOCUS_BY_ID } from './island-expedition.models';
import {
  EXPEDITION_QUESTS,
  chanceOfSuccess,
  evaluateIslandChoice,
  questProbability,
  questTargetBreakdown,
  rankIslandsForQuest,
} from './island-expedition.quests';
import {
  evaluateDragon,
  sequenceLocus,
  sequencingCandidates,
  surveyIsland,
  targetNeedsSequencing,
  visibleForm,
} from './island-expedition.survey';

describe('island expedition quests', () => {
  it('gives every quest at least one island where the target is genuinely findable', () => {
    // Content is checked against the model, so retuning the ecology fails the spec rather than
    // silently handing a student an impossible brief.
    for (const quest of EXPEDITION_QUESTS) {
      const best = rankIslandsForQuest(quest)[0];
      // A multi-carrier brief is necessarily rare per dragon — three carriers caps at 0.5³ — so the
      // real gate is whether the survey budget can reach one, not the per-dragon rate.
      expect(best.probability, quest.id).toBeGreaterThan(0.1);
      expect(chanceOfSuccess(best.islandId, quest), quest.id).toBeGreaterThan(0.85);
    }
  });

  it('makes the wrong island genuinely worse, so the choice carries weight', () => {
    for (const quest of EXPEDITION_QUESTS) {
      const ranking = rankIslandsForQuest(quest);
      const worst = ranking[ranking.length - 1];
      expect(worst.probability, quest.id).toBeLessThan(ranking[0].probability * 0.5);
    }
  });

  it('never names an island in a brief', () => {
    const islandWords = ['ashfall', 'stormcrag', 'palewind', 'gloomroot', 'ironmoor', 'sunspire', 'nightglass', 'kelpreach'];
    for (const quest of EXPEDITION_QUESTS) {
      const text = `${quest.title} ${quest.brief}`.toLowerCase();
      for (const word of islandWords) {
        expect(text, `${quest.id} leaks ${word}`).not.toContain(word);
      }
    }
  });

  it('sends the carrier hunt somewhere other than the recessive-rich island', () => {
    const hiddenLine = EXPEDITION_QUESTS.find((quest) => quest.id === 'hidden-line')!;
    const best = rankIslandsForQuest(hiddenLine)[0];
    // Ashfall and Palewind are where light scales are commonest; neither is where carriers are.
    expect(best.islandId).not.toBe('ashfall');
    expect(best.islandId).not.toBe('palewind');
    expect(best.islandId).toBe('kelpreach');
  });

  it('makes the three-carrier capstone solvable only on a weakly-selected island', () => {
    const founder = EXPEDITION_QUESTS.find((quest) => quest.id === 'founder-stock')!;
    const ranking = rankIslandsForQuest(founder);
    expect(ranking[0].islandId).toBe('kelpreach');
    expect(ranking[0].probability).toBeGreaterThan(ranking[1].probability * 1.5);
  });

  it('grades a joint-best choice as best and a poor one as poor', () => {
    const quest = EXPEDITION_QUESTS.find((q) => q.id === 'stormrider')!;
    const ranking = rankIslandsForQuest(quest);
    expect(evaluateIslandChoice(quest, ranking[0].islandId).tier).toBe('best');
    expect(evaluateIslandChoice(quest, ranking[ranking.length - 1].islandId).tier).toBe('poor');
  });

  it('multiplies independent target probabilities', () => {
    const quest = EXPEDITION_QUESTS.find((q) => q.id === 'palescout')!;
    for (const islandId of EXPEDITION_ISLAND_IDS) {
      const breakdown = questTargetBreakdown(quest, islandId);
      const product = breakdown.reduce((total, entry) => total * entry.probability, 1);
      expect(questProbability(islandId, quest)).toBeCloseTo(product, 10);
    }
  });

  it('knows which targets phenotype alone can settle', () => {
    expect(targetNeedsSequencing({ locusId: 'wings', kind: 'phenotype', form: 'dominant' })).toBe(
      false,
    );
    // A recessive form already proves the genotype; no sequencing needed.
    expect(
      targetNeedsSequencing({
        locusId: 'wings',
        kind: 'genotype',
        genotype: 'homozygous-recessive',
      }),
    ).toBe(false);
    expect(targetNeedsSequencing({ locusId: 'wings', kind: 'carrier', genotype: 'heterozygous' })).toBe(
      true,
    );
    expect(
      targetNeedsSequencing({
        locusId: 'wings',
        kind: 'genotype',
        genotype: 'homozygous-dominant',
      }),
    ).toBe(true);
  });
});

describe('island expedition surveying', () => {
  it('draws the same dragons for the same seed and different ones otherwise', () => {
    const first = surveyIsland('kelpreach', 10, 'student-1:survey-1');
    const again = surveyIsland('kelpreach', 10, 'student-1:survey-1');
    const other = surveyIsland('kelpreach', 10, 'student-1:survey-2');
    expect(again).toEqual(first);
    expect(JSON.stringify(other)).not.toEqual(JSON.stringify(first));
  });

  it('samples close to the island distribution over a large draw', () => {
    // The field must agree with the ecology, or reasoning from the map would be pointless.
    const dragons = surveyIsland('stormcrag', 4000, 'distribution-check');
    const platedShare =
      dragons.filter((dragon) => visibleForm(dragon, 'scales') === 'dominant').length /
      dragons.length;
    expect(platedShare).toBeGreaterThan(0.9);

    const gloomroot = surveyIsland('gloomroot', 4000, 'distribution-check');
    const broadWinged =
      gloomroot.filter((dragon) => visibleForm(dragon, 'wings') === 'dominant').length /
      gloomroot.length;
    expect(broadWinged).toBeLessThan(0.15);
  });

  it('hides a carrier until it is sequenced', () => {
    const quest = EXPEDITION_QUESTS.find((q) => q.id === 'hidden-line')!;
    const dragons = surveyIsland('kelpreach', 40, 'carrier-check');
    const heterozygote = dragons.find(
      (dragon) => dragon.genotypes['scales'] === 'heterozygous',
    )!;
    expect(heterozygote).toBeDefined();

    // Looks plated, like a homozygous dominant. Nothing visible separates them.
    expect(visibleForm(heterozygote, 'scales')).toBe('dominant');
    expect(evaluateDragon(heterozygote, quest).candidate).toBe(true);
    expect(evaluateDragon(heterozygote, quest).confirmed).toBe(false);

    const sequenced = sequenceLocus(heterozygote, 'scales');
    expect(evaluateDragon(sequenced, quest).confirmed).toBe(true);
  });

  it('rules a light-scaled dragon out of the carrier hunt by sight alone', () => {
    const quest = EXPEDITION_QUESTS.find((q) => q.id === 'hidden-line')!;
    const dragons = surveyIsland('ashfall', 40, 'exclusion-check');
    const recessive = dragons.find(
      (dragon) => dragon.genotypes['scales'] === 'homozygous-recessive',
    )!;
    const match = evaluateDragon(recessive, quest);
    expect(match.candidate).toBe(false);
    expect(match.confirmed).toBe(false);
    // Spending a sequencing run here is the waste the budget teaches students to avoid.
    expect(sequencingCandidates([recessive], quest)).toEqual([]);
  });

  it('offers only unresolved dragons as sequencing candidates', () => {
    const quest = EXPEDITION_QUESTS.find((q) => q.id === 'shellcracker')!;
    const dragons = surveyIsland('ironmoor', 30, 'candidate-check');
    for (const candidate of sequencingCandidates(dragons, quest)) {
      expect(visibleForm(candidate, 'fire')).toBe('dominant');
      expect(candidate.sequencedLoci).toEqual([]);
    }
  });

  it('gives every surveyed dragon a genotype at every locus', () => {
    const dragons = surveyIsland('ironmoor', 12, 'completeness');
    for (const dragon of dragons) {
      for (const locusId of Object.keys(EXPEDITION_LOCUS_BY_ID)) {
        expect(dragon.genotypes[locusId as keyof typeof dragon.genotypes]).toBeTruthy();
      }
    }
  });
});
