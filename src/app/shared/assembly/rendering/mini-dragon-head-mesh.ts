import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniDragonFace } from './mini-dragon-face-mesh';
import { addMiniDragonHeadOrnaments } from './mini-dragon-head-ornaments';
import { MiniDragonPalette, coatMaterial, mesh, visualNumber } from './mini-dragon-rendering';

// ---------------------------------------------------------------------------
// Head: oversized round skull, huge eyes, stub snout, tufted ears, curling horns.
// ---------------------------------------------------------------------------

export function buildMiniHead(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const eyeSize = visualNumber(part, 'miniEyeSize', 0.62);
  const snoutLength = visualNumber(part, 'miniSnoutLength', 0.34);
  const hornCurl = visualNumber(part, 'miniHornCurl', 0);
  const hornLength = visualNumber(part, 'miniHornLength', 0.62);
  const earTuft = visualNumber(part, 'miniEarTuft', 0.6);
  const earScale = visualNumber(part, 'miniEarScale', 1);
  const cheekTuft = visualNumber(part, 'miniCheekTuft', 0.6);
  const crownCrest = visualNumber(part, 'miniCrestCrown', 0) >= 0.5;
  const sideFrill = visualNumber(part, 'miniCrestFrill', 0) >= 0.5;
  const coat = coatMaterial(palette.coat);

  // Cranium: wider than long, which is most of what makes it read as young.
  const skullRadius = dims.y * 0.5;
  const skullScale = new THREE.Vector3((dims.x / dims.y) * 0.92, 1, (dims.z / dims.y) * 1.02);
  const skull = mesh(new THREE.SphereGeometry(skullRadius, 20, 16), coat);
  skull.name = 'mini-dragon-cranium';
  skull.scale.copy(skullScale);
  group.add(skull);

  /**
   * A point on the cranium, so features sit *on* the skull rather than inside
   * it. Placing eyes by raw part fractions buried them in the head — a sphere
   * scaled on three axes has no single radius to guess at.
   */
  const skullPoint = (direction: THREE.Vector3, lift = 1): THREE.Vector3 => {
    const unit = direction.clone().normalize();
    return new THREE.Vector3(
      unit.x * skullRadius * skullScale.x * lift,
      unit.y * skullRadius * skullScale.y * lift,
      unit.z * skullRadius * skullScale.z * lift,
    );
  };

  // Snout: short, blunt, and set low so the forehead stays big.
  const snoutRoot = skullPoint(new THREE.Vector3(1, -0.34, 0), 0.8);
  const snout = mesh(new THREE.SphereGeometry(dims.y * 0.21, 14, 12), coat);
  snout.name = 'mini-dragon-snout';
  snout.scale.set(0.85 + snoutLength * 1.1, 0.78, 0.86);
  snout.position.set(snoutRoot.x + dims.x * 0.1, snoutRoot.y - dims.y * 0.02, 0);
  group.add(snout);

  const nostrilMaterial = coatMaterial(palette.coatDeep);
  for (const side of [-1, 1] as const) {
    const nostril = mesh(new THREE.SphereGeometry(dims.y * 0.034, 8, 6), nostrilMaterial);
    nostril.name = 'mini-dragon-nostril';
    nostril.position.set(
      snout.position.x + dims.y * 0.17 * (0.7 + snoutLength),
      snout.position.y + dims.y * 0.02,
      side * dims.z * 0.1,
    );
    group.add(nostril);
  }

  addMiniDragonFace(group, dims, palette, coat, skullPoint, {
    eyeSize,
    earTuft,
    earScale,
    cheekTuft,
  });
  addMiniDragonHeadOrnaments(group, dims, palette, coat, skullPoint, {
    hornCurl,
    hornLength,
    crownCrest,
    sideFrill,
  });

  return group;
}

export { buildMiniJaw } from './mini-dragon-jaw-mesh';
