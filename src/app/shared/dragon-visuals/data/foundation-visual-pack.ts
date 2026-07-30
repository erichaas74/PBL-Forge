import { CORE_DRAGON_TEACHING_SEQUENCES } from './core-teaching-sequences';
import { DRAGON_VISUAL_CONTRACT_VERSION } from '../domain/dragon-visual.models';
import { DragonVisualPackManifest } from '../domain/visual-pack.models';

export const FOUNDATION_DRAGON_VISUAL_PACK: DragonVisualPackManifest = {
  manifestVersion: 1,
  packId: 'royal-hatchery-foundation',
  packVersion: '1.0.0',
  compatibleContractVersions: [DRAGON_VISUAL_CONTRACT_VERSION],
  assets: [],
  motions: [
    motion('instrument-focus', 800),
    motion('allele-trace', 1400),
    motion('trait-morph', 1200),
    motion('evidence-highlight', 800),
    motion('allele-transfer', 1300),
  ],
  teachingSequences: CORE_DRAGON_TEACHING_SEQUENCES,
};

function motion(id: string, durationMs: number) {
  return {
    id,
    durationMs,
    easing: 'ease-in-out',
    keyframes: [
      { offset: 0, opacity: 0.6, scale: 0.96 },
      { offset: 1, opacity: 1, scale: 1 },
    ],
  } as const;
}

