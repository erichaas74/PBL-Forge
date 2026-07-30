import { DragonTeachingSequence } from './teaching-sequence.models';
import { DragonVisualContractVersion } from './dragon-visual.models';

export type DragonVisualAssetKind = 'svg' | 'image' | 'sprite-sheet' | 'model' | 'audio';

export interface DragonVisualAnchor {
  id: string;
  x: number;
  y: number;
}

export interface DragonVisualAsset {
  id: string;
  kind: DragonVisualAssetKind;
  source: string;
  anchors: readonly DragonVisualAnchor[];
}

export interface DragonVisualMotionKeyframe {
  offset: number;
  x?: number;
  y?: number;
  scale?: number;
  rotationDegrees?: number;
  opacity?: number;
}

export interface DragonVisualMotion {
  id: string;
  durationMs: number;
  easing: string;
  keyframes: readonly DragonVisualMotionKeyframe[];
}

export interface DragonVisualPackManifest {
  manifestVersion: 1;
  packId: string;
  packVersion: string;
  compatibleContractVersions: readonly DragonVisualContractVersion[];
  assets: readonly DragonVisualAsset[];
  motions: readonly DragonVisualMotion[];
  teachingSequences: readonly DragonTeachingSequence[];
}

