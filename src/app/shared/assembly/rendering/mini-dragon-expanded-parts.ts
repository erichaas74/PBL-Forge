import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { createMiniPetalGeometry, miniDetail, miniMesh } from './mini-dragon-geometry';
import {
  miniCoatMaterial,
  miniHornMaterial,
  miniWingMembraneMaterial,
} from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

/** Ten focused inherited ornaments added by the expanded Mini Dragon genome. */

export function buildMiniBrowPlates(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-brow-plates');
  const amount = miniVisualNumber(part, 'miniBrowScale', 0.68);
  if (amount <= 0.02) return group;
  const material = miniHornMaterial(palette, palette.dorsal, part.id);
  for (const side of [-1, 1] as const) {
    const plate = miniMesh(
      new THREE.SphereGeometry(part.dimensions.y * 0.09 * amount, miniDetail(14), miniDetail(9)),
      material,
    );
    plate.name = 'mini-dragon-brow-plate';
    plate.scale.set(1.45, 0.42, 0.82);
    plate.position.set(
      part.dimensions.x * 0.35,
      part.dimensions.y * 0.17,
      side * part.dimensions.z * 0.22,
    );
    plate.rotation.x = side * 0.22;
    group.add(plate);
  }
  return group;
}

export function buildMiniWhiskers(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-whiskers');
  const amount = miniVisualNumber(part, 'miniWhiskerScale', 0.65);
  if (amount <= 0.04) return group;
  const material = miniHornMaterial(
    palette,
    palette.horn.clone().lerp(palette.coat, 0.35),
    part.id,
  );
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < 2; row += 1) {
      const root = new THREE.Vector3(
        part.dimensions.x * 0.43,
        part.dimensions.y * (-0.03 - row * 0.055),
        side * part.dimensions.z * (0.28 + row * 0.035),
      );
      const length = part.dimensions.x * (0.3 + amount * 0.62);
      const curve = new THREE.CatmullRomCurve3([
        root,
        root.clone().add(new THREE.Vector3(length * 0.35, part.dimensions.y * 0.02, side * length * 0.16)),
        root.clone().add(new THREE.Vector3(length * 0.72, part.dimensions.y * (0.03 - row * 0.025), side * length * 0.3)),
        root.clone().add(new THREE.Vector3(length, part.dimensions.y * (0.08 - row * 0.04), side * length * 0.38)),
      ]);
      const whisker = miniMesh(
        new THREE.TubeGeometry(
          curve,
          miniDetail(16),
          part.dimensions.y * 0.0085,
          miniDetail(6),
          false,
        ),
        material,
      );
      whisker.name = 'mini-dragon-whisker';
      group.add(whisker);
    }
  }
  return group;
}

export function buildMiniChinTuft(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-chin-tuft');
  const amount = miniVisualNumber(part, 'miniChinScale', 0);
  if (amount <= 0.04) return group;
  // Petals are extruded geometry, not the UV-mapped feather cards used by the
  // mantle. A solid velvet material keeps this inherited tuft visible from
  // every angle instead of letting the feather-card alpha map cut it away.
  const material = miniCoatMaterial(palette.accent, part.id, palette.surfaceStyle);
  for (const side of [-1, 0, 1] as const) {
    const tuft = miniMesh(
      createMiniPetalGeometry(
        part.dimensions.z * 0.11 * amount,
        part.dimensions.y * 0.24 * amount,
        part.dimensions.z * 0.018,
        0.7,
      ),
      material,
    );
    tuft.name = 'mini-dragon-chin-feather';
    tuft.position.set(
      part.dimensions.x * (0.22 - Math.abs(side) * 0.04),
      -part.dimensions.y * 0.27,
      side * part.dimensions.z * 0.1,
    );
    tuft.rotation.z = Math.PI + side * 0.18;
    tuft.rotation.x = side * 0.2;
    group.add(tuft);
  }
  return group;
}

export function buildMiniDewlap(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-dewlap');
  const amount = miniVisualNumber(part, 'miniDewlapScale', 0.65);
  if (amount <= 0.04) return group;
  const sail = miniMesh(
    createMiniPetalGeometry(
      part.dimensions.z * (0.45 + amount * 0.25),
      part.dimensions.y * (0.42 + amount * 0.48),
      part.dimensions.z * 0.024,
      0.82,
    ),
    miniWingMembraneMaterial(palette, part.id),
  );
  sail.name = 'mini-dragon-dewlap-sail';
  sail.position.set(part.dimensions.x * 0.08, -part.dimensions.y * 0.12, 0);
  sail.rotation.z = Math.PI * 0.92;
  group.add(sail);
  return group;
}

export function buildMiniNeckRuff(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-neck-ruff');
  const amount = miniVisualNumber(part, 'miniRuffScale', 0.82);
  if (amount <= 0.04) return group;
  const material = miniCoatMaterial(palette.accent, part.id, palette.surfaceStyle);
  for (let index = 0; index < 7; index += 1) {
    const angle = -Math.PI * 0.72 + (index / 6) * Math.PI * 1.44;
    const petal = miniMesh(
      createMiniPetalGeometry(
        part.dimensions.z * 0.18 * amount,
        part.dimensions.y * 0.32 * amount,
        part.dimensions.z * 0.018,
        0.68,
      ),
      material,
    );
    petal.name = 'mini-dragon-ruff-petal';
    petal.position.set(
      -part.dimensions.x * 0.18,
      Math.cos(angle) * part.dimensions.y * 0.24,
      Math.sin(angle) * part.dimensions.z * 0.38,
    );
    petal.rotation.x = angle - Math.PI / 2;
    petal.rotation.z = -0.42;
    group.add(petal);
  }
  return group;
}

export function buildMiniShoulderPlates(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-shoulder-plates');
  const amount = miniVisualNumber(part, 'miniShoulderScale', 0.42);
  if (amount <= 0.04) return group;
  const material = miniHornMaterial(palette, palette.dorsal, part.id);
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < 2; row += 1) {
      const plate = miniMesh(
        new THREE.SphereGeometry(part.dimensions.y * 0.105 * amount, miniDetail(14), miniDetail(9)),
        material,
      );
      plate.name = 'mini-dragon-shoulder-plate';
      plate.scale.set(1.15, 0.38, 1.42);
      plate.position.set(
        part.dimensions.x * (0.2 - row * 0.13),
        part.dimensions.y * (0.28 - row * 0.04),
        side * part.dimensions.z * (0.39 + row * 0.025),
      );
      group.add(plate);
    }
  }
  return group;
}

export function buildMiniBellyScutes(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-belly-scutes');
  const amount = miniVisualNumber(part, 'miniBellyScuteScale', 0.68);
  if (amount <= 0.04) return group;
  const material = miniHornMaterial(
    palette,
    palette.belly,
    part.id,
  );
  for (let index = 0; index < 6; index += 1) {
    const t = index / 5;
    const scute = miniMesh(
      new THREE.SphereGeometry(part.dimensions.y * 0.07 * amount, miniDetail(12), miniDetail(8)),
      material,
    );
    scute.name = 'mini-dragon-belly-scute';
    scute.scale.set(1.35, 0.32, 1.65);
    scute.position.set(
      part.dimensions.x * (0.32 - t * 0.66),
      -part.dimensions.y * (0.43 + Math.sin(t * Math.PI) * 0.03),
      0,
    );
    group.add(scute);
  }
  return group;
}

export function buildMiniFlankFins(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-flank-fins');
  const amount = miniVisualNumber(part, 'miniFlankFinScale', 0.68);
  if (amount <= 0.04) return group;
  const material = miniWingMembraneMaterial(palette, part.id);
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < 2; row += 1) {
      const fin = miniMesh(
        createMiniPetalGeometry(
          part.dimensions.x * 0.14 * amount,
          part.dimensions.y * 0.28 * amount,
          part.dimensions.z * 0.016,
          0.7,
        ),
        material,
      );
      fin.name = 'mini-dragon-flank-fin';
      fin.position.set(
        part.dimensions.x * (0.1 - row * 0.24),
        -part.dimensions.y * 0.04,
        side * part.dimensions.z * 0.49,
      );
      fin.rotation.z = side * (0.52 + row * 0.12);
      group.add(fin);
    }
  }
  return group;
}

export function buildMiniHipFins(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-hip-fins');
  const amount = miniVisualNumber(part, 'miniHipFinScale', 0.68);
  if (amount <= 0.04) return group;
  const material = miniWingMembraneMaterial(palette, part.id);
  for (const side of [-1, 1] as const) {
    const fin = miniMesh(
      createMiniPetalGeometry(
        part.dimensions.z * 0.3 * amount,
        part.dimensions.y * 0.48 * amount,
        part.dimensions.z * 0.02,
        0.84,
      ),
      material,
    );
    fin.name = 'mini-dragon-hip-fin';
    fin.position.set(
      -part.dimensions.x * 0.31,
      part.dimensions.y * 0.02,
      side * part.dimensions.z * 0.48,
    );
    fin.rotation.z = side * 0.46;
    group.add(fin);
  }
  return group;
}

export function buildMiniTailSail(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = namedGroup('mini-dragon-tail-sail');
  const amount = miniVisualNumber(part, 'miniTailSailScale', 0.65);
  if (amount <= 0.04) return group;
  const material = miniWingMembraneMaterial(palette, part.id);
  for (let index = 0; index < 4; index += 1) {
    const taper = 1 - index * 0.14;
    const sail = miniMesh(
      createMiniPetalGeometry(
        part.dimensions.z * 0.28 * amount * taper,
        part.dimensions.y * 0.72 * amount * taper,
        part.dimensions.z * 0.015,
        0.6,
      ),
      material,
    );
    sail.name = 'mini-dragon-tail-sail-panel';
    sail.position.set(
      part.dimensions.x * (0.32 - index * 0.21),
      part.dimensions.y * 0.18,
      0,
    );
    sail.rotation.z = -0.12 - index * 0.04;
    group.add(sail);
  }
  return group;
}

function namedGroup(name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  return group;
}
