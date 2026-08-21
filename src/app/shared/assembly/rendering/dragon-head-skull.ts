import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildJointBall, jointBallScale } from './dragon-anatomy';
import { DragonHeadShape, dragonHeadSection, headShapeFor } from './dragon-head-profile';
import { detail, mesh, revolvedUv } from './dragon-geometry';
import { DragonPalette, scaleMaterial } from './dragon-materials';
import { SCALE_TILE } from './dragon-texture-constants';

/**
 * Rings and radial divisions of the lofted skull, as authored. `buildHeadGeometry`
 * shadows these with the device-tiered counts; these stay the tuned baseline and
 * the floor that `detailSegments` never goes below.
 */
const BASE_HEAD_AXIAL_SEGMENTS = 22;
const BASE_HEAD_RADIAL_SEGMENTS = 18;

/**
 * Heads wear finer scales than flanks do — facial scales are small on any real
 * animal, and at body pitch a skull reads as a pinecone.
 */
const HEAD_SCALE_TILE = SCALE_TILE * 0.5;

/**
 * Rounds the loft closed over the last few percent at each end, so the nose and
 * the occiput finish as domes rather than open tubes. A circular ease, not a
 * linear one — a linear taper cones the nose to a point.
 */
function headCapEase(axialFraction: number): number {
  const CAP_SPAN = 0.08;
  const toEnd = 0.5 - Math.abs(axialFraction);
  if (toEnd >= CAP_SPAN) return 1;
  return Math.sqrt(Math.max(0, 1 - Math.pow(1 - toEnd / CAP_SPAN, 2)));
}

/**
 * The skull as a loft over the head profile's cross-sections.
 *
 * A lathe would force every section to be a circle; the whole point of the
 * profile is that a section is an ellipse whose aspect ratio *and* centre
 * height change from braincase to nose. Poles close each end, so topology
 * matches a sphere and `computeVertexNormals` has something sane to work with.
 */
function buildHeadGeometry(
  dims: { x: number; y: number; z: number },
  shape: DragonHeadShape,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Shadow the module constants with the device-tiered counts. Every reference
  // below is to these, so the loft densifies without a change at each use.
  const HEAD_AXIAL_SEGMENTS = detail(BASE_HEAD_AXIAL_SEGMENTS);
  const HEAD_RADIAL_SEGMENTS = detail(BASE_HEAD_RADIAL_SEGMENTS);

  // The seam column is duplicated so u can reach 1 instead of wrapping to 0.
  const columns = HEAD_RADIAL_SEGMENTS + 1;
  const ringAt = (ring: number): number => -0.5 + ring / (HEAD_AXIAL_SEGMENTS + 1);
  const vertexAt = (ring: number, column: number): number => 1 + (ring - 1) * columns + column;

  const occiput = dragonHeadSection(dims, -0.5, shape);
  positions.push(-dims.x / 2, occiput.centerY, 0);
  uvs.push(0.5, 0);

  for (let ring = 1; ring <= HEAD_AXIAL_SEGMENTS; ring += 1) {
    const axial = ringAt(ring);
    const section = dragonHeadSection(dims, axial, shape);
    const cap = headCapEase(axial);

    for (let column = 0; column <= HEAD_RADIAL_SEGMENTS; column += 1) {
      const angle = (column / HEAD_RADIAL_SEGMENTS) * Math.PI * 2;
      positions.push(
        axial * dims.x,
        section.centerY + Math.cos(angle) * section.halfHeight * cap,
        Math.sin(angle) * section.halfWidth * cap,
      );
      uvs.push(column / HEAD_RADIAL_SEGMENTS, ring / (HEAD_AXIAL_SEGMENTS + 1));
    }
  }

  const nose = dragonHeadSection(dims, 0.5, shape);
  const noseIndex = 1 + HEAD_AXIAL_SEGMENTS * columns;
  positions.push(dims.x / 2, nose.centerY, 0);
  uvs.push(0.5, 1);

  for (let column = 0; column < HEAD_RADIAL_SEGMENTS; column += 1) {
    indices.push(0, vertexAt(1, column + 1), vertexAt(1, column));
    indices.push(
      noseIndex,
      vertexAt(HEAD_AXIAL_SEGMENTS, column),
      vertexAt(HEAD_AXIAL_SEGMENTS, column + 1),
    );
  }

  for (let ring = 1; ring < HEAD_AXIAL_SEGMENTS; ring += 1) {
    for (let column = 0; column < HEAD_RADIAL_SEGMENTS; column += 1) {
      const a = vertexAt(ring, column);
      const b = vertexAt(ring, column + 1);
      const c = vertexAt(ring + 1, column);
      const d = vertexAt(ring + 1, column + 1);
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Skull mesh for a head variant.
 *
 * `headShapeFor` is what makes a gene visible: the variant supplies the base
 * character, and the part's own proportions — which the phenotype builder has
 * already scaled per locus — bend it from there.
 */
export function buildDragonSkull(
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  base: DragonHeadShape,
): { skull: THREE.Mesh; shape: DragonHeadShape } {
  const shape = headShapeFor(dims, base);
  const geometry = buildHeadGeometry(dims, shape);
  const midSection = dragonHeadSection(dims, 0, shape);
  revolvedUv(
    geometry,
    (midSection.halfHeight + midSection.halfWidth) / 2,
    dims.x,
    HEAD_SCALE_TILE,
    palette,
  );

  // Shallower relief to match: at this scale a body-strength normal map turns
  // the skull into a golf ball.
  return { skull: mesh(geometry, scaleMaterial(palette, 0.5)), shape };
}

/**
 * Where the skull hinges on the neck, as a fraction of the head's own length.
 *
 * The shipped skeleton hangs the head off `pivotOnChild.x = -0.36` against a
 * 0.84-long head extent, which is -0.43 — just inside the back of the skull.
 */
const NECK_PIVOT_AXIAL = -0.43;

/**
 * The station the neck ball is sized from. Forward of the pivot, because the
 * skull has already tapered to its rear cap by then and a ball that small
 * leaves the throat open.
 */
const NECK_SECTION_AXIAL = -0.3;

export function buildDragonNeckSocket(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): THREE.Mesh {
  const neckSection = dragonHeadSection(dims, NECK_SECTION_AXIAL, shape);
  const neck = buildJointBall(
    ((neckSection.halfHeight + neckSection.halfWidth) / 2) * jointBallScale(part),
    palette,
    'dragon-neck-ball',
  );
  neck.position.set(NECK_PIVOT_AXIAL * dims.x, neckSection.centerY, 0);
  return neck;
}
