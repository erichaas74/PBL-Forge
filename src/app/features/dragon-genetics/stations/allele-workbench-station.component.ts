import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DragonPortraitComponent } from '../dragon-portrait.component';
import {
  alleleWorkbenchTask,
  alleleWorkbenchTasks,
} from '../simulation/data/allele-workbench-content';
import {
  AlleleGenotypeClass,
  AllelePhenotypePrediction,
  AlleleWorkbenchMode,
  AlleleWorkbenchNotebookRecord,
  AlleleWorkbenchRecord,
  AlleleWorkbenchSetResult,
  AlleleWorkbenchTask,
} from '../simulation/domain/allele-workbench.models';
import {
  DRAGON_PARENTS,
  getTrait,
  showsDominantPhenotype,
} from '../simulation/domain/dragon-inheritance';
import { DragonParentProfile, DragonTraitGenotype } from '../simulation/domain/dragon-lab.models';

type InvestigationStep = 'reference' | 'samples' | 'analyze' | 'reveal' | 'notebook' | 'review';
type ExpressionAnswer = 'dominant' | 'recessive';
type ReferencePatternId = 'allele-pattern-a' | 'allele-pattern-b';
type ComparisonAnswer = 'same' | 'different';
type GenotypeTypeAnswer = 'homozygous' | 'heterozygous';
type CombinationAnswer = 'two-dominant' | 'mixed' | 'two-recessive';
type AttemptedSection = 'reference' | 'samples' | 'analyze' | null;

interface ReferenceAnswers {
  aExpression: ExpressionAnswer | null;
  bExpression: ExpressionAnswer | null;
}

interface AnalysisAnswers {
  comparison: ComparisonAnswer | null;
  genotypeType: GenotypeTypeAnswer | null;
  combination: CombinationAnswer | null;
  phenotype: AllelePhenotypePrediction | null;
}

interface WorkbenchFeedback {
  tone: 'neutral' | 'good' | 'warn';
  headline: string;
  detail: string;
}

const EMPTY_REFERENCE: ReferenceAnswers = {
  aExpression: null,
  bExpression: null,
};

const EMPTY_ANALYSIS: AnalysisAnswers = {
  comparison: null,
  genotypeType: null,
  combination: null,
  phenotype: null,
};

const STEP_LABELS: readonly { id: InvestigationStep; label: string }[] = [
  { id: 'reference', label: 'Discover' },
  { id: 'samples', label: 'Identify' },
  { id: 'analyze', label: 'Compare' },
  { id: 'reveal', label: 'Check' },
  { id: 'notebook', label: 'Record' },
];

@Component({
  selector: 'app-allele-workbench-station',
  imports: [DatePipe, DragonPortraitComponent],
  templateUrl: './allele-workbench-station.component.html',
  styleUrl: './allele-workbench-station.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlleleWorkbenchStationComponent {
  readonly mode = input<AlleleWorkbenchMode>('learn');
  readonly seed = input('module-4');
  readonly evidenceSaved = output<AlleleWorkbenchRecord>();
  readonly setCompleted = output<AlleleWorkbenchSetResult>();

  private readonly activeIndexState = signal(0);
  private readonly stepState = signal<InvestigationStep>('reference');
  private readonly referenceAnswersState = signal<ReferenceAnswers>({ ...EMPTY_REFERENCE });
  private readonly referenceDropsState = signal<readonly [ReferencePatternId | null, ReferencePatternId | null]>([null, null]);
  private readonly selectedReferencePatternState = signal<ReferencePatternId | null>(null);
  private readonly expressionTestPairState = signal<readonly [ReferencePatternId | null, ReferencePatternId | null]>([null, null]);
  private readonly expressionTestResultState = signal<ReferencePatternId | null>(null);
  private readonly mixedPairTestedState = signal(false);
  private readonly sampleAnswersState = signal<readonly [string | null, string | null]>([null, null]);
  private readonly analysisAnswersState = signal<AnalysisAnswers>({ ...EMPTY_ANALYSIS });
  private readonly attemptedState = signal<AttemptedSection>(null);
  private readonly feedbackState = signal<WorkbenchFeedback | null>(null);
  private readonly recordsState = signal<readonly AlleleWorkbenchNotebookRecord[]>([]);
  private readonly teamNameState = signal('');
  private readonly openedAtMsState = signal(now());
  private readonly actionLogState = signal<readonly string[]>([]);

  readonly stepLabels = STEP_LABELS;
  readonly tasks = computed(() => alleleWorkbenchTasks(this.mode(), this.seed()));
  readonly activeIndex = this.activeIndexState.asReadonly();
  readonly step = this.stepState.asReadonly();
  readonly referenceAnswers = this.referenceAnswersState.asReadonly();
  readonly referenceDrops = this.referenceDropsState.asReadonly();
  readonly selectedReferencePattern = this.selectedReferencePatternState.asReadonly();
  readonly expressionTestPair = this.expressionTestPairState.asReadonly();
  readonly expressionTestResult = this.expressionTestResultState.asReadonly();
  readonly mixedPairTested = this.mixedPairTestedState.asReadonly();
  readonly sampleAnswers = this.sampleAnswersState.asReadonly();
  readonly analysisAnswers = this.analysisAnswersState.asReadonly();
  readonly attempted = this.attemptedState.asReadonly();
  readonly feedback = this.feedbackState.asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly teamName = this.teamNameState.asReadonly();

  readonly activeTask = computed(() => this.tasks()[this.activeIndex()] ?? this.tasks()[0]);
  readonly trait = computed(() => getTrait(this.activeTask().traitId));
  readonly selectedSample = computed(() =>
    DRAGON_PARENTS.find(profile => profile.id === this.activeTask().sampleProfileId) ?? DRAGON_PARENTS[0]);
  readonly dominantReferenceDragon = computed(() =>
    this.referenceDragon('Phenotype A', [this.trait().dominantAllele, this.trait().dominantAllele]));
  readonly recessiveReferenceDragon = computed(() =>
    this.referenceDragon('Phenotype B', [this.trait().recessiveAllele, this.trait().recessiveAllele]));
  readonly observedDragon = computed(() =>
    this.referenceDragon('Observed dragon', this.activeTask().requestedAlleles));
  readonly expressionTestDragon = computed<DragonParentProfile | null>(() => {
    const result = this.expressionTestResult();
    if (!result) return null;
    return result === 'allele-pattern-a'
      ? this.dominantReferenceDragon()
      : this.recessiveReferenceDragon();
  });
  readonly expressionTestPhenotype = computed(() => {
    const result = this.expressionTestResult();
    if (!result) return null;
    return result === 'allele-pattern-a'
      ? this.trait().dominantPhenotype
      : this.trait().recessivePhenotype;
  });
  readonly actualPrediction = computed<AllelePhenotypePrediction>(() =>
    showsDominantPhenotype(
      this.activeTask().requestedAlleles as DragonTraitGenotype,
      this.activeTask().traitId,
    ) ? 'dominant' : 'recessive');
  readonly genotypeClass = computed<AlleleGenotypeClass>(() =>
    classifyPair(this.activeTask().requestedAlleles, this.trait().dominantAllele));
  readonly recessiveAllelePresent = computed(() =>
    this.activeTask().requestedAlleles.includes(this.trait().recessiveAllele));
  readonly sampleComparison = computed<ComparisonAnswer>(() =>
    this.activeTask().requestedAlleles[0] === this.activeTask().requestedAlleles[1] ? 'same' : 'different');
  readonly genotypeType = computed<GenotypeTypeAnswer>(() =>
    this.genotypeClass() === 'heterozygous' ? 'heterozygous' : 'homozygous');
  readonly alleleCombination = computed<CombinationAnswer>(() => {
    const dominantCount = this.activeTask().requestedAlleles
      .filter(allele => allele === this.trait().dominantAllele).length;
    return dominantCount === 2 ? 'two-dominant' : dominantCount === 1 ? 'mixed' : 'two-recessive';
  });
  readonly referenceReady = computed(() =>
    this.referenceDrops().every(Boolean)
    && this.mixedPairTested()
    && Object.values(this.referenceAnswers()).every(Boolean));
  readonly expressionTestReady = computed(() => this.expressionTestPair().every(Boolean));
  readonly samplesReady = computed(() => this.sampleAnswers().every(Boolean));
  readonly analysisReady = computed(() => Object.values(this.analysisAnswers()).every(Boolean));
  readonly notebookReady = computed(() => this.teamName().trim().length > 0);
  readonly taskNumber = computed(() => Math.min(this.activeIndex() + 1, this.tasks().length));
  readonly isLastTask = computed(() => this.activeIndex() >= this.tasks().length - 1);
  readonly activePhenotypeLabel = computed(() =>
    this.actualPrediction() === 'dominant'
      ? this.trait().dominantPhenotype
      : this.trait().recessivePhenotype);
  readonly modeLabel = computed(() => ({
    learn: 'Guided investigation',
    practice: 'Independent investigation',
    official: 'Team confirmation',
    reteach: 'Guided review',
  })[this.mode()]);

  selectReferenceExpression(model: 'a' | 'b', value: ExpressionAnswer): void {
    if (this.step() !== 'reference' || !this.mixedPairTested()) return;
    const key = `${model}Expression` as keyof ReferenceAnswers;
    this.referenceAnswersState.update(answers => ({ ...answers, [key]: value }));
    this.attemptedState.set(null);
  }

  selectReferencePattern(pattern: ReferencePatternId): void {
    if (this.step() !== 'reference') return;
    this.selectedReferencePatternState.set(pattern);
  }

  startReferenceDrag(event: DragEvent, pattern: ReferencePatternId): void {
    if (this.step() !== 'reference' || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', pattern);
    this.selectedReferencePatternState.set(pattern);
  }

  allowReferenceDrop(event: DragEvent): void {
    if (this.step() !== 'reference') return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dropReference(event: DragEvent, panelIndex: 0 | 1): void {
    event.preventDefault();
    const pattern = event.dataTransfer?.getData('text/plain');
    if (isReferencePattern(pattern)) this.placeReferencePattern(panelIndex, pattern);
  }

  dropExpressionTestAllele(event: DragEvent, slotIndex: 0 | 1): void {
    event.preventDefault();
    const pattern = event.dataTransfer?.getData('text/plain');
    if (isReferencePattern(pattern)) this.placeExpressionTestAllele(slotIndex, pattern);
  }

  placeSelectedExpressionTestAllele(slotIndex: 0 | 1): void {
    const selected = this.selectedReferencePattern();
    if (selected) this.placeExpressionTestAllele(slotIndex, selected);
  }

  runExpressionTest(): void {
    if (this.step() !== 'reference' || !this.expressionTestReady()) return;
    const pair = this.expressionTestPair() as readonly [ReferencePatternId, ReferencePatternId];
    const result: ReferencePatternId = pair.includes('allele-pattern-a')
      ? 'allele-pattern-a'
      : 'allele-pattern-b';
    const mixed = pair[0] !== pair[1];
    this.expressionTestResultState.set(result);
    this.log(`reference-expression-tested:${pair.join('+')}`);
    if (mixed) {
      this.mixedPairTestedState.set(true);
      this.accept(
        `The mixed pair expresses ${result === 'allele-pattern-a' ? 'Phenotype A' : 'Phenotype B'}.`,
        'This mixed-pair evidence now lets you determine which allele is dominant and which is recessive.',
      );
      return;
    }
    this.feedbackState.set({
      tone: 'neutral',
      headline: `The matching pair expresses ${result === 'allele-pattern-a' ? 'Phenotype A' : 'Phenotype B'}.`,
      detail: 'Now test one of each allele option. A mixed pair is the evidence needed to determine dominance.',
    });
  }

  placeSelectedReferencePattern(panelIndex: 0 | 1): void {
    const selected = this.selectedReferencePattern();
    if (selected) this.placeReferencePattern(panelIndex, selected);
  }

  clearReferenceDrop(panelIndex: 0 | 1): void {
    if (this.step() !== 'reference') return;
    this.referenceDropsState.update(([first, second]) =>
      panelIndex === 0 ? [null, second] : [first, null]);
    this.attemptedState.set(null);
  }

  referenceOptionNumber(pattern: ReferencePatternId | null): string {
    return pattern === 'allele-pattern-a' ? '1' : pattern === 'allele-pattern-b' ? '2' : '';
  }

  checkReference(): void {
    if (!this.referenceReady()) return;
    this.attemptedState.set('reference');
    const answers = this.referenceAnswers();
    const correct = this.referenceDrops()[0] === 'allele-pattern-a'
      && this.referenceDrops()[1] === 'allele-pattern-b'
      && answers.aExpression === 'dominant'
      && answers.bExpression === 'recessive';
    if (!correct) {
      this.reject(
        'The reference key is not confirmed yet.',
        'Compare each resistor-code fingerprint with the phenotype evidence, then reconsider how each allele is expressed.',
      );
      return;
    }
    this.log('reference-models-confirmed');
    this.stepState.set('samples');
    this.attemptedState.set(null);
    this.accept(
      `${this.trait().name} reference confirmed.`,
      `${this.trait().dominantAllele} is dominant and ${this.trait().recessiveAllele} is recessive in this model.`,
    );
  }

  selectSampleAllele(index: 0 | 1, allele: string): void {
    if (this.step() !== 'samples') return;
    this.sampleAnswersState.update(([first, second]) =>
      index === 0 ? [allele, second] : [first, allele]);
    this.attemptedState.set(null);
  }

  checkSamples(): void {
    if (!this.samplesReady()) return;
    this.attemptedState.set('samples');
    const correct = this.sampleAnswers().every(
      (allele, index) => allele === this.activeTask().requestedAlleles[index],
    );
    if (!correct) {
      this.reject(
        'One sample identity needs another look.',
        'Match each sample fingerprint to the fingerprint beside the confirmed reference models.',
      );
      return;
    }
    this.log(`samples-identified:${this.activeTask().requestedAlleles.join('')}`);
    this.stepState.set('analyze');
    this.attemptedState.set(null);
    this.accept(
      `Samples form the pair ${this.activeTask().requestedAlleles.join('')}.`,
      'Now compare the two alleles and predict the visible trait.',
    );
  }

  selectAnalysis<K extends keyof AnalysisAnswers>(field: K, value: AnalysisAnswers[K]): void {
    if (this.step() !== 'analyze') return;
    this.analysisAnswersState.update(answers => ({ ...answers, [field]: value }));
    this.attemptedState.set(null);
  }

  checkAnalysis(): void {
    if (!this.analysisReady()) return;
    this.attemptedState.set('analyze');
    const answers = this.analysisAnswers();
    const correct = answers.comparison === this.sampleComparison()
      && answers.genotypeType === this.genotypeType()
      && answers.combination === this.alleleCombination()
      && answers.phenotype === this.actualPrediction();
    if (!correct) {
      this.reject(
        this.mode() === 'official' ? 'Investigation not confirmed.' : 'One part of the pair analysis needs revision.',
        this.mode() === 'official'
          ? 'Review the reference evidence and submit the analysis again.'
          : 'Use both allele symbols. Same/different determines genotype type; an uppercase allele determines expression.',
      );
      return;
    }
    this.log(`pair-analyzed:${this.activeTask().requestedAlleles.join('')}`);
    this.stepState.set('reveal');
    this.attemptedState.set(null);
    this.accept('Prediction confirmed.', this.activeTask().explanation);
  }

  openNotebook(): void {
    if (this.step() !== 'reveal') return;
    this.stepState.set('notebook');
    this.log('notebook-record-opened');
    this.feedbackState.set(null);
  }

  updateTeamName(event: Event): void {
    this.teamNameState.set((event.target as HTMLInputElement).value);
  }

  saveRecord(): void {
    if (this.step() !== 'notebook' || !this.notebookReady()) return;
    const task = this.activeTask();
    const createdAtIso = new Date().toISOString();
    const record: AlleleWorkbenchNotebookRecord = {
      sceneId: `allele-investigation-${task.id}`,
      seed: `${this.seed()}:${this.mode()}:${task.id}`,
      sampleId: this.selectedSample().id,
      taskId: task.id,
      mode: this.mode(),
      traitId: task.traitId,
      focusGeneId: task.targetGeneId,
      startingAlleles: task.startingAlleles,
      workingAlleles: task.requestedAlleles,
      requestedAlleles: task.requestedAlleles,
      constructionCorrect: true,
      predictedPhenotypeId: this.actualPrediction(),
      actualPhenotypeId: this.actualPrediction(),
      predictionCorrect: true,
      genotypeClassId: this.genotypeClass(),
      carrierState: this.genotypeClass() === 'heterozygous',
      evidenceId: task.evidenceId,
      evidenceCorrect: true,
      misconception: null,
      moveCount: 2,
      elapsedMs: Math.max(0, now() - this.openedAtMsState()),
      createdAtIso,
      sampleSelectionCorrect: true,
      geneLocationCorrect: true,
      machineActions: [...this.actionLogState(), 'confirmed-gene-record-saved'],
      interpretationCorrect: true,
      sampleCode: task.sampleCode,
      chromosomeNumber: task.chromosomeNumber,
      predictedRecessiveRetained: this.recessiveAllelePresent(),
      interpretedRecessiveRetained: this.recessiveAllelePresent(),
      interpretedGenotypeClassId: this.genotypeClass(),
      geneName: this.trait().name,
      traitControlled: this.trait().name,
      dominantAlleleSymbol: this.trait().dominantAllele,
      dominantPhenotype: this.trait().dominantPhenotype,
      recessiveAlleleSymbol: this.trait().recessiveAllele,
      recessivePhenotype: this.trait().recessivePhenotype,
      genotypeOutcomes: {
        homozygousDominant: this.trait().dominantPhenotype,
        heterozygous: this.trait().dominantPhenotype,
        homozygousRecessive: this.trait().recessivePhenotype,
      },
      investigationEvidence: [
        'Reference phenotype models matched',
        'Mixed allele pair tested for dominance',
        'Both allele samples identified',
        'Genotype and phenotype prediction confirmed',
      ],
      discoveredAtIso: createdAtIso,
      confirmedBy: this.teamName().trim(),
      confirmed: true,
    };

    this.recordsState.update(records => [...records, record]);
    this.evidenceSaved.emit(record);

    if (this.isLastTask()) {
      this.stepState.set('review');
      this.setCompleted.emit({
        mode: this.mode(),
        correct: this.records().length,
        total: this.records().length,
        misconceptions: [],
      });
      this.accept(
        'Dragon Genetics Notebook complete.',
        `${this.records().length} confirmed gene records are ready for future breeding decisions.`,
      );
      return;
    }

    this.activeIndexState.update(index => index + 1);
    this.resetInvestigation();
    this.accept(
      'Confirmed gene record saved.',
      `The notebook now contains ${this.records().length} breeding reference ${this.records().length === 1 ? 'entry' : 'entries'}.`,
    );
  }

  stepDone(step: InvestigationStep): boolean {
    const order = STEP_LABELS.map(item => item.id);
    const current = this.step() === 'review' ? order.length : order.indexOf(this.step());
    return order.indexOf(step) < current;
  }

  taskForRecord(record: AlleleWorkbenchRecord): AlleleWorkbenchTask {
    return alleleWorkbenchTask(record.taskId);
  }

  fingerprintKind(allele: string): 'dominant' | 'recessive' {
    return allele === this.trait().dominantAllele ? 'dominant' : 'recessive';
  }

  private resetInvestigation(): void {
    this.stepState.set('reference');
    this.referenceAnswersState.set({ ...EMPTY_REFERENCE });
    this.referenceDropsState.set([null, null]);
    this.selectedReferencePatternState.set(null);
    this.expressionTestPairState.set([null, null]);
    this.expressionTestResultState.set(null);
    this.mixedPairTestedState.set(false);
    this.sampleAnswersState.set([null, null]);
    this.analysisAnswersState.set({ ...EMPTY_ANALYSIS });
    this.attemptedState.set(null);
    this.openedAtMsState.set(now());
    this.actionLogState.set([]);
  }

  private referenceDragon(name: string, alleles: readonly [string, string]): DragonParentProfile {
    const profile = this.selectedSample();
    return {
      ...profile,
      id: `${profile.id}-${this.activeTask().traitId}-${alleles.join('')}`,
      name,
      genome: { ...profile.genome, [this.activeTask().traitId]: alleles },
    };
  }

  private log(action: string): void {
    this.actionLogState.update(actions => [...actions, action]);
  }

  private placeReferencePattern(panelIndex: 0 | 1, pattern: ReferencePatternId): void {
    if (this.step() !== 'reference') return;
    this.referenceDropsState.update(([first, second]) => {
      const withoutDuplicate: [ReferencePatternId | null, ReferencePatternId | null] = [
        first === pattern ? null : first,
        second === pattern ? null : second,
      ];
      withoutDuplicate[panelIndex] = pattern;
      return withoutDuplicate;
    });
    this.selectedReferencePatternState.set(pattern);
    this.attemptedState.set(null);
  }

  private placeExpressionTestAllele(slotIndex: 0 | 1, pattern: ReferencePatternId): void {
    if (this.step() !== 'reference') return;
    this.expressionTestPairState.update(([first, second]) =>
      slotIndex === 0 ? [pattern, second] : [first, pattern]);
    this.expressionTestResultState.set(null);
    this.selectedReferencePatternState.set(pattern);
    this.attemptedState.set(null);
  }

  private accept(headline: string, detail: string): void {
    this.feedbackState.set({ tone: 'good', headline, detail });
  }

  private reject(headline: string, detail: string): void {
    this.feedbackState.set({ tone: 'warn', headline, detail });
  }
}

function classifyPair(
  pair: readonly [string, string],
  dominantAllele: string,
): AlleleGenotypeClass {
  if (pair[0] !== pair[1]) return 'heterozygous';
  return pair[0] === dominantAllele ? 'homozygous-dominant' : 'homozygous-recessive';
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function isReferencePattern(value: string | undefined): value is ReferencePatternId {
  return value === 'allele-pattern-a' || value === 'allele-pattern-b';
}
