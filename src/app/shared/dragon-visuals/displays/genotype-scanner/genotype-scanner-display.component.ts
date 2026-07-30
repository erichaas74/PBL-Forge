import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  DragonScannerOptionStatusId,
  DragonVisualEventType,
  DragonVisualPhase,
  DragonVisualStageEvent,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { ChromosomePairComponent } from '../shared/chromosome-pair.component';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import { createReducedMotionSignal } from '../shared/reduced-motion';
import { createTeachingSequencePlayer } from '../shared/teaching-sequence.player';
import {
  GENOTYPE_SCANNER_THEME,
  GenotypeScannerTheme,
} from './genotype-scanner.theme';
import {
  ScannerOptionView,
  buildGenotypeScannerViewModel,
} from './genotype-scanner.view-model';

/** Lesson-owned feedback. The renderer styles it but never writes or grades it. */
export interface GenotypeScannerFeedback {
  tone: 'neutral' | 'good' | 'warn';
  headline: string;
  detail?: string;
}

interface PhaseStep {
  id: DragonVisualPhase;
  label: string;
}

const PHASE_RAIL: readonly PhaseStep[] = [
  { id: 'observe', label: 'Read' },
  { id: 'predict', label: 'Select' },
  { id: 'manipulate', label: 'Scan' },
  { id: 'reveal', label: 'Compare' },
  { id: 'explain', label: 'Explain' },
];

/**
 * Genotype Scanner — the Module 3 laboratory display.
 *
 * It draws whichever `genotype-scanner` scene the bridge holds: a phenotype readout, a shielded
 * chromosome pair, the genotype records a student can select, and the comparison sample. It owns
 * no curriculum text, no correctness, and no progression.
 */
@Component({
  selector: 'app-genotype-scanner-display',
  imports: [ChromosomePairComponent],
  templateUrl: './genotype-scanner-display.component.html',
  styleUrl: './genotype-scanner-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenotypeScannerDisplayComponent {
  private readonly bridge = inject(DragonVisualBridge);
  readonly phaseRail = PHASE_RAIL;

  /** Curriculum wording keyed by the label IDs carried in the scene. */
  readonly copy = input<StationCopy>({});
  /** Swap or edit the theme to change the graphics without touching this component. */
  readonly theme = input<GenotypeScannerTheme>(GENOTYPE_SCANNER_THEME);
  readonly feedback = input<GenotypeScannerFeedback | null>(null);
  /** `null` follows the operating system setting; a boolean forces it (used by tests). */
  readonly reducedMotionOverride = input<boolean | null>(null);
  readonly stageEvent = output<DragonVisualStageEvent>();

  private readonly systemReducedMotion = createReducedMotionSignal();
  readonly reducedMotion = computed(() => this.reducedMotionOverride() ?? this.systemReducedMotion());
  private readonly player = createTeachingSequencePlayer(this.reducedMotion);

  readonly scene = computed(() => {
    const scene = this.bridge.scene();
    return scene?.kind === 'genotype-scanner' ? scene : null;
  });
  readonly model = computed(() => {
    const scene = this.scene();
    return scene ? buildGenotypeScannerViewModel(scene, this.copy(), this.theme()) : null;
  });
  readonly caption = computed(() => resolveStationCopy(this.copy(), this.player.activeCaptionId()));
  readonly themeVariables = computed(() => {
    const palette = this.theme().palette;
    return {
      '--gs-console-top': palette.consoleTop,
      '--gs-console-bottom': palette.consoleBottom,
      '--gs-panel': palette.panel,
      '--gs-panel-edge': palette.panelEdge,
      '--gs-ink': palette.ink,
      '--gs-muted': palette.mutedInk,
      '--gs-brass': palette.brass,
      '--gs-glow': palette.glow,
      '--gs-dominant': palette.dominant,
      '--gs-recessive': palette.recessive,
      '--gs-correct': palette.correct,
      '--gs-incorrect': palette.incorrect,
      '--gs-missed': palette.missed,
      '--gs-scan-ms': `${this.theme().motion.scanMs}ms`,
      '--gs-reveal-ms': `${this.theme().motion.revealMs}ms`,
      '--gs-pulse-ms': `${this.theme().motion.pulseMs}ms`,
    } as Record<string, string>;
  });

  constructor() {
    effect(() => {
      const sequence = this.bridge.sequence();
      if (sequence && this.bridge.surface() === 'station') this.player.play(sequence);
      else this.player.stop();
    });

    // The scan checkpoint releases once the lesson records a locked selection.
    effect(() => {
      const checkpointId = this.player.awaitingCheckpointId();
      const scene = this.scene();
      if (!checkpointId || !scene) return;
      if (scene.instrument.kind !== 'genotype-scanner' || !scene.instrument.selectionLocked) return;
      this.player.completeCheckpoint(checkpointId);
      this.emit('sequence-checkpoint-completed', checkpointId);
    });
  }

  /** Placeholder letters while the locus is shielded; the shield covers them anyway. */
  alleleDisplay(pair: readonly [string, string] | null): readonly [string, string] {
    return pair ?? ['?', '?'];
  }

  statusLabel(status: DragonScannerOptionStatusId): string {
    switch (status) {
      case 'correct': return 'Supported';
      case 'incorrect': return 'Not supported';
      case 'missed': return 'Also supported';
      default: return 'Selected';
    }
  }

  isPhaseDone(current: DragonVisualPhase, step: DragonVisualPhase): boolean {
    const order = PHASE_RAIL.map(item => item.id);
    const currentIndex = current === 'review' ? order.length : order.indexOf(current);
    return currentIndex > order.indexOf(step);
  }

  toggleOption(option: ScannerOptionView): void {
    if (!option.enabled) return;
    this.emit('allele-selected', option.id, option.selected ? 'deselect' : 'select');
  }

  requestScan(): void {
    if (!this.model()?.scanEnabled) return;
    this.emit('reveal-requested', this.model()?.targets.scanControl ?? 'scan-control');
  }

  pinEvidence(markId: string, enabled: boolean): void {
    if (!enabled) return;
    this.emit('evidence-pinned', markId);
  }

  inspectReadout(targetId: string): void {
    this.emit('hotspot-selected', targetId);
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
