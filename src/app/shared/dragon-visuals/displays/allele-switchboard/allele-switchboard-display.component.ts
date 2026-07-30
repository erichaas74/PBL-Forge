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
  DragonVisualEventType,
  DragonVisualPhase,
  DragonVisualStageEvent,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { createReducedMotionSignal } from '../shared/reduced-motion';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import { createTeachingSequencePlayer } from '../shared/teaching-sequence.player';
import {
  ALLELE_SWITCHBOARD_THEME,
  AlleleSwitchboardTheme,
} from './allele-switchboard.theme';
import { buildAlleleSwitchboardViewModel } from './allele-switchboard.view-model';

const PHASE_RAIL: readonly { id: DragonVisualPhase; label: string }[] = [
  { id: 'observe', label: 'Observe' },
  { id: 'manipulate', label: 'Build' },
  { id: 'predict', label: 'Predict' },
  { id: 'reveal', label: 'Trace' },
  { id: 'explain', label: 'Explain' },
];

export interface AlleleSwitchboardFeedback {
  tone: 'neutral' | 'good' | 'warn';
  headline: string;
  detail?: string;
}

@Component({
  selector: 'app-allele-switchboard-display',
  imports: [NgClass],
  templateUrl: './allele-switchboard-display.component.html',
  styleUrl: './allele-switchboard-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlleleSwitchboardDisplayComponent {
  private readonly bridge = inject(DragonVisualBridge);
  readonly copy = input<StationCopy>({});
  readonly theme = input<AlleleSwitchboardTheme>(ALLELE_SWITCHBOARD_THEME);
  readonly feedback = input<AlleleSwitchboardFeedback | null>(null);
  readonly reducedMotionOverride = input<boolean | null>(null);
  readonly stageEvent = output<DragonVisualStageEvent>();

  readonly phaseRail = PHASE_RAIL;
  private readonly systemReducedMotion = createReducedMotionSignal();
  readonly reducedMotion = computed(() => this.reducedMotionOverride() ?? this.systemReducedMotion());
  private readonly player = createTeachingSequencePlayer(this.reducedMotion);
  private readonly selectedAlleleState = signal<string | null>(null);
  readonly selectedAllele = this.selectedAlleleState.asReadonly();
  readonly scene = computed(() => {
    const scene = this.bridge.scene();
    return scene?.kind === 'allele-switchboard' ? scene : null;
  });
  readonly model = computed(() => {
    const scene = this.scene();
    return scene ? buildAlleleSwitchboardViewModel(scene, this.copy(), this.theme()) : null;
  });
  readonly caption = computed(() => resolveStationCopy(this.copy(), this.player.activeCaptionId()));
  readonly activeCueTargets = computed(() => new Set(
    this.player.frame()?.activeCues.flatMap(cue => cue.targetIds) ?? [],
  ));
  readonly traceProgress = computed(() => this.player.frame()?.progress ?? 0);
  readonly themeVariables = computed(() => {
    const palette = this.theme().palette;
    return {
      '--aw-console-top': palette.consoleTop,
      '--aw-console-bottom': palette.consoleBottom,
      '--aw-panel': palette.panel,
      '--aw-panel-edge': palette.panelEdge,
      '--aw-ink': palette.ink,
      '--aw-muted': palette.mutedInk,
      '--aw-dominant': palette.dominant,
      '--aw-recessive': palette.recessive,
      '--aw-focus': palette.focus,
      '--aw-brass': palette.brass,
      '--aw-correct': palette.correct,
      '--aw-incorrect': palette.incorrect,
      '--aw-move-ms': `${this.theme().motion.moveMs}ms`,
      '--aw-trace-ms': `${this.theme().motion.traceMs}ms`,
      '--aw-reveal-ms': `${this.theme().motion.revealMs}ms`,
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
      if (!checkpointId || !this.model()?.predictedPhenotypeId) return;
      this.player.completeCheckpoint(checkpointId);
      this.emit('sequence-checkpoint-completed', checkpointId);
    });
    effect(() => {
      if (!this.model()?.tokenEnabled) this.selectedAlleleState.set(null);
    });
  }

  isPhaseDone(current: DragonVisualPhase, step: DragonVisualPhase): boolean {
    const order = PHASE_RAIL.map(item => item.id);
    const currentIndex = current === 'review' ? order.length : order.indexOf(current);
    return currentIndex > order.indexOf(step);
  }

  cueActive(targetId: string): boolean {
    return this.activeCueTargets().has(targetId);
  }

  selectAllele(symbol: string): void {
    if (!this.model()?.tokenEnabled) return;
    this.selectedAlleleState.set(symbol);
    this.emit('allele-selected', 'allele-token', symbol);
  }

  placeAllele(slot: 'allele-slot-a' | 'allele-slot-b'): void {
    const symbol = this.selectedAllele();
    if (!symbol || !this.model()?.slotEnabled) return;
    this.emit('allele-moved', slot, symbol);
    this.selectedAlleleState.set(null);
  }

  lockPrediction(value: 'dominant' | 'recessive'): void {
    if (!this.model()?.predictionEnabled) return;
    this.emit('prediction-locked', 'phenotype-readout', value);
  }

  reveal(): void {
    if (!this.model()?.revealEnabled) return;
    this.emit('reveal-requested', 'expression-path', true);
  }

  pinEvidence(id: string): void {
    if (!this.model()?.evidence.find(item => item.id === id)?.enabled) return;
    this.emit('evidence-pinned', id, id);
  }

  onTokenDragStart(symbol: string, event: DragEvent): void {
    if (!this.model()?.tokenEnabled) {
      event.preventDefault();
      return;
    }
    this.selectAllele(symbol);
    event.dataTransfer?.setData('text/plain', symbol);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }

  onSlotDragOver(event: DragEvent): void {
    if (!this.model()?.slotEnabled) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  onSlotDrop(slot: 'allele-slot-a' | 'allele-slot-b', event: DragEvent): void {
    event.preventDefault();
    const symbol = event.dataTransfer?.getData('text/plain') || this.selectedAllele();
    if (symbol) this.selectedAlleleState.set(symbol);
    this.placeAllele(slot);
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
