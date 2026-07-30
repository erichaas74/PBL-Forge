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
  DragonVisualEventType,
  DragonVisualPhase,
  DragonVisualStageEvent,
} from '../../domain/dragon-visual.models';
import { DragonVisualBridge } from '../../state/dragon-visual.bridge';
import { ChromosomePairComponent } from '../shared/chromosome-pair.component';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import { createReducedMotionSignal } from '../shared/reduced-motion';
import { createTeachingSequencePlayer } from '../shared/teaching-sequence.player';
import { DRAGON_HATCHERY_THEME, DragonHatcheryTheme } from './dragon-hatchery.theme';
import { HatcheryEggGlyphComponent } from './hatchery-egg-glyph.component';
import { HatcheryEggView, buildDragonHatcheryViewModel } from './dragon-hatchery.view-model';

/** Lesson-owned feedback. The renderer styles it but never writes or grades it. */
export interface DragonHatcheryFeedback {
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
  { id: 'predict', label: 'Predict' },
  { id: 'manipulate', label: 'Examine' },
  { id: 'reveal', label: 'Hatch' },
  { id: 'explain', label: 'Explain' },
];

/**
 * Dragon Hatchery — the shared clutch instrument.
 *
 * It draws whichever `dragon-hatchery` scene the bridge holds: a tray of eggs, the bench where
 * one egg is examined for traits or sampled for its allele pair, and the hatch tray a student
 * fills before committing. Several modules host it with different tools and budgets enabled.
 *
 * It owns no curriculum text, no correctness, and no progression. Which eggs have been examined,
 * sampled, or hatched arrives in the scene; nothing here decides it.
 */
@Component({
  selector: 'app-dragon-hatchery-display',
  imports: [ChromosomePairComponent, HatcheryEggGlyphComponent],
  templateUrl: './dragon-hatchery-display.component.html',
  styleUrl: './dragon-hatchery-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonHatcheryDisplayComponent {
  private readonly bridge = inject(DragonVisualBridge);
  readonly phaseRail = PHASE_RAIL;

  /** Curriculum wording keyed by the label IDs carried in the scene. */
  readonly copy = input<StationCopy>({});
  /** Swap or edit the theme to change the graphics without touching this component. */
  readonly theme = input<DragonHatcheryTheme>(DRAGON_HATCHERY_THEME);
  readonly feedback = input<DragonHatcheryFeedback | null>(null);
  /** `null` follows the operating system setting; a boolean forces it (used by tests). */
  readonly reducedMotionOverride = input<boolean | null>(null);
  readonly stageEvent = output<DragonVisualStageEvent>();

  private readonly systemReducedMotion = createReducedMotionSignal();
  readonly reducedMotion = computed(() => this.reducedMotionOverride() ?? this.systemReducedMotion());
  private readonly player = createTeachingSequencePlayer(this.reducedMotion);

  readonly scene = computed(() => {
    const scene = this.bridge.scene();
    return scene?.kind === 'dragon-hatchery' ? scene : null;
  });
  readonly model = computed(() => {
    const scene = this.scene();
    return scene ? buildDragonHatcheryViewModel(scene, this.copy(), this.theme()) : null;
  });
  readonly caption = computed(() => resolveStationCopy(this.copy(), this.player.activeCaptionId()));
  readonly themeVariables = computed(() => {
    const theme = this.theme();
    const palette = theme.palette;
    return {
      '--dh-bay-top': palette.bayTop,
      '--dh-bay-bottom': palette.bayBottom,
      '--dh-panel': palette.panel,
      '--dh-panel-edge': palette.panelEdge,
      '--dh-ink': palette.ink,
      '--dh-muted': palette.mutedInk,
      '--dh-brass': palette.brass,
      '--dh-glow': palette.glow,
      '--dh-shell': palette.shell,
      '--dh-shell-edge': palette.shellEdge,
      '--dh-speckle': palette.speckle,
      '--dh-examined': palette.examined,
      '--dh-sampled': palette.sampled,
      '--dh-hatched': palette.hatched,
      '--dh-staged': palette.staged,
      '--dh-locked': palette.locked,
      '--dh-candle-ms': `${theme.motion.candleMs}ms`,
      '--dh-sample-ms': `${theme.motion.sampleMs}ms`,
      '--dh-hatch-ms': `${theme.motion.hatchMs}ms`,
      '--dh-pulse-ms': `${theme.motion.pulseMs}ms`,
    } as Record<string, string>;
  });

  constructor() {
    effect(() => {
      const sequence = this.bridge.sequence();
      if (sequence && this.bridge.surface() === 'station') this.player.play(sequence);
      else this.player.stop();
    });

    // The hatch checkpoint releases once the lesson records a committed hatch.
    effect(() => {
      const checkpointId = this.player.awaitingCheckpointId();
      const scene = this.scene();
      if (!checkpointId || !scene) return;
      if (scene.instrument.kind !== 'dragon-hatchery' || !scene.instrument.hatchCommitted) return;
      this.player.completeCheckpoint(checkpointId);
      this.emit('sequence-checkpoint-completed', checkpointId);
    });
  }

  isPhaseDone(current: DragonVisualPhase, step: DragonVisualPhase): boolean {
    const order = PHASE_RAIL.map(item => item.id);
    const currentIndex = current === 'review' ? order.length : order.indexOf(current);
    return currentIndex > order.indexOf(step);
  }

  budgetLabel(remaining: number | null): string {
    return remaining === null ? 'unlimited' : `${remaining} left`;
  }

  /** Placeholder letters while the locus is unsampled; the shield covers them anyway. */
  alleleDisplay(pair: readonly [string, string] | null | undefined): readonly [string, string] {
    return pair ?? ['?', '?'];
  }

  focusEgg(egg: HatcheryEggView): void {
    if (egg.locked) return;
    this.emit('specimen-selected', egg.id, egg.position);
  }

  examineEgg(egg: HatcheryEggView): void {
    if (!egg.canExamine) return;
    this.emit('reveal-requested', egg.id, 'examine');
  }

  sampleEgg(egg: HatcheryEggView): void {
    if (!egg.canSample) return;
    this.emit('reveal-requested', egg.id, 'sample');
  }

  toggleStaged(egg: HatcheryEggView): void {
    if (!egg.canStage) return;
    this.emit('egg-marked', egg.id, egg.staged ? 'deselect' : 'select');
  }

  commitHatch(): void {
    const model = this.model();
    if (!model?.hatchEnabled) return;
    this.emit('hatch-committed', model.targets.hatchControl, model.stagedEggs.length);
  }

  pinEvidence(markId: string, enabled: boolean): void {
    if (!enabled) return;
    this.emit('evidence-pinned', markId);
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
