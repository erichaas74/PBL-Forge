import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addDragonHeadDecorations } from './dragon-head-decorations';
import { dragonHeadExtent } from './dragon-head-profile';
import { buildDragonNeckSocket, buildDragonSkull } from './dragon-head-skull';
import { DragonPalette } from './dragon-materials';
import { DragonHeadStyle, getActiveDragonStyle } from './dragon-style';
import { visualNumber } from './dragon-visual-parameter-readers';

/** Builds the complete horned-head assembly from its skull and decorative anatomy. */
export function buildDragonHornedHead(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const dims = dragonHeadExtent(part.dimensions, part.shape);
  const group = new THREE.Group();
  const style = headStyleFor(part);
  const { skull, shape } = buildDragonSkull(dims, palette, style);

  group.add(skull);
  group.add(buildDragonNeckSocket(part, dims, palette, shape));
  addDragonHeadDecorations(group, part, dims, palette, shape, style);
  return group;
}

function headStyleFor(part: AssemblyPart): DragonHeadStyle {
  const defaults = getActiveDragonStyle().head;
  return {
    cranium: visualNumber(part, 'cranium', defaults.cranium),
    browRidge: visualNumber(part, 'browRidge', defaults.browRidge),
    muzzleDepth: visualNumber(part, 'muzzleDepth', defaults.muzzleDepth),
    muzzleWidth: visualNumber(part, 'muzzleWidth', defaults.muzzleWidth),
    muzzleDrop: visualNumber(part, 'muzzleDrop', defaults.muzzleDrop),
    cheek: visualNumber(part, 'cheek', defaults.cheek),
    eyeAxial: visualNumber(part, 'eyeAxial', defaults.eyeAxial),
    hornLength: visualNumber(part, 'hornLength', defaults.hornLength),
    hornRadius: visualNumber(part, 'hornRadius', defaults.hornRadius),
    browLength: visualNumber(part, 'browLength', defaults.browLength),
  };
}
