import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniWingFeathers } from './mini-dragon-feathers';
import {
  addMiniJointBall,
  createMiniLoftGeometry,
  createMiniPetalGeometry,
  miniDetail,
  miniMesh,
} from './mini-dragon-geometry';
import {
  miniCoatMaterial,
  miniHornMaterial,
  miniWingMembraneMaterial,
} from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

/** Broad, rounded skull shield used by the crown + bumpy + armored combination. */
export function buildMiniFaceShield(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  const group = namedGroup('mini-dragon-face-shield-part');
  const amount = miniVisualNumber(part, 'miniFaceShieldScale', 0);
  if (amount <= 0) return group;
  const dims = part.dimensions;
  const plateMaterial = miniHornMaterial(palette, palette.dorsal, part.id);

  const centre = miniMesh(
    new THREE.SphereGeometry(dims.y * 0.23 * amount, miniDetail(18), miniDetail(12)),
    plateMaterial,
  );
  centre.name = 'mini-dragon-face-shield-centre';
  centre.scale.set(0.42, 1.12, 1.42);
  centre.position.set(-dims.x * 0.34, dims.y * 0.08, 0);
  group.add(centre);

  for (const side of [-1, 1] as const) {
    for (const [index, lift] of [-0.19, 0.02, 0.23].entries()) {
      const plate = miniMesh(
        createMiniPetalGeometry(
          dims.z * (0.28 + index * 0.025) * amount,
          dims.y * (0.25 + index * 0.035) * amount,
          dims.x * 0.025,
          0.9,
        ),
        plateMaterial,
      );
      plate.name = 'mini-dragon-face-shield-lobe';
      plate.position.set(
        -dims.x * (0.34 + index * 0.025),
        dims.y * lift,
        side * dims.z * (0.26 + index * 0.07),
      );
      plate.rotation.x = side * Math.PI * 0.5;
      plate.rotation.z = -0.28 + index * 0.12;
      group.add(plate);
    }
  }
  return group;
}

/** A soft keratin bumper on the upper muzzle rather than a weapon-like spike. */
export function buildMiniNoseHorn(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  const group = namedGroup('mini-dragon-nose-horn-part');
  const amount = miniVisualNumber(part, 'miniNoseHornScale', 0);
  if (amount <= 0) return group;
  const dims = part.dimensions;
  const material = miniHornMaterial(palette, palette.horn, part.id);
  const length = dims.x * 0.28 * amount;
  const horn = miniMesh(
    new THREE.ConeGeometry(dims.y * 0.075 * amount, length, miniDetail(12)),
    material,
  );
  horn.name = 'mini-dragon-nose-horn';
  horn.rotation.z = -Math.PI / 2;
  horn.position.set(dims.x * 0.34, dims.y * 0.17, 0);
  horn.scale.set(1, 1, 1.22);
  group.add(horn);
  return group;
}

/** One plush caterpillar section in the articulated long-body overlay chain. */
export function buildMiniSerpentBodySegment(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  const group = namedGroup('mini-dragon-serpent-body-segment-part');
  const amount = miniVisualNumber(part, 'miniSerpentSegmentScale', 0);
  if (amount <= 0) return group;
  const dims = part.dimensions;
  const material = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const segment = miniMesh(createMiniLoftGeometry([
    { x: -dims.x * 0.5, yRadius: dims.y * 0.35 * amount, zRadius: dims.z * 0.36 * amount },
    { x: -dims.x * 0.28, yRadius: dims.y * 0.49 * amount, zRadius: dims.z * 0.5 * amount },
    { x: 0, yRadius: dims.y * 0.53 * amount, zRadius: dims.z * 0.54 * amount },
    { x: dims.x * 0.28, yRadius: dims.y * 0.49 * amount, zRadius: dims.z * 0.5 * amount },
    { x: dims.x * 0.5, yRadius: dims.y * 0.35 * amount, zRadius: dims.z * 0.36 * amount },
  ], 22), material);
  segment.name = 'mini-dragon-serpent-body-segment';
  group.add(segment);

  const ringMaterial = miniHornMaterial(
    palette,
    palette.dorsal.clone().lerp(palette.coat, 0.62),
    `${part.id}-rings`,
  );
  for (const axial of [-0.26, 0.26]) {
    const ring = miniMesh(
      new THREE.TorusGeometry(dims.y * 0.39 * amount, dims.y * 0.018, miniDetail(7), miniDetail(18)),
      ringMaterial,
    );
    ring.name = 'mini-dragon-serpent-flex-ring';
    ring.rotation.y = Math.PI / 2;
    ring.scale.z = dims.z / Math.max(dims.y, 1e-6);
    ring.position.x = dims.x * axial;
    group.add(ring);
  }
  addMiniJointBall(group, dims.y * 0.34 * amount, material, { x: dims.x * 0.47, y: 0, z: 0 });
  return group;
}

/** One independently connected koi-like branch of the fork-tail phenotype. */
export function buildMiniForkTailBranch(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  const group = namedGroup('mini-dragon-fork-tail-branch-part');
  const amount = miniVisualNumber(part, 'miniForkTailScale', 1);
  if (amount <= 0) return group;
  const dims = part.dimensions;
  const material = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const stem = miniMesh(createMiniLoftGeometry([
    { x: -dims.x * 0.46, yRadius: dims.y * 0.17, zRadius: dims.z * 0.16 },
    { x: -dims.x * 0.08, yRadius: dims.y * 0.27, zRadius: dims.z * 0.24 },
    { x: dims.x * 0.46, yRadius: dims.y * 0.34, zRadius: dims.z * 0.3 },
  ], 16), material);
  stem.name = 'mini-dragon-fork-tail-stem';
  group.add(stem);
  const paddle = miniMesh(
    createMiniPetalGeometry(
      dims.y * 0.8 * amount,
      dims.x * 0.72 * amount,
      dims.z * 0.08,
      0.93,
    ),
    material,
  );
  paddle.name = 'mini-dragon-fork-tail-paddle';
  paddle.rotation.z = Math.PI / 2;
  paddle.position.set(-dims.x * 0.42, 0, 0);
  group.add(paddle);
  addMiniJointBall(group, dims.y * 0.3, material, { x: dims.x * 0.46, y: 0, z: 0 });
  return group;
}

export function buildMiniFairyWing(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  return buildBreedWing(part, palette, 'fairy');
}

export function buildMiniAeroWing(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  return buildBreedWing(part, palette, 'aero');
}

function buildBreedWing(
  part: AssemblyPart,
  palette: MiniDragonPalette,
  kind: 'fairy' | 'aero',
): THREE.Group {
  const group = namedGroup(`mini-dragon-${kind}-wing-part`);
  const dims = part.dimensions;
  const side = miniVisualNumber(part, 'miniWingSide', 1) < 0 ? -1 : 1;
  const spread = miniVisualNumber(part, 'miniWingSpread', 1);
  const chordScale = miniVisualNumber(part, 'miniWingChord', 1);
  const span = dims.z * spread * (kind === 'aero' ? 1.34 : 1.12);
  const chord = dims.x * chordScale * (kind === 'aero' ? 0.82 : 1.16);
  const coat = miniCoatMaterial(palette.coat, `${part.id}-bone`, palette.surfaceStyle);
  addMiniJointBall(group, dims.y * 0.2, coat, { x: 0, y: 0, z: 0 });

  const shape = new THREE.Shape();
  shape.moveTo(chord * 0.34, 0);
  if (kind === 'fairy') {
    shape.bezierCurveTo(chord * 0.62, span * 0.22, chord * 0.42, span * 0.56, chord * 0.04, span);
    shape.bezierCurveTo(-chord * 0.34, span * 0.96, -chord * 0.5, span * 0.72, -chord * 0.24, span * 0.55);
    shape.bezierCurveTo(-chord * 0.58, span * 0.46, -chord * 0.56, span * 0.18, chord * 0.34, 0);
  } else {
    shape.bezierCurveTo(chord * 0.42, span * 0.3, chord * 0.08, span * 0.78, -chord * 0.08, span);
    shape.quadraticCurveTo(-chord * 0.3, span * 0.7, -chord * 0.42, span * 0.34);
    shape.quadraticCurveTo(-chord * 0.34, span * 0.08, chord * 0.34, 0);
  }
  const geometry = new THREE.ShapeGeometry(shape, miniDetail(22));
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const unit = THREE.MathUtils.clamp(positions.getY(index) / Math.max(span, 1e-6), 0, 1);
    positions.setZ(index, Math.sin(unit * Math.PI) * dims.y * (kind === 'fairy' ? 0.2 : 0.1));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.rotateX(Math.PI / 2);
  const membrane = miniMesh(geometry, miniWingMembraneMaterial(palette, part.id));
  membrane.name = kind === 'fairy'
    ? 'mini-dragon-fairy-wing-membrane'
    : 'mini-dragon-aero-wing-membrane';
  membrane.scale.z = side;
  group.add(membrane);

  const leading = new THREE.CatmullRomCurve3([
    new THREE.Vector3(chord * 0.32, 0, 0),
    new THREE.Vector3(chord * 0.28, dims.y * 0.1, side * span * 0.38),
    new THREE.Vector3(chord * 0.08, dims.y * 0.04, side * span * 0.72),
    new THREE.Vector3(kind === 'fairy' ? chord * 0.04 : -chord * 0.08, 0, side * span),
  ]);
  const bone = miniMesh(
    new THREE.TubeGeometry(leading, miniDetail(20), dims.y * 0.055, miniDetail(8), false),
    coat,
  );
  bone.name = `mini-dragon-${kind}-wing-bone`;
  group.add(bone);

  const strutPositions = kind === 'fairy' ? [0.3, 0.52, 0.74] : [0.38, 0.68, 0.86];
  for (const at of strutPositions) {
    const from = leading.getPoint(at);
    const to = new THREE.Vector3(-chord * (kind === 'fairy' ? 0.34 : 0.26), 0, side * span * at);
    const axis = new THREE.Vector3().subVectors(to, from);
    const strut = miniMesh(
      new THREE.CylinderGeometry(dims.y * 0.02, dims.y * 0.034, axis.length(), miniDetail(7)),
      coat,
    );
    strut.name = `mini-dragon-${kind}-wing-strut`;
    strut.position.copy(from).addScaledVector(axis, 0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    group.add(strut);
  }

  addMiniWingFeathers(group, part, palette, side, span, chord);
  group.rotation.x = -side * (kind === 'fairy' ? 0.42 : 0.34);
  group.rotation.y = side * (kind === 'fairy' ? 0.16 : 0.28);
  return group;
}

function namedGroup(name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  return group;
}
