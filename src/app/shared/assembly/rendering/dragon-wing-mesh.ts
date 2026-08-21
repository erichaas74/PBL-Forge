import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { detail, mesh, tubeUv } from './dragon-geometry';
import { DragonPalette, hornMaterial, membraneMaterial } from './dragon-materials';
import { getActiveWingShape } from './dragon-style';
import { HORN_TILE } from './dragon-texture-constants';
import { visualNumber } from './dragon-visual-parameter-readers';
import {
  WING_ELBOW_S,
  WING_FINGER_STATIONS,
  WingMembraneShape,
  wingChord,
  wingChordFraction,
  wingLeadingEdge,
} from './dragon-wing-profile';

/**
 * Spanwise/chordwise tessellation of the membrane grid, as authored.
 * `buildWingMembraneGeometry` shadows these with the device-tiered counts.
 */
const BASE_WING_SPAN_SEGMENTS = 26;
const BASE_WING_CHORD_SEGMENTS = 8;

/**
 * Radius of every bone in the wing, as a fraction of the plate's thickness.
 *
 * One number for the arm and the fingers, because they used to differ by a factor
 * of two and that is exactly what made the leading edge read as scaffolding: a
 * pole twice the width of the digits beside it. The fingers still thin outboard
 * from here, but within a range you read as one skeleton.
 */
const BONE_RADIUS = 0.26;

export function buildDragonWing(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const span = dims.z;
  const thickness = dims.y;
  const chord = wingChord(dims);
  const rootSign = wingRootSign(part);
  const defaults = getActiveWingShape();
  const form: WingMembraneShape = {
    camber: visualNumber(part, 'camber', defaults.camber),
    fingerSag: visualNumber(part, 'fingerSag', defaults.fingerSag),
    dihedral: visualNumber(part, 'dihedral', defaults.dihedral),
    scallop: visualNumber(part, 'scallop', defaults.scallop),
  };

  // Chordwise coordinates: +x is the dragon's forward, membrane trails backward.
  const leadingAt = (s: number): number => wingLeadingEdge(dims, s);
  // Straight lines between the stations the fingers pin, so the trailing edge
  // has a corner on every finger. The scallop below then cuts each run inward
  // between them, which is what turns a taper into a bat's outline.
  const flatTrailingAt = (s: number): number => leadingAt(s) - chord * wingChordFraction(s);
  const fingerStops = WING_FINGER_STATIONS;
  // Root, each finger tip, and the wingtip: the membrane is pinned at each and
  // free to sag between them.
  const anchors = [0, ...fingerStops, 1];

  /** 0 where the membrane is pinned to a bone, 1 midway between two of them. */
  const betweenFingers = (s: number): number => {
    for (let index = 1; index < anchors.length; index += 1) {
      const from = anchors[index - 1];
      const to = anchors[index];
      if (s > to) continue;
      return Math.sin(((s - from) / Math.max(to - from, 1e-6)) * Math.PI);
    }
    return 0;
  };

  const ELBOW_S = WING_ELBOW_S;

  // Trailing edge scallops inward between the fingers, pulling toward the
  // leading edge (larger x) where nothing holds the membrane out. This is the
  // scalloped edge a bat wing is read by: skin under tension between two spread
  // digits cuts back in, so the outline is a run of shallow arcs hung off the
  // finger tips rather than one straight hem.
  const trailingAt = (s: number): number =>
    flatTrailingAt(s) + chord * form.scallop * betweenFingers(s);

  const zOf = (s: number): number => span / 2 - s * span;

  /**
   * Height of the membrane at span fraction `s`, chord fraction `c` (0 at the
   * leading edge, 1 at the trailing edge). Bones read from this too, so they
   * stay attached to the surface rather than floating.
   */
  const membraneY = (s: number, c: number): number => {
    const sag = (form.camber + form.fingerSag * betweenFingers(s)) * chord;
    // Lift is linear in span: a straight rake out to the tip, not the quadratic
    // arc this used to describe. The arc was the wing's other curve — the one
    // that bowed it upward along its whole length — and at the tip the two
    // agree, so the hand claw still lands on the surface.
    return form.dihedral * span * s - sag * Math.sin(Math.max(0, Math.min(1, c)) * Math.PI);
  };

  group.add(mesh(
    buildWingMembraneGeometry(leadingAt, trailingAt, zOf, membraneY),
    membraneMaterial(palette),
  ));

  const bone = hornMaterial(palette, THREE.DoubleSide);

  /*
   * The arm: **one** bone along the leading edge, in two straight runs meeting at
   * the wrist.
   *
   * One, because there used to be two poles up here and the wing read as a pair
   * of parallel broomsticks. The other was the outermost finger strut: with the
   * tip drawn to a point, its target at the trailing edge came so close to the
   * leading edge that it ran alongside this bone for most of the span. That strut
   * is gone (the fingers now stop at the stations they actually pin) and this bone
   * is drawn at the finger radius instead of twice it — the wide pole was the one
   * that read as scaffolding.
   *
   * Straight runs rather than a spline: this was a Catmull-Rom curve, and it is
   * most of what read as the wing "curving back" — a spline through the arm
   * points rounds the wrist into an arc and bows the whole leading edge with it.
   * Real wing bones are straight and the bend is at the joint. Samples only at
   * the ends and the wrist, because anything in between is on the line anyway.
   */
  const armRadius = thickness * BONE_RADIUS;
  const armStations = [0.02, ELBOW_S, 0.99] as const;
  const armPoints = armStations.map(s =>
    new THREE.Vector3(
      leadingAt(s) + (s === ELBOW_S ? 0.01 : -0.015),
      thickness * (s < ELBOW_S ? 0.1 : s === ELBOW_S ? 0.5 : 0.2) + membraneY(s, 0),
      zOf(s),
    ),
  );
  const armCurve = new THREE.CurvePath<THREE.Vector3>();
  for (let index = 1; index < armPoints.length; index += 1) {
    armCurve.add(new THREE.LineCurve3(armPoints[index - 1], armPoints[index]));
  }
  const armBone = mesh(
    tubeUv(
      new THREE.TubeGeometry(armCurve, 14, armRadius, 6),
      armCurve.getLength(),
      armRadius,
      HORN_TILE,
      palette,
    ),
    bone,
  );
  armBone.name = 'dragon-wing-arm-bone';
  group.add(armBone);

  const elbow = new THREE.Vector3(
    leadingAt(ELBOW_S),
    thickness * 0.3 + membraneY(ELBOW_S, 0),
    zOf(ELBOW_S),
  );
  /*
   * The fingers, fanning from the wrist to the trailing edge — one to each of the
   * stations the membrane is pinned at, and no further.
   *
   * There used to be an extra strut out at 0.99, on the theory that the tip needed
   * holding too. Once the planform came to a point the tip's chord was so shallow
   * that the strut ran parallel to the arm bone all the way out, and the wing had
   * two poles along its leading edge. The tip is pinned by the arm bone that
   * already ends there.
   *
   * Each finger is pinned to the corner it makes in the outline, so the strut and
   * the scallop it holds out cannot drift apart: whatever the planform does, a
   * finger ends exactly where the membrane changes direction.
   *
   * They thin outboard. The inner digit carries the deepest span of membrane and
   * the outer one the shallowest, and a fan of identical rods reads as a garden
   * trellis — the taper is what makes it a hand.
   */
  for (const [index, stop] of fingerStops.entries()) {
    const target = new THREE.Vector3(trailingAt(stop), membraneY(stop, 1), zOf(stop));
    const radius = thickness * BONE_RADIUS * (1 - 0.2 * (index / Math.max(fingerStops.length - 1, 1)));
    const strut = new THREE.LineCurve3(elbow, target);
    group.add(mesh(
      tubeUv(
        new THREE.TubeGeometry(strut, 1, radius, 5),
        elbow.distanceTo(target),
        radius,
        HORN_TILE,
        palette,
      ),
      bone,
    ));
  }

  // Mirror the whole wing for the right side. Materials are double-sided, so the
  // flipped winding renders correctly.
  if (rootSign < 0) {
    group.scale.z = -1;
  }

  return group;
}

/**
 * The membrane as a tessellated grid rather than a flat `ShapeGeometry`.
 *
 * ShapeGeometry only emits vertices along the outline, so there is nothing in
 * the interior to displace — which is why the membrane used to render as a
 * perfectly flat sheet no matter what the bones did. A parametric grid gives
 * every interior point a height.
 */
function buildWingMembraneGeometry(
  leadingAt: (s: number) => number,
  trailingAt: (s: number) => number,
  zOf: (s: number) => number,
  membraneY: (s: number, c: number) => number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Shadowed, for the reason given in `buildHeadGeometry`.
  const WING_SPAN_SEGMENTS = detail(BASE_WING_SPAN_SEGMENTS);
  const WING_CHORD_SEGMENTS = detail(BASE_WING_CHORD_SEGMENTS);

  const columns = WING_CHORD_SEGMENTS + 1;

  for (let row = 0; row <= WING_SPAN_SEGMENTS; row += 1) {
    const s = row / WING_SPAN_SEGMENTS;
    const leading = leadingAt(s);
    const trailing = trailingAt(s);
    const z = zOf(s);

    for (let column = 0; column <= WING_CHORD_SEGMENTS; column += 1) {
      const c = column / WING_CHORD_SEGMENTS;
      positions.push(leading + (trailing - leading) * c, membraneY(s, c), z);
      // The membrane is the one part that maps its texture once rather than
      // tiling it: the vein network has to run root-to-tip with the anatomy, so
      // the UVs are the parametric coordinates themselves — chord across, span
      // along. That also puts the alpha map's thin edge exactly on the trailing
      // edge at c = 1, whatever the scallop does to the outline.
      uvs.push(c, s);
    }
  }

  for (let row = 0; row < WING_SPAN_SEGMENTS; row += 1) {
    for (let column = 0; column < WING_CHORD_SEGMENTS; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** +1 when the wing root socket sits at +z (left wing), -1 for the right wing. */
function wingRootSign(part: AssemblyPart): number {
  const rootSnap = part.snapPoints?.find(snap => snap.id === 'dragon-wing-root');
  if (rootSnap && Math.abs(rootSnap.localPosition.z) > 1e-6) {
    return Math.sign(rootSnap.localPosition.z);
  }
  return `${part.id} ${part.label ?? ''}`.toLowerCase().includes('left') ? 1 : -1;
}
