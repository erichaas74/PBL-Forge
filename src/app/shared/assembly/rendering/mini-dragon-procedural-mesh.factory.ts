import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildMiniBody, buildMiniDorsalScales, buildMiniNeck } from './mini-dragon-body-mesh';
import { buildMiniHead, buildMiniJaw } from './mini-dragon-head-mesh';
import { buildMiniLeg, buildMiniThigh } from './mini-dragon-limb-mesh';
import { createMiniDragonPalette } from './mini-dragon-rendering';
import { buildMiniTail, buildMiniTailPlume } from './mini-dragon-tail-mesh';
import { buildMiniWing } from './mini-dragon-wing-mesh';

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
  'mini-dragon-jaw',
  'mini-dragon-thigh',
  'mini-dragon-leg',
  'mini-dragon-wing',
  'mini-dragon-tail',
  'mini-dragon-tail-plume',
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
  }
}
