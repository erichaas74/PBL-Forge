import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import {
  miniBodyLoftStations,
  miniBodySurfaceNormal,
  miniBodySurfacePoint,
} from './mini-dragon-anatomy';
import { addMiniBodyFeathers } from './mini-dragon-feathers';
import {
  addMiniJointBall,
  createMiniLoftGeometry,
  miniDetail,
  miniMesh,
} from './mini-dragon-geometry';
import { miniCoatMaterial, miniEmberMaterial } from './mini-dragon-materials';
import {
  miniBodyMorphology,
  miniNeckCurve,
  miniNeckThickness,
  miniPatchScale,
  miniScaleSize,
} from './mini-dragon-morphology';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

/** Three orderly rows of rounded scales; the recessive form grows soft baby spikes. */
export function buildMiniDorsalScales(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-dorsal-scale-rows';
  const dims = part.dimensions;
  const bumpy = miniVisualNumber(part, 'miniDorsalBumps', 0) >= 0.5;
  const bodyMorphology = miniBodyMorphology(part);
  const sizeFactor = miniScaleSize(part);
  const baseMaterial = miniCoatMaterial(palette.dorsal, `${part.id}-dorsal`, palette.surfaceStyle);
  const patchMaterial = miniCoatMaterial(palette.patch, `${part.id}-patch`, palette.surfaceStyle);
  const rowAngles = [Math.PI - 0.42, Math.PI, Math.PI + 0.42] as const;
  const stations = [-0.38, -0.25, -0.12, 0.01, 0.14, 0.27, 0.38] as const;

  for (const [rowIndex, angle] of rowAngles.entries()) {
    for (const [stationIndex, axial] of stations.entries()) {
      const root = miniBodySurfacePoint(dims, axial, angle, bodyMorphology);
      const sampledNormal = miniBodySurfaceNormal(dims, axial, angle, bodyMorphology);
      const normal = new THREE.Vector3(sampledNormal.x, sampledNormal.y, sampledNormal.z);
      const material =
        !palette.patch.equals(palette.coat)
          && dorsalScaleUsesPatch(palette.patternStyle, stationIndex, rowIndex)
          ? patchMaterial
          : baseMaterial;
      const scaleRadius = dims.y * (bumpy ? 0.052 : 0.045) * sizeFactor;
      const scale = miniMesh(
        new THREE.SphereGeometry(scaleRadius, miniDetail(12), miniDetail(8)),
        material,
      );
      scale.name = bumpy ? 'mini-dragon-bumpy-scale' : 'mini-dragon-smooth-scale';
      scale.position.set(root.x, root.y, root.z).addScaledVector(normal, scaleRadius * 0.2);
      scale.scale.set(1.25, bumpy ? 0.72 : 0.34, 0.9);
      scale.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      group.add(scale);

      if (!bumpy) continue;
      const spikeHeight = dims.y * (rowIndex === 1 ? 0.105 : 0.078);
      const spike = miniMesh(
        new THREE.CapsuleGeometry(scaleRadius * 0.46, spikeHeight, miniDetail(4), miniDetail(8)),
        material,
      );
      spike.name = 'mini-dragon-baby-spike';
      spike.position.set(root.x, root.y, root.z).addScaledVector(normal, spikeHeight * 0.56);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      spike.rotateZ(-0.16);
      group.add(spike);
    }
  }

  return group;
}

/** A separate neck gives learned cues a second expressive hinge behind the head. */
export function buildMiniNeck(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const curve = miniNeckCurve(part);
  const thickness = miniNeckThickness(part);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-dims.x * 0.46, -dims.y * curve * 0.18, 0),
    new THREE.Vector3(-dims.x * 0.12, dims.y * curve * 0.02, 0),
    new THREE.Vector3(dims.x * 0.18, dims.y * curve * 0.18, 0),
    new THREE.Vector3(dims.x * 0.46, dims.y * curve * 0.3, 0),
  ]);
  const neck = miniMesh(
    new THREE.TubeGeometry(
      path,
      miniDetail(18),
      dims.z * 0.27 * thickness,
      miniDetail(12),
      false,
    ),
    miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle),
  );
  neck.name = 'mini-dragon-neck';
  neck.scale.z = dims.y / Math.max(dims.z, 0.001);
  group.add(neck);
  addMiniJointBall(
    group,
    dims.z * 0.25 * miniVisualNumber(part, 'miniJointBall', 1),
    miniCoatMaterial(palette.coat, `${part.id}-joint`, palette.surfaceStyle),
    { x: 0, y: 0, z: 0 },
  );
  return group;
}

export function buildMiniBody(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const twoToned = !palette.patch.equals(palette.coat);
  const patchCoat = twoToned
    ? miniCoatMaterial(palette.patch, `${part.id}-patch`, palette.surfaceStyle)
    : undefined;
  // Keep these tufts sparse enough that the inherited dorsal rows remain the
  // readable silhouette feature.

  const barrel = createMiniLoftGeometry(miniBodyLoftStations(part), 26);
  const torso = miniMesh(barrel, coat);
  torso.name = 'mini-dragon-torso';
  group.add(torso);

  // The loft owns its caps. Named markers preserve the inspection contract and
  // make it obvious where front and rear anatomy terminate without z-fighting.
  for (const side of [-1, 1] as const) {
    const cap = new THREE.Group();
    cap.name = side > 0 ? 'mini-dragon-front-body-cap' : 'mini-dragon-rear-body-cap';
    cap.position.x = side * dims.x * 0.5;
    group.add(cap);
  }

  // Recessed cups beneath the two axial attachment balls. The neck pivot is
  // authored at (+.38, +.28) of the torso and the shortened tail's root ball
  // lands at about (-.42, +.08), so these rims remain visible around the balls
  // instead of making either appendage look pasted onto an unbroken hide.
  addMiniBodySocket(
    group,
    dims,
    palette,
    'neck',
    { x: dims.x * 0.38, y: dims.y * 0.28, z: 0 },
    new THREE.Vector3(0.58, 0.82, 0),
  );
  addMiniBodySocket(
    group,
    dims,
    palette,
    'tail',
    { x: -dims.x * 0.42, y: dims.y * 0.08, z: 0 },
    new THREE.Vector3(-0.96, 0.28, 0),
  );

  /*
   * Two-tone coat. A codominant specimen carries both alleles' colours at once,
   * so the second colour has to appear as its own area on the animal rather than
   * as a blend — a blended midpoint would be indistinguishable from a third
   * allele, which is exactly the confusion this locus exists to break.
   *
   * Blotches on the hide and alternating dorsal scales carry both colours.
   */
  if (patchCoat) {
    const patchScale = miniPatchScale(part);
    const bodyMorphology = miniBodyMorphology(part);
    const patches = miniBodyPatchLayout(palette.patternStyle);
    for (const [axial, angle, size] of patches) {
      for (const side of [-1, 1] as const) {
        const patchAngle = angle * side;
        const point = miniBodySurfacePoint(dims, axial, patchAngle, bodyMorphology);
        const sampledNormal = miniBodySurfaceNormal(dims, axial, patchAngle, bodyMorphology);
        const normal = new THREE.Vector3(sampledNormal.x, sampledNormal.y, sampledNormal.z);
        const radius = dims.y * 0.13 * size * patchScale;
        const blob = miniMesh(
          new THREE.SphereGeometry(radius, miniDetail(14), miniDetail(10)),
          patchCoat,
        );
        blob.name = 'mini-dragon-coat-patch';
        blob.position.set(point.x, point.y, point.z).addScaledVector(normal, radius * 0.03);
        blob.scale.set(1.65, 0.92, 0.08);
        blob.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        group.add(blob);
      }
    }
  }

  addMiniBodyFeathers(group, part, palette);

  // Throat glow, tucked under the neck.
  const throat = miniMesh(
    new THREE.SphereGeometry(dims.y * 0.11, 10, 8),
    miniEmberMaterial(palette, 0.7),
  );
  throat.name = 'mini-dragon-throat-ember';
  const throatPoint = miniBodySurfacePoint(dims, 0.3, 0.25, miniBodyMorphology(part));
  throat.position.set(throatPoint.x, throatPoint.y * 0.94, throatPoint.z);
  group.add(throat);

  return group;
}

function dorsalScaleUsesPatch(style: string, station: number, row: number): boolean {
  switch (style) {
    case 'bands': return station % 2 === 0;
    case 'blaze': return station >= 4 && row === 1;
    case 'constellation': return (station * 3 + row * 5) % 7 < 2;
    case 'harlequin': return (station + row) % 2 === 0;
    case 'freckles': return (station * 11 + row * 7) % 5 === 0;
    default: return station >= 2 && station <= 4;
  }
}

/** Anatomical, deterministic layouts keep markings bold and stable without a per-dragon texture. */
function miniBodyPatchLayout(style: string): readonly (readonly [number, number, number])[] {
  switch (style) {
    case 'blaze':
      return [[0.32, 0.95, 1.2], [0.39, 1.45, 0.82], [0.22, 0.35, 0.64]];
    case 'bands':
      return [[-0.34, 1.25, 0.82], [-0.12, 1.25, 0.82], [0.12, 1.25, 0.82], [0.34, 1.25, 0.82]];
    case 'constellation':
      return [[-0.31, 1.1, 0.35], [-0.18, 1.75, 0.46], [0.02, 0.75, 0.3], [0.16, 1.55, 0.4], [0.34, 0.95, 0.34]];
    case 'harlequin':
      return [[-0.28, 0.82, 1.1], [-0.05, 2.12, 0.9], [0.24, 1.18, 1.12]];
    case 'freckles':
      return [[-0.36, 0.72, 0.26], [-0.26, 1.58, 0.3], [-0.12, 2.18, 0.24], [0.02, 0.98, 0.28], [0.16, 1.82, 0.24], [0.3, 0.62, 0.3], [0.39, 1.36, 0.23]];
    default:
      return [[-0.2, 1.45, 0.9], [0.08, 2, 1.05], [0.3, 1, 0.72]];
  }
}

/** A shallow visual socket whose normal points toward the attached appendage. */
function addMiniBodySocket(
  group: THREE.Group,
  dims: Vector3Data,
  palette: MiniDragonPalette,
  kind: 'neck' | 'tail',
  position: Vector3Data,
  normal: THREE.Vector3,
): void {
  const radius = dims.y * 0.12;
  const direction = normal.clone().normalize();
  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    direction,
  );
  const cavityMaterial = miniCoatMaterial(palette.socketCavity, `body-${kind}-socket-cavity`, palette.surfaceStyle);
  const rimMaterial = miniCoatMaterial(palette.socketRim, `body-${kind}-socket-rim`, palette.surfaceStyle);

  const cavity = miniMesh(new THREE.CircleGeometry(radius * 0.82, 24), cavityMaterial);
  cavity.name = `mini-dragon-${kind}-socket-cavity`;
  cavity.position
    .set(position.x, position.y, position.z)
    .addScaledVector(direction, radius * 0.035);
  cavity.quaternion.copy(orientation);
  group.add(cavity);

  const rim = miniMesh(new THREE.TorusGeometry(radius * 0.88, radius * 0.13, 8, 24), rimMaterial);
  rim.name = `mini-dragon-${kind}-socket-rim`;
  rim.position.set(position.x, position.y, position.z).addScaledVector(direction, radius * 0.055);
  rim.quaternion.copy(orientation);
  group.add(rim);
}
