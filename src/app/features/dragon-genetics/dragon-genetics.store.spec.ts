import { TestBed } from '@angular/core/testing';
import { TRAIT_SORT_CARDS } from '../../../../migration-archive/physics-coupled-dragon-genetics/data/dragon-lab-content';
import { DRAGON_TRAITS } from '../../../../migration-archive/physics-coupled-dragon-genetics/domain/dragon-inheritance';
import {
  GENOME_PATH,
  PHENOTYPE_QUESTIONS,
  TRAIT_RULE_CHALLENGES,
} from './dragon-genetics.content';
import { DragonGeneticsRepository } from './dragon-genetics.repository';
import { DragonGeneticsStore } from './dragon-genetics.store';

describe('DragonGeneticsStore', () => {
  let store: DragonGeneticsStore;

  beforeEach(() => {
    localStorage.removeItem('pbl-forge.dragon-genetics.v2');
    TestBed.configureTestingModule({
      providers: [
        DragonGeneticsStore,
        {
          provide: DragonGeneticsRepository,
          useValue: {
            load: async () => null,
            save: async () => undefined,
          },
        },
      ],
    });
    store = TestBed.inject(DragonGeneticsStore);
  });

  it('enforces the complete three-week evidence sequence through the final challenge', () => {
    for (const card of TRAIT_SORT_CARDS) store.setTraitSortAnswer(card.id, card.category);
    expect(store.checkTraitSort().complete).toBeTrue();

    for (const term of GENOME_PATH) store.chooseGenomePathTerm(term);
    expect(store.checkGenomePath()).toBeTrue();

    for (const question of PHENOTYPE_QUESTIONS) {
      store.setPhenotypeAnswer(question.id, question.correctOptionId);
    }
    expect(store.checkPhenotypeAnswers().complete).toBeTrue();

    for (const challenge of TRAIT_RULE_CHALLENGES) {
      store.setRuleAnswer(challenge.id, challenge.correctAnswer);
    }
    expect(store.checkRuleAnswers().complete).toBeTrue();

    for (const trait of DRAGON_TRAITS) {
      store.setPrediction(trait.id, store.expectedPredictions()[trait.id]);
    }
    expect(store.checkBreedingPredictions().complete).toBeTrue();
    expect(store.runBatch(8)).toBeTrue();
    expect(store.runBatch(100)).toBeTrue();

    store.setReproductionAnswer('sexual');
    expect(store.checkReproduction()).toBeTrue();

    const siblings = store.snapshot().smallBatch?.sample.slice(0, 2) ?? [];
    for (const sibling of siblings) store.toggleSibling(sibling.id);
    store.setSiblingExplanation('The siblings inherited different wing alleles from the same two parents.');
    expect(store.submitSiblingEvidence()).toBeTrue();

    const pair = store.pairAnalyses()[0];
    store.selectRecommendedPair(pair.pairId);
    store.setDiversityRecommendation('This pair preserves multiple alleles and has strong allele-richness and heterozygosity evidence.');
    expect(store.submitDiversityRecommendation().complete).toBeTrue();

    for (const question of store.licenseQuestions()) {
      store.setLicenseAnswer(question.id, question.correctOptionId);
    }
    expect(store.submitLicense().passed).toBeTrue();

    for (const trait of DRAGON_TRAITS) {
      store.setOfficialPrediction(trait.id, store.expectedPredictions()[trait.id]);
    }
    expect(store.runOfficialBreeding().ready).toBeTrue();
    store.selectChampion(store.snapshot().officialPool[0].id);
    store.recordBattle({ won: true, winnerName: 'Official hatchling 1', elapsedSeconds: 20, remainingHealthPercent: 60 });
    store.setFinalEvidence('My champion inherited a wing allele and fire allele that changed its generated body, while tactics and collisions also affected the arena outcome.');
    store.setDefenseAnswer(0, 'The W allele could have come from Ember because Ember carries Ww.');
    store.setDefenseAnswer(1, 'A sibling could inherit a different allele combination at each gene.');
    store.setDefenseAnswer(2, 'The model uses only four imaginary single-gene traits and simplified physics.');

    expect(store.submitFinalChallenge()).toBeTrue();
    expect(store.snapshot().completedModules).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
