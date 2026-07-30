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
  DragonVisualBridge,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
  EVIDENCE_PATH_SEQUENCE,
  TraitInspectorDisplayComponent,
  TraitInspectorFeedback,
} from '../../../shared/dragon-visuals';
import {
  TRAIT_EVIDENCE_COPY,
  TRAIT_EVIDENCE_MISCONCEPTION_NOTES,
  TRAIT_EVIDENCE_SPECIMEN,
  traitEvidenceObservation,
  traitEvidenceReteachSet,
  traitEvidenceSet,
} from '../simulation/data/trait-evidence-content';
import {
  TraitEvidenceCategory,
  TraitEvidenceClassification,
  TraitEvidenceMisconception,
  TraitEvidenceMode,
  TraitEvidenceObservation,
  TraitEvidenceRecord,
  TraitEvidenceSetResult,
} from '../simulation/domain/trait-evidence.models';
import {
  createTraitInspectorScene,
  toVisualClues,
  toVisualObservations,
} from '../visual-adapter/dragon-visual-scene.adapter';

interface ItemState {
  prediction: TraitEvidenceCategory | null;
  tray: TraitEvidenceCategory | null;
  revealed: boolean;
  pinnedClueId: string | null;
  clueAttempts: number;
  saved: boolean;
  openedAtMs: number;
}

interface RunState {
  itemIds: readonly string[];
  activeId: string | null;
  phase: DragonVisualPhase;
  items: Readonly<Record<string, ItemState>>;
  submitted: boolean;
  reteachAppended: boolean;
}

interface PrimaryAction {
  label: string;
  disabled: boolean;
  kind: 'begin-prediction' | 'open-explain' | 'save' | 'submit' | 'done' | 'waiting';
}

const WORKED_EXAMPLE_ID = 'worked-ash-stain';

/**
 * Module 1 laboratory station: the lesson half of the Trait Evidence Analyzer.
 *
 * It owns the teaching loop (observe, predict, manipulate, reveal, explain, save),
 * correctness, misconception diagnosis, reteach selection, and evidence records. The
 * graphics half is `TraitInspectorDisplayComponent`, which only draws the published scene
 * and reports semantic stage events back here.
 */
@Component({
  selector: 'app-trait-evidence-station',
  imports: [TraitInspectorDisplayComponent],
  templateUrl: './trait-evidence-station.component.html',
  styleUrl: './trait-evidence-station.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraitEvidenceStationComponent {
  private readonly bridge = inject(DragonVisualBridge);

  readonly mode = input<TraitEvidenceMode>('learn');
  readonly seed = input('module-1');
  /** Diagnosed misconception used to choose a reteach bundle. */
  readonly reteachFlag = input<TraitEvidenceMisconception | null>(null);

  readonly evidenceSaved = output<TraitEvidenceRecord>();
  readonly classified = output<TraitEvidenceClassification>();
  readonly setCompleted = output<TraitEvidenceSetResult>();
  readonly reteachTriggered = output<TraitEvidenceMisconception>();

  readonly copy = TRAIT_EVIDENCE_COPY;
  readonly misconceptionNotes = TRAIT_EVIDENCE_MISCONCEPTION_NOTES;

  private readonly feedbackState = signal<TraitInspectorFeedback | null>(null);
  private readonly reteachNoticeState = signal<string | null>(null);
  private readonly misconceptionCounts = signal<Readonly<Record<string, number>>>({});
  private readonly savedRecords = signal<readonly TraitEvidenceRecord[]>([]);

  private readonly baseItems = computed<readonly TraitEvidenceObservation[]>(() => {
    const mode = this.mode();
    if (mode === 'reteach') return traitEvidenceReteachSet(this.reteachFlag());
    return traitEvidenceSet(mode, this.seed());
  });

  private readonly run = linkedSignal<RunState>(() => createRun(this.baseItems(), this.mode()));

  readonly feedback = this.feedbackState.asReadonly();
  readonly reteachNotice = this.reteachNoticeState.asReadonly();
  readonly records = this.savedRecords.asReadonly();
  readonly items = computed(() => this.run().itemIds.map(traitEvidenceObservation));
  readonly activeItem = computed(() => {
    const activeId = this.run().activeId;
    return activeId ? traitEvidenceObservation(activeId) : null;
  });
  readonly activeState = computed(() => {
    const activeId = this.run().activeId;
    return activeId ? this.run().items[activeId] ?? null : null;
  });
  readonly finished = computed(() => {
    const run = this.run();
    const complete = run.itemIds.every(id => run.items[id]?.saved);
    return complete && (this.mode() !== 'official' || run.submitted);
  });
  /** Counts student responses only; the Learn-mode worked example is a demonstration. */
  readonly savedCount = computed(() => this.savedRecords().length);
  readonly correctCount = computed(() => this.savedRecords().filter(record => record.correct).length);
  readonly openMisconceptions = computed(() =>
    Object.entries(this.misconceptionCounts())
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([flag, count]) => ({ flag: flag as TraitEvidenceMisconception, count })));

  readonly scene = computed<DragonVisualScene>(() => {
    const run = this.run();
    const observations = this.items();
    const activeState = run.activeId ? run.items[run.activeId] : undefined;
    return createTraitInspectorScene(
      TRAIT_EVIDENCE_SPECIMEN,
      this.sceneId(),
      this.visualMode(),
      run.phase,
      {
        observations: toVisualObservations(observations),
        clues: toVisualClues(observations),
        placements: this.placements(),
        activeObservationId: run.activeId,
        lockedPrediction: activeState?.prediction ?? null,
        showSourceHints: this.mode() === 'learn' || this.mode() === 'reteach',
        seed: `${this.seed()}:${this.mode()}`,
        selection: {
          highlightedIds: run.activeId ? [run.activeId] : [],
          disabledIds: run.itemIds.filter(id =>
            id !== run.activeId && !run.items[id]?.tray),
        },
      },
    );
  });

  readonly primaryAction = computed<PrimaryAction>(() => {
    const run = this.run();
    if (this.finished()) return { label: 'Station complete', disabled: true, kind: 'done' };
    if (this.mode() === 'official' && !run.submitted
      && run.itemIds.every(id => run.items[id]?.saved)) {
      return { label: 'Submit responses', disabled: false, kind: 'submit' };
    }
    if (this.activeState()?.saved) {
      return {
        label: run.activeId === WORKED_EXAMPLE_ID
          ? 'Start the investigation'
          : 'Continue to the next record',
        disabled: false,
        kind: 'save',
      };
    }
    switch (run.phase) {
      case 'observe':
        return { label: 'I have read the record — predict', disabled: false, kind: 'begin-prediction' };
      case 'predict':
        return { label: 'Lock a classification above', disabled: true, kind: 'waiting' };
      case 'manipulate':
        return { label: 'Place the record in a tray', disabled: true, kind: 'waiting' };
      case 'reveal':
        return { label: 'Pin the supporting evidence', disabled: false, kind: 'open-explain' };
      case 'explain':
        return {
          label: 'Save to evidence notebook',
          disabled: !this.activeState()?.pinnedClueId,
          kind: 'save',
        };
      default:
        return { label: 'Continue', disabled: false, kind: 'save' };
    }
  });

  readonly stepHint = computed(() => {
    if (this.finished()) return `All ${this.savedCount()} observations are saved to the notebook.`;
    if (this.run().activeId === WORKED_EXAMPLE_ID && this.mode() === 'learn') {
      return 'Worked example — follow the traced path from the field log to the environmental tray, then start the investigation.';
    }
    if (this.activeState()?.saved) return 'Saved. Open the next record when you are ready.';
    switch (this.run().phase) {
      case 'observe': return 'Step 1 — Observe: read the record and check which instrument could have captured it.';
      case 'predict': return 'Step 2 — Predict: lock inherited, learned, or environmental before anything is revealed.';
      case 'manipulate': return 'Step 3 — Place: drag the record into a tray, or select a tray button.';
      case 'reveal': return 'Step 4 — Reveal: the console traces the evidence path back to its source instrument.';
      case 'explain': return 'Step 5 — Explain: pin the clue that shows where this characteristic came from.';
      default: return 'Review your saved evidence.';
    }
  });

  readonly modeLabel = computed(() => ({
    learn: 'Learn · worked example first',
    practice: 'Practice · varied order, hints off',
    official: 'Official · no hints, results locked until submit',
    reteach: 'Reteach · new examples for one misconception',
  }[this.mode()]));

  constructor() {
    effect(() => this.bridge.showScene(this.scene()));
    effect(() => {
      const run = this.run();
      if (run.phase === 'reveal' || run.phase === 'explain') {
        this.bridge.playSequence(EVIDENCE_PATH_SEQUENCE, 'station');
      } else {
        this.bridge.stopSequence();
      }
    });
  }

  onStageEvent(event: DragonVisualStageEvent): void {
    switch (event.type) {
      case 'hotspot-selected':
        this.openObservation(event.targetId);
        break;
      case 'prediction-locked':
        this.lockPrediction(event.value as TraitEvidenceCategory);
        break;
      case 'label-placed':
        this.placeActive(event.value as TraitEvidenceCategory);
        break;
      case 'evidence-pinned':
        this.pinClue(event.targetId);
        break;
      default:
        break;
    }
  }

  runPrimaryAction(): void {
    const action = this.primaryAction();
    if (action.disabled) return;
    switch (action.kind) {
      case 'begin-prediction':
        this.setPhase('predict');
        break;
      case 'open-explain':
        this.setPhase('explain');
        this.feedbackState.set({
          tone: 'neutral',
          headline: 'Choose the clue that supports your classification.',
          detail: 'Only one clue shows where this characteristic came from. Usefulness and body location are not evidence of origin.',
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

  clueTextFor(clueId: string | null): string {
    if (!clueId) return '';
    for (const item of this.items()) {
      const clue = item.clues.find(candidate => candidate.id === clueId);
      if (clue) return clue.text;
    }
    return '';
  }

  observationLabel(observationId: string): string {
    return traitEvidenceObservation(observationId).label;
  }

  private sceneId(): string {
    return `module-1-trait-evidence-${this.mode()}`;
  }

  private visualMode(): DragonVisualMode {
    const mode = this.mode();
    return mode === 'official' ? 'official' : mode === 'practice' ? 'practice' : 'learn';
  }

  private placements() {
    const run = this.run();
    return run.itemIds.flatMap(id => {
      const state = run.items[id];
      if (!state?.tray) return [];
      const observation = traitEvidenceObservation(id);
      return [{
        observationId: id,
        tray: state.tray,
        status: state.revealed
          ? (state.tray === observation.category ? 'correct' as const : 'incorrect' as const)
          : 'pending' as const,
        revealed: state.revealed,
        pinnedClueId: state.pinnedClueId ?? undefined,
        clueStatus: state.pinnedClueId && state.revealed
          ? (state.pinnedClueId === observation.correctClueId ? 'correct' as const : 'incorrect' as const)
          : undefined,
      }];
    });
  }

  private openObservation(observationId: string): void {
    const run = this.run();
    if (!run.itemIds.includes(observationId)) return;
    const state = run.items[observationId];
    if (!state) return;
    if (observationId !== run.activeId && !state.tray) return;

    this.feedbackState.set(null);
    this.run.update(current => ({
      ...current,
      activeId: observationId,
      phase: phaseForItem(state, this.mode()),
      items: {
        ...current.items,
        [observationId]: { ...state, openedAtMs: state.openedAtMs || now() },
      },
    }));
  }

  private lockPrediction(category: TraitEvidenceCategory): void {
    const activeId = this.run().activeId;
    if (!activeId || this.run().phase !== 'predict') return;
    this.updateItem(activeId, state => ({ ...state, prediction: category }));
    this.setPhase('manipulate');
    this.feedbackState.set({
      tone: 'neutral',
      headline: `Prediction locked: ${category}.`,
      detail: 'Now place the record in a tray. The tray you use is your final answer.',
    });
  }

  private placeActive(tray: TraitEvidenceCategory): void {
    const activeId = this.run().activeId;
    const observation = this.activeItem();
    if (!activeId || !observation || this.run().phase !== 'manipulate') return;

    const revealNow = this.mode() !== 'official';
    this.updateItem(activeId, state => ({ ...state, tray, revealed: revealNow }));
    this.setPhase(revealNow ? 'reveal' : 'explain');

    if (!revealNow) {
      this.feedbackState.set({
        tone: 'neutral',
        headline: 'Response recorded.',
        detail: 'Pin the clue you would use to defend this classification. Results stay locked until you submit.',
      });
      return;
    }

    const correct = tray === observation.category;
    const changedMind = this.run().items[activeId]?.prediction !== tray;
    if (correct) {
      this.feedbackState.set({
        tone: 'good',
        headline: 'The evidence path supports this tray.',
        detail: observation.rule,
      });
      return;
    }
    const misconception = classificationMisconception(observation.category, tray);
    this.flagMisconception(misconception);
    this.feedbackState.set({
      tone: 'warn',
      headline: `This record is classified as ${observation.category}.`,
      detail: `${this.misconceptionNotes[misconception]} ${observation.rule}${
        changedMind ? ' Your placement, not your earlier prediction, was graded.' : ''}`,
    });
  }

  private pinClue(clueId: string): void {
    const activeId = this.run().activeId;
    const observation = this.activeItem();
    if (!activeId || !observation || this.run().phase !== 'explain') return;
    const clue = observation.clues.find(candidate => candidate.id === clueId);
    if (!clue) return;

    const state = this.run().items[activeId];
    if (this.mode() === 'official' && state?.pinnedClueId) return;

    this.updateItem(activeId, current => ({
      ...current,
      pinnedClueId: clueId,
      clueAttempts: current.clueAttempts + 1,
    }));

    if (this.mode() === 'official') {
      this.feedbackState.set({ tone: 'neutral', headline: 'Evidence pinned.', detail: 'You can save this response.' });
      return;
    }
    if (!clue.misconception) {
      this.feedbackState.set({
        tone: 'good',
        headline: 'Evidence pinned.',
        detail: 'This clue names where the characteristic came from, which is what decides the category.',
      });
      return;
    }
    this.flagMisconception(clue.misconception);
    this.feedbackState.set({
      tone: 'warn',
      headline: 'That clue does not settle the classification.',
      detail: `${this.misconceptionNotes[clue.misconception]} Choose again, or save and revisit it in the notebook.`,
    });
  }

  private saveActive(): void {
    const activeId = this.run().activeId;
    const observation = this.activeItem();
    const state = this.activeState();
    if (!activeId || !observation || !state?.tray) return;
    if (state.saved) {
      this.advance();
      return;
    }

    const correct = state.tray === observation.category;
    const clueCorrect = state.pinnedClueId === observation.correctClueId;
    const clue = observation.clues.find(candidate => candidate.id === state.pinnedClueId);
    const record: TraitEvidenceRecord = {
      sceneId: this.sceneId(),
      seed: `${this.seed()}:${this.mode()}`,
      sampleId: TRAIT_EVIDENCE_SPECIMEN.id,
      observationId: activeId,
      mode: this.mode(),
      predictedCategory: state.prediction,
      placedCategory: state.tray,
      actualCategory: observation.category,
      correct,
      pinnedClueId: state.pinnedClueId,
      clueCorrect,
      attempts: 1 + state.clueAttempts,
      misconception: correct
        ? clue?.misconception ?? null
        : classificationMisconception(observation.category, state.tray),
      elapsedMs: Math.max(0, now() - state.openedAtMs),
      createdAtIso: new Date().toISOString(),
    };

    this.updateItem(activeId, current => ({ ...current, saved: true }));
    this.savedRecords.update(records => [...records, record]);
    this.evidenceSaved.emit(record);
    if (observation.sortCardId) {
      this.classified.emit({
        observationId: activeId,
        sortCardId: observation.sortCardId,
        category: state.tray,
      });
    }
    this.maybeAppendReteach();
    this.advance();
  }

  private advance(): void {
    const run = this.run();
    const nextId = run.itemIds.find(id => !run.items[id]?.saved) ?? null;
    if (!nextId) {
      this.setPhase('review');
      this.feedbackState.set(null);
      if (this.mode() !== 'official') this.emitSetResult();
      return;
    }
    this.feedbackState.set(null);
    this.run.update(current => ({
      ...current,
      activeId: nextId,
      phase: 'observe',
      items: {
        ...current.items,
        [nextId]: { ...current.items[nextId], openedAtMs: now() },
      },
    }));
  }

  private submitOfficial(): void {
    this.run.update(current => ({
      ...current,
      submitted: true,
      phase: 'review',
      items: Object.fromEntries(Object.entries(current.items)
        .map(([id, state]) => [id, { ...state, revealed: true }])),
    }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Responses submitted.',
      detail: 'Every evidence path is now open for review.',
    });
    this.emitSetResult();
  }

  private emitSetResult(): void {
    this.setCompleted.emit({
      mode: this.mode(),
      correct: this.correctCount(),
      total: this.savedRecords().length,
      misconceptions: this.openMisconceptions().map(entry => entry.flag),
    });
  }

  /** Two hits on the same misconception earn fresh examples rather than a replay. */
  private maybeAppendReteach(): void {
    if (this.mode() === 'official' || this.run().reteachAppended) return;
    const repeated = this.openMisconceptions().find(entry => entry.count >= 2);
    if (!repeated) return;

    const existing = this.run().itemIds;
    const fresh = traitEvidenceReteachSet(repeated.flag, existing)
      .filter(item => !existing.includes(item.id))
      .slice(0, 2);
    if (!fresh.length) return;

    this.run.update(current => ({
      ...current,
      reteachAppended: true,
      itemIds: [...current.itemIds, ...fresh.map(item => item.id)],
      items: {
        ...current.items,
        ...Object.fromEntries(fresh.map(item => [item.id, emptyItem()])),
      },
    }));
    this.reteachNoticeState.set(
      `${this.misconceptionNotes[repeated.flag]} Two new records were added to the queue so you can test the corrected idea on a fresh example.`,
    );
    this.reteachTriggered.emit(repeated.flag);
  }

  private flagMisconception(flag: TraitEvidenceMisconception): void {
    this.misconceptionCounts.update(counts => ({ ...counts, [flag]: (counts[flag] ?? 0) + 1 }));
  }

  private setPhase(phase: DragonVisualPhase): void {
    this.run.update(current => ({ ...current, phase }));
  }

  private updateItem(observationId: string, mutate: (state: ItemState) => ItemState): void {
    this.run.update(current => ({
      ...current,
      items: {
        ...current.items,
        [observationId]: mutate(current.items[observationId] ?? emptyItem()),
      },
    }));
  }
}

function createRun(
  observations: readonly TraitEvidenceObservation[],
  mode: TraitEvidenceMode,
): RunState {
  const itemIds = observations.map(item => item.id);
  const items: Record<string, ItemState> = Object.fromEntries(
    itemIds.map(id => [id, emptyItem()]),
  );

  // Learn mode opens on a solved worked example so students see the whole loop once.
  if (mode === 'learn' && itemIds.includes(WORKED_EXAMPLE_ID)) {
    const worked = traitEvidenceObservation(WORKED_EXAMPLE_ID);
    items[WORKED_EXAMPLE_ID] = {
      prediction: worked.category,
      tray: worked.category,
      revealed: true,
      pinnedClueId: worked.correctClueId,
      clueAttempts: 0,
      saved: true,
      openedAtMs: now(),
    };
    return {
      itemIds,
      activeId: WORKED_EXAMPLE_ID,
      phase: 'reveal',
      items,
      submitted: false,
      reteachAppended: false,
    };
  }

  const firstId = itemIds[0] ?? null;
  if (firstId) items[firstId] = { ...items[firstId], openedAtMs: now() };
  return {
    itemIds,
    activeId: firstId,
    phase: 'observe',
    items,
    submitted: false,
    reteachAppended: false,
  };
}

function emptyItem(): ItemState {
  return {
    prediction: null,
    tray: null,
    revealed: false,
    pinnedClueId: null,
    clueAttempts: 0,
    saved: false,
    openedAtMs: 0,
  };
}

function phaseForItem(state: ItemState, mode: TraitEvidenceMode): DragonVisualPhase {
  if (state.saved) return 'review';
  if (!state.prediction) return 'observe';
  if (!state.tray) return 'manipulate';
  if (!state.revealed && mode !== 'official') return 'reveal';
  return 'explain';
}

export function classificationMisconception(
  actual: TraitEvidenceCategory,
  chosen: TraitEvidenceCategory,
): TraitEvidenceMisconception {
  if (actual === 'inherited') return 'inherited-marked-acquired';
  if (chosen === 'inherited') return 'acquired-marked-inherited';
  return 'learned-environment-swap';
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
