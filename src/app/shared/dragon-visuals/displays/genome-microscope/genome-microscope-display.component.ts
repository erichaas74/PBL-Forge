import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  DragonGenomeLevelId,
  DragonVisualEventType,
  DragonVisualPhase,
  DragonVisualStageEvent,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { createReducedMotionSignal } from '../shared/reduced-motion';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import { createTeachingSequencePlayer } from '../shared/teaching-sequence.player';
import { GenomeLevelGlyphComponent } from './genome-level-glyph.component';
import {
  GENOME_MICROSCOPE_THEME,
  GenomeMicroscopeTheme,
} from './genome-microscope.theme';
import {
  GenomeLabelView,
  GenomeLevelView,
  buildGenomeMicroscopeViewModel,
} from './genome-microscope.view-model';

interface PhaseStep {
  id: DragonVisualPhase;
  label: string;
}

const PHASE_RAIL: readonly PhaseStep[] = [
  { id: 'observe', label: 'Observe' },
  { id: 'predict', label: 'Predict' },
  { id: 'manipulate', label: 'Map' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'explain', label: 'Explain' },
];

export interface GenomeMicroscopeFeedback {
  tone: 'neutral' | 'good' | 'warn';
  headline: string;
  detail?: string;
}

@Component({
  selector: 'app-genome-microscope-display',
  imports: [NgClass, GenomeLevelGlyphComponent],
  templateUrl: './genome-microscope-display.component.html',
  styleUrl: './genome-microscope-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenomeMicroscopeDisplayComponent {
  private readonly bridge = inject(DragonVisualBridge);
  readonly copy = input<StationCopy>({});
  readonly theme = input<GenomeMicroscopeTheme>(GENOME_MICROSCOPE_THEME);
  readonly feedback = input<GenomeMicroscopeFeedback | null>(null);
  readonly reducedMotionOverride = input<boolean | null>(null);
  readonly stageEvent = output<DragonVisualStageEvent>();

  readonly phaseRail = PHASE_RAIL;
  private readonly systemReducedMotion = createReducedMotionSignal();
  readonly reducedMotion = computed(() => this.reducedMotionOverride() ?? this.systemReducedMotion());
  private readonly player = createTeachingSequencePlayer(this.reducedMotion);
  private readonly selectedLabelState = signal<DragonGenomeLevelId | null>(null);
  private readonly draggedLabelState = signal<DragonGenomeLevelId | null>(null);

  readonly selectedLabel = this.selectedLabelState.asReadonly();
  readonly draggedLabel = this.draggedLabelState.asReadonly();
  readonly scene = computed(() => {
    const scene = this.bridge.scene();
    return scene?.kind === 'genome-microscope' ? scene : null;
  });
  readonly model = computed(() => {
    const scene = this.scene();
    return scene ? buildGenomeMicroscopeViewModel(scene, this.copy(), this.theme()) : null;
  });
  readonly caption = computed(() => resolveStationCopy(this.copy(), this.player.activeCaptionId()));
  readonly activeCueTargets = computed(() => new Set(
    this.player.frame()?.activeCues.flatMap(cue => cue.targetIds) ?? [],
  ));
  readonly traceProgress = computed(() => this.player.frame()?.progress ?? 0);
  readonly themeVariables = computed(() => {
    const palette = this.theme().palette;
    return {
      '--gm-console-top': palette.consoleTop,
      '--gm-console-bottom': palette.consoleBottom,
      '--gm-panel': palette.panel,
      '--gm-panel-edge': palette.panelEdge,
      '--gm-ink': palette.ink,
      '--gm-muted': palette.mutedInk,
      '--gm-cyan': palette.cyan,
      '--gm-indigo': palette.indigo,
      '--gm-brass': palette.brass,
      '--gm-correct': palette.correct,
      '--gm-incorrect': palette.incorrect,
      '--gm-focus-ms': `${this.theme().motion.focusMs}ms`,
      '--gm-trace-ms': `${this.theme().motion.traceMs}ms`,
      '--gm-reveal-ms': `${this.theme().motion.revealMs}ms`,
    } as Record<string, string>;
  });

  constructor() {
    effect(() => {
      const sequence = this.bridge.sequence();
      if (sequence && this.bridge.surface() === 'station') this.player.play(sequence);
      else this.player.stop();
    });
    effect(() => {
      const checkpointId = this.player.awaitingCheckpointId();
      const scene = this.scene();
      if (!checkpointId || scene?.instrument.kind !== 'genome-microscope') return;
      if (!scene.instrument.lockedPrediction) return;
      this.player.completeCheckpoint(checkpointId);
      this.emit('sequence-checkpoint-completed', checkpointId);
    });
    effect(() => {
      const labels = this.model()?.labels ?? [];
      const selected = this.selectedLabelState();
      if (selected && labels.find(label => label.id === selected)?.placed) {
        this.selectedLabelState.set(null);
      }
    });
  }

  isPhaseDone(current: DragonVisualPhase, step: DragonVisualPhase): boolean {
    const order = PHASE_RAIL.map(item => item.id);
    const currentIndex = current === 'review' ? order.length : order.indexOf(current);
    return currentIndex > order.indexOf(step);
  }

  levelIsCueActive(level: GenomeLevelView): boolean {
    return this.activeCueTargets().has(level.targetId);
  }

  focusLevel(level: GenomeLevelView): void {
    this.emit('hotspot-selected', level.id);
  }

  lockPrediction(level: DragonGenomeLevelId): void {
    if (!this.model()?.predictionEnabled) return;
    this.emit('prediction-locked', level, level);
  }

  selectLabel(label: GenomeLabelView): void {
    if (!label.enabled) return;
    this.selectedLabelState.set(this.selectedLabel() === label.id ? null : label.id);
  }

  placeSelectedLabel(level: GenomeLevelView): void {
    const labelId = this.selectedLabel();
    if (!labelId || !level.dropEnabled) return;
    this.emit('label-placed', labelId, level.id);
    this.selectedLabelState.set(null);
  }

  pinEvidence(level: GenomeLevelView): void {
    if (!level.evidenceEnabled) return;
    this.emit('evidence-pinned', level.id, level.id);
  }

  replayZoom(): void {
    const sequence = this.bridge.sequence();
    if (sequence) this.player.play(sequence);
    this.emit('reveal-requested', this.model()?.focusLevel ?? 'cell');
  }

  onLabelDragStart(label: GenomeLabelView, event: DragEvent): void {
    if (!label.enabled) {
      event.preventDefault();
      return;
    }
    this.draggedLabelState.set(label.id);
    this.selectedLabelState.set(label.id);
    event.dataTransfer?.setData('text/plain', label.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onLabelDragEnd(): void {
    this.draggedLabelState.set(null);
  }

  onSlotDragOver(level: GenomeLevelView, event: DragEvent): void {
    if (!level.dropEnabled || !this.draggedLabel()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onSlotDrop(level: GenomeLevelView, event: DragEvent): void {
    event.preventDefault();
    this.placeSelectedLabel(level);
    this.draggedLabelState.set(null);
  }

  private emit(
    type: DragonVisualEventType,
    targetId: string,
    value?: string | number | boolean,
  ): void {
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
