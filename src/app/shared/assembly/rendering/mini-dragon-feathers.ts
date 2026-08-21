import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { miniBodySurfaceNormal, miniBodySurfacePoint } from './mini-dragon-anatomy';
import { MiniDragonPalette, clampedVisualNumber, fract, hashUnit } from './mini-dragon-rendering';

interface MiniFeatherTextures {
  albedo: THREE.DataTexture;
  alpha: THREE.DataTexture;
}

/**
 * One procedural colour card and one cutout mask, owned by the resulting
 * InstancedMesh. This preserves the same alpha-card path a painted feather
 * would use without adding another downloaded asset to every page.
 */
function createMiniFeatherTextures(): MiniFeatherTextures {
  const width = 32;
  const height = 64;
  const albedoData = new Uint8Array(width * height * 4);
  const alphaData = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const t = y / (height - 1);
    // Narrow quill, full middle, and a rounded point. A small periodic bite at
    // the edge reads as soft barbs once alpha-tested rather than as a leaf.
    const envelope = 0.055 + Math.sin(Math.PI * Math.pow(t, 0.82)) * 0.43;
    const barbEdge = envelope * (0.975 + Math.sin(t * Math.PI * 8) * 0.022);
    for (let x = 0; x < width; x += 1) {
      const offset = Math.abs(x / (width - 1) - 0.5);
      const inside = offset <= barbEdge;
      const shaft = Math.max(0, 1 - offset / 0.055);
      const vane = 214 + Math.round(25 * (1 - offset / Math.max(envelope, 0.001)));
      const shade = Math.max(170, Math.min(255, vane + Math.round(shaft * 24)));
      const index = (y * width + x) * 4;

      albedoData[index] = shade;
      albedoData[index + 1] = shade;
      albedoData[index + 2] = Math.min(255, shade + 7);
      albedoData[index + 3] = 255;

      const mask = inside ? 255 : 0;
      // MeshStandardMaterial reads the alpha map's green channel, so all three
      // colour channels carry the same mask value.
      alphaData[index] = mask;
      alphaData[index + 1] = mask;
      alphaData[index + 2] = mask;
      alphaData[index + 3] = 255;
    }
  }

  const albedo = new THREE.DataTexture(
    albedoData,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  albedo.name = 'mini-dragon-feather-albedo';
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.needsUpdate = true;

  const alpha = new THREE.DataTexture(
    alphaData,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  alpha.name = 'mini-dragon-feather-alpha';
  alpha.needsUpdate = true;
  return { albedo, alpha };
}

function miniFeatherMaterial(textures: MiniFeatherTextures): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: textures.albedo,
    alphaMap: textures.alpha,
    alphaTest: 0.46,
    transparent: false,
    depthWrite: true,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
}

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
  const coverage = clampedVisualNumber(part, 'miniFeatherCoverage', 0);
  if (coverage <= 0) return;
  const count = Math.max(1, Math.round(96 * coverage));
  const feathers = createMiniFeatherInstances(count, 'mini-dragon-body-feathers');
  const dims = part.dimensions;
  const seed = hashUnit(`${part.id}:body-feathers`);

  for (let index = 0; index < count; index += 1) {
    const axialUnit = fract(seed + index * 0.61803398875);
    const aroundUnit = fract(hashUnit(`${part.id}:body-angle:${index}`) + index * 0.38196601125);
    const axial = -0.4 + axialUnit * 0.78;
    const angle = Math.PI + (aroundUnit - 0.5) * 1.78;
    const sampledRoot = miniBodySurfacePoint(dims, axial, angle);
    const sampledNormal = miniBodySurfaceNormal(dims, axial, angle);
    const normal = new THREE.Vector3(sampledNormal.x, sampledNormal.y, sampledNormal.z);
    const root = new THREE.Vector3(sampledRoot.x, sampledRoot.y, sampledRoot.z).addScaledVector(
      normal,
      dims.y * 0.008,
    );
    const lengthJitter = hashUnit(`${part.id}:body-length:${index}`);
    const length = dims.x * (0.105 + lengthJitter * 0.045);
    const width = length * (0.36 + hashUnit(`${part.id}:body-width:${index}`) * 0.1);
    const roll = (hashUnit(`${part.id}:body-roll:${index}`) - 0.5) * 0.42;
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
  const coverage = clampedVisualNumber(part, 'miniFeatherCoverage', 0);
  if (coverage <= 0) return;
  const count = Math.max(1, Math.round(30 * coverage));
  const feathers = createMiniFeatherInstances(count, 'mini-dragon-wing-feathers');
  const normal = new THREE.Vector3(0, 1, 0);
  const lay = new THREE.Vector3(-0.16, 0, side).normalize();
  const seed = hashUnit(`${part.id}:wing-feathers`);

  for (let index = 0; index < count; index += 1) {
    const spanUnit = fract(seed + index * 0.61803398875);
    const chordUnit = fract(hashUnit(`${part.id}:wing-chord:${index}`) + index * 0.38196601125);
    const alongSpan = 0.16 + spanUnit * 0.7;
    const centerX = chord * (0.1 - alongSpan * 0.18);
    const halfWidth = chord * (0.08 + (1 - alongSpan) * 0.27);
    const root = new THREE.Vector3(
      centerX + (chordUnit - 0.5) * halfWidth * 2,
      part.dimensions.y * 0.012,
      side * span * alongSpan,
    );
    const length = span * (0.17 + hashUnit(`${part.id}:wing-length:${index}`) * 0.08);
    const width = length * (0.38 + hashUnit(`${part.id}:wing-width:${index}`) * 0.1);
    const roll = (hashUnit(`${part.id}:wing-roll:${index}`) - 0.5) * 0.36;
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

function createMiniFeatherInstances(count: number, name: string): THREE.InstancedMesh {
  const textures = createMiniFeatherTextures();
  const feathers = new THREE.InstancedMesh(
    miniFeatherCardGeometry(),
    miniFeatherMaterial(textures),
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
  if (!palette.patch.equals(palette.coat) && hashUnit(`${part.id}:feather-color:${index}`) < 0.28) {
    return palette.patch.clone().lerp(new THREE.Color('#fff7df'), 0.14);
  }
  return palette.coat.clone().lerp(new THREE.Color('#fff7df'), 0.22);
}
