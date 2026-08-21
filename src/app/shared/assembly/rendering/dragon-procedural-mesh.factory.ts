import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildDragonBody } from './dragon-body-mesh';
import { buildDragonHornedHead } from './dragon-head-mesh';
import { buildDragonJaw } from './dragon-jaw-mesh';
import {
  buildDragonFoot,
  buildDragonGraspArm,
  buildDragonGraspHand,
  buildDragonLeg,
  buildDragonTalon,
} from './dragon-limb-mesh';
import {
  buildDragonTailClub,
  buildDragonTailSegment,
  buildDragonTailStinger,
} from './dragon-tail-mesh';
import { buildDragonWing } from './dragon-wing-mesh';
import { dragonPaletteForPart } from './dragon-materials';

/**
 * Routes each procedural profile to anatomy built from the part's physics
 * dimensions, so the genetics pipeline automatically reshapes the visuals.
 * Collision stays on the primitive shape; these meshes are purely visual.
 *
 * All colors derive from `part.color`, which the phenotype builder repaints from
 * the dragon's pigment genes — so horn, membrane, and claw tones track genetics.
 */
export function createDragonProceduralObject(part: AssemblyPart): THREE.Object3D | null {
  const profileId = part.visualProfile?.profileId ?? '';
  const palette = dragonPaletteForPart(part);
  const dims = part.dimensions;

  switch (profileId) {
    case 'dragon-body':
      return buildDragonBody(part, palette);
    case 'dragon-head-horned':
      return buildDragonHornedHead(part, palette);
    case 'dragon-upper-jaw':
      return buildDragonJaw(part, palette, 'upper');
    case 'dragon-lower-jaw':
      return buildDragonJaw(part, palette, 'lower');
    case 'dragon-leg':
      return buildDragonLeg(part, palette);
    case 'dragon-grasp-arm':
      return buildDragonGraspArm(part, palette);
    case 'dragon-grasp-hand':
      return buildDragonGraspHand(part, palette);
    case 'dragon-foot':
      return buildDragonFoot(part, palette);
    case 'dragon-claw':
      return buildDragonTalon(dims.x, dims.y, palette);
    case 'dragon-wing-claw':
      return buildDragonTalon(dims.x, dims.y, palette);
    case 'dragon-wing':
    case 'dragon-secondary-wing':
      return buildDragonWing(part, palette);
    case 'dragon-tail':
      return buildDragonTailSegment(part, palette);
    case 'dragon-tail-club':
      return buildDragonTailClub(part, palette);
    case 'dragon-tail-stinger':
      return buildDragonTailStinger(dims.x, palette);
    default:
      return null;
  }
}
