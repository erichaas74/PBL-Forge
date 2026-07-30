import { DestroyRef, Signal, computed, inject, signal } from '@angular/core';
import {
  DragonTeachingSequence,
  DragonTeachingSequenceFrame,
  teachingSequenceFrameAt,
} from '../../domain/teaching-sequence.models';

export interface TeachingSequencePlayer {
  readonly sequence: Signal<DragonTeachingSequence | null>;
  readonly frame: Signal<DragonTeachingSequenceFrame | null>;
  readonly activeCaptionId: Signal<string | null>;
  readonly awaitingCheckpointId: Signal<string | null>;
  readonly complete: Signal<boolean>;
  play(sequence: DragonTeachingSequence): void;
  completeCheckpoint(checkpointId: string): void;
  stop(): void;
}

/**
 * Plays a declarative teaching sequence. Timing, captions, and checkpoints stay in data;
 * the station only reads the resulting frame. With reduced motion the sequence resolves to
 * its final state immediately while still honouring prediction checkpoints.
 *
 * Must be created inside an injection context.
 */
export function createTeachingSequencePlayer(
  reducedMotion: Signal<boolean>,
): TeachingSequencePlayer {
  const sequence = signal<DragonTeachingSequence | null>(null);
  const elapsedMs = signal(0);
  const checkpoints = signal<ReadonlySet<string>>(new Set<string>());
  let handle: number | null = null;
  let startedAt = 0;

  const frame = computed<DragonTeachingSequenceFrame | null>(() => {
    const active = sequence();
    if (!active) return null;
    return teachingSequenceFrameAt(active, elapsedMs(), checkpoints());
  });

  const cancel = () => {
    if (handle !== null) globalThis.cancelAnimationFrame?.(handle);
    handle = null;
  };

  const tick = () => {
    handle = null;
    const active = sequence();
    if (!active) return;
    elapsedMs.set(Math.min(active.durationMs, now() - startedAt));
    if (elapsedMs() < active.durationMs) schedule();
  };

  const schedule = () => {
    if (handle !== null) return;
    const request = globalThis.requestAnimationFrame;
    if (!request) {
      const active = sequence();
      if (active) elapsedMs.set(active.durationMs);
      return;
    }
    handle = request(tick);
  };

  inject(DestroyRef).onDestroy(cancel);

  return {
    sequence: sequence.asReadonly(),
    frame,
    activeCaptionId: computed(() => frame()?.activeCaptionIds.at(-1) ?? null),
    awaitingCheckpointId: computed(() => frame()?.awaitingCheckpointId ?? null),
    complete: computed(() => frame()?.complete ?? false),
    play(next: DragonTeachingSequence): void {
      cancel();
      checkpoints.set(new Set<string>());
      sequence.set(next);
      if (reducedMotion()) {
        elapsedMs.set(next.durationMs);
        return;
      }
      startedAt = now();
      elapsedMs.set(0);
      schedule();
    },
    completeCheckpoint(checkpointId: string): void {
      checkpoints.update(current => new Set([...current, checkpointId]));
      const active = sequence();
      if (!active) return;
      if (reducedMotion()) {
        elapsedMs.set(active.durationMs);
        return;
      }
      startedAt = now() - elapsedMs();
      schedule();
    },
    stop(): void {
      cancel();
      sequence.set(null);
      elapsedMs.set(0);
      checkpoints.set(new Set<string>());
    },
  };
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
