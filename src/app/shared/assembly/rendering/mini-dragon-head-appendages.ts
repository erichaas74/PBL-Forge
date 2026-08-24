import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniJointBall, createMiniPetalGeometry, miniDetail, miniMesh } from './mini-dragon-geometry';
import { miniCoatMaterial, miniHornMaterial, miniPawMaterial } from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

/** One independently rigged horn whose root is the part origin. */
export function buildMiniHornPart(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-horn-part';
  const dims = part.dimensions;
  const side = miniVisualNumber(part, 'miniHornSide', 1) < 0 ? -1 : 1;
  const curl = miniVisualNumber(part, 'miniHornCurl', 0);
  const lengthFactor = miniVisualNumber(part, 'miniHornLength', 0.48);
  const spreadFactor = miniVisualNumber(part, 'miniHornSpread', 1);
  const hornScale = miniVisualNumber(part, 'miniHornScale', 1);
  const material = miniHornMaterial(palette, palette.horn, part.id);
  if (hornScale <= 0.02) return group;
  // The inherited value was historically measured against skull height. This
  // part's X dimension is now its own envelope, so preserve that visible scale
  // instead of accidentally shrinking every separated horn by half.
  const length = dims.x * Math.max(lengthFactor * 2.1, 0.15) * hornScale;
  const baseRadius = Math.min(dims.y, dims.z) * 0.48 * hornScale;
  const segments = 12;
  const sweep = 0.55 + curl * 4.7;
  const coil = length / sweep;
  const start = new THREE.Vector2(0, 0);
  const heading = new THREE.Vector2(-0.42, 1).normalize();
  const centre = start.clone().add(new THREE.Vector2(heading.y, -heading.x).multiplyScalar(coil));

  const pointAt = (t: number): THREE.Vector3 => {
    const angle = sweep * t;
    const offset = start.clone().sub(centre);
    const planar = centre.clone().add(new THREE.Vector2(
      offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
      offset.x * Math.sin(angle) + offset.y * Math.cos(angle),
    ));
    return new THREE.Vector3(
      planar.x,
      planar.y,
      side * t * length * (0.12 + 0.28 * curl) * spreadFactor,
    );
  };

  for (let index = 0; index < segments; index += 1) {
    const from = pointAt(index / segments);
    const to = pointAt((index + 1) / segments);
    const axis = new THREE.Vector3().subVectors(to, from);
    const height = axis.length();
    if (height < 1e-5) continue;
    const taper = (value: number): number => baseRadius * (1 - 0.74 * value);
    const segment = miniMesh(
      new THREE.CylinderGeometry(
        taper((index + 1) / segments),
        taper(index / segments),
        height,
        miniDetail(11),
      ),
      material,
    );
    segment.name = 'mini-dragon-horn-segment';
    segment.position.copy(from).addScaledVector(axis, 0.5);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    group.add(segment);
  }

  addMiniJointBall(group, baseRadius * 0.96, material, { x: 0, y: 0, z: 0 });
  const tip = miniMesh(
    new THREE.SphereGeometry(baseRadius * 0.3, miniDetail(9), miniDetail(7)),
    material,
  );
  tip.name = 'mini-dragon-horn-tip';
  tip.position.copy(pointAt(1));
  group.add(tip);
  return group;
}

/** One independently rigged ear; its hinge and all local geometry meet at the origin. */
export function buildMiniEarPart(
  part: AssemblyPart,
  palette: MiniDragonPalette,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-ear-part';
  const dims = part.dimensions;
  const side = miniVisualNumber(part, 'miniEarSide', 1) < 0 ? -1 : 1;
  const scale = miniVisualNumber(part, 'miniEarScale', 1);
  const fold = miniVisualNumber(part, 'miniEarFold', 0.42);
  const roundness = miniVisualNumber(part, 'miniEarRoundness', 0.74);
  const tuftAmount = miniVisualNumber(part, 'miniEarTuft', 0.6);
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const inner = miniCoatMaterial(palette.accent, `${part.id}-inner`, palette.surfaceStyle);
  const earLength = dims.y * scale;
  const earWidth = dims.x * (0.82 + scale * 0.18);

  const petal = miniMesh(
    createMiniPetalGeometry(earWidth, earLength, dims.z, roundness),
    coat,
  );
  petal.name = 'mini-dragon-ear-petal';
  group.add(petal);

  const innerPetal = miniMesh(
    createMiniPetalGeometry(
      earWidth * 0.62,
      earLength * (0.7 + roundness * 0.08),
      dims.z * 0.45,
      Math.min(1, roundness + 0.06),
    ),
    inner,
  );
  innerPetal.name = 'mini-dragon-inner-ear';
  innerPetal.position.set(0, earLength * 0.08, dims.z * 0.6);
  group.add(innerPetal);

  const tuftLength = earLength * (0.14 + tuftAmount * 0.11);
  const tuft = miniMesh(
    createMiniPetalGeometry(tuftLength * 0.48, tuftLength, dims.z * 0.5, 0.5),
    miniPawMaterial(palette, `${part.id}-tuft`),
  );
  tuft.name = 'mini-dragon-ear-tuft';
  tuft.position.y = earLength * 0.74;
  tuft.rotation.z = side * 0.16;
  group.add(tuft);

  addMiniJointBall(group, Math.min(earWidth, earLength) * 0.16, coat, { x: 0, y: 0, z: 0 });
  group.rotation.z = side * (-0.12 - fold * 0.68);
  group.rotation.x = side * (-0.24 - (1 - fold) * 0.28);
  group.rotation.y = side * fold * 0.16;
  return group;
}
