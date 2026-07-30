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
  DragonScannerOptionStatus,
  DragonVisualBridge,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
  GENOTYPE_SCAN_SEQUENCE,
  GenotypeScannerDisplayComponent,
  GenotypeScannerFeedback,
} from '../../../shared/dragon-visuals';
import { getTrait } from '../simulation/domain/dragon-inheritance';
import {
  GENOTYPE_SCANNER_COPY,
  GENOTYPE_SCANNER_MISCONCEPTION_NOTES,
  genotypeScannerReteachTasks,
  genotypeScannerSpecimen,
  genotypeScannerTasks,
  scannerOptions,
} from '../simulation/data/genotype-scanner-content';
import {
  GenotypeScanAnswer,
  GenotypeScanRecord,
  GenotypeScannerMisconception,
  GenotypeScannerMode,
  GenotypeScannerSetResult,
  GenotypeScannerTask,
} from '../simulation/domain/genotype-scanner.models';
import { createGenotypeScannerScene } from '../visual-adapter/dragon-visual-scene.adapter';

interface RunState {
  taskIds: readonly string[];
  activeIndex: number;
  phase: DragonVisualPhase;
  selectedOptionIds: readonly string[];
  selectionLocked: boolean;
  revealed: boolean;
  evidenceMarkId: string | null;
  evidenceAttempts: number;
  saved: boolean;
  openedAtMs: number;
  submitted: boolean;
}

interface PrimaryAction {
  label: string;
  disabled: boolean;
  kind: 'begin' | 'lock' | 'scan' | 'explain' | 'save' | 'submit' | 'done' | 'waiting';
}

/**
 * Module 3 laboratory station: the lesson half of the Genotype Scanner.
 *
 * It owns the teaching loop (read, select, lock, scan, compare, explain, save), correctness,
 * misconception diagnosis, and evidence records. `GenotypeScannerDisplayComponent` draws the
 * published scene and reports semantic stage events back here.
 */
@Component({
  selector: 'app-genotype-scanner-station',
  imports: [GenotypeScannerDisplayComponent],
  templateUrl: './genotype-scanner-station.component.html',
  styleUrl: './genotype-scanner-station.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenotypeScannerStationComponent {
  private readonly bridge = inject(DragonVisualBridge);

  readonly mode = input<GenotypeScannerMode>('learn');
  readonly seed = input('module-3');
  /** Diagnosed misconception used to choose a reteach bundle. */
  readonly reteachFlag = input<GenotypeScannerMisconception | null>(null);

  readonly evidenceSaved = output<GenotypeScanRecord>();
  readonly answered = output<GenotypeScanAnswer>();
  readonly setCompleted = output<GenotypeScannerSetResult>();

  readonly copy = GENOTYPE_SCANNER_COPY;
  readonly misconceptionNotes = GENOTYPE_SCANNER_MISCONCEPTION_NOTES;

  private readonly feedbackState = signal<GenotypeScannerFeedback | null>(null);
  private readonly recordsState = signal<readonly GenotypeScanRecord[]>([]);
  private readonly misconceptionCounts = signal<Readonly<Record<string, number>>>({});

  private readonly taskList = computed<readonly GenotypeScannerTask[]>(() => {
    const mode = this.mode();
    if (mode === 'reteach') return genotypeScannerReteachTasks(this.reteachFlag());
    return genotypeScannerTasks(mode, this.seed());
  });
  private readonly run = linkedSignal<RunState>(() => createRun(this.taskList()));

  readonly feedback = this.feedbackState.asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly tasks = this.taskList;
  readonly activeTask = computed(() => this.taskList()[this.run().activeIndex] ?? null);
  readonly activeOptions = computed(() => {
    const task = this.activeTask();
    return task ? scannerOptions(task.traitId, task.direction) : [];
  });
  readonly finished = computed(() =>
    this.run().phase === 'review' && (this.mode() !== 'official' || this.run().submitted));
  readonly savedCount = computed(() => this.records().length);
  readonly correctCount = computed(() =>
    this.records().filter(record => record.selectionCorrect && record.evidenceCorrect).length);
  readonly openMisconceptions = computed(() =>
    Object.entries(this.misconceptionCounts())
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([flag, count]) => ({ flag: flag as GenotypeScannerMisconception, count })));

  readonly scene = computed<DragonVisualScene>(() => {
    const run = this.run();
    const task = this.activeTask();
    const trait = getTrait(task?.traitId ?? 'wings');
    const profile = genotypeScannerSpecimen(task?.sampleId ?? 'scan-s11');
    const comparison = task?.comparisonSampleId
      ? genotypeScannerSpecimen(task.comparisonSampleId)
      : null;
    // Genotype-first tasks open the scan and seal the readout instead.
    const concealed = task?.direction === 'genotype-first' ? 'phenotype' : 'genotype';

    return createGenotypeScannerScene(
      profile,
      this.sceneId(),
      this.visualMode(),
      run.phase,
      {
        focusGeneId: trait.geneSymbol,
        genotypeRevealed: run.revealed,
        concealed,
        optionKind: task?.direction === 'genotype-first' ? 'phenotype' : 'genotype',
        options: this.activeOptions(),
        selectedOptionIds: run.selectedOptionIds,
        optionStatuses: this.optionStatuses(),
        selectionLocked: run.selectionLocked,
        comparisonProfile: comparison,
        evidenceMarks: (task?.evidence ?? []).map(mark => ({
          id: mark.id,
          labelId: `evidence.${mark.id}`,
          anchorId: mark.anchorId,
        })),
        evidenceMarkId: run.evidenceMarkId,
        showHints: this.mode() === 'learn' || this.mode() === 'reteach',
        seed: `${this.seed()}:${this.mode()}:${task?.id ?? 'complete'}`,
      },
    );
  });

  readonly primaryAction = computed<PrimaryAction>(() => {
    const run = this.run();
    if (this.finished()) return { label: 'Station complete', disabled: true, kind: 'done' };
    if (this.mode() === 'official' && !run.submitted && run.phase === 'review') {
      return { label: 'Submit scans', disabled: false, kind: 'submit' };
    }
    switch (run.phase) {
      case 'observe':
        return { label: 'I have read the readout — select records', disabled: false, kind: 'begin' };
      case 'predict':
        return {
          label: 'Lock this selection',
          disabled: !run.selectedOptionIds.length,
          kind: 'lock',
        };
      case 'manipulate':
        return { label: 'Run the allele scan', disabled: false, kind: 'scan' };
      case 'reveal':
        return { label: 'Pin the supporting evidence', disabled: false, kind: 'explain' };
      default:
        return {
          label: this.run().activeIndex === this.taskList().length - 1
            ? 'Save final scan record'
            : 'Save record and load next sample',
          disabled: !run.evidenceMarkId,
          kind: 'save',
        };
    }
  });

  readonly stepHint = computed(() => {
    const task = this.activeTask();
    if (this.finished()) return `All ${this.savedCount()} scan records are saved.`;
    switch (this.run().phase) {
      case 'observe':
        return task?.direction === 'genotype-first'
          ? 'Step 1 — Read: the scan is already open. The readout is sealed.'
          : 'Step 1 — Read: the readout is visible. The allele pair is sealed.';
      case 'predict':
        return 'Step 2 — Select: mark every record the evidence still supports. More than one can be right.';
      case 'manipulate':
        return 'Step 3 — Scan: your selection is locked, so the shield can open.';
      case 'reveal':
        return 'Step 4 — Compare: check the actual pair against the records you selected.';
      case 'explain':
        return 'Step 5 — Explain: pin the mark that proves your claim.';
      default:
        return 'Review your saved scan records.';
    }
  });

  readonly modeLabel = computed(() => ({
    learn: 'Learn · zygosity hints on',
    practice: 'Practice · both directions, hints off',
    official: 'Official · no hints, results locked until submit',
    reteach: 'Reteach · same readout, different scans',
  }[this.mode()]));

  constructor() {
    effect(() => this.bridge.showScene(this.scene()));
    effect(() => {
      const phase = this.run().phase;
      if (phase === 'manipulate' || phase === 'reveal' || phase === 'explain') {
        this.bridge.playSequence(GENOTYPE_SCAN_SEQUENCE, 'station');
      } else {
        this.bridge.stopSequence();
      }
    });
  }

  onStageEvent(event: DragonVisualStageEvent): void {
    switch (event.type) {
      case 'allele-selected':
        this.toggleOption(event.targetId);
        break;
      case 'reveal-requested':
        this.runScan();
        break;
      case 'evidence-pinned':
        this.pinEvidence(event.targetId);
        break;
      default:
        break;
    }
  }

  runPrimaryAction(): void {
    const action = this.primaryAction();
    if (action.disabled) return;
    switch (action.kind) {
      case 'begin':
        this.setPhase('predict');
        break;
      case 'lock':
        this.lockSelection();
        break;
      case 'scan':
        this.runScan();
        break;
      case 'explain':
        this.setPhase('explain');
        this.feedbackState.set({
          tone: 'neutral',
          headline: 'Pin the mark that supports your claim.',
          detail: 'Only one mark reports what the scan and the readout actually show together.',
        });
        break;
      case 'save':
        this.saveActive();
        break;
      case 'submit':
        this.submitOfficial();
        break;
      default:
        break;
    }
  }

  readonly pinnedMarkId = computed(() => this.run().evidenceMarkId);
  readonly selectedLabels = computed(() =>
    this.run().selectedOptionIds.map(id => this.optionLabel(id)).join(', '));

  evidenceTextFor(markId: string | null): string {
    if (!markId) return '';
    for (const task of this.taskList()) {
      const mark = task.evidence.find(candidate => candidate.id === markId);
      if (mark) return mark.text;
    }
    return '';
  }

  optionLabel(optionId: string): string {
    const option = this.activeOptions().find(candidate => candidate.id === optionId);
    if (!option) return optionId;
    return option.kind === 'genotype'
      ? option.alleles?.join('') ?? optionId
      : this.copy[option.labelId ?? ''] ?? optionId;
  }

  taskLabel(taskId: string): string {
    const task = this.taskList().find(candidate => candidate.id === taskId);
    return task ? task.prompt : taskId;
  }

  private sceneId(): string {
    return `module-3-genotype-scanner-${this.mode()}`;
  }

  private visualMode(): DragonVisualMode {
    const mode = this.mode();
    return mode === 'official' ? 'official' : mode === 'practice' ? 'practice' : 'learn';
  }

  /**
   * Verdicts are published only after the scan opens, and only the lesson computes them.
   * Official runs withhold them until the whole set is submitted.
   */
  private optionStatuses(): readonly DragonScannerOptionStatus[] {
    const run = this.run();
    const task = this.activeTask();
    if (!task || !run.revealed) return [];
    if (this.mode() === 'official' && !run.submitted) return [];
    const supported = new Set(task.supportedOptionIds);
    return this.activeOptions().map(option => {
      const selected = run.selectedOptionIds.includes(option.id);
      if (selected && supported.has(option.id)) return { optionId: option.id, status: 'correct' as const };
      if (selected) return { optionId: option.id, status: 'incorrect' as const };
      if (supported.has(option.id)) return { optionId: option.id, status: 'missed' as const };
      return { optionId: option.id, status: 'pending' as const };
    });
  }

  private toggleOption(optionId: string): void {
    const run = this.run();
    if (run.phase !== 'predict' || run.selectionLocked) return;
    if (!this.activeOptions().some(option => option.id === optionId)) return;
    this.run.update(current => ({
      ...current,
      selectedOptionIds: current.selectedOptionIds.includes(optionId)
        ? current.selectedOptionIds.filter(id => id !== optionId)
        : [...current.selectedOptionIds, optionId],
    }));
  }

  private lockSelection(): void {
    if (!this.run().selectedOptionIds.length) return;
    this.run.update(current => ({ ...current, selectionLocked: true, phase: 'manipulate' }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Selection locked.',
      detail: 'Run the scan to see which records the allele pair actually supports.',
    });
  }

  private runScan(): void {
    const task = this.activeTask();
    const run = this.run();
    if (!task || run.phase !== 'manipulate' || run.revealed) return;

    this.run.update(current => ({ ...current, revealed: true, phase: 'reveal' }));

    const supported = new Set(task.supportedOptionIds);
    const selected = new Set(run.selectedOptionIds);
    const wrongSelections = [...selected].filter(id => !supported.has(id));
    const missed = [...supported].filter(id => !selected.has(id));
    const correct = !wrongSelections.length && !missed.length;
    const diagnosed = correct ? null : this.diagnoseSelection(task, wrongSelections, missed);

    if (this.mode() === 'official') {
      // Official runs still diagnose; they just do not show the result yet.
      if (diagnosed) this.flagMisconception(diagnosed);
      this.feedbackState.set({
        tone: 'neutral',
        headline: 'Scan recorded.',
        detail: 'Pin the evidence you would use to defend this selection. Results stay locked until you submit.',
      });
      return;
    }
    if (correct) {
      this.feedbackState.set({
        tone: 'good',
        headline: 'Every supported record was selected.',
        detail: task.rule,
      });
      return;
    }
    const flag = diagnosed;
    if (flag) this.flagMisconception(flag);
    this.feedbackState.set({
      tone: 'warn',
      headline: missed.length
        ? `Missed a supported record: ${missed.map(id => this.optionLabel(id)).join(', ')}.`
        : `Unsupported record selected: ${wrongSelections.map(id => this.optionLabel(id)).join(', ')}.`,
      detail: `${flag ? this.misconceptionNotes[flag] + ' ' : ''}${task.rule}`,
    });
  }

  private pinEvidence(markId: string): void {
    const task = this.activeTask();
    const run = this.run();
    if (!task || run.phase !== 'explain') return;
    const mark = task.evidence.find(candidate => candidate.id === markId);
    if (!mark) return;
    if (this.mode() === 'official' && run.evidenceMarkId) return;

    this.run.update(current => ({
      ...current,
      evidenceMarkId: markId,
      evidenceAttempts: current.evidenceAttempts + 1,
    }));

    if (this.mode() === 'official') {
      this.feedbackState.set({ tone: 'neutral', headline: 'Evidence pinned.', detail: 'You can save this record.' });
      return;
    }
    if (!mark.misconception) {
      this.feedbackState.set({
        tone: 'good',
        headline: 'Evidence pinned.',
        detail: 'This mark reports what the scan and the readout show together, which is what supports the claim.',
      });
      return;
    }
    this.flagMisconception(mark.misconception);
    this.feedbackState.set({
      tone: 'warn',
      headline: 'That mark does not support the claim.',
      detail: `${this.misconceptionNotes[mark.misconception]} Choose again, or save and revisit it in the record list.`,
    });
  }

  private saveActive(): void {
    const task = this.activeTask();
    const run = this.run();
    if (!task || !run.revealed || !run.evidenceMarkId) return;

    const profile = genotypeScannerSpecimen(task.sampleId);
    const trait = getTrait(task.traitId);
    const supported = new Set(task.supportedOptionIds);
    const selected = new Set(run.selectedOptionIds);
    const wrongSelections = [...selected].filter(id => !supported.has(id));
    const missed = [...supported].filter(id => !selected.has(id));
    const selectionCorrect = !wrongSelections.length && !missed.length;
    const mark = task.evidence.find(candidate => candidate.id === run.evidenceMarkId);
    const evidenceCorrect = run.evidenceMarkId === task.correctEvidenceId;

    const record: GenotypeScanRecord = {
      sceneId: this.sceneId(),
      seed: `${this.seed()}:${this.mode()}`,
      sampleId: task.sampleId,
      taskId: task.id,
      mode: this.mode(),
      geneId: trait.geneSymbol,
      direction: task.direction,
      selectedOptionIds: [...run.selectedOptionIds],
      supportedOptionIds: [...task.supportedOptionIds],
      selectionCorrect,
      revealedGenotype: profile.genome[task.traitId].join(''),
      evidenceMarkId: run.evidenceMarkId,
      evidenceCorrect,
      attempts: 1 + run.evidenceAttempts,
      misconception: selectionCorrect
        ? mark?.misconception ?? null
        : this.diagnoseSelection(task, wrongSelections, missed),
      elapsedMs: Math.max(0, now() - run.openedAtMs),
      createdAtIso: new Date().toISOString(),
    };

    this.recordsState.update(records => [...records, record]);
    this.evidenceSaved.emit(record);
    if (task.questionId) {
      this.answered.emit({
        taskId: task.id,
        questionId: task.questionId,
        correct: selectionCorrect,
      });
    }
    this.advance();
  }

  private advance(): void {
    const run = this.run();
    const nextIndex = run.activeIndex + 1;
    if (nextIndex >= this.taskList().length) {
      this.run.update(current => ({ ...current, saved: true, phase: 'review' }));
      this.feedbackState.set(null);
      if (this.mode() !== 'official') this.emitSetResult();
      return;
    }
    this.feedbackState.set(null);
    this.run.update(current => ({
      ...current,
      activeIndex: nextIndex,
      phase: 'observe',
      selectedOptionIds: [],
      selectionLocked: false,
      revealed: false,
      evidenceMarkId: null,
      evidenceAttempts: 0,
      openedAtMs: now(),
    }));
  }

  private submitOfficial(): void {
    this.run.update(current => ({ ...current, submitted: true }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Scans submitted.',
      detail: `${this.correctCount()} of ${this.savedCount()} records were fully supported by the evidence.`,
    });
    this.emitSetResult();
  }

  private emitSetResult(): void {
    this.setCompleted.emit({
      mode: this.mode(),
      correct: this.correctCount(),
      total: this.savedCount(),
      misconceptions: this.openMisconceptions().map(entry => entry.flag),
    });
  }

  private diagnoseSelection(
    task: GenotypeScannerTask,
    wrongSelections: readonly string[],
    missed: readonly string[],
  ): GenotypeScannerMisconception | null {
    for (const optionId of [...wrongSelections, ...missed]) {
      const flag = task.optionMisconceptions[optionId];
      if (flag) return flag;
    }
    return null;
  }

  private flagMisconception(flag: GenotypeScannerMisconception): void {
    this.misconceptionCounts.update(counts => ({ ...counts, [flag]: (counts[flag] ?? 0) + 1 }));
  }

  private setPhase(phase: DragonVisualPhase): void {
    this.run.update(current => ({ ...current, phase }));
  }
}

function createRun(tasks: readonly GenotypeScannerTask[]): RunState {
  return {
    taskIds: tasks.map(task => task.id),
    activeIndex: 0,
    phase: 'observe',
    selectedOptionIds: [],
    selectionLocked: false,
    revealed: false,
    evidenceMarkId: null,
    evidenceAttempts: 0,
    saved: false,
    openedAtMs: now(),
    submitted: false,
  };
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
