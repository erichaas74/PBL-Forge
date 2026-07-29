import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DRAGON_LAB_REPOSITORY,
  DRAGON_LAB_SESSION_ID,
} from '../../../core/persistence/dragon-lab.repository';
import { TRAIT_SORT_CARDS } from '../data/dragon-lab-content';
import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  allParentPairAnalyses,
  breedLabClutch,
  dominantPhenotypeProbability,
} from '../domain/dragon-inheritance';
import {
  DragonLabSnapshot,
  DragonLabStage,
  DragonTraitId,
  TraitSortCategory,
} from '../domain/dragon-lab.models';

@Injectable()
export class DragonGeneticsLabStore {
  private readonly repository = inject(DRAGON_LAB_REPOSITORY);
  private readonly sessionId = inject(DRAGON_LAB_SESSION_ID);
  private readonly initial = defaultSnapshot();
  private saveQueue: Promise<void> = Promise.resolve();
  private changedBeforeLoad = false;

  readonly persistenceState = signal<'loading' | 'saving' | 'saved' | 'error'>('loading');

  readonly stage = signal<DragonLabStage>(this.initial.stage);
  readonly completedLessonIds = signal<string[]>(this.initial.completedLessonIds);
  readonly sortAnswers = signal<Partial<Record<string, TraitSortCategory>>>(this.initial.sortAnswers);
  readonly sortChecked = signal(this.initial.sortChecked);
  readonly parentAId = signal(this.initial.parentAId);
  readonly parentBId = signal(this.initial.parentBId);
  readonly predictions = signal<Partial<Record<DragonTraitId, number>>>(this.initial.predictions);
  readonly predictionChecked = signal(this.initial.predictionChecked);
  readonly hatchRun = signal(this.initial.hatchRun);
  readonly clutch = signal(this.initial.clutch);
  readonly selectedOffspringId = signal<string | null>(this.initial.selectedOffspringId);
  readonly comparisonTraitId = signal<DragonTraitId>(this.initial.comparisonTraitId);
  readonly reproductionAnswer = signal<'sexual' | 'asexual' | null>(this.initial.reproductionAnswer);
  readonly claim = signal(this.initial.claim);
  readonly evidence = signal(this.initial.evidence);
  readonly reasoning = signal(this.initial.reasoning);
  readonly recommendedPairId = signal<string | null>(this.initial.recommendedPairId);
  readonly recommendation = signal(this.initial.recommendation);
  readonly recommendationSubmitted = signal(this.initial.recommendationSubmitted);

  readonly parentA = computed(() => findParent(this.parentAId()));
  readonly parentB = computed(() => findParent(this.parentBId()));
  readonly selectedOffspring = computed(() =>
    this.clutch().find(dragon => dragon.id === this.selectedOffspringId()) ?? this.clutch()[0] ?? null,
  );
  readonly pairAnalyses = allParentPairAnalyses();
  readonly selectedPairAnalysis = computed(() =>
    this.pairAnalyses.find(pair => pair.pairId === this.recommendedPairId()) ?? null,
  );
  readonly sortScore = computed(() => TRAIT_SORT_CARDS.reduce(
    (score, card) => score + (this.sortAnswers()[card.id] === card.category ? 1 : 0),
    0,
  ));
  readonly predictionScore = computed(() => DRAGON_TRAITS.reduce((score, trait) => {
    const expected = dominantPhenotypeProbability(this.parentA(), this.parentB(), trait.id);
    return score + (this.predictions()[trait.id] === expected ? 1 : 0);
  }, 0));
  readonly progressPercent = computed(() => {
    const milestones = [
      this.sortChecked() && this.sortScore() === TRAIT_SORT_CARDS.length,
      this.completedLessonIds().length === 7,
      this.predictionChecked(),
      this.clutch().length > 0,
      this.reproductionAnswer() === 'sexual' && hasText(this.claim()) && hasText(this.evidence()) && hasText(this.reasoning()),
      this.recommendationSubmitted(),
    ];
    return Math.round(100 * milestones.filter(Boolean).length / milestones.length);
  });

  constructor() {
    void this.restore();
  }

  setStage(stage: DragonLabStage): void {
    this.stage.set(stage);
    this.persist();
  }

  toggleLesson(lessonId: string): void {
    this.completedLessonIds.update(ids => ids.includes(lessonId)
      ? ids.filter(id => id !== lessonId)
      : [...ids, lessonId]);
    this.persist();
  }

  answerSort(cardId: string, category: TraitSortCategory): void {
    this.sortAnswers.update(answers => ({ ...answers, [cardId]: category }));
    this.sortChecked.set(false);
    this.persist();
  }

  checkSort(): void {
    this.sortChecked.set(true);
    this.persist();
  }

  selectParent(slot: 'a' | 'b', parentId: string): void {
    const otherId = slot === 'a' ? this.parentBId() : this.parentAId();
    if (parentId === otherId || !DRAGON_PARENTS.some(parent => parent.id === parentId)) return;
    (slot === 'a' ? this.parentAId : this.parentBId).set(parentId);
    this.predictions.set({});
    this.predictionChecked.set(false);
    this.clutch.set([]);
    this.selectedOffspringId.set(null);
    this.claim.set('');
    this.evidence.set('');
    this.reasoning.set('');
    this.recommendationSubmitted.set(false);
    this.persist();
  }

  setPrediction(traitId: DragonTraitId, value: number): void {
    this.predictions.update(predictions => ({ ...predictions, [traitId]: value }));
    this.predictionChecked.set(false);
    this.persist();
  }

  checkPredictions(): boolean {
    if (!DRAGON_TRAITS.every(trait => this.predictions()[trait.id] !== undefined)) return false;
    this.predictionChecked.set(true);
    this.persist();
    return true;
  }

  hatchClutch(): void {
    const run = this.hatchRun() + 1;
    const clutch = breedLabClutch(this.parentA(), this.parentB(), run);
    this.hatchRun.set(run);
    this.clutch.set(clutch);
    this.selectedOffspringId.set(clutch[0]?.id ?? null);
    this.recommendationSubmitted.set(false);
    this.persist();
  }

  selectOffspring(offspringId: string): void {
    if (!this.clutch().some(dragon => dragon.id === offspringId)) return;
    this.selectedOffspringId.set(offspringId);
    this.persist();
  }

  setComparisonTrait(traitId: DragonTraitId): void {
    this.comparisonTraitId.set(traitId);
    this.persist();
  }

  setReproductionAnswer(value: 'sexual' | 'asexual'): void {
    this.reproductionAnswer.set(value);
    this.persist();
  }

  setExplanationField(field: 'claim' | 'evidence' | 'reasoning', value: string): void {
    this[field].set(value);
    this.recommendationSubmitted.set(false);
    this.persist();
  }

  selectRecommendedPair(pairId: string): void {
    if (!this.pairAnalyses.some(pair => pair.pairId === pairId)) return;
    this.recommendedPairId.set(pairId);
    this.recommendationSubmitted.set(false);
    this.persist();
  }

  setRecommendation(value: string): void {
    this.recommendation.set(value);
    this.recommendationSubmitted.set(false);
    this.persist();
  }

  submitRecommendation(): boolean {
    const ready = this.recommendedPairId() !== null
      && this.reproductionAnswer() === 'sexual'
      && hasText(this.claim())
      && hasText(this.evidence())
      && hasText(this.reasoning())
      && this.recommendation().trim().length >= 40;
    if (!ready) return false;
    this.recommendationSubmitted.set(true);
    this.persist();
    return true;
  }

  reset(): void {
    const fresh = defaultSnapshot();
    this.applySnapshot(fresh);
    this.persist();
  }

  snapshot(): DragonLabSnapshot {
    return {
      schemaVersion: 1,
      stage: this.stage(),
      completedLessonIds: this.completedLessonIds(),
      sortAnswers: this.sortAnswers(),
      sortChecked: this.sortChecked(),
      parentAId: this.parentAId(),
      parentBId: this.parentBId(),
      predictions: this.predictions(),
      predictionChecked: this.predictionChecked(),
      hatchRun: this.hatchRun(),
      clutch: this.clutch(),
      selectedOffspringId: this.selectedOffspringId(),
      comparisonTraitId: this.comparisonTraitId(),
      reproductionAnswer: this.reproductionAnswer(),
      claim: this.claim(),
      evidence: this.evidence(),
      reasoning: this.reasoning(),
      recommendedPairId: this.recommendedPairId(),
      recommendation: this.recommendation(),
      recommendationSubmitted: this.recommendationSubmitted(),
    };
  }

  private persist(): void {
    this.changedBeforeLoad = true;
    const snapshot = this.snapshot();
    this.persistenceState.set('saving');
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.repository.save(this.sessionId, snapshot))
      .then(() => this.persistenceState.set('saved'))
      .catch(() => this.persistenceState.set('error'));
  }

  private async restore(): Promise<void> {
    try {
      const saved = await this.repository.load(this.sessionId);
      if (saved && !this.changedBeforeLoad) this.applySnapshot(normalizeSnapshot(saved));
      this.persistenceState.set('saved');
    } catch {
      this.persistenceState.set('error');
    }
  }

  private applySnapshot(snapshot: DragonLabSnapshot): void {
    this.stage.set(snapshot.stage);
    this.completedLessonIds.set(snapshot.completedLessonIds);
    this.sortAnswers.set(snapshot.sortAnswers);
    this.sortChecked.set(snapshot.sortChecked);
    this.parentAId.set(snapshot.parentAId);
    this.parentBId.set(snapshot.parentBId);
    this.predictions.set(snapshot.predictions);
    this.predictionChecked.set(snapshot.predictionChecked);
    this.hatchRun.set(snapshot.hatchRun);
    this.clutch.set(snapshot.clutch);
    this.selectedOffspringId.set(snapshot.selectedOffspringId);
    this.comparisonTraitId.set(snapshot.comparisonTraitId);
    this.reproductionAnswer.set(snapshot.reproductionAnswer);
    this.claim.set(snapshot.claim);
    this.evidence.set(snapshot.evidence);
    this.reasoning.set(snapshot.reasoning);
    this.recommendedPairId.set(snapshot.recommendedPairId);
    this.recommendation.set(snapshot.recommendation);
    this.recommendationSubmitted.set(snapshot.recommendationSubmitted);
  }
}

function defaultSnapshot(): DragonLabSnapshot {
  return {
    schemaVersion: 1,
    stage: 'mission',
    completedLessonIds: [],
    sortAnswers: {},
    sortChecked: false,
    parentAId: 'ember',
    parentBId: 'tide',
    predictions: {},
    predictionChecked: false,
    hatchRun: 0,
    clutch: [],
    selectedOffspringId: null,
    comparisonTraitId: 'wings',
    reproductionAnswer: null,
    claim: '',
    evidence: '',
    reasoning: '',
    recommendedPairId: null,
    recommendation: '',
    recommendationSubmitted: false,
  };
}

function normalizeSnapshot(saved: Partial<DragonLabSnapshot>): DragonLabSnapshot {
  const fallback = defaultSnapshot();
  if (saved.schemaVersion !== 1) return fallback;
  return {
    ...fallback,
    ...saved,
    completedLessonIds: Array.isArray(saved.completedLessonIds) ? saved.completedLessonIds : [],
    sortAnswers: saved.sortAnswers ?? {},
    predictions: saved.predictions ?? {},
    clutch: Array.isArray(saved.clutch) ? saved.clutch : [],
  };
}

function findParent(parentId: string) {
  return DRAGON_PARENTS.find(parent => parent.id === parentId) ?? DRAGON_PARENTS[0];
}

function hasText(value: string): boolean {
  return value.trim().length >= 12;
}
