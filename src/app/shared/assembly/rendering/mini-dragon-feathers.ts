import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { miniBodySurfaceNormal, miniBodySurfacePoint } from './mini-dragon-anatomy';
import { miniFeatherMaterial } from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniDragonFract, miniDragonHashUnit } from './mini-dragon-random';
import { miniBodyMorphology, miniFeatherLength } from './mini-dragon-morphology';
import { clampedMiniVisualNumber, miniVisualNumber } from './mini-dragon-visual-parameter-readers';

/** A four-segment plane gives the feather a gentle lift without complex geometry. */
function miniFeatherCardGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 4);
  geometry.translate(0, 0.5, 0);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const t = positions.getY(index);
    positions.setZ(index, Math.sin(t * Math.PI * 0.5) * 0.055 + t * t * 0.025);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Feather cards. The known procedural torso and wing equations are sampled
// directly, avoiding the cost and nondeterminism of a generic surface sampler.
// Each anatomical layer is one InstancedMesh, regardless of feather count.
// ---------------------------------------------------------------------------

export function addMiniBodyFeathers(
  group: THREE.Group,
  part: AssemblyPart,
  palette: MiniDragonPalette,
): void {
  const coverage = clampedMiniVisualNumber(part, 'miniFeatherCoverage', 0);
  if (coverage <= 0) return;
  const volume = THREE.MathUtils.clamp(miniVisualNumber(part, 'miniFeatherVolume', 1), 0.65, 1.65);
  const count = Math.max(1, Math.round(104 * coverage * volume));
  const feathers = createMiniFeatherInstances(count, 'mini-dragon-body-feathers', `${part.id}-feathers`);
  const dims = part.dimensions;
  const seed = miniDragonHashUnit(`${part.id}:body-feathers`);
  const morphology = miniBodyMorphology(part);
  const featherLength = miniFeatherLength(part);

  for (let index = 0; index < count; index += 1) {
    const axialUnit = miniDragonFract(seed + index * 0.61803398875);
    const aroundUnit = miniDragonFract(
      miniDragonHashUnit(`${part.id}:body-angle:${index}`) + index * 0.38196601125,
    );
    const axial = -0.4 + axialUnit * 0.78;
    const angle = Math.PI + (aroundUnit - 0.5) * 1.78;
    const sampledRoot = miniBodySurfacePoint(dims, axial, angle, morphology);
    const sampledNormal = miniBodySurfaceNormal(dims, axial, angle, morphology);
    const normal = new THREE.Vector3(sampledNormal.x, sampledNormal.y, sampledNormal.z);
    const root = new THREE.Vector3(sampledRoot.x, sampledRoot.y, sampledRoot.z).addScaledVector(
      normal,
      dims.y * 0.008,
    );
    const lengthJitter = miniDragonHashUnit(`${part.id}:body-length:${index}`);
    const length = dims.x * (0.086 + lengthJitter * 0.04) * featherLength * Math.sqrt(volume);
    const width = length * (0.38 + miniDragonHashUnit(`${part.id}:body-width:${index}`) * 0.12) * Math.sqrt(volume);
    const roll = (miniDragonHashUnit(`${part.id}:body-roll:${index}`) - 0.5) * 0.42;
    setMiniFeatherInstance(
      feathers,
      index,
      root,
      normal,
      new THREE.Vector3(-1, 0.05, 0),
      width,
      length,
      roll,
      miniFeatherColor(part, palette, index),
    );
  }

  finishMiniFeatherInstances(feathers);
  group.add(feathers);
}

export function addMiniWingFeathers(
  group: THREE.Group,
  part: AssemblyPart,
  palette: MiniDragonPalette,
  side: -1 | 1,
  span: number,
  chord: number,
): void {
  const coverage = clampedMiniVisualNumber(part, 'miniFeatherCoverage', 0);
  if (coverage <= 0) return;
  const volume = THREE.MathUtils.clamp(miniVisualNumber(part, 'miniFeatherVolume', 1), 0.65, 1.65);
  const count = Math.max(1, Math.round(36 * coverage * volume));
  const feathers = createMiniFeatherInstances(count, 'mini-dragon-wing-feathers', `${part.id}-feathers`);
  const normal = new THREE.Vector3(0, 1, 0);
  const lay = new THREE.Vector3(-0.16, 0, side).normalize();
  const seed = miniDragonHashUnit(`${part.id}:wing-feathers`);
  const featherLength = miniFeatherLength(part);

  for (let index = 0; index < count; index += 1) {
    const spanUnit = miniDragonFract(seed + index * 0.61803398875);
    const chordUnit = miniDragonFract(
      miniDragonHashUnit(`${part.id}:wing-chord:${index}`) + index * 0.38196601125,
    );
    const alongSpan = 0.16 + spanUnit * 0.7;
    const centerX = chord * (0.1 - alongSpan * 0.18);
    const halfWidth = chord * (0.08 + (1 - alongSpan) * 0.27);
    const root = new THREE.Vector3(
      centerX + (chordUnit - 0.5) * halfWidth * 2,
      part.dimensions.y * 0.012,
      side * span * alongSpan,
    );
    const length = span
      * (0.13 + miniDragonHashUnit(`${part.id}:wing-length:${index}`) * 0.065)
      * featherLength
      * Math.sqrt(volume);
    const width = length
      * (0.4 + miniDragonHashUnit(`${part.id}:wing-width:${index}`) * 0.12)
      * Math.sqrt(volume);
    const roll = (miniDragonHashUnit(`${part.id}:wing-roll:${index}`) - 0.5) * 0.36;
    setMiniFeatherInstance(
      feathers,
      index,
      root,
      normal,
      lay,
      width,
      length,
      roll,
      miniFeatherColor(part, palette, index),
    );
  }

  finishMiniFeatherInstances(feathers);
  group.add(feathers);
}

function createMiniFeatherInstances(
  count: number,
  name: string,
  textureVariant: string,
): THREE.InstancedMesh {
  const feathers = new THREE.InstancedMesh(
    miniFeatherCardGeometry(),
    miniFeatherMaterial(textureVariant),
    count,
  );
  feathers.name = name;
  feathers.castShadow = true;
  feathers.receiveShadow = true;
  feathers.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  return feathers;
}

function setMiniFeatherInstance(
  feathers: THREE.InstancedMesh,
  index: number,
  root: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  layDirection: THREE.Vector3,
  width: number,
  length: number,
  roll: number,
  color: THREE.Color,
): void {
  const normal = surfaceNormal.clone().normalize();
  const lengthAxis = layDirection
    .clone()
    .addScaledVector(normal, -layDirection.dot(normal))
    .normalize()
    .applyAxisAngle(normal, roll);
  const widthAxis = lengthAxis.clone().cross(normal).normalize();
  const correctedLengthAxis = normal.clone().cross(widthAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(widthAxis, correctedLengthAxis, normal);
  matrix.setPosition(root);
  // Scale the card's bend depth with its length too. Leaving the local Z curve
  // in world units turns a small feather into a porcupine quill.
  matrix.scale(new THREE.Vector3(width, length, length));
  feathers.setMatrixAt(index, matrix);
  feathers.setColorAt(index, color);
}

function finishMiniFeatherInstances(feathers: THREE.InstancedMesh): void {
  feathers.instanceMatrix.needsUpdate = true;
  if (feathers.instanceColor) feathers.instanceColor.needsUpdate = true;
  feathers.computeBoundingBox();
  feathers.computeBoundingSphere();
}

function miniFeatherColor(
  part: AssemblyPart,
  palette: MiniDragonPalette,
  index: number,
): THREE.Color {
  const colorUnit = miniDragonHashUnit(`${part.id}:feather-color:${index}`);
  if (colorUnit < 0.34) {
    return palette.accent.clone().lerp(palette.featherLight, 0.26);
  }
  if (
    !palette.patch.equals(palette.coat) &&
    colorUnit < 0.58
  ) {
    return palette.patch.clone().lerp(palette.featherLight, 0.18);
  }
  return palette.coat.clone().lerp(palette.featherLight, 0.3);
}
