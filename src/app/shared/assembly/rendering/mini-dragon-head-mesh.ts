import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniDragonFace } from './mini-dragon-face-mesh';
import {
  createMiniDragonMuzzleGeometry,
  createMiniDragonSkullShape,
} from './mini-dragon-head-shape';
import { miniMesh } from './mini-dragon-geometry';
import { addMiniDragonHeadOrnaments } from './mini-dragon-head-ornaments';
import { miniCoatMaterial } from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniHeadMorphology } from './mini-dragon-morphology';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

// ---------------------------------------------------------------------------
// Head: oversized round skull, huge eyes, stub snout, tufted ears, curling horns.
// ---------------------------------------------------------------------------

export function buildMiniHead(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const eyeSize = miniVisualNumber(part, 'miniEyeSize', 0.62);
  const snoutLength = miniVisualNumber(part, 'miniSnoutLength', 0.34);
  const cheekTuft = miniVisualNumber(part, 'miniCheekTuft', 0.6);
  const crownCrest = miniVisualNumber(part, 'miniCrestCrown', 0) >= 0.5;
  const sideFrill = miniVisualNumber(part, 'miniCrestFrill', 0) >= 0.5;
  const morphology = miniHeadMorphology(part);
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);

  const skullShape = createMiniDragonSkullShape(dims, morphology);
  const skull = miniMesh(skullShape.geometry, coat);
  skull.name = 'mini-dragon-cranium';
  group.add(skull);

  /**
   * A point on the cranium, so features sit *on* the skull rather than inside
   * it. Placing eyes by raw part fractions buried them in the head — a sphere
   * scaled on three axes has no single radius to guess at.
   */
  const skullPoint = skullShape.point;

  // Snout length now changes the actual face profile, not only the scale of a ball.
  const snoutRoot = skullPoint(new THREE.Vector3(1, -0.34, 0), 0.8);
  const muzzleLength = dims.x * (0.2 + snoutLength * 0.48);
  const muzzleHeight = dims.y * 0.34 * morphology.muzzleDepth;
  const muzzleWidth = dims.z * 0.48 * morphology.muzzleWidth;
  const snout = miniMesh(
    createMiniDragonMuzzleGeometry(muzzleLength, muzzleHeight, muzzleWidth),
    coat,
  );
  snout.name = 'mini-dragon-snout';
  snout.position.set(
    snoutRoot.x + muzzleLength * 0.36,
    snoutRoot.y - dims.y * 0.018,
    0,
  );
  group.add(snout);

  const nostrilMaterial = miniCoatMaterial(palette.coatDeep, `${part.id}-nostril`, palette.surfaceStyle);
  for (const side of [-1, 1] as const) {
    const nostril = miniMesh(new THREE.SphereGeometry(dims.y * 0.034, 8, 6), nostrilMaterial);
    nostril.name = 'mini-dragon-nostril';
    nostril.position.set(
      snout.position.x + muzzleLength * 0.4,
      snout.position.y + muzzleHeight * 0.14,
      side * muzzleWidth * 0.25,
    );
    group.add(nostril);
  }

  addMiniDragonFace(group, dims, palette, coat, skullPoint, {
    eyeSize,
    eyeSpacing: morphology.eyeSpacing,
    cheekTuft,
  });
  addMiniDragonHeadOrnaments(group, dims, coat, {
    crestScale: morphology.crestScale,
    crownCrest,
    sideFrill,
  });

  return group;
}

export { buildMiniJaw } from './mini-dragon-jaw-mesh';
