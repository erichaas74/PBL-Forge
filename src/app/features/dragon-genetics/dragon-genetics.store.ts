import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  allParentPairAnalyses,
  analyzePairDiversity,
} from '../../../../migration-archive/physics-coupled-dragon-genetics/domain/dragon-inheritance';
import { TRAIT_SORT_CARDS } from '../../../../migration-archive/physics-coupled-dragon-genetics/data/dragon-lab-content';
import {
  DragonTraitId,
  TraitSortCategory,
} from '../../../../migration-archive/physics-coupled-dragon-genetics/domain/dragon-lab.models';
import {
  GENOME_PATH,
  GENOME_QUICK_QUESTIONS,
  LICENSE_QUESTIONS,
  PHENOTYPE_QUESTIONS,
  TRAIT_RULE_CHALLENGES,
  WEEK1_MASTERY_QUESTIONS,
  WEEK2_MASTERY_QUESTIONS,
} from './dragon-genetics.content';
import {
  academicMasteryPercent,
  challengeScore,
  createDefaultDragonSnapshot,
  expectedPredictions,
  findParent,
  genotypeDistribution,
  genotypePredictionAccuracy,
  hasAllGenotypePredictions,
  hasAllTraitPredictions,
  masteryFromScore,
  mergeMastery,
  predictionAccuracy,
  runDragonBatch,
} from './dragon-genetics.domain';
import {
  DragonBattleResult,
  DragonGeneticsSnapshot,
  DragonLabMode,
  DragonModuleNumber,
  GeneticsSkill,
  LicenseQuestion,
  MasteryRecord,
} from './dragon-genetics.models';
import { DragonGeneticsRepository } from './dragon-genetics.repository';

const STORAGE_KEY = 'pbl-forge.dragon-genetics.v3';
const MAX_EVENTS = 120;

@Injectable()
export class DragonGeneticsStore {
  private readonly repository = inject(DragonGeneticsRepository);
  private readonly snapshotSignal = signal<DragonGeneticsSnapshot>(loadLocalSnapshot());
  private readonly hydratedSignal = signal(false);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly persistenceState = signal<'loading' | 'saved' | 'saving' | 'error'>('loading');
  readonly teacherPreview = signal(false);
  readonly activeModule = computed(() => this.snapshot().activeModule);
  readonly activeMode = computed(() => this.snapshot().activeMode);
  readonly completedModules = computed(() => this.snapshot().completedModules);
  readonly progressPercent = computed(() => Math.round(this.completedModules().length * 100 / 10));
  readonly parentA = computed(() => findParent(this.snapshot().parentAId));
  readonly parentB = computed(() => findParent(this.snapshot().parentBId));
  readonly expectedPredictions = computed(() => expectedPredictions(this.parentA(), this.parentB()));
  readonly expectedGenotypePredictions = computed(() => Object.fromEntries(DRAGON_TRAITS.map(trait => [
    trait.id,
    genotypeDistribution(this.parentA(), this.parentB(), trait.id),
  ])) as Record<DragonTraitId, string>);
  readonly pairAnalyses = computed(() => allParentPairAnalyses());
  readonly licenseQuestions = computed(() => this.snapshot().licenseQuestionOrder
    .map(id => LICENSE_QUESTIONS.find(question => question.id === id))
    .filter((question): question is (typeof LICENSE_QUESTIONS)[number] => !!question));
  readonly champion = computed(() => this.snapshot().officialPool
    .find(dragon => dragon.id === this.snapshot().championId) ?? null);
  readonly academicMasteryPercent = computed(() => academicMasteryPercent(this.snapshot()));
  readonly challengeScore = computed(() => challengeScore(this.snapshot()));
  readonly officialAttemptsRemaining = computed(() => Math.max(0, 3 - this.snapshot().officialAttempts.length));
  readonly readiness = computed(() => ({
    license: this.snapshot().licensePassed,
    breeding: this.snapshot().officialAttempts.length > 0,
    champion: !!this.snapshot().championId,
  }));
  readonly repeatedMisconceptions = computed(() => {
    const flags = Object.values(this.snapshot().mastery)
      .flatMap(record => record?.misconceptionFlags ?? []);
    return [...new Set(flags.filter(flag => flags.filter(item => item === flag).length > 1))];
  });

  constructor() {
    effect(() => {
      const snapshot = this.snapshotSignal();
      if (!this.hydratedSignal()) return;
      saveLocalSnapshot(snapshot);
      this.scheduleCloudSave(snapshot);
    });
    void this.hydrate();
  }

  isModuleUnlocked(module: DragonModuleNumber): boolean {
    return this.teacherPreview() || module === 1 || this.completedModules().includes((module - 1) as DragonModuleNumber);
  }

  goToModule(module: DragonModuleNumber): void {
    if (!this.isModuleUnlocked(module)) return;
    this.update(snapshot => ({ ...snapshot, activeModule: module }));
  }

  setMode(mode: DragonLabMode): void {
    if (mode === 'official' && (this.activeModule() !== 10 || !this.snapshot().licensePassed)) return;
    this.update(snapshot => ({ ...snapshot, activeMode: mode }));
  }

  setDiagnosticAnswer(promptId: string, value: string): void {
    this.update(snapshot => ({
      ...snapshot,
      diagnosticAnswers: { ...snapshot.diagnosticAnswers, [promptId]: value },
    }));
  }

  setCorrectedMisconception(value: string): void {
    this.update(snapshot => ({ ...snapshot, correctedMisconception: value }));
  }

  setTeamRole(roleId: string): void {
    this.update(snapshot => ({ ...snapshot, teamRole: roleId }));
  }

  setTraitSortAnswer(cardId: string, answer: TraitSortCategory): void {
    this.update(snapshot => ({
      ...snapshot,
      sortAnswers: { ...snapshot.sortAnswers, [cardId]: answer },
    }));
  }

  checkTraitSort(): { correct: number; total: number; complete: boolean } {
    const correct = TRAIT_SORT_CARDS.filter(card => this.snapshot().sortAnswers[card.id] === card.category).length;
    const total = TRAIT_SORT_CARDS.length;
    const flags = TRAIT_SORT_CARDS
      .filter(card => this.snapshot().sortAnswers[card.id] && this.snapshot().sortAnswers[card.id] !== card.category)
      .map(card => card.category === 'inherited' ? 'inherited-marked-acquired' : 'acquired-marked-inherited');
    this.recordMastery('GEN-1', correct, total, flags);
    const diagnosticReady = Object.values(this.snapshot().diagnosticAnswers)
      .filter(answer => answer.trim().length >= 10).length >= 3;
    const correctionReady = this.snapshot().correctedMisconception.trim().length >= 30;
    const roleReady = this.snapshot().teamRole.trim().length > 0;
    const complete = correct === total && diagnosticReady && correctionReady && roleReady;
    if (complete) this.completeModule(1, 'Trait classifications verified');
    return { correct, total, complete };
  }

  chooseGenomePathTerm(term: string): void {
    if (this.snapshot().genomePath.includes(term)) return;
    this.update(snapshot => ({ ...snapshot, genomePath: [...snapshot.genomePath, term] }));
  }

  resetGenomePath(): void {
    this.update(snapshot => ({ ...snapshot, genomePath: [] }));
  }

  setGenomeQuickAnswer(questionId: string, optionId: string): void {
    this.update(snapshot => ({
      ...snapshot,
      genomeQuickAnswers: { ...snapshot.genomeQuickAnswers, [questionId]: optionId },
    }));
  }

  checkGenomePath(): boolean {
    const pathCorrect = GENOME_PATH.every((term, index) => this.snapshot().genomePath[index] === term);
    const quickCorrect = GENOME_QUICK_QUESTIONS.filter(question =>
      this.snapshot().genomeQuickAnswers[question.id] === question.correctOptionId).length;
    const correct = pathCorrect && quickCorrect === GENOME_QUICK_QUESTIONS.length;
    const score = countMatchingPositions(this.snapshot().genomePath, GENOME_PATH) + quickCorrect;
    this.recordMastery('GEN-2', score, GENOME_PATH.length + GENOME_QUICK_QUESTIONS.length,
      correct ? [] : ['hierarchy-confusion']);
    if (correct) this.completeModule(2, 'Biological information pathway decoded');
    return correct;
  }

  setPhenotypeAnswer(questionId: string, optionId: string): void {
    this.update(snapshot => ({
      ...snapshot,
      phenotypeAnswers: { ...snapshot.phenotypeAnswers, [questionId]: optionId },
    }));
  }

  checkPhenotypeAnswers(): { correct: number; total: number; complete: boolean } {
    const correct = PHENOTYPE_QUESTIONS.filter(question =>
      this.snapshot().phenotypeAnswers[question.id] === question.correctOptionId).length;
    const total = PHENOTYPE_QUESTIONS.length;
    this.recordMastery('GEN-3', correct, total, correct === total ? [] : ['genotype-phenotype-swap']);
    const complete = correct === total;
    if (complete) this.completeModule(3, 'Genotype and phenotype evidence verified');
    return { correct, total, complete };
  }

  setRuleAnswer(challengeId: string, answer: string): void {
    this.update(snapshot => ({
      ...snapshot,
      ruleAnswers: { ...snapshot.ruleAnswers, [challengeId]: answer },
    }));
  }

  checkRuleAnswers(): { correct: number; total: number; complete: boolean } {
    const correct = TRAIT_RULE_CHALLENGES.filter(challenge =>
      this.snapshot().ruleAnswers[challenge.id] === challenge.correctAnswer).length;
    const total = TRAIT_RULE_CHALLENGES.length;
    this.recordMastery('GEN-4', correct, total, correct === total ? [] : ['dominance-rule-error']);
    const complete = correct === total;
    if (complete) this.completeModule(4, 'Dominant/recessive rules applied');
    return { correct, total, complete };
  }

  selectParent(slot: 'a' | 'b', parentId: string): void {
    const otherId = slot === 'a' ? this.snapshot().parentBId : this.snapshot().parentAId;
    if (parentId === otherId || !DRAGON_PARENTS.some(parent => parent.id === parentId)) return;
    this.update(snapshot => ({
      ...snapshot,
      ...(slot === 'a' ? { parentAId: parentId } : { parentBId: parentId }),
      predictions: {},
      genotypePredictions: {},
      predictionsChecked: false,
      predictionAccuracy: 0,
      smallBatch: null,
      largeBatch: null,
      officialPredictions: {},
      officialGenotypePredictions: {},
    }));
  }

  setPrediction(traitId: DragonTraitId, value: number): void {
    this.update(snapshot => ({
      ...snapshot,
      predictions: { ...snapshot.predictions, [traitId]: value },
      predictionsChecked: false,
    }));
  }

  setGenotypePrediction(traitId: DragonTraitId, value: string): void {
    this.update(snapshot => ({
      ...snapshot,
      genotypePredictions: { ...snapshot.genotypePredictions, [traitId]: value },
      predictionsChecked: false,
    }));
  }

  checkBreedingPredictions(): { ready: boolean; accuracy: number; complete: boolean } {
    if (!hasAllTraitPredictions(this.snapshot().predictions) ||
      !hasAllGenotypePredictions(this.snapshot().genotypePredictions)) {
      return { ready: false, accuracy: 0, complete: false };
    }
    const phenotypeAccuracy = predictionAccuracy(this.snapshot().predictions, this.parentA(), this.parentB());
    const genotypeAccuracy = genotypePredictionAccuracy(
      this.snapshot().genotypePredictions,
      this.parentA(),
      this.parentB(),
    );
    const accuracy = Math.round((phenotypeAccuracy + genotypeAccuracy) / 2);
    this.update(snapshot => ({ ...snapshot, predictionsChecked: true, predictionAccuracy: accuracy }));
    this.recordMastery('GEN-5', accuracy / 12.5, 8, accuracy === 100 ? [] : ['punnett-probability']);
    const complete = accuracy >= 75;
    return { ready: true, accuracy, complete };
  }

  setWeek1Answer(questionId: string, optionId: string): void {
    this.update(snapshot => ({
      ...snapshot,
      week1Answers: { ...snapshot.week1Answers, [questionId]: optionId },
    }));
  }

  submitWeek1Mastery(): { ready: boolean; correct: number; passed: boolean; reteachSkills: GeneticsSkill[] } {
    if (WEEK1_MASTERY_QUESTIONS.some(question => !this.snapshot().week1Answers[question.id])) {
      return { ready: false, correct: 0, passed: false, reteachSkills: [] };
    }
    const result = this.gradeAssessment(WEEK1_MASTERY_QUESTIONS, this.snapshot().week1Answers);
    const passed = result.correct >= 8 && result.reteachSkills.length === 0 &&
      this.snapshot().predictionAccuracy >= 75;
    this.update(snapshot => ({ ...snapshot, week1Score: result.correct, week1Passed: passed }));
    if (passed) this.completeModule(5, `Week 1 mastery ${result.correct}/10`);
    this.addEvent(5, 'week-1-mastery', `${result.correct}/10; ${passed ? 'mastery met' : 'reteach assigned'}`);
    return { ready: true, correct: result.correct, passed, reteachSkills: result.reteachSkills };
  }

  resetWeek1Mastery(): void {
    if (this.snapshot().week1Passed) return;
    this.update(snapshot => ({ ...snapshot, week1Answers: {}, week1Score: null }));
  }

  runBatch(size: 8 | 100): boolean {
    if (!this.snapshot().predictionsChecked || this.snapshot().predictionAccuracy < 75) return false;
    const run = size === 8 ? 20 : 21;
    const result = runDragonBatch(this.parentA(), this.parentB(), run, size);
    this.update(snapshot => ({
      ...snapshot,
      ...(size === 8 ? { smallBatch: result } : { largeBatch: result }),
    }));
    const next = this.snapshot();
    if (next.smallBatch && next.largeBatch) {
      this.recordMastery('GEN-7', 3, 4, []);
      this.completeModule(6, 'Small and large samples compared');
    }
    this.addEvent(6, 'batch', `${size} offspring simulated after predictions were locked`);
    return true;
  }

  setReproductionAnswer(answer: 'sexual' | 'asexual'): void {
    this.update(snapshot => ({ ...snapshot, reproductionAnswer: answer }));
  }

  checkReproduction(): boolean {
    const correct = this.snapshot().reproductionAnswer === 'sexual';
    this.recordMastery('GEN-6', correct ? 1 : 0, 1, correct ? [] : ['reproduction-confusion']);
    if (correct) this.completeModule(7, 'Sexual and asexual models distinguished');
    return correct;
  }

  toggleSibling(dragonId: string): void {
    const current = this.snapshot().siblingIds;
    const siblingIds = current.includes(dragonId)
      ? current.filter(id => id !== dragonId)
      : [...current.slice(-1), dragonId];
    this.update(snapshot => ({ ...snapshot, siblingIds }));
  }

  setSiblingExplanation(value: string): void {
    this.update(snapshot => ({ ...snapshot, siblingExplanation: value }));
  }

  submitSiblingEvidence(): boolean {
    const complete = this.snapshot().siblingIds.length === 2 && this.snapshot().siblingExplanation.trim().length >= 40;
    if (complete) {
      this.recordMastery('GEN-7', 3, 4, []);
      this.completeModule(8, 'Sibling allele-path evidence submitted');
    }
    return complete;
  }

  selectRecommendedPair(pairId: string): void {
    if (!this.pairAnalyses().some(pair => pair.pairId === pairId)) return;
    this.update(snapshot => ({ ...snapshot, recommendedPairId: pairId }));
  }

  setDiversityRecommendation(value: string): void {
    this.update(snapshot => ({ ...snapshot, diversityRecommendation: value }));
  }

  setDiversityStrategy(strategy: 'narrow' | 'balanced'): void {
    this.update(snapshot => ({ ...snapshot, diversityStrategy: strategy }));
  }

  setPeerReview(value: string): void {
    this.update(snapshot => ({ ...snapshot, peerReview: value }));
  }

  submitDiversityRecommendation(): { complete: boolean; score: number } {
    const pair = this.pairAnalyses().find(item => item.pairId === this.snapshot().recommendedPairId);
    const evidenceReady = this.snapshot().diversityRecommendation.trim().length >= 50;
    const complete = !!pair && pair.score >= 70 && evidenceReady &&
      this.snapshot().diversityStrategy === 'balanced';
    this.recordMastery('GEN-8', pair ? Math.round(pair.score / 25) : 0, 4,
      complete ? [] : ['diversity-strategy-narrow']);
    return { complete, score: pair?.score ?? 0 };
  }

  setWeek2Answer(questionId: string, optionId: string): void {
    this.update(snapshot => ({
      ...snapshot,
      week2Answers: { ...snapshot.week2Answers, [questionId]: optionId },
    }));
  }

  submitWeek2Mastery(): { ready: boolean; correct: number; passed: boolean; reteachSkills: GeneticsSkill[] } {
    if (WEEK2_MASTERY_QUESTIONS.some(question => !this.snapshot().week2Answers[question.id])) {
      return { ready: false, correct: 0, passed: false, reteachSkills: [] };
    }
    const result = this.gradeAssessment(WEEK2_MASTERY_QUESTIONS, this.snapshot().week2Answers);
    const diversityReady = this.snapshot().diversityStrategy === 'balanced' &&
      !!this.snapshot().recommendedPairId && this.snapshot().diversityRecommendation.trim().length >= 50;
    const peerReviewReady = this.snapshot().peerReview.trim().length >= 40;
    const passed = result.correct >= 9 && result.reteachSkills.length === 0 &&
      diversityReady && peerReviewReady;
    this.update(snapshot => ({ ...snapshot, week2Score: result.correct, week2Passed: passed }));
    if (passed) this.completeModule(9, `Week 2 mastery ${result.correct}/12`);
    this.addEvent(9, 'week-2-mastery', `${result.correct}/12; ${passed ? 'mastery met' : 'reteach assigned'}`);
    return { ready: true, correct: result.correct, passed, reteachSkills: result.reteachSkills };
  }

  resetWeek2Mastery(): void {
    if (this.snapshot().week2Passed) return;
    this.update(snapshot => ({ ...snapshot, week2Answers: {}, week2Score: null }));
  }

  setLicenseAnswer(questionId: string, optionId: string): void {
    if (this.snapshot().licenseScore !== null && this.snapshot().licensePassed) return;
    this.update(snapshot => ({
      ...snapshot,
      licenseAnswers: { ...snapshot.licenseAnswers, [questionId]: optionId },
    }));
  }

  submitLicense(): { ready: boolean; correct: number; passed: boolean; reteachSkills: GeneticsSkill[] } {
    const questions = this.licenseQuestions();
    if (questions.some(question => !this.snapshot().licenseAnswers[question.id])) {
      return { ready: false, correct: 0, passed: false, reteachSkills: [] };
    }
    const correct = questions.filter(question =>
      this.snapshot().licenseAnswers[question.id] === question.correctOptionId).length;
    const skills = [...new Set(questions.map(question => question.skill))];
    const reteachSkills: GeneticsSkill[] = [];
    for (const skill of skills) {
      const skillQuestions = questions.filter(question => question.skill === skill);
      const skillCorrect = skillQuestions.filter(question =>
        this.snapshot().licenseAnswers[question.id] === question.correctOptionId).length;
      const flags = skillQuestions
        .filter(question => this.snapshot().licenseAnswers[question.id] !== question.correctOptionId)
        .map(question => question.misconceptionFlag)
        .filter((flag): flag is string => !!flag);
      this.recordMastery(skill, skillCorrect, skillQuestions.length, flags);
      const priorOrCurrentMastery = this.snapshot().mastery[skill]?.level ?? 1;
      if (skillCorrect === 0 && priorOrCurrentMastery < 3) reteachSkills.push(skill);
    }
    const passed = correct >= 9 && reteachSkills.length === 0;
    this.update(snapshot => ({
      ...snapshot,
      licenseScore: correct,
      licensePassed: passed,
      activeMode: passed ? 'official' : 'practice',
    }));
    this.addEvent(10, 'license', `${correct}/12; ${passed ? 'license earned' : 'targeted reteach assigned'}`);
    return { ready: true, correct, passed, reteachSkills };
  }

  resetLicenseForRetake(): void {
    if (this.snapshot().licensePassed) return;
    this.update(snapshot => ({
      ...snapshot,
      licenseAnswers: {},
      licenseScore: null,
      licenseQuestionOrder: [...snapshot.licenseQuestionOrder].reverse(),
    }));
  }

  setOfficialPrediction(traitId: DragonTraitId, value: number): void {
    if (!this.snapshot().licensePassed || this.officialAttemptsRemaining() === 0) return;
    this.update(snapshot => ({
      ...snapshot,
      officialPredictions: { ...snapshot.officialPredictions, [traitId]: value },
    }));
  }

  setOfficialGenotypePrediction(traitId: DragonTraitId, value: string): void {
    if (!this.snapshot().licensePassed || this.officialAttemptsRemaining() === 0) return;
    this.update(snapshot => ({
      ...snapshot,
      officialGenotypePredictions: {
        ...snapshot.officialGenotypePredictions,
        [traitId]: value,
      },
    }));
  }

  runOfficialBreeding(): { ready: boolean; accuracy: number; offspringCount: number } {
    const snapshot = this.snapshot();
    if (!snapshot.licensePassed || this.officialAttemptsRemaining() === 0 ||
      !hasAllTraitPredictions(snapshot.officialPredictions) ||
      !hasAllGenotypePredictions(snapshot.officialGenotypePredictions)) {
      return { ready: false, accuracy: 0, offspringCount: 0 };
    }
    const parentA = this.parentA();
    const parentB = this.parentB();
    const attemptNumber = snapshot.officialAttempts.length + 1;
    const batch = runDragonBatch(parentA, parentB, 100 + attemptNumber, 8);
    const predictions = { ...snapshot.officialPredictions } as Record<DragonTraitId, number>;
    const genotypePredictions = {
      ...snapshot.officialGenotypePredictions,
    } as Record<DragonTraitId, string>;
    const phenotypeAccuracy = predictionAccuracy(predictions, parentA, parentB);
    const genotypeAccuracy = genotypePredictionAccuracy(genotypePredictions, parentA, parentB);
    const accuracy = Math.round((phenotypeAccuracy + genotypeAccuracy) / 2);
    const diversityScore = analyzePairDiversity(parentA, parentB).score;
    const offspring = batch.sample.map((dragon, index) => ({
      ...dragon,
      id: `official-${attemptNumber}-${index + 1}`,
      name: `Official hatchling ${snapshot.officialPool.length + index + 1}`,
      title: `Official generation ${attemptNumber}`,
    }));
    this.update(current => ({
      ...current,
      officialAttempts: [...current.officialAttempts, {
        id: `official-attempt-${attemptNumber}`,
        parentIds: [parentA.id, parentB.id],
        predictions,
        genotypePredictions,
        predictionAccuracy: accuracy,
        diversityScore,
        offspring,
        createdAtIso: new Date().toISOString(),
      }],
      officialPool: [...current.officialPool, ...offspring],
      officialPredictions: {},
      officialGenotypePredictions: {},
    }));
    this.recordMastery('GEN-5', accuracy / 12.5, 8, accuracy === 100 ? [] : ['official-prediction-error']);
    this.addEvent(10, 'official-breed', `Attempt ${attemptNumber}: ${accuracy}% prediction accuracy, ${diversityScore} diversity`);
    return { ready: true, accuracy, offspringCount: offspring.length };
  }

  selectChampion(dragonId: string): void {
    if (!this.snapshot().officialPool.some(dragon => dragon.id === dragonId)) return;
    this.update(snapshot => ({ ...snapshot, championId: dragonId, battleResult: null }));
    this.addEvent(10, 'champion', `${dragonId} selected for the arena`);
  }

  setFinalEvidence(value: string): void {
    this.update(snapshot => ({ ...snapshot, finalEvidence: value }));
  }

  setDefenseAnswer(index: number, value: string): void {
    if (index < 0 || index > 2) return;
    this.update(snapshot => ({
      ...snapshot,
      defenseAnswers: snapshot.defenseAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer),
    }));
  }

  setReflectionAnswer(index: number, value: string): void {
    if (index < 0 || index > 4) return;
    this.update(snapshot => ({
      ...snapshot,
      reflectionAnswers: snapshot.reflectionAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer),
    }));
  }

  recordBattle(result: DragonBattleResult): void {
    this.update(snapshot => ({ ...snapshot, battleResult: result }));
    this.addEvent(10, 'battle', `${result.won ? 'win' : 'loss'} against ${result.winnerName} in ${result.elapsedSeconds.toFixed(1)} seconds`);
  }

  submitFinalChallenge(): boolean {
    const snapshot = this.snapshot();
    const complete = snapshot.licensePassed && snapshot.officialAttempts.length > 0 &&
      !!snapshot.championId && !!snapshot.battleResult && snapshot.finalEvidence.trim().length >= 80 &&
      snapshot.defenseAnswers.every(answer => answer.trim().length >= 25) &&
      snapshot.reflectionAnswers.every(answer => answer.trim().length >= 25);
    if (!complete) return false;
    this.update(current => ({ ...current, finalSubmitted: true }));
    this.completeModule(10, `Final challenge score ${this.challengeScore().total}/100`);
    return true;
  }

  masteryFor(skill: GeneticsSkill): MasteryRecord | undefined {
    return this.snapshot().mastery[skill];
  }

  resetLab(): void {
    this.snapshotSignal.set(createDefaultDragonSnapshot());
    this.teacherPreview.set(false);
  }

  private completeModule(module: DragonModuleNumber, detail: string): void {
    this.update(snapshot => ({
      ...snapshot,
      completedModules: snapshot.completedModules.includes(module)
        ? snapshot.completedModules
        : [...snapshot.completedModules, module].sort((a, b) => a - b),
    }));
    this.addEvent(module, 'module-complete', detail);
  }

  private recordMastery(
    skill: GeneticsSkill,
    correct: number,
    total: number,
    flags: string[],
  ): void {
    const current = this.snapshot().mastery[skill];
    const next = masteryFromScore(correct, total, 1, flags);
    this.update(snapshot => ({
      ...snapshot,
      mastery: { ...snapshot.mastery, [skill]: mergeMastery(current, next) },
    }));
  }

  private gradeAssessment(
    questions: readonly LicenseQuestion[],
    answers: Record<string, string>,
  ): { correct: number; reteachSkills: GeneticsSkill[] } {
    const correct = questions.filter(question => answers[question.id] === question.correctOptionId).length;
    const skills = [...new Set(questions.map(question => question.skill))];
    const reteachSkills: GeneticsSkill[] = [];

    for (const skill of skills) {
      const skillQuestions = questions.filter(question => question.skill === skill);
      const skillCorrect = skillQuestions.filter(question =>
        answers[question.id] === question.correctOptionId).length;
      const flags = skillQuestions
        .filter(question => answers[question.id] !== question.correctOptionId)
        .map(question => question.misconceptionFlag)
        .filter((flag): flag is string => !!flag);
      this.recordMastery(skill, skillCorrect, skillQuestions.length, flags);
      if (skillCorrect / skillQuestions.length < 0.75 &&
        (this.snapshot().mastery[skill]?.level ?? 1) < 3) {
        reteachSkills.push(skill);
      }
    }

    return { correct, reteachSkills };
  }

  private addEvent(module: DragonModuleNumber, type: string, detail: string): void {
    this.update(snapshot => ({
      ...snapshot,
      events: [{
        type,
        module,
        mode: snapshot.activeMode,
        detail,
        createdAtIso: new Date().toISOString(),
      }, ...snapshot.events].slice(0, MAX_EVENTS),
    }));
  }

  private update(mutator: (snapshot: DragonGeneticsSnapshot) => DragonGeneticsSnapshot): void {
    this.snapshotSignal.update(snapshot => ({
      ...mutator(snapshot),
      updatedAtIso: new Date().toISOString(),
    }));
  }

  private async hydrate(): Promise<void> {
    try {
      const remote = await this.repository.load();
      if (remote?.schemaVersion === 3 && remote.updatedAtIso > this.snapshot().updatedAtIso) {
        this.snapshotSignal.set(remote);
      }
      this.persistenceState.set('saved');
    } catch (error) {
      console.error('Dragon Genetics progress could not be loaded from Firestore.', error);
      this.persistenceState.set('error');
    } finally {
      this.hydratedSignal.set(true);
      saveLocalSnapshot(this.snapshot());
    }
  }

  private scheduleCloudSave(snapshot: DragonGeneticsSnapshot): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.persistenceState.set('saving');
    this.saveTimer = setTimeout(() => {
      void this.repository.save(snapshot)
        .then(() => this.persistenceState.set('saved'))
        .catch((error: unknown) => {
          console.error('Dragon Genetics progress could not be saved to Firestore.', error);
          this.persistenceState.set('error');
        });
    }, 650);
  }
}

function loadLocalSnapshot(): DragonGeneticsSnapshot {
  if (typeof localStorage === 'undefined') return createDefaultDragonSnapshot();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as DragonGeneticsSnapshot | null;
    return parsed?.schemaVersion === 3 ? parsed : createDefaultDragonSnapshot();
  } catch {
    return createDefaultDragonSnapshot();
  }
}

function saveLocalSnapshot(snapshot: DragonGeneticsSnapshot): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}

function countMatchingPositions(actual: readonly string[], expected: readonly string[]): number {
  return expected.filter((term, index) => actual[index] === term).length;
}
