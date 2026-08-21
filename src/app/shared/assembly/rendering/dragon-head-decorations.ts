import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addDragonHeadExpressiveFeatures } from './dragon-head-expressive-features';
import { addDragonHeadHornsAndEyes } from './dragon-head-sensory-features';
import { DragonHeadShape } from './dragon-head-profile';
import { DragonPalette } from './dragon-materials';
import { DragonHeadStyle } from './dragon-style';

/** Joins the head's sensory anatomy to inherited and sex-specific decorations. */
export function addDragonHeadDecorations(
  group: THREE.Group,
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
  style: DragonHeadStyle,
): void {
  addDragonHeadHornsAndEyes(group, part, dims, palette, shape, style);
  addDragonHeadExpressiveFeatures(group, part, dims, palette, shape);
}
