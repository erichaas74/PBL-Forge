import { DragonVisualContractVersion } from './dragon-visual.models';

export type DragonVisualSurface = 'station' | 'cutscene';
export type DragonAnimationAction =
  | 'set-scene'
  | 'focus'
  | 'highlight'
  | 'move'
  | 'morph'
  | 'trace'
  | 'show-caption'
  | 'pause-for-prediction'
  | 'reveal';

export interface DragonAnimationCue {
  id: string;
  atMs: number;
  durationMs: number;
  action: DragonAnimationAction;
  targetIds: readonly string[];
  motionId?: string;
  captionId?: string;
  checkpointId?: string;
  value?: string | number | boolean;
}

export interface DragonTeachingSequence {
  contractVersion: DragonVisualContractVersion;
  sequenceId: string;
  conceptId: string;
  supportedSurfaces: readonly DragonVisualSurface[];
  durationMs: number;
  cues: readonly DragonAnimationCue[];
}

export interface DragonTeachingSequenceFrame {
  elapsedMs: number;
  progress: number;
  activeCues: readonly DragonAnimationCue[];
  completedCueIds: readonly string[];
  activeCaptionIds: readonly string[];
  awaitingCheckpointId: string | null;
  complete: boolean;
}

export function teachingSequenceFrameAt(
  sequence: DragonTeachingSequence,
  elapsedMs: number,
  completedCheckpointIds: ReadonlySet<string> = new Set<string>(),
): DragonTeachingSequenceFrame {
  const boundedElapsedMs = Math.max(0, Math.min(elapsedMs, sequence.durationMs));
  const cuesReached = sequence.cues.filter(cue => cue.atMs <= boundedElapsedMs);
  const pendingCheckpoint = cuesReached.find(cue =>
    cue.action === 'pause-for-prediction'
    && !!cue.checkpointId
    && !completedCheckpointIds.has(cue.checkpointId),
  );
  const effectiveElapsedMs = pendingCheckpoint
    ? Math.min(boundedElapsedMs, pendingCheckpoint.atMs)
    : boundedElapsedMs;
  const activeCues = sequence.cues.filter(cue =>
    cue.atMs <= effectiveElapsedMs && cue.atMs + cue.durationMs >= effectiveElapsedMs,
  );
  const completedCueIds = sequence.cues
    .filter(cue => cue.atMs + cue.durationMs < effectiveElapsedMs)
    .map(cue => cue.id);
  const activeCaptionIds = cuesReached
    .filter(cue => !!cue.captionId && cue.atMs <= effectiveElapsedMs)
    .map(cue => cue.captionId!)
    .slice(-1);

  return {
    elapsedMs: effectiveElapsedMs,
    progress: sequence.durationMs === 0 ? 1 : effectiveElapsedMs / sequence.durationMs,
    activeCues,
    completedCueIds,
    activeCaptionIds,
    awaitingCheckpointId: pendingCheckpoint?.checkpointId ?? null,
    complete: effectiveElapsedMs >= sequence.durationMs && !pendingCheckpoint,
  };
}

