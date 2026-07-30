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
  DragonGenomeLabelPlacement,
  DragonGenomeLevelId,
  DragonVisualBridge,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
  GENOME_LEVEL_ORDER,
  GENOME_ZOOM_SEQUENCE,
  GenomeMicroscopeDisplayComponent,
  GenomeMicroscopeFeedback,
} from '../../../shared/dragon-visuals';
import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  phenotypeLabel,
} from '../simulation/domain/dragon-inheritance';
import { DragonPortraitComponent } from '../dragon-portrait.component';
import { genomeTraitFile } from '../simulation/data/dragon-genome-expedition.content';
import {
  GENOME_MICROSCOPE_COPY,
  GENOME_MICROSCOPE_MISCONCEPTION_NOTES,
  genomeMicroscopeTask,
  genomeMicroscopeTasks,
} from '../simulation/data/genome-microscope-content';
import {
  GenomeMicroscopeMisconception,
  GenomeMicroscopeMode,
  GenomeMicroscopeRecord,
  GenomeMicroscopeSetResult,
} from '../simulation/domain/genome-microscope.models';
import { createGenomeMicroscopeScene } from '../visual-adapter/dragon-visual-scene.adapter';

interface RunState {
  taskIds: readonly string[];
  activeIndex: number;
  phase: DragonVisualPhase;
  focusLevel: DragonGenomeLevelId;
  prediction: DragonGenomeLevelId | null;
  placements: readonly DragonGenomeLabelPlacement[];
  hierarchyAttempts: number;
  revealedLevelIds: readonly DragonGenomeLevelId[];
  evidenceLevelId: DragonGenomeLevelId | null;
  saved: boolean;
  openedAtMs: number;
}

interface PrimaryAction {
  label: string;
  disabled: boolean;
  kind: 'begin' | 'check-map' | 'reset-map' | 'explain' | 'save' | 'done' | 'waiting';
}

@Component({
  selector: 'app-genome-microscope-station',
  imports: [GenomeMicroscopeDisplayComponent, DragonPortraitComponent],
  templateUrl: './genome-microscope-station.component.html',
  styleUrl: './genome-microscope-station.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenomeMicroscopeStationComponent {
  private readonly bridge = inject(DragonVisualBridge);

  readonly mode = input<GenomeMicroscopeMode>('learn');
  readonly seed = input('module-2');
  readonly evidenceSaved = output<GenomeMicroscopeRecord>();
  readonly setCompleted = output<GenomeMicroscopeSetResult>();

  readonly profiles = DRAGON_PARENTS;
  readonly copy = GENOME_MICROSCOPE_COPY;
  readonly misconceptionNotes = GENOME_MICROSCOPE_MISCONCEPTION_NOTES;
  readonly selectedSampleId = signal(DRAGON_PARENTS[0].id);
  private readonly feedbackState = signal<GenomeMicroscopeFeedback | null>(null);
  private readonly recordsState = signal<readonly GenomeMicroscopeRecord[]>([]);

  private readonly tasks = computed(() => genomeMicroscopeTasks(this.mode(), this.seed()));
  private readonly run = linkedSignal<RunState>(() => createRun(this.tasks()));
  readonly feedback = this.feedbackState.asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly activeTask = computed(() => this.tasks()[this.run().activeIndex] ?? null);
  readonly selectedSample = computed(
    () =>
      DRAGON_PARENTS.find((profile) => profile.id === this.selectedSampleId()) ?? DRAGON_PARENTS[0],
  );
  readonly focusTrait = computed(() => {
    const task = this.activeTask();
    return DRAGON_TRAITS.find((trait) => trait.id === task?.focusTraitId) ?? DRAGON_TRAITS[0];
  });
  readonly traitFile = computed(() => genomeTraitFile(this.focusTrait().id));
  readonly investigationQuestion = computed(
    () => `${this.selectedSample().name}: ${this.traitFile().mysteryStem}`,
  );
  readonly visiblePhenotype = computed(() =>
    phenotypeLabel(this.selectedSample(), this.focusTrait().id),
  );
  readonly allelePair = computed(() => this.selectedSample().genome[this.focusTrait().id]);
  readonly finished = computed(() => this.run().phase === 'review');
  readonly correctCount = computed(
    () =>
      this.records().filter(
        (record) => record.predictionCorrect && record.hierarchyCorrect && record.evidenceCorrect,
      ).length,
  );

  readonly scene = computed<DragonVisualScene>(() => {
    const run = this.run();
    const task = this.activeTask();
    const trait = this.focusTrait();
    return createGenomeMicroscopeScene(
      this.selectedSample(),
      this.sceneId(),
      this.visualMode(),
      run.phase,
      {
        focusLevel: run.focusLevel,
        focusGeneId: trait.geneSymbol,
        taskId: task?.id,
        requestedLevel: task?.targetLevel,
        lockedPrediction: run.prediction,
        labelPlacements: run.placements,
        revealedLevelIds: run.revealedLevelIds,
        evidenceLevelId: run.evidenceLevelId,
        showLevelHints: this.mode() === 'learn' || this.mode() === 'reteach',
        seed: `${this.seed()}:${this.mode()}:${task?.id ?? 'complete'}:${this.selectedSampleId()}`,
        selection: { highlightedIds: [run.focusLevel] },
      },
    );
  });

  readonly primaryAction = computed<PrimaryAction>(() => {
    const run = this.run();
    if (run.phase === 'review') return { label: 'Station complete', disabled: true, kind: 'done' };
    if (run.phase === 'observe')
      return { label: 'Begin prediction', disabled: false, kind: 'begin' };
    if (run.phase === 'predict')
      return { label: 'Lock a microscope level above', disabled: true, kind: 'waiting' };
    if (run.phase === 'manipulate') {
      const incorrect = run.placements.some((placement) => placement.status === 'incorrect');
      if (incorrect) return { label: 'Reset incorrect labels', disabled: false, kind: 'reset-map' };
      return {
        label: 'Check map and resolve sample',
        disabled: run.placements.length !== GENOME_LEVEL_ORDER.length,
        kind: 'check-map',
      };
    }
    if (run.phase === 'reveal')
      return { label: 'Explain with evidence', disabled: false, kind: 'explain' };
    return {
      label:
        run.activeIndex === run.taskIds.length - 1
          ? 'Save final microscope record'
          : 'Save record and load next sample',
      disabled: !run.evidenceLevelId,
      kind: 'save',
    };
  });

  readonly stepHint = computed(() => {
    switch (this.run().phase) {
      case 'observe':
        return 'Observe: inspect the generic sample record and read the microscope assignment.';
      case 'predict':
        return 'Predict: choose the level before any allele symbols are revealed.';
      case 'manipulate':
        return 'Map: select a hierarchy label, then select its numbered bay. Dragging also works.';
      case 'reveal':
        return 'Reveal: follow nucleus → chromosome → DNA → gene → allele pair.';
      case 'explain':
        return 'Explain: pin the level that directly supports your answer.';
      default:
        return 'All microscope evidence has been saved.';
    }
  });

  readonly modeLabel = computed(
    () =>
      ({
        learn: 'Learn · guided containment map',
        practice: 'Practice · varied fixed-seed tasks',
        official: 'Official · hints and immediate scoring off',
        reteach: 'Reteach · gene, allele, and base-pair contrast',
      })[this.mode()],
  );

  constructor() {
    effect(() => this.bridge.showScene(this.scene()));
    effect(() => {
      if (this.run().phase === 'reveal') this.bridge.playSequence(GENOME_ZOOM_SEQUENCE, 'station');
      else this.bridge.stopSequence();
    });
  }

  selectSample(sampleId: string): void {
    if (this.run().phase !== 'observe') return;
    if (DRAGON_PARENTS.some((profile) => profile.id === sampleId)) {
      this.selectedSampleId.set(sampleId);
    }
  }

  alleleVaultOpen(): boolean {
    return this.run().revealedLevelIds.includes('allele') || this.run().phase === 'review';
  }

  onStageEvent(event: DragonVisualStageEvent): void {
    switch (event.type) {
      case 'hotspot-selected':
        if (isGenomeLevel(event.targetId)) {
          this.run.update((current) => ({
            ...current,
            focusLevel: event.targetId as DragonGenomeLevelId,
          }));
        }
        break;
      case 'prediction-locked':
        if (isGenomeLevel(event.value)) this.lockPrediction(event.value as DragonGenomeLevelId);
        break;
      case 'label-placed':
        if (isGenomeLevel(event.targetId) && isGenomeLevel(event.value)) {
          this.placeLabel(
            event.targetId as DragonGenomeLevelId,
            event.value as DragonGenomeLevelId,
          );
        }
        break;
      case 'evidence-pinned':
        if (isGenomeLevel(event.targetId)) this.pinEvidence(event.targetId as DragonGenomeLevelId);
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
      case 'check-map':
        this.checkMap();
        break;
      case 'reset-map':
        this.resetIncorrectLabels();
        break;
      case 'explain':
        this.setPhase('explain');
        this.feedbackState.set({
          tone: 'neutral',
          headline: 'Choose the level that directly supports the assignment.',
          detail: 'The strongest evidence names the relevant scale of biological information.',
        });
        break;
      case 'save':
        this.saveRecord();
        break;
      default:
        break;
    }
  }

  taskLabel(taskId: string): string {
    return genomeMicroscopeTask(taskId).prompt;
  }

  runPhaseLocked(): boolean {
    return this.run().phase !== 'observe';
  }

  currentPredictionLabel(): string {
    return this.run().prediction ?? 'Not locked';
  }

  placedLabelCount(): number {
    return this.run().placements.length;
  }

  hierarchyAttemptCount(): number {
    return this.run().hierarchyAttempts;
  }

  currentEvidenceLabel(): string {
    return this.run().evidenceLevelId ?? 'Not pinned';
  }

  activeTaskNumber(): number {
    return Math.min(this.run().activeIndex + 1, this.run().taskIds.length);
  }

  taskCount(): number {
    return this.run().taskIds.length;
  }

  private sceneId(): string {
    return `module-2-genome-microscope-${this.mode()}-${this.activeTask()?.id ?? 'complete'}`;
  }

  private visualMode(): DragonVisualMode {
    return this.mode() === 'official'
      ? 'official'
      : this.mode() === 'practice'
        ? 'practice'
        : 'learn';
  }

  private lockPrediction(level: DragonGenomeLevelId): void {
    if (this.run().phase !== 'predict') return;
    this.run.update((current) => ({ ...current, prediction: level, phase: 'manipulate' }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Prediction locked: ${level}.`,
      detail: 'Now reconstruct all five nested levels before the microscope resolves the sample.',
    });
  }

  private placeLabel(labelId: DragonGenomeLevelId, levelId: DragonGenomeLevelId): void {
    const run = this.run();
    if (run.phase !== 'manipulate') return;
    if (
      run.placements.some(
        (placement) => placement.labelId === labelId || placement.levelId === levelId,
      )
    )
      return;
    this.run.update((current) => ({
      ...current,
      placements: [
        ...current.placements,
        {
          labelId,
          levelId,
          status: 'pending' as const,
          revealed: false,
        },
      ],
    }));
    this.feedbackState.set(null);
  }

  private checkMap(): void {
    const run = this.run();
    if (run.phase !== 'manipulate' || run.placements.length !== GENOME_LEVEL_ORDER.length) return;
    const correct = run.placements.every((placement) => placement.labelId === placement.levelId);
    const revealStatus = (placement: DragonGenomeLabelPlacement): DragonGenomeLabelPlacement => ({
      ...placement,
      status: placement.labelId === placement.levelId ? 'correct' : 'incorrect',
      revealed: this.mode() !== 'official',
    });
    if (!correct) {
      this.run.update((current) => ({
        ...current,
        hierarchyAttempts: current.hierarchyAttempts + 1,
        placements: current.placements.map(revealStatus),
      }));
      this.feedbackState.set({
        tone: 'warn',
        headline: 'The containment map needs revision.',
        detail:
          this.mode() === 'official'
            ? 'Reset the map and try the complete order again.'
            : 'Keep the correctly placed labels. Reset the marked labels and trace from the nucleus toward smaller information units.',
      });
      return;
    }
    const predictionCorrect = run.prediction === this.activeTask()?.targetLevel;
    this.run.update((current) => ({
      ...current,
      phase: 'reveal',
      focusLevel: 'allele',
      hierarchyAttempts: current.hierarchyAttempts + 1,
      placements: current.placements.map((placement) => ({
        ...placement,
        status: 'correct',
        revealed: true,
      })),
      revealedLevelIds: GENOME_LEVEL_ORDER,
    }));
    this.feedbackState.set(
      this.mode() === 'official'
        ? {
            tone: 'neutral',
            headline: 'Sample resolved.',
            detail:
              'Follow the containment path and pin the level that supports your submitted prediction.',
          }
        : {
            tone: predictionCorrect ? 'good' : 'warn',
            headline: predictionCorrect
              ? 'Prediction supported.'
              : 'The sample resolved at a different level.',
            detail: this.activeTask()?.explanation,
          },
    );
  }

  private resetIncorrectLabels(): void {
    this.run.update((current) => ({
      ...current,
      placements:
        this.mode() === 'official'
          ? []
          : current.placements.filter((placement) => placement.status === 'correct'),
    }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Open slots are ready.',
      detail: 'Select an unused label, then select its matching microscope bay.',
    });
  }

  private pinEvidence(level: DragonGenomeLevelId): void {
    if (this.run().phase !== 'explain') return;
    if (this.mode() === 'official' && this.run().evidenceLevelId) return;
    const correct = level === this.activeTask()?.evidenceLevel;
    this.run.update((current) => ({ ...current, evidenceLevelId: level }));
    this.feedbackState.set(
      this.mode() === 'official'
        ? {
            tone: 'neutral',
            headline: 'Evidence recorded.',
            detail: 'Save this microscope record when ready.',
          }
        : {
            tone: correct ? 'good' : 'warn',
            headline: correct
              ? 'This level directly supports the claim.'
              : 'That level is part of the path, but it is not the strongest evidence.',
            detail: correct
              ? this.activeTask()?.explanation
              : 'Choose the level named by the assignment and compare its definition.',
          },
    );
  }

  private saveRecord(): void {
    const run = this.run();
    const task = this.activeTask();
    if (!task || !run.prediction || !run.evidenceLevelId) return;
    const predictionCorrect = run.prediction === task.targetLevel;
    const evidenceCorrect = run.evidenceLevelId === task.evidenceLevel;
    const record: GenomeMicroscopeRecord = {
      sceneId: this.sceneId(),
      seed: `${this.seed()}:${this.mode()}:${task.id}:${this.selectedSampleId()}`,
      sampleId: this.selectedSampleId(),
      taskId: task.id,
      mode: this.mode(),
      focusGeneId: this.focusTrait().geneSymbol,
      predictedLevel: run.prediction,
      requestedLevel: task.targetLevel,
      predictionCorrect,
      hierarchyCorrect: run.placements.every((placement) => placement.status === 'correct'),
      hierarchyAttempts: run.hierarchyAttempts,
      evidenceLevelId: run.evidenceLevelId,
      evidenceCorrect,
      misconception: predictionCorrect && evidenceCorrect ? null : task.misconception,
      elapsedMs: Math.max(0, now() - run.openedAtMs),
      createdAtIso: new Date().toISOString(),
    };
    this.recordsState.update((records) => [...records, record]);
    this.evidenceSaved.emit(record);

    if (run.activeIndex >= run.taskIds.length - 1) {
      this.run.update((current) => ({ ...current, phase: 'review', saved: true }));
      const records = this.records().filter(
        (item) => item.mode === this.mode() && run.taskIds.includes(item.taskId),
      );
      this.setCompleted.emit({
        mode: this.mode(),
        correct: records.filter(
          (item) => item.predictionCorrect && item.hierarchyCorrect && item.evidenceCorrect,
        ).length,
        total: records.length,
        misconceptions: [
          ...new Set(
            records
              .map((item) => item.misconception)
              .filter((flag): flag is GenomeMicroscopeMisconception => !!flag),
          ),
        ],
      });
      return;
    }

    this.run.update((current) => ({
      ...createRun(this.tasks()),
      taskIds: current.taskIds,
      activeIndex: current.activeIndex + 1,
      openedAtMs: now(),
    }));
    this.feedbackState.set(null);
  }

  private setPhase(phase: DragonVisualPhase): void {
    this.run.update((current) => ({ ...current, phase }));
  }
}

function createRun(tasks: readonly { id: string }[]): RunState {
  return {
    taskIds: tasks.map((task) => task.id),
    activeIndex: 0,
    phase: 'observe',
    focusLevel: 'cell',
    prediction: null,
    placements: [],
    hierarchyAttempts: 0,
    revealedLevelIds: [],
    evidenceLevelId: null,
    saved: false,
    openedAtMs: now(),
  };
}

function isGenomeLevel(value: unknown): value is DragonGenomeLevelId {
  return typeof value === 'string' && GENOME_LEVEL_ORDER.includes(value as DragonGenomeLevelId);
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
