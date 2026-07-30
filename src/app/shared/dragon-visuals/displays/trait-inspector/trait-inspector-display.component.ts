import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  DragonEvidenceSourceId,
  DragonTraitCategory,
  DragonVisualEventType,
  DragonVisualPhase,
  DragonVisualStageEvent,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import { createReducedMotionSignal } from '../shared/reduced-motion';
import { StationGlyphComponent } from '../shared/station-glyph.component';
import { createTeachingSequencePlayer } from '../shared/teaching-sequence.player';
import {
  TRAIT_INSPECTOR_THEME,
  TraitInspectorTheme,
} from './trait-inspector.theme';
import {
  EVIDENCE_SOURCE_ORDER,
  TRAIT_CATEGORY_ORDER,
  TraitInspectorCardView,
  TraitInspectorTrayView,
  TraitInspectorViewModel,
  buildTraitInspectorViewModel,
} from './trait-inspector.view-model';

interface PhaseStep {
  id: DragonVisualPhase;
  label: string;
}

const PHASE_RAIL: readonly PhaseStep[] = [
  { id: 'observe', label: 'Observe' },
  { id: 'predict', label: 'Predict' },
  { id: 'manipulate', label: 'Place' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'explain', label: 'Explain' },
];

/** Lesson-owned feedback. The renderer styles it but never writes or grades it. */
export interface TraitInspectorFeedback {
  tone: 'neutral' | 'good' | 'warn';
  headline: string;
  detail?: string;
}

/**
 * Trait Evidence Analyzer — the Module 1 laboratory display.
 *
 * The component draws whatever `trait-inspector` scene the bridge holds and reports what the
 * student did as semantic stage events. It owns no curriculum text, no correctness, and no
 * progression: those belong to the lesson that publishes the scene.
 */
@Component({
  selector: 'app-trait-inspector-display',
  imports: [NgClass, StationGlyphComponent],
  templateUrl: './trait-inspector-display.component.html',
  styleUrl: './trait-inspector-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraitInspectorDisplayComponent {
  private readonly bridge = inject(DragonVisualBridge);
  readonly phaseRail = PHASE_RAIL;

  /** Curriculum wording keyed by the label IDs carried in the scene. */
  readonly copy = input<StationCopy>({});
  /** Swap or edit the theme to change the graphics without touching this component. */
  readonly theme = input<TraitInspectorTheme>(TRAIT_INSPECTOR_THEME);
  readonly feedback = input<TraitInspectorFeedback | null>(null);
  /** `null` follows the operating system setting; a boolean forces it (used by tests). */
  readonly reducedMotionOverride = input<boolean | null>(null);
  readonly stageEvent = output<DragonVisualStageEvent>();

  private readonly systemReducedMotion = createReducedMotionSignal();
  readonly reducedMotion = computed(() => this.reducedMotionOverride() ?? this.systemReducedMotion());
  private readonly player = createTeachingSequencePlayer(this.reducedMotion);

  private readonly consoleRef = viewChild<ElementRef<HTMLElement>>('consoleFrame');
  private readonly cardRef = viewChild<ElementRef<HTMLElement>>('activeCard');
  private readonly sourceRefs = viewChildren<ElementRef<HTMLElement>>('sourcePanel');
  private readonly trayRefs = viewChildren<ElementRef<HTMLElement>>('trayPanel');
  private readonly layoutVersion = signal(0);
  private readonly tracePathState = signal<string>('');
  private readonly draggingCardId = signal<string | null>(null);
  private readonly hoveredTray = signal<DragonTraitCategory | null>(null);

  readonly scene = computed(() => {
    const scene = this.bridge.scene();
    return scene?.kind === 'trait-inspector' ? scene : null;
  });
  readonly model = computed(() => {
    const scene = this.scene();
    return scene ? buildTraitInspectorViewModel(scene, this.copy(), this.theme()) : null;
  });
  readonly tracePath = this.tracePathState.asReadonly();
  readonly caption = computed(() => resolveStationCopy(this.copy(), this.player.activeCaptionId()));
  readonly traceProgress = computed(() => this.player.frame()?.progress ?? 1);
  readonly dragging = this.draggingCardId.asReadonly();
  readonly hovered = this.hoveredTray.asReadonly();
  readonly themeVariables = computed(() => {
    const palette = this.theme().palette;
    return {
      '--tia-console-top': palette.consoleTop,
      '--tia-console-bottom': palette.consoleBottom,
      '--tia-panel': palette.panel,
      '--tia-panel-edge': palette.panelEdge,
      '--tia-ink': palette.ink,
      '--tia-muted': palette.mutedInk,
      '--tia-brass': palette.brass,
      '--tia-glow': palette.glow,
      '--tia-correct': palette.correct,
      '--tia-incorrect': palette.incorrect,
      '--tia-trace-ms': `${this.theme().motion.tracePathMs}ms`,
      '--tia-travel-ms': `${this.theme().motion.cardTravelMs}ms`,
      '--tia-pulse-ms': `${this.theme().motion.pulseMs}ms`,
    } as Record<string, string>;
  });

  constructor() {
    const resize = () => this.layoutVersion.update(value => value + 1);
    globalThis.addEventListener?.('resize', resize);
    inject(DestroyRef).onDestroy(() => globalThis.removeEventListener?.('resize', resize));

    // Play whatever sequence the lesson stages for this station.
    effect(() => {
      const sequence = this.bridge.sequence();
      if (sequence && this.bridge.surface() === 'station') this.player.play(sequence);
      else this.player.stop();
    });

    // A prediction checkpoint releases once the lesson records a locked prediction.
    effect(() => {
      const checkpointId = this.player.awaitingCheckpointId();
      const scene = this.scene();
      if (!checkpointId || !scene) return;
      if (scene.instrument.kind !== 'trait-inspector' || !scene.instrument.lockedPrediction) return;
      this.player.completeCheckpoint(checkpointId);
      this.emit('sequence-checkpoint-completed', checkpointId);
    });

    afterRenderEffect(() => this.tracePathState.set(this.measureTracePath()));
  }

  isPhaseDone(current: DragonVisualPhase, step: DragonVisualPhase): boolean {
    const order = PHASE_RAIL.map(item => item.id);
    const currentIndex = current === 'review' ? order.length : order.indexOf(current);
    return currentIndex > order.indexOf(step);
  }

  accentFor(sourceId: DragonEvidenceSourceId): string {
    return this.theme().sources[sourceId].accent;
  }

  sourceTitle(model: TraitInspectorViewModel, sourceId: DragonEvidenceSourceId): string {
    return model.sources.find(source => source.id === sourceId)?.title ?? '';
  }

  trayAriaLabel(model: TraitInspectorViewModel, tray: TraitInspectorTrayView): string {
    const contents = `Contains ${tray.count} of ${model.totalCount} observations.`;
    if (!tray.enabled || !model.activeCard) return `${tray.title} tray. ${contents}`;
    return `Place ${model.activeCard.title} in the ${tray.title} tray. ${contents}`;
  }

  selectCard(card: TraitInspectorCardView): void {
    if (card.disabled) return;
    this.emit('hotspot-selected', card.id);
  }

  lockPrediction(category: DragonTraitCategory): void {
    if (!this.model()?.predictionEnabled) return;
    this.emit('prediction-locked', this.model()?.activeCard?.id ?? category, category);
  }

  placeCard(tray: TraitInspectorTrayView): void {
    const card = this.model()?.activeCard;
    if (!card || !tray.enabled) return;
    this.draggingCardId.set(null);
    this.hoveredTray.set(null);
    this.emit('label-placed', card.id, tray.id);
  }

  pinClue(clueId: string, selectable: boolean): void {
    if (!selectable) return;
    this.emit('evidence-pinned', clueId);
  }

  replayEvidencePath(): void {
    const trace = this.model()?.trace;
    if (!trace) return;
    const sequence = this.bridge.sequence();
    if (sequence) this.player.play(sequence);
    this.emit('reveal-requested', trace.observationId);
  }

  focusSource(sourceId: string): void {
    this.emit('hotspot-selected', sourceId);
  }

  onDragStart(card: TraitInspectorCardView, event: DragEvent): void {
    if (!card.draggable) {
      event.preventDefault();
      return;
    }
    this.draggingCardId.set(card.id);
    event.dataTransfer?.setData('text/plain', card.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragEnd(): void {
    this.draggingCardId.set(null);
    this.hoveredTray.set(null);
  }

  onTrayDragOver(tray: TraitInspectorTrayView, event: DragEvent): void {
    if (!tray.enabled || !this.draggingCardId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.hoveredTray.set(tray.id);
  }

  onTrayDragLeave(tray: TraitInspectorTrayView): void {
    if (this.hoveredTray() === tray.id) this.hoveredTray.set(null);
  }

  onTrayDrop(tray: TraitInspectorTrayView, event: DragEvent): void {
    event.preventDefault();
    this.placeCard(tray);
  }

  /**
   * Draws the source → observation → tray path from measured layout so the same evidence
   * animation works at any width and after any theme or layout change.
   */
  private measureTracePath(): string {
    this.layoutVersion();
    const trace = this.model()?.trace;
    const frame = this.consoleRef()?.nativeElement;
    if (!trace || !frame) return '';

    const sourceIndex = EVIDENCE_SOURCE_ORDER.indexOf(trace.sourceId);
    const trayIndex = TRAIT_CATEGORY_ORDER.indexOf(trace.tray);
    const source = this.sourceRefs()[sourceIndex]?.nativeElement;
    const tray = this.trayRefs()[trayIndex]?.nativeElement;
    const card = this.cardRef()?.nativeElement;
    if (!source || !tray) return '';

    const origin = frame.getBoundingClientRect();
    const at = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.left - origin.left + box.width / 2,
        y: box.top - origin.top + box.height / 2,
      };
    };
    const start = at(source);
    const middle = card ? at(card) : { x: (start.x + at(tray).x) / 2, y: at(tray).y };
    const end = at(tray);
    const control = (from: { x: number; y: number }, to: { x: number; y: number }) =>
      `Q ${from.x} ${(from.y + to.y) / 2} ${to.x} ${to.y}`;

    return `M ${start.x} ${start.y} ${control(start, middle)} ${control(middle, end)}`;
  }

  private emit(type: DragonVisualEventType, targetId: string, value?: string | number): void {
    const scene = this.scene();
    if (!scene) return;
    const event: DragonVisualStageEvent = {
      sceneId: scene.sceneId,
      type,
      targetId,
      value,
      occurredAtIso: new Date().toISOString(),
    };
    this.bridge.receiveStageEvent(event);
    this.stageEvent.emit(event);
  }
}
