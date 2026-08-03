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
  alleleWorkbenchVials,
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

export type AlleleWorkbenchObserveStep =
  | 'select-sample'
  | 'load-sample'
  | 'secure-chamber'
  | 'locate-gene';

interface RunState {
  taskIds: readonly string[];
  activeIndex: number;
  phase: DragonVisualPhase;
  observeStep: AlleleWorkbenchObserveStep;
  selectedVialCode: string | null;
  loadedVialCode: string | null;
  chamberLocked: boolean;
  sampleMismatch: boolean;
  centeredGeneIndex: number;
  geneLocationLocked: boolean;
  locatorHintVisible: boolean;
  bandingEnabled: boolean;
  fluorescenceEnabled: boolean;
  homologComparisonEnabled: boolean;
  workingAlleles: readonly [string, string];
  socketsSecured: readonly [boolean, boolean];
  prediction: AllelePhenotypePrediction | null;
  predictedRecessiveRetained: boolean | null;
  expressionRevealed: boolean;
  interpretationGenotypeClassId: AlleleGenotypeClass | null;
  interpretedRecessiveRetained: boolean | null;
  interpretationLocked: boolean;
  evidenceId: AlleleRuleEvidenceId | null;
  moveCount: number;
  machineActions: readonly string[];
  openedAtMs: number;
}

interface PrimaryAction {
  label: string;
  disabled: boolean;
  kind:
    | 'lock-pair'
    | 'lock-prediction'
    | 'interpret'
    | 'lock-interpretation'
    | 'save'
    | 'retry'
    | 'done'
    | 'waiting';
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

  readonly copy = ALLELE_WORKBENCH_COPY;
  private readonly feedbackState = signal<AlleleSwitchboardFeedback | null>(null);
  private readonly recordsState = signal<readonly AlleleWorkbenchRecord[]>([]);
  private readonly tasks = computed(() => alleleWorkbenchTasks(this.mode(), this.seed()));
  private readonly run = linkedSignal<RunState>(() => createRun(this.tasks()));

  readonly feedback = this.feedbackState.asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly activeTask = computed(() => this.tasks()[this.run().activeIndex] ?? this.tasks()[0]);
  readonly selectedSample = computed(() => {
    const task = this.activeTask();
    return DRAGON_PARENTS.find(profile => profile.id === task.sampleProfileId) ?? DRAGON_PARENTS[0];
  });
  readonly vials = computed(() => alleleWorkbenchVials(this.activeTask().id));
  readonly focusTrait = computed(() => getTrait(this.activeTask().traitId));
  readonly finished = computed(() => this.run().phase === 'review');
  readonly correctCount = computed(() => this.records().filter(record =>
    record.constructionCorrect
    && record.predictionCorrect
    && record.evidenceCorrect
    && record.interpretationCorrect !== false).length);
  readonly actualPrediction = computed<AllelePhenotypePrediction>(() =>
    showsDominantPhenotype(this.run().workingAlleles as DragonTraitGenotype, this.focusTrait().id)
      ? 'dominant'
      : 'recessive');
  readonly genotypeClass = computed<AlleleGenotypeClass>(() =>
    classifyPair(this.run().workingAlleles, this.focusTrait().dominantAllele));
  readonly carrierState = computed(() => this.genotypeClass() === 'heterozygous');
  readonly recessiveAllelePresent = computed(() =>
    this.run().workingAlleles.includes(this.focusTrait().recessiveAllele));
  readonly requiresRecessivePrediction = computed(() =>
    classifyPair(this.activeTask().requestedAlleles, this.focusTrait().dominantAllele) === 'heterozygous');

  readonly scene = computed<DragonVisualScene>(() => {
    const run = this.run();
    const task = this.activeTask();
    const trait = this.focusTrait();
    return createAlleleSwitchboardScene(
      this.selectedSample(),
      this.sceneId(),
      this.visualMode(),
      run.phase,
      {
        sampleCode: task.sampleCode,
        sampleLabel: task.sampleLabel,
        sampleVials: this.vials().map(vial => ({
          code: vial.code,
          label: vial.label,
          selected: run.selectedVialCode === vial.code,
          loaded: run.loadedVialCode === vial.code,
        })),
        observeStep: run.observeStep,
        chamberLocked: run.chamberLocked,
        sampleMismatch: run.sampleMismatch,
        chromosomeNumber: task.chromosomeNumber,
        nearbyGeneIds: task.nearbyGeneIds,
        centeredGeneId: task.nearbyGeneIds[run.centeredGeneIndex] ?? null,
        geneLocationLocked: run.geneLocationLocked,
        locatorHintVisible: run.locatorHintVisible,
        bandingEnabled: run.bandingEnabled,
        fluorescenceEnabled: run.fluorescenceEnabled,
        homologComparisonEnabled: run.homologComparisonEnabled,
        focusGeneId: task.targetGeneId,
        taskId: task.id,
        dominantAllele: trait.dominantAllele,
        recessiveAllele: trait.recessiveAllele,
        startingAlleles: task.startingAlleles,
        requestedAlleles: task.requestedAlleles,
        workingAlleles: run.workingAlleles,
        socketsSecured: run.socketsSecured,
        dominantPhenotypeId: task.dominantPhenotypeLabel,
        recessivePhenotypeId: task.recessivePhenotypeLabel,
        predictedPhenotypeId: run.prediction,
        predictedRecessiveRetained: run.predictedRecessiveRetained,
        requiresRecessivePrediction: this.requiresRecessivePrediction(),
        actualPhenotypeId: run.expressionRevealed ? this.actualPrediction() : null,
        dominantSignalPresent: run.expressionRevealed
          && run.workingAlleles.includes(trait.dominantAllele),
        recessiveSignalPresent: run.expressionRevealed
          && this.recessiveAllelePresent(),
        genotypeClassId: run.expressionRevealed ? this.genotypeClass() : null,
        interpretationGenotypeClassId: run.interpretationGenotypeClassId,
        interpretedRecessiveRetained: run.interpretedRecessiveRetained,
        interpretationLocked: run.interpretationLocked,
        carrierState: run.expressionRevealed && this.carrierState(),
        expressionRevealed: run.expressionRevealed,
        evidenceMarks: ALLELE_WORKBENCH_EVIDENCE,
        evidenceMarkId: run.evidenceId,
        machineStatus: this.feedback()?.headline,
        showHints: this.mode() === 'learn' || this.mode() === 'reteach',
        seed: `${this.seed()}:${this.mode()}:${task.id}:${task.sampleCode}`,
      },
    );
  });

  readonly primaryAction = computed<PrimaryAction>(() => {
    const run = this.run();
    if (run.phase === 'review') {
      return this.correctCount() === run.taskIds.length
        ? { label: 'Station complete', disabled: true, kind: 'done' }
        : { label: 'Retry unsupported records', disabled: false, kind: 'retry' };
    }
    if (run.phase === 'observe') {
      const labels: Record<AlleleWorkbenchObserveStep, string> = {
        'select-sample': 'Select the assigned vial in the sample rack',
        'load-sample': run.sampleMismatch ? 'Eject the mismatched vial' : 'Load the selected vial',
        'secure-chamber': 'Close and lock the sample chamber',
        'locate-gene': `Center gene ${this.activeTask().targetGeneId} and lock the locus`,
      };
      return { label: labels[run.observeStep], disabled: true, kind: 'waiting' };
    }
    if (run.phase === 'manipulate') {
      return { label: 'Lock allele pair and open prediction console', disabled: false, kind: 'lock-pair' };
    }
    if (run.phase === 'predict') {
      const ready = !!run.prediction
        && (!this.requiresRecessivePrediction() || run.predictedRecessiveRetained !== null);
      return { label: 'Lock predictions and arm analyzer', disabled: !ready, kind: 'lock-prediction' };
    }
    if (run.phase === 'reveal') {
      return run.expressionRevealed
        ? { label: 'Interpret analyzer data', disabled: false, kind: 'interpret' }
        : { label: 'Energize the analyzer in the instrument', disabled: true, kind: 'waiting' };
    }
    if (!run.interpretationLocked) {
      const ready = !!run.interpretationGenotypeClassId && run.interpretedRecessiveRetained !== null;
      return { label: 'Lock data interpretation', disabled: !ready, kind: 'lock-interpretation' };
    }
    return {
      label: run.activeIndex === run.taskIds.length - 1
        ? 'Save final laboratory record'
        : 'Save record and load next sample',
      disabled: !run.evidenceId,
      kind: 'save',
    };
  });

  readonly stepHint = computed(() => {
    const run = this.run();
    if (run.phase === 'observe') {
      return ({
        'select-sample': `Mission intake: find vial ${this.activeTask().sampleCode}.`,
        'load-sample': 'Sample handling: insert the selected vial into the chamber.',
        'secure-chamber': 'Containment: lock the correct sample before chromosome scanning.',
        'locate-gene': `Gene discovery: scan chromosome ${this.activeTask().chromosomeNumber} for locus ${this.activeTask().targetGeneId}.`,
      } as const)[run.observeStep];
    }
    if (run.phase === 'manipulate') return 'Cartridge bay: build the assigned pair and secure both chromosome-copy sockets.';
    if (run.phase === 'predict') return 'Prediction console: commit your phenotype forecast before any expression data appears.';
    if (run.phase === 'reveal') return 'Expression analyzer: trace the allele pair through the expression rule.';
    if (run.phase === 'explain' && !run.interpretationLocked) return 'Data desk: classify the genotype and account for the recessive allele.';
    if (run.phase === 'explain') return 'Evidence dock: pin the rule that most directly supports this result.';
    return 'All laboratory records have been saved.';
  });

  readonly modeLabel = computed(() => ({
    learn: 'Learn · guided investigation',
    practice: 'Practice · independent evidence',
    official: 'Official · sealed scoring',
    reteach: 'Reteach · misconception contrast',
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

  onStageEvent(event: DragonVisualStageEvent): void {
    if (event.type === 'specimen-selected') {
      this.selectVial(event.targetId);
      return;
    }
    if (event.type === 'hotspot-selected') {
      this.handleMachineAction(event.targetId, event.value);
      return;
    }
    if (event.type === 'allele-moved' && typeof event.value === 'string') {
      this.moveAllele(event.targetId, event.value);
      return;
    }
    if (event.type === 'prediction-locked') {
      this.selectPrediction(event.targetId, event.value);
      return;
    }
    if (event.type === 'reveal-requested') {
      this.revealExpression();
      return;
    }
    if (event.type === 'evidence-pinned' && isEvidence(event.targetId)) {
      this.pinEvidence(event.targetId);
    }
  }

  runPrimaryAction(): void {
    const action = this.primaryAction();
    if (action.disabled) return;
    if (action.kind === 'lock-pair') this.lockPair();
    if (action.kind === 'lock-prediction') this.lockPredictions();
    if (action.kind === 'interpret') this.openInterpretation();
    if (action.kind === 'lock-interpretation') this.lockInterpretation();
    if (action.kind === 'save') this.saveRecord();
    if (action.kind === 'retry') {
      this.run.set(createRun(this.tasks()));
      this.recordsState.set([]);
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

  currentPair(): string {
    return this.run().workingAlleles.join('');
  }

  currentPrediction(): string {
    return this.run().prediction ?? 'Not locked';
  }

  currentEvidence(): string {
    return this.run().evidenceId?.replaceAll('-', ' ') ?? 'Not pinned';
  }

  currentObserveStep(): AlleleWorkbenchObserveStep {
    return this.run().observeStep;
  }

  selectedVialCode(): string | null {
    return this.run().selectedVialCode;
  }

  loadedVialCode(): string | null {
    return this.run().loadedVialCode;
  }

  chamberLocked(): boolean {
    return this.run().chamberLocked;
  }

  centeredGeneId(): string | null {
    return this.activeTask().nearbyGeneIds[this.run().centeredGeneIndex] ?? null;
  }

  geneLocationLocked(): boolean {
    return this.run().geneLocationLocked;
  }

  socketsSecured(): readonly [boolean, boolean] {
    return this.run().socketsSecured;
  }

  private sceneId(): string {
    return `module-4-allele-workbench-${this.mode()}-${this.activeTask()?.id ?? 'complete'}`;
  }

  private visualMode(): DragonVisualMode {
    return this.mode() === 'official' ? 'official' : this.mode() === 'practice' ? 'practice' : 'learn';
  }

  private handleMachineAction(targetId: string, value: unknown): void {
    if (targetId === 'sample-chamber' && value === 'load') this.loadSelectedVial();
    if (targetId === 'sample-chamber' && value === 'eject') this.ejectVial();
    if (targetId === 'sample-lock' && value === 'lock') this.lockChamber();
    if (targetId === 'chromosome-stage' && (value === 'previous' || value === 'next')) {
      this.moveChromosomeStage(value === 'next' ? 1 : -1);
    }
    if (targetId === 'gene-locator' && value === 'lock') this.lockGeneLocation();
    if (targetId === 'gene-locator' && value === 'hint') this.showLocatorHint();
    if (targetId === 'banding-overlay' && typeof value === 'boolean') {
      this.toggleMachineView('bandingEnabled', value, `banding-${value ? 'on' : 'off'}`);
    }
    if (targetId === 'fluorescent-marker' && typeof value === 'boolean') {
      this.toggleMachineView('fluorescenceEnabled', value, `fluorescence-${value ? 'on' : 'off'}`);
    }
    if (targetId === 'homolog-compare' && typeof value === 'boolean') {
      this.toggleMachineView('homologComparisonEnabled', value, `homolog-compare-${value ? 'on' : 'off'}`);
    }
    if ((targetId === 'socket-lock-a' || targetId === 'socket-lock-b') && value === 'secure') {
      this.secureSocket(targetId === 'socket-lock-a' ? 0 : 1);
    }
    if (targetId === 'genotype-interpretation' && isGenotypeClass(value)) {
      this.selectGenotypeInterpretation(value);
    }
    if (targetId === 'recessive-interpretation' && isYesNo(value)) {
      this.selectRecessiveInterpretation(value === 'yes');
    }
  }

  private selectVial(code: string): void {
    const run = this.run();
    if (run.phase !== 'observe' || run.loadedVialCode || !this.vials().some(vial => vial.code === code)) return;
    this.run.update(current => withAction({
      ...current,
      selectedVialCode: code,
      observeStep: 'load-sample',
    }, `sample-selected:${code}`));
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Vial ${code} selected.`,
      detail: 'Insert the vial into the chamber to let the identifier reader verify it.',
    });
  }

  private loadSelectedVial(): void {
    const run = this.run();
    if (run.phase !== 'observe' || !run.selectedVialCode || run.loadedVialCode) return;
    const mismatch = run.selectedVialCode !== this.activeTask().sampleCode;
    this.run.update(current => withAction({
      ...current,
      loadedVialCode: current.selectedVialCode,
      sampleMismatch: mismatch,
      observeStep: mismatch ? 'load-sample' : 'secure-chamber',
    }, `sample-loaded:${run.selectedVialCode}`));
    this.feedbackState.set(mismatch
      ? {
        tone: 'warn',
        headline: 'Sample identifier mismatch.',
        detail: `Loaded: ${run.selectedVialCode}. Required: ${this.activeTask().sampleCode}. Eject the vial and try again.`,
      }
      : {
        tone: 'good',
        headline: `Sample ${run.selectedVialCode} accepted.`,
        detail: 'Close and lock the chamber before scanning the chromosome.',
      });
  }

  private ejectVial(): void {
    const run = this.run();
    if (run.phase !== 'observe' || !run.loadedVialCode || run.chamberLocked) return;
    this.run.update(current => withAction({
      ...current,
      selectedVialCode: null,
      loadedVialCode: null,
      sampleMismatch: false,
      observeStep: 'select-sample',
    }, `sample-ejected:${run.loadedVialCode}`));
    this.feedbackState.set({ tone: 'neutral', headline: 'Sample ejected.', detail: 'Select the assigned vial from the rack.' });
  }

  private lockChamber(): void {
    const run = this.run();
    if (run.phase !== 'observe' || run.loadedVialCode !== this.activeTask().sampleCode || run.chamberLocked) return;
    this.run.update(current => withAction({
      ...current,
      chamberLocked: true,
      observeStep: 'locate-gene',
      centeredGeneIndex: 0,
    }, 'sample-chamber-locked'));
    this.feedbackState.set({
      tone: 'good',
      headline: 'Sample chamber locked.',
      detail: `Chromosome ${this.activeTask().chromosomeNumber} is ready. Move the stage to gene ${this.activeTask().targetGeneId}.`,
    });
  }

  private moveChromosomeStage(delta: number): void {
    const run = this.run();
    const genes = this.activeTask().nearbyGeneIds;
    if (run.phase !== 'observe' || run.observeStep !== 'locate-gene' || !run.chamberLocked || run.geneLocationLocked) return;
    const nextIndex = Math.max(0, Math.min(genes.length - 1, run.centeredGeneIndex + delta));
    if (nextIndex === run.centeredGeneIndex) return;
    this.run.update(current => withAction({ ...current, centeredGeneIndex: nextIndex }, `stage-centered:${genes[nextIndex]}`));
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Reticle centered on locus ${genes[nextIndex]}.`,
      detail: 'Compare the locus label on both homologous chromosomes before locking.',
    });
  }

  private lockGeneLocation(): void {
    const run = this.run();
    if (run.phase !== 'observe' || run.observeStep !== 'locate-gene' || !run.chamberLocked) return;
    const centered = this.centeredGeneId();
    if (centered !== this.activeTask().targetGeneId) {
      this.run.update(current => withAction(current, `gene-lock-rejected:${centered ?? 'none'}`));
      this.feedbackState.set({
        tone: 'warn',
        headline: `Locus ${centered ?? 'unresolved'} does not match the mission gene.`,
        detail: `Continue scanning chromosome ${this.activeTask().chromosomeNumber} for gene ${this.activeTask().targetGeneId}.`,
      });
      return;
    }
    this.run.update(current => withAction({
      ...current,
      geneLocationLocked: true,
      phase: 'manipulate',
    }, `gene-location-locked:${centered}`));
    this.feedbackState.set({
      tone: 'good',
      headline: `Gene ${centered} location locked.`,
      detail: 'The allele cartridge sockets are now available on both chromosome copies.',
    });
  }

  private showLocatorHint(): void {
    if (!['learn', 'reteach'].includes(this.mode()) || this.run().observeStep !== 'locate-gene') return;
    this.run.update(current => withAction({ ...current, locatorHintVisible: true }, 'gene-locator-hint'));
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Fluorescent hint marks gene ${this.activeTask().targetGeneId}.`,
      detail: 'Move the reticle to the same labeled locus on both homologous chromosomes.',
    });
  }

  private toggleMachineView(
    key: 'bandingEnabled' | 'fluorescenceEnabled' | 'homologComparisonEnabled',
    value: boolean,
    action: string,
  ): void {
    if (this.run().phase !== 'observe' || this.run().observeStep !== 'locate-gene') return;
    this.run.update(current => withAction({ ...current, [key]: value }, action));
  }

  private moveAllele(targetId: string, symbol: string): void {
    const run = this.run();
    const trait = this.focusTrait();
    if (run.phase !== 'manipulate' || !run.geneLocationLocked
      || ![trait.dominantAllele, trait.recessiveAllele].includes(symbol)) return;
    if (targetId !== 'allele-slot-a' && targetId !== 'allele-slot-b') return;
    const slotIndex = targetId === 'allele-slot-a' ? 0 : 1;
    const pair: [string, string] = slotIndex === 0
      ? [symbol, run.workingAlleles[1]]
      : [run.workingAlleles[0], symbol];
    const sockets: [boolean, boolean] = [...run.socketsSecured] as [boolean, boolean];
    sockets[slotIndex] = false;
    this.run.update(current => withAction({
      ...current,
      workingAlleles: pair,
      socketsSecured: sockets,
      moveCount: current.moveCount + 1,
    }, `allele-cartridge:${targetId}:${symbol}`));
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Allele cartridge ${symbol} accepted.`,
      detail: `Socket ${slotIndex === 0 ? 'A' : 'B'} remains open until you secure it.`,
    });
  }

  private secureSocket(slotIndex: 0 | 1): void {
    const run = this.run();
    if (run.phase !== 'manipulate' || !run.geneLocationLocked) return;
    const sockets: [boolean, boolean] = [...run.socketsSecured] as [boolean, boolean];
    sockets[slotIndex] = true;
    this.run.update(current => withAction({ ...current, socketsSecured: sockets }, `socket-${slotIndex === 0 ? 'a' : 'b'}-secured`));
    this.feedbackState.set({
      tone: 'good',
      headline: `Socket ${slotIndex === 0 ? 'A' : 'B'} secured.`,
      detail: sockets.every(Boolean) ? 'Both allele cartridges are physically locked.' : `Socket ${slotIndex === 0 ? 'B' : 'A'} remains open.`,
    });
  }

  private lockPair(): void {
    const run = this.run();
    if (!run.socketsSecured.every(Boolean)) {
      this.feedbackState.set({
        tone: 'warn',
        headline: 'Both allele sockets must be secured.',
        detail: 'Lock socket A and socket B before opening the prediction console.',
      });
      return;
    }
    const pairMatches = pairsMatch(run.workingAlleles, this.activeTask().requestedAlleles);
    this.run.update(current => withAction({ ...current, phase: 'predict' }, `allele-pair-locked:${this.currentPair()}`));
    this.feedbackState.set(this.mode() === 'learn'
      ? {
        tone: pairMatches ? 'good' : 'warn',
        headline: pairMatches ? `Assigned allele pair ${this.currentPair()} complete.` : `Pair ${this.currentPair()} is sealed for analysis.`,
        detail: pairMatches ? 'Predict the phenotype and whether a recessive allele remains.' : 'Use the data trace to evaluate the pair you constructed.',
      }
      : {
        tone: 'neutral',
        headline: `Allele pair ${this.currentPair()} sealed.`,
        detail: 'Record predictions before energizing the analyzer.',
      });
  }

  private selectPrediction(targetId: string, value: unknown): void {
    if (this.run().phase !== 'predict') return;
    if (targetId === 'phenotype-readout' && isPrediction(value)) {
      this.run.update(current => withAction({ ...current, prediction: value }, `phenotype-predicted:${value}`));
    }
    if (targetId === 'recessive-prediction' && isYesNo(value)) {
      this.run.update(current => withAction({ ...current, predictedRecessiveRetained: value === 'yes' }, `recessive-predicted:${value}`));
    }
  }

  private lockPredictions(): void {
    const run = this.run();
    if (!run.prediction || (this.requiresRecessivePrediction() && run.predictedRecessiveRetained === null)) return;
    this.run.update(current => withAction({ ...current, phase: 'reveal' }, 'predictions-locked'));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Predictions locked.',
      detail: 'Energize the analyzer. The allele pair will remain visible throughout the trace.',
    });
  }

  private revealExpression(): void {
    const run = this.run();
    if (run.phase !== 'reveal' || run.expressionRevealed) return;
    const correct = run.prediction === this.actualPrediction();
    this.run.update(current => withAction({ ...current, expressionRevealed: true }, 'expression-analyzer-run'));
    const immediateFeedback = this.mode() === 'learn' || this.mode() === 'reteach';
    this.feedbackState.set(immediateFeedback
      ? {
        tone: correct ? 'good' : 'warn',
        headline: correct ? 'Prediction supported by the analyzer.' : 'The analyzer resolved a different phenotype.',
        detail: this.activeTask().explanation,
      }
      : {
        tone: 'neutral',
        headline: 'Expression analyzer cycle complete.',
        detail: 'Interpret the genotype class and the status of the recessive allele.',
      });
  }

  private openInterpretation(): void {
    if (this.run().phase !== 'reveal' || !this.run().expressionRevealed) return;
    this.run.update(current => withAction({ ...current, phase: 'explain' }, 'interpretation-opened'));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Machine data transferred to the interpretation desk.',
      detail: 'Classify the pair and state whether any recessive allele remains present.',
    });
  }

  private selectGenotypeInterpretation(value: AlleleGenotypeClass): void {
    if (this.run().phase !== 'explain' || this.run().interpretationLocked) return;
    this.run.update(current => withAction({ ...current, interpretationGenotypeClassId: value }, `genotype-interpreted:${value}`));
  }

  private selectRecessiveInterpretation(value: boolean): void {
    if (this.run().phase !== 'explain' || this.run().interpretationLocked) return;
    this.run.update(current => withAction({ ...current, interpretedRecessiveRetained: value }, `recessive-interpreted:${value ? 'yes' : 'no'}`));
  }

  private lockInterpretation(): void {
    const run = this.run();
    if (!run.interpretationGenotypeClassId || run.interpretedRecessiveRetained === null) return;
    const correct = run.interpretationGenotypeClassId === this.genotypeClass()
      && run.interpretedRecessiveRetained === this.recessiveAllelePresent();
    this.run.update(current => withAction({ ...current, interpretationLocked: true }, 'interpretation-locked'));
    const immediateFeedback = this.mode() === 'learn' || this.mode() === 'reteach';
    this.feedbackState.set(immediateFeedback
      ? {
        tone: correct ? 'good' : 'warn',
        headline: correct ? 'Interpretation matches the machine data.' : 'Interpretation recorded; inspect both allele symbols again.',
        detail: correct ? this.activeTask().explanation : 'Genotype class depends on both allele copies, not phenotype alone.',
      }
      : {
        tone: 'neutral',
        headline: 'Interpretation locked.',
        detail: 'Select the rule evidence that supports this laboratory result.',
      });
  }

  private pinEvidence(evidenceId: AlleleRuleEvidenceId): void {
    const run = this.run();
    if (run.phase !== 'explain' || !run.interpretationLocked) return;
    if (this.mode() === 'official' && run.evidenceId) return;
    const correct = evidenceId === this.activeTask().evidenceId;
    this.run.update(current => withAction({ ...current, evidenceId }, `evidence-pinned:${evidenceId}`));
    const immediateFeedback = this.mode() === 'learn' || this.mode() === 'reteach';
    this.feedbackState.set(immediateFeedback
      ? {
        tone: correct ? 'good' : 'warn',
        headline: correct ? 'That rule directly supports this result.' : 'A different rule is stronger evidence for this pair.',
        detail: correct ? this.activeTask().explanation : 'Compare the number and case of both allele symbols.',
      }
      : { tone: 'neutral', headline: 'Rule evidence recorded.', detail: 'Save the laboratory record when ready.' });
  }

  private saveRecord(): void {
    const run = this.run();
    const task = this.activeTask();
    if (!run.prediction || !run.evidenceId || !run.expressionRevealed || !run.interpretationLocked
      || !run.interpretationGenotypeClassId || run.interpretedRecessiveRetained === null) return;
    const constructionCorrect = pairsMatch(run.workingAlleles, task.requestedAlleles);
    const predictionCorrect = run.prediction === this.actualPrediction();
    const evidenceCorrect = run.evidenceId === task.evidenceId;
    const interpretationCorrect = run.interpretationGenotypeClassId === this.genotypeClass()
      && run.interpretedRecessiveRetained === this.recessiveAllelePresent();
    const allCorrect = constructionCorrect && predictionCorrect && evidenceCorrect && interpretationCorrect;
    const record: AlleleWorkbenchRecord = {
      sceneId: this.sceneId(),
      seed: `${this.seed()}:${this.mode()}:${task.id}:${task.sampleCode}`,
      sampleId: this.selectedSample().id,
      taskId: task.id,
      mode: this.mode(),
      traitId: task.traitId,
      focusGeneId: task.targetGeneId,
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
      misconception: allCorrect ? null : task.misconception,
      moveCount: run.moveCount,
      elapsedMs: Math.max(0, now() - run.openedAtMs),
      createdAtIso: new Date().toISOString(),
      sampleSelectionCorrect: run.loadedVialCode === task.sampleCode,
      geneLocationCorrect: run.geneLocationLocked,
      machineActions: run.machineActions,
      interpretationCorrect,
      sampleCode: task.sampleCode,
      chromosomeNumber: task.chromosomeNumber,
      predictedRecessiveRetained: run.predictedRecessiveRetained ?? undefined,
      interpretedRecessiveRetained: run.interpretedRecessiveRetained,
      interpretedGenotypeClassId: run.interpretationGenotypeClassId,
    };
    this.recordsState.update(records => [
      ...records.filter(existing => existing.taskId !== record.taskId || existing.mode !== record.mode),
      record,
    ]);
    this.evidenceSaved.emit(record);

    const feedback = this.mode() === 'official'
      ? { tone: 'neutral' as const, headline: 'Sealed laboratory record saved.', detail: 'Scoring remains hidden in official mode.' }
      : {
        tone: allCorrect ? 'good' as const : 'warn' as const,
        headline: allCorrect ? 'Complete evidence chain saved.' : 'Record saved with an unsupported step.',
        detail: allCorrect ? task.explanation : `Review the model evidence for ${task.targetGeneId}.`,
      };

    if (run.activeIndex >= run.taskIds.length - 1) {
      this.run.update(current => ({ ...current, phase: 'review' }));
      const records = this.records().filter(item => item.mode === this.mode() && run.taskIds.includes(item.taskId));
      this.setCompleted.emit({
        mode: this.mode(),
        correct: records.filter(item => item.constructionCorrect
          && item.predictionCorrect
          && item.evidenceCorrect
          && item.interpretationCorrect !== false).length,
        total: records.length,
        misconceptions: [...new Set(records
          .map(item => item.misconception)
          .filter((flag): flag is AlleleWorkbenchMisconception => !!flag))],
      });
      this.feedbackState.set(feedback);
      return;
    }

    const nextIndex = run.activeIndex + 1;
    this.run.set(createTaskRun(run.taskIds, nextIndex, this.tasks()[nextIndex]));
    this.feedbackState.set(feedback);
  }
}

function createRun(tasks: readonly AlleleWorkbenchTask[]): RunState {
  return createTaskRun(tasks.map(task => task.id), 0, tasks[0]);
}

function createTaskRun(
  taskIds: readonly string[],
  activeIndex: number,
  task: AlleleWorkbenchTask | undefined,
): RunState {
  return {
    taskIds,
    activeIndex,
    phase: 'observe',
    observeStep: 'select-sample',
    selectedVialCode: null,
    loadedVialCode: null,
    chamberLocked: false,
    sampleMismatch: false,
    centeredGeneIndex: 0,
    geneLocationLocked: false,
    locatorHintVisible: false,
    bandingEnabled: false,
    fluorescenceEnabled: false,
    homologComparisonEnabled: true,
    workingAlleles: task?.startingAlleles ?? ['W', 'w'],
    socketsSecured: [false, false],
    prediction: null,
    predictedRecessiveRetained: null,
    expressionRevealed: false,
    interpretationGenotypeClassId: null,
    interpretedRecessiveRetained: null,
    interpretationLocked: false,
    evidenceId: null,
    moveCount: 0,
    machineActions: [],
    openedAtMs: now(),
  };
}

function withAction(run: RunState, action: string): RunState {
  return { ...run, machineActions: [...run.machineActions, action] };
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

function isYesNo(value: unknown): value is 'yes' | 'no' {
  return value === 'yes' || value === 'no';
}

function isGenotypeClass(value: unknown): value is AlleleGenotypeClass {
  return value === 'homozygous-dominant'
    || value === 'heterozygous'
    || value === 'homozygous-recessive';
}

function isEvidence(value: string): value is AlleleRuleEvidenceId {
  return ALLELE_WORKBENCH_EVIDENCE.some(item => item.id === value);
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
