import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  ALLELE_EXPRESSION_SEQUENCE,
  AlleleSwitchboardDisplayComponent,
  AlleleSwitchboardFeedback,
  DragonVisualBridge,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
} from '../../../shared/dragon-visuals';
import {
  ALLELE_WORKBENCH_COPY,
  ALLELE_WORKBENCH_EVIDENCE,
  alleleWorkbenchTask,
  alleleWorkbenchTasks,
} from '../simulation/data/allele-workbench-content';
import {
  AlleleGenotypeClass,
  AllelePhenotypePrediction,
  AlleleRuleEvidenceId,
  AlleleWorkbenchMisconception,
  AlleleWorkbenchMode,
  AlleleWorkbenchRecord,
  AlleleWorkbenchSetResult,
  AlleleWorkbenchTask,
} from '../simulation/domain/allele-workbench.models';
import {
  DRAGON_PARENTS,
  getTrait,
  normalizeGenotype,
  showsDominantPhenotype,
} from '../simulation/domain/dragon-inheritance';
import { DragonTraitGenotype } from '../simulation/domain/dragon-lab.models';
import { createAlleleSwitchboardScene } from '../visual-adapter/dragon-visual-scene.adapter';

interface RunState {
  taskIds: readonly string[];
  activeIndex: number;
  phase: DragonVisualPhase;
  workingAlleles: readonly [string, string];
  prediction: AllelePhenotypePrediction | null;
  expressionRevealed: boolean;
  evidenceId: AlleleRuleEvidenceId | null;
  moveCount: number;
  openedAtMs: number;
}

interface PrimaryAction {
  label: string;
  disabled: boolean;
  kind: 'begin' | 'lock-pair' | 'explain' | 'save' | 'retry' | 'done' | 'waiting';
}

@Component({
  selector: 'app-allele-workbench-station',
  imports: [AlleleSwitchboardDisplayComponent],
  templateUrl: './allele-workbench-station.component.html',
  styleUrl: './allele-workbench-station.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlleleWorkbenchStationComponent {
  private readonly bridge = inject(DragonVisualBridge);

  readonly mode = input<AlleleWorkbenchMode>('learn');
  readonly seed = input('module-4');
  readonly evidenceSaved = output<AlleleWorkbenchRecord>();
  readonly setCompleted = output<AlleleWorkbenchSetResult>();

  readonly profiles = DRAGON_PARENTS;
  readonly copy = ALLELE_WORKBENCH_COPY;
  readonly selectedSampleId = signal(DRAGON_PARENTS[0].id);
  private readonly feedbackState = signal<AlleleSwitchboardFeedback | null>(null);
  private readonly recordsState = signal<readonly AlleleWorkbenchRecord[]>([]);
  private readonly tasks = computed(() => alleleWorkbenchTasks(this.mode(), this.seed()));
  private readonly run = linkedSignal<RunState>(() => createRun(this.tasks()));

  readonly feedback = this.feedbackState.asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly activeTask = computed(() => this.tasks()[this.run().activeIndex] ?? null);
  readonly selectedSample = computed(() =>
    DRAGON_PARENTS.find(profile => profile.id === this.selectedSampleId()) ?? DRAGON_PARENTS[0]);
  readonly focusTrait = computed(() => getTrait(this.activeTask()?.traitId ?? 'wings'));
  readonly finished = computed(() => this.run().phase === 'review');
  readonly correctCount = computed(() => this.records().filter(record =>
    record.constructionCorrect && record.predictionCorrect && record.evidenceCorrect).length);
  readonly actualPrediction = computed<AllelePhenotypePrediction>(() =>
    showsDominantPhenotype(this.run().workingAlleles as DragonTraitGenotype, this.focusTrait().id)
      ? 'dominant'
      : 'recessive');
  readonly genotypeClass = computed<AlleleGenotypeClass>(() =>
    classifyPair(this.run().workingAlleles, this.focusTrait().dominantAllele));
  readonly carrierState = computed(() => this.genotypeClass() === 'heterozygous');

  readonly scene = computed<DragonVisualScene>(() => {
    const run = this.run();
    const task = this.activeTask() ?? this.tasks()[0];
    const trait = this.focusTrait();
    return createAlleleSwitchboardScene(
      this.selectedSample(),
      this.sceneId(),
      this.visualMode(),
      run.phase,
      {
        focusGeneId: trait.geneSymbol,
        taskId: task.id,
        dominantAllele: trait.dominantAllele,
        recessiveAllele: trait.recessiveAllele,
        startingAlleles: task.startingAlleles,
        requestedAlleles: task.requestedAlleles,
        workingAlleles: run.workingAlleles,
        dominantPhenotypeId: trait.dominantPhenotype,
        recessivePhenotypeId: trait.recessivePhenotype,
        predictedPhenotypeId: run.prediction,
        actualPhenotypeId: run.expressionRevealed ? this.actualPrediction() : null,
        genotypeClassId: run.expressionRevealed ? this.genotypeClass() : null,
        carrierState: run.expressionRevealed && this.carrierState(),
        expressionRevealed: run.expressionRevealed,
        evidenceMarks: ALLELE_WORKBENCH_EVIDENCE,
        evidenceMarkId: run.evidenceId,
        showHints: this.mode() === 'learn' || this.mode() === 'reteach',
        seed: `${this.seed()}:${this.mode()}:${task.id}:${this.selectedSampleId()}`,
      },
    );
  });

  readonly primaryAction = computed<PrimaryAction>(() => {
    const run = this.run();
    if (run.phase === 'review') return this.correctCount() === run.taskIds.length
      ? { label: 'Station complete', disabled: true, kind: 'done' }
      : { label: 'Retry unsupported records', disabled: false, kind: 'retry' };
    if (run.phase === 'observe') return { label: 'Open allele token bank', disabled: false, kind: 'begin' };
    if (run.phase === 'manipulate') return { label: 'Lock allele pair and predict', disabled: false, kind: 'lock-pair' };
    if (run.phase === 'predict') return { label: 'Choose a phenotype prediction above', disabled: true, kind: 'waiting' };
    if (run.phase === 'reveal') return run.expressionRevealed
      ? { label: 'Explain with rule evidence', disabled: false, kind: 'explain' }
      : { label: 'Run the expression trace in the console', disabled: true, kind: 'waiting' };
    return {
      label: run.activeIndex === run.taskIds.length - 1
        ? 'Save final workbench record'
        : 'Save record and load next gene',
      disabled: !run.evidenceId,
      kind: 'save',
    };
  });

  readonly stepHint = computed(() => {
    switch (this.run().phase) {
      case 'observe': return 'Observe: compare the starting pair with the assigned genotype.';
      case 'manipulate': return 'Build: select an allele token, then choose either chromosome socket to replace it.';
      case 'predict': return 'Predict: decide which phenotype will be expressed before the analyzer runs.';
      case 'reveal': return 'Trace: follow the pair through the expression rule while both allele symbols remain visible.';
      case 'explain': return 'Explain: pin the rule that is the strongest evidence for this result.';
      default: return 'All four gene-expression records have been saved.';
    }
  });

  readonly modeLabel = computed(() => ({
    learn: 'Learn · guided genotype contrast',
    practice: 'Practice · four gene changes',
    official: 'Official · locked evidence records',
    reteach: 'Reteach · dominant describes expression only',
  })[this.mode()]);

  constructor() {
    effect(() => this.bridge.showScene(this.scene()));
    effect(() => {
      if (this.run().phase === 'reveal' && this.run().expressionRevealed) {
        this.bridge.playSequence(ALLELE_EXPRESSION_SEQUENCE, 'station');
      } else {
        this.bridge.stopSequence();
      }
    });
  }

  selectSample(sampleId: string): void {
    if (this.run().phase !== 'observe') return;
    if (DRAGON_PARENTS.some(profile => profile.id === sampleId)) this.selectedSampleId.set(sampleId);
  }

  onStageEvent(event: DragonVisualStageEvent): void {
    if (event.type === 'allele-moved' && typeof event.value === 'string') {
      this.moveAllele(event.targetId, event.value);
    } else if (event.type === 'prediction-locked' && isPrediction(event.value)) {
      this.lockPrediction(event.value);
    } else if (event.type === 'reveal-requested') {
      this.revealExpression();
    } else if (event.type === 'evidence-pinned' && isEvidence(event.targetId)) {
      this.pinEvidence(event.targetId);
    }
  }

  runPrimaryAction(): void {
    const action = this.primaryAction();
    if (action.disabled) return;
    if (action.kind === 'begin') {
      this.setPhase('manipulate');
      return;
    }
    if (action.kind === 'lock-pair') {
      this.lockPair();
      return;
    }
    if (action.kind === 'explain') {
      this.setPhase('explain');
      this.feedbackState.set({
        tone: 'neutral',
        headline: 'Choose the rule that supports this exact allele pair.',
        detail: 'Dominant describes which phenotype is expressed, not which allele is stronger, better, or more common.',
      });
      return;
    }
    if (action.kind === 'save') this.saveRecord();
    if (action.kind === 'retry') {
      this.run.set(createRun(this.tasks()));
      this.feedbackState.set(null);
    }
  }

  taskLabel(taskId: string): string {
    return alleleWorkbenchTask(taskId).prompt;
  }

  activeTaskNumber(): number {
    return Math.min(this.run().activeIndex + 1, this.run().taskIds.length);
  }

  taskCount(): number {
    return this.run().taskIds.length;
  }

  runPhaseLocked(): boolean {
    return this.run().phase !== 'observe';
  }

  currentPair(): string {
    return this.run().workingAlleles.join('');
  }

  currentPrediction(): string {
    return this.run().prediction ?? 'Not locked';
  }

  currentEvidence(): string {
    return this.run().evidenceId?.replaceAll('-', ' ') ?? 'Not pinned';
  }

  private sceneId(): string {
    return `module-4-allele-workbench-${this.mode()}-${this.activeTask()?.id ?? 'complete'}`;
  }

  private visualMode(): DragonVisualMode {
    return this.mode() === 'official' ? 'official' : this.mode() === 'practice' ? 'practice' : 'learn';
  }

  private moveAllele(targetId: string, symbol: string): void {
    const run = this.run();
    const trait = this.focusTrait();
    if (run.phase !== 'manipulate' || ![trait.dominantAllele, trait.recessiveAllele].includes(symbol)) return;
    if (targetId !== 'allele-slot-a' && targetId !== 'allele-slot-b') return;
    const pair: [string, string] = targetId === 'allele-slot-a'
      ? [symbol, run.workingAlleles[1]]
      : [run.workingAlleles[0], symbol];
    this.run.update(current => ({ ...current, workingAlleles: pair, moveCount: current.moveCount + 1 }));
    this.feedbackState.set(null);
  }

  private lockPair(): void {
    const task = this.activeTask();
    if (!task || !pairsMatch(this.run().workingAlleles, task.requestedAlleles)) {
      this.feedbackState.set({
        tone: 'warn',
        headline: 'The chromosome sockets do not match the assigned extract yet.',
        detail: `Build ${task?.requestedAlleles.join('') ?? ''}. Allele order does not matter.`,
      });
      return;
    }
    this.setPhase('predict');
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Allele pair ${this.currentPair()} locked.`,
      detail: 'Predict the expressed phenotype before running the trace.',
    });
  }

  private lockPrediction(prediction: AllelePhenotypePrediction): void {
    if (this.run().phase !== 'predict') return;
    this.run.update(current => ({ ...current, prediction, phase: 'reveal' }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Prediction locked.',
      detail: 'Run the expression trace. The pair will remain visible beside the readout.',
    });
  }

  private revealExpression(): void {
    if (this.run().phase !== 'reveal' || this.run().expressionRevealed) return;
    const correct = this.run().prediction === this.actualPrediction();
    this.run.update(current => ({ ...current, expressionRevealed: true }));
    this.feedbackState.set(this.mode() === 'official'
      ? { tone: 'neutral', headline: 'Expression record resolved.', detail: 'Inspect the genotype class and pin rule evidence.' }
      : {
        tone: correct ? 'good' : 'warn',
        headline: correct ? 'Prediction supported by the allele pair.' : 'The allele pair produced a different expression result.',
        detail: this.activeTask()?.explanation,
      });
  }

  private pinEvidence(evidenceId: AlleleRuleEvidenceId): void {
    if (this.run().phase !== 'explain') return;
    if (this.mode() === 'official' && this.run().evidenceId) return;
    const correct = evidenceId === this.activeTask()?.evidenceId;
    this.run.update(current => ({ ...current, evidenceId }));
    this.feedbackState.set(this.mode() === 'official'
      ? { tone: 'neutral', headline: 'Rule evidence recorded.', detail: 'Save the workbench record when ready.' }
      : {
        tone: correct ? 'good' : 'warn',
        headline: correct ? 'That rule directly supports this result.' : 'That rule is true, but another rule is stronger evidence for this pair.',
        detail: correct ? this.activeTask()?.explanation : 'Compare the number and case of both allele symbols.',
      });
  }

  private saveRecord(): void {
    const run = this.run();
    const task = this.activeTask();
    if (!task || !run.prediction || !run.evidenceId || !run.expressionRevealed) return;
    const constructionCorrect = pairsMatch(run.workingAlleles, task.requestedAlleles);
    const predictionCorrect = run.prediction === this.actualPrediction();
    const evidenceCorrect = run.evidenceId === task.evidenceId;
    const record: AlleleWorkbenchRecord = {
      sceneId: this.sceneId(),
      seed: `${this.seed()}:${this.mode()}:${task.id}:${this.selectedSampleId()}`,
      sampleId: this.selectedSampleId(),
      taskId: task.id,
      mode: this.mode(),
      traitId: task.traitId,
      focusGeneId: this.focusTrait().geneSymbol,
      startingAlleles: task.startingAlleles,
      workingAlleles: run.workingAlleles,
      requestedAlleles: task.requestedAlleles,
      constructionCorrect,
      predictedPhenotypeId: run.prediction,
      actualPhenotypeId: this.actualPrediction(),
      predictionCorrect,
      genotypeClassId: this.genotypeClass(),
      carrierState: this.carrierState(),
      evidenceId: run.evidenceId,
      evidenceCorrect,
      misconception: constructionCorrect && predictionCorrect && evidenceCorrect ? null : task.misconception,
      moveCount: run.moveCount,
      elapsedMs: Math.max(0, now() - run.openedAtMs),
      createdAtIso: new Date().toISOString(),
    };
    this.recordsState.update(records => [
      ...records.filter(existing => existing.taskId !== record.taskId || existing.mode !== record.mode),
      record,
    ]);
    this.evidenceSaved.emit(record);

    if (run.activeIndex >= run.taskIds.length - 1) {
      this.run.update(current => ({ ...current, phase: 'review' }));
      const records = this.records().filter(item =>
        item.mode === this.mode() && run.taskIds.includes(item.taskId));
      this.setCompleted.emit({
        mode: this.mode(),
        correct: records.filter(item =>
          item.constructionCorrect && item.predictionCorrect && item.evidenceCorrect).length,
        total: records.length,
        misconceptions: [...new Set(records
          .map(item => item.misconception)
          .filter((flag): flag is AlleleWorkbenchMisconception => !!flag))],
      });
      return;
    }

    const nextIndex = run.activeIndex + 1;
    const nextTask = this.tasks()[nextIndex];
    this.run.set({
      taskIds: run.taskIds,
      activeIndex: nextIndex,
      phase: 'observe',
      workingAlleles: nextTask.startingAlleles,
      prediction: null,
      expressionRevealed: false,
      evidenceId: null,
      moveCount: 0,
      openedAtMs: now(),
    });
    this.feedbackState.set(null);
  }

  private setPhase(phase: DragonVisualPhase): void {
    this.run.update(current => ({ ...current, phase }));
  }
}

function createRun(tasks: readonly AlleleWorkbenchTask[]): RunState {
  const first = tasks[0];
  return {
    taskIds: tasks.map(task => task.id),
    activeIndex: 0,
    phase: 'observe',
    workingAlleles: first?.startingAlleles ?? ['W', 'w'],
    prediction: null,
    expressionRevealed: false,
    evidenceId: null,
    moveCount: 0,
    openedAtMs: now(),
  };
}

function pairsMatch(left: readonly [string, string], right: readonly [string, string]): boolean {
  return normalizeGenotype(left as DragonTraitGenotype).join('')
    === normalizeGenotype(right as DragonTraitGenotype).join('');
}

function classifyPair(
  pair: readonly [string, string],
  dominantAllele: string,
): AlleleGenotypeClass {
  if (pair[0] !== pair[1]) return 'heterozygous';
  return pair[0] === dominantAllele ? 'homozygous-dominant' : 'homozygous-recessive';
}

function isPrediction(value: unknown): value is AllelePhenotypePrediction {
  return value === 'dominant' || value === 'recessive';
}

function isEvidence(value: string): value is AlleleRuleEvidenceId {
  return ALLELE_WORKBENCH_EVIDENCE.some(item => item.id === value);
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
