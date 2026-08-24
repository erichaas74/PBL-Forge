import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildMiniBody, buildMiniDorsalScales, buildMiniNeck } from './mini-dragon-body-mesh';
import { buildMiniHead, buildMiniJaw } from './mini-dragon-head-mesh';
import { buildMiniEarPart, buildMiniHornPart } from './mini-dragon-head-appendages';
import { buildMiniLeg, buildMiniThigh } from './mini-dragon-limb-mesh';
import { createMiniDragonPalette } from './mini-dragon-palette';
import { buildMiniTail, buildMiniTailPlume } from './mini-dragon-tail-mesh';
import { buildMiniWing } from './mini-dragon-wing-mesh';
import {
  buildMiniBellyScutes,
  buildMiniBrowPlates,
  buildMiniChinTuft,
  buildMiniDewlap,
  buildMiniFlankFins,
  buildMiniHipFins,
  buildMiniNeckRuff,
  buildMiniShoulderPlates,
  buildMiniTailSail,
  buildMiniWhiskers,
} from './mini-dragon-expanded-parts';
import {
  buildMiniAeroWing,
  buildMiniFaceShield,
  buildMiniFairyWing,
  buildMiniForkTailBranch,
  buildMiniNoseHorn,
  buildMiniSerpentBodySegment,
} from './mini-dragon-breed-parts';

/**
 * Routes procedural anatomy for the domesticated mini dragon.
 *
 * The mini dragon remains a separate animal from the classic dragon: it shares
 * no builder, silhouette, palette, material, or texture with that renderer.
 */
export const MINI_DRAGON_PROFILE_IDS = [
  'mini-dragon-body',
  'mini-dragon-dorsal-scales',
  'mini-dragon-neck',
  'mini-dragon-head',
  'mini-dragon-horn',
  'mini-dragon-ear',
  'mini-dragon-jaw',
  'mini-dragon-thigh',
  'mini-dragon-leg',
  'mini-dragon-wing',
  'mini-dragon-tail',
  'mini-dragon-tail-plume',
  'mini-dragon-brow-plates',
  'mini-dragon-whiskers',
  'mini-dragon-chin-tuft',
  'mini-dragon-dewlap',
  'mini-dragon-neck-ruff',
  'mini-dragon-shoulder-plates',
  'mini-dragon-belly-scutes',
  'mini-dragon-flank-fins',
  'mini-dragon-hip-fins',
  'mini-dragon-tail-sail',
  'mini-dragon-face-shield',
  'mini-dragon-nose-horn',
  'mini-dragon-serpent-body-segment',
  'mini-dragon-fork-tail-branch',
  'mini-dragon-fairy-wing',
  'mini-dragon-aero-wing',
] as const;

export type MiniDragonProfileId = (typeof MINI_DRAGON_PROFILE_IDS)[number];

export function isMiniDragonProfileId(value: string): value is MiniDragonProfileId {
  return (MINI_DRAGON_PROFILE_IDS as readonly string[]).includes(value);
}

export function createMiniDragonProceduralObject(part: AssemblyPart): THREE.Object3D | null {
  const profileId = part.visualProfile?.profileId ?? '';
  if (!isMiniDragonProfileId(profileId)) return null;
  const palette = createMiniDragonPalette(part);

  switch (profileId) {
    case 'mini-dragon-body':
      return buildMiniBody(part, palette);
    case 'mini-dragon-dorsal-scales':
      return buildMiniDorsalScales(part, palette);
    case 'mini-dragon-neck':
      return buildMiniNeck(part, palette);
    case 'mini-dragon-head':
      return buildMiniHead(part, palette);
    case 'mini-dragon-horn':
      return buildMiniHornPart(part, palette);
    case 'mini-dragon-ear':
      return buildMiniEarPart(part, palette);
    case 'mini-dragon-jaw':
      return buildMiniJaw(part, palette);
    case 'mini-dragon-thigh':
      return buildMiniThigh(part, palette);
    case 'mini-dragon-leg':
      return buildMiniLeg(part, palette);
    case 'mini-dragon-wing':
      return buildMiniWing(part, palette);
    case 'mini-dragon-tail':
      return buildMiniTail(part, palette);
    case 'mini-dragon-tail-plume':
      return buildMiniTailPlume(part, palette);
    case 'mini-dragon-brow-plates':
      return buildMiniBrowPlates(part, palette);
    case 'mini-dragon-whiskers':
      return buildMiniWhiskers(part, palette);
    case 'mini-dragon-chin-tuft':
      return buildMiniChinTuft(part, palette);
    case 'mini-dragon-dewlap':
      return buildMiniDewlap(part, palette);
    case 'mini-dragon-neck-ruff':
      return buildMiniNeckRuff(part, palette);
    case 'mini-dragon-shoulder-plates':
      return buildMiniShoulderPlates(part, palette);
    case 'mini-dragon-belly-scutes':
      return buildMiniBellyScutes(part, palette);
    case 'mini-dragon-flank-fins':
      return buildMiniFlankFins(part, palette);
    case 'mini-dragon-hip-fins':
      return buildMiniHipFins(part, palette);
    case 'mini-dragon-tail-sail':
      return buildMiniTailSail(part, palette);
    case 'mini-dragon-face-shield':
      return buildMiniFaceShield(part, palette);
    case 'mini-dragon-nose-horn':
      return buildMiniNoseHorn(part, palette);
    case 'mini-dragon-serpent-body-segment':
      return buildMiniSerpentBodySegment(part, palette);
    case 'mini-dragon-fork-tail-branch':
      return buildMiniForkTailBranch(part, palette);
    case 'mini-dragon-fairy-wing':
      return buildMiniFairyWing(part, palette);
    case 'mini-dragon-aero-wing':
      return buildMiniAeroWing(part, palette);
  }
}
