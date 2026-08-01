import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AssemblyPart } from '../domain/assembly.models';

/**
 * Procedural dragon anatomy built from each part's physics dimensions, so the
 * genetics pipeline (which scales wings, jaws, tails per genome) automatically
 * reshapes the visuals. Collision stays on the primitive shape; these meshes are
 * purely visual and are sized to hug the physics volume.
 *
 * All colors derive from `part.color`, which the phenotype builder repaints from
 * the dragon's pigment genes — so horn, membrane, and claw tones track genetics.
 */
export function createDragonProceduralObject(part: AssemblyPart): THREE.Object3D | null {
  const profileId = part.visualProfile?.profileId ?? '';
  const palette = createDragonPalette(part.color);
  const dims = part.dimensions;

  switch (profileId) {
    case 'dragon-body':
      return buildBody(dims, palette);
    case 'dragon-head-horned':
      return buildHornedHead(dims.x, palette);
    case 'dragon-head-snout':
      return buildSnoutHead(dims, palette);
    case 'dragon-head-armored':
      return buildArmoredHead(dims, palette);
    case 'dragon-snout':
      return buildSnout(dims, palette);
    case 'dragon-upper-jaw':
      return buildJaw(dims, palette, 'upper');
    case 'dragon-lower-jaw':
      return buildJaw(dims, palette, 'lower');
    case 'dragon-leg':
      return buildLeg(dims, palette);
    case 'dragon-foot':
      return buildFoot(dims, palette);
    case 'dragon-claw':
    case 'dragon-wing-claw':
      return buildTalon(dims.x, dims.y, palette);
    case 'dragon-wing':
    case 'dragon-secondary-wing':
      return buildWing(part, palette);
    case 'dragon-tail':
      return buildTailSegment(dims, palette);
    case 'dragon-tail-club':
      return buildTailClub(dims, palette);
    case 'dragon-tail-stinger':
      return buildStinger(dims.x, palette);
    default:
      return null;
  }
}

interface DragonPalette {
  scale: THREE.Color;
  scaleDeep: THREE.Color;
  horn: THREE.Color;
  claw: THREE.Color;
  tooth: THREE.Color;
  membrane: THREE.Color;
}

function createDragonPalette(baseColor: string): DragonPalette {
  const scale = new THREE.Color(baseColor);
  return {
    scale,
    scaleDeep: scale.clone().multiplyScalar(0.55),
    horn: scale.clone().lerp(new THREE.Color('#e9dcc0'), 0.72),
    claw: scale.clone().lerp(new THREE.Color('#d8c9a3'), 0.6).multiplyScalar(0.88),
    tooth: new THREE.Color('#f2ead6'),
    membrane: scale.clone().lerp(new THREE.Color('#ffffff'), 0.22),
  };
}

function scaleMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: palette.scale,
    roughness: 0.58,
    metalness: 0.12,
  });
}

function hornMaterial(palette: DragonPalette, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: palette.horn,
    roughness: 0.42,
    metalness: 0.08,
    side,
  });
}

function clawMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.claw, roughness: 0.4, metalness: 0.1 });
}

function toothMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.tooth, roughness: 0.35, metalness: 0.02 });
}

function membraneMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: palette.membrane,
    roughness: 0.62,
    metalness: 0,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
}

function eyeMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#3a1d05',
    emissive: '#ff9f2e',
    emissiveIntensity: 1.15,
    roughness: 0.25,
    metalness: 0,
  });
  // Keep eyes glowing through team tint and damage recolor.
  material.userData['preserveAppearance'] = true;
  return material;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

// ---------------------------------------------------------------------------
// Body: tapered lathe along X with dorsal ridge spikes.
// ---------------------------------------------------------------------------

const BODY_PROFILE: readonly [number, number][] = [
  [-0.5, 0.28],
  [-0.4, 0.5],
  [-0.24, 0.78],
  [-0.05, 0.97],
  [0.1, 1.0],
  [0.24, 0.9],
  [0.36, 0.72],
  [0.46, 0.5],
  [0.5, 0.42],
];

function buildBody(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const length = dims.x;

  const lathe = new THREE.LatheGeometry(
    BODY_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * length)),
    20,
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  group.add(mesh(lathe, scaleMaterial(palette)));

  const spikeMaterial = hornMaterial(palette);
  for (const t of [-0.32, -0.16, 0, 0.16, 0.3]) {
    const spike = mesh(
      new THREE.ConeGeometry(length * 0.032, length * 0.085, 6),
      spikeMaterial,
    );
    spike.position.set(t * length, sampleProfile(BODY_PROFILE, t) * (dims.y / 2) * 0.96, 0);
    spike.rotation.z = 0.32;
    group.add(spike);
  }

  return group;
}

function sampleProfile(profile: readonly [number, number][], t: number): number {
  for (let index = 1; index < profile.length; index += 1) {
    const [t0, r0] = profile[index - 1];
    const [t1, r1] = profile[index];
    if (t <= t1) {
      const blend = (t - t0) / Math.max(t1 - t0, 1e-6);
      return r0 + (r1 - r0) * Math.max(0, Math.min(1, blend));
    }
  }
  return profile[profile.length - 1][1];
}

// ---------------------------------------------------------------------------
// Heads.
// ---------------------------------------------------------------------------

function buildHornedHead(radius: number, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();

  const skull = mesh(new THREE.SphereGeometry(radius * 0.92, 24, 16), scaleMaterial(palette));
  skull.scale.set(1.18, 0.92, 0.9);
  group.add(skull);

  const horn = hornMaterial(palette);
  for (const side of [-1, 1]) {
    const mainHorn = buildHorn(radius * 1.35, radius * 0.16, horn);
    mainHorn.position.set(-radius * 0.12, radius * 0.5, side * radius * 0.34);
    mainHorn.rotation.set(side * 0.5, 0, 0.55);
    group.add(mainHorn);

    const browSpike = buildHorn(radius * 0.45, radius * 0.08, horn);
    browSpike.position.set(radius * 0.34, radius * 0.55, side * radius * 0.3);
    browSpike.rotation.set(side * 0.3, 0, 0.75);
    group.add(browSpike);

    group.add(buildEye(radius, side));
  }

  return group;
}

function buildSnoutHead(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const body = scaleMaterial(palette);

  const cranium = mesh(new THREE.SphereGeometry(1, 20, 14), body);
  cranium.scale.set(dims.x * 0.42, dims.y * 0.52, dims.z * 0.5);
  cranium.position.x = -dims.x * 0.18;
  group.add(cranium);

  const muzzle = mesh(
    createTaperedBoxGeometry(dims.x * 0.74, dims.y * 0.62, dims.z * 0.72, 0.6, 0.68),
    body,
  );
  muzzle.position.set(dims.x * 0.22, -dims.y * 0.05, 0);
  group.add(muzzle);

  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(dims.y * 0.16, 12, 8), eyeMaterial());
    eye.position.set(-dims.x * 0.02, dims.y * 0.22, side * dims.z * 0.4);
    group.add(eye);
  }

  return group;
}

function buildArmoredHead(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const minDim = Math.min(dims.x, dims.y, dims.z);

  const skull = mesh(
    new RoundedBoxGeometry(dims.x * 0.95, dims.y * 0.85, dims.z * 0.95, 2, minDim * 0.14),
    scaleMaterial(palette),
  );
  group.add(skull);

  const crest = hornMaterial(palette);
  for (const [offset, height] of [[-0.28, 0.5], [0, 0.62], [0.26, 0.48]] as const) {
    const fin = mesh(new THREE.BoxGeometry(dims.x * 0.3, dims.y * height, dims.z * 0.07), crest);
    fin.position.set(dims.x * offset, dims.y * 0.6, 0);
    fin.rotation.z = 0.4;
    group.add(fin);
  }

  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(dims.y * 0.14, 12, 8), eyeMaterial());
    eye.position.set(dims.x * 0.32, dims.y * 0.16, side * dims.z * 0.42);
    group.add(eye);
  }

  return group;
}

function buildHorn(length: number, baseRadius: number, material: THREE.Material): THREE.Group {
  const horn = new THREE.Group();

  const base = mesh(new THREE.CylinderGeometry(baseRadius * 0.45, baseRadius, length * 0.55, 8), material);
  base.position.y = length * 0.275;
  horn.add(base);

  const tipPivot = new THREE.Group();
  tipPivot.position.y = length * 0.55;
  tipPivot.rotation.z = 0.55;
  const tip = mesh(new THREE.CylinderGeometry(baseRadius * 0.04, baseRadius * 0.45, length * 0.5, 8), material);
  tip.position.y = length * 0.25;
  tipPivot.add(tip);
  horn.add(tipPivot);

  return horn;
}

function buildEye(radius: number, side: number): THREE.Mesh {
  const eye = mesh(new THREE.SphereGeometry(radius * 0.13, 12, 8), eyeMaterial());
  eye.position.set(radius * 0.6, radius * 0.16, side * radius * 0.52);
  return eye;
}

// ---------------------------------------------------------------------------
// Snout and jaws.
// ---------------------------------------------------------------------------

function buildSnout(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();

  group.add(mesh(createTaperedBoxGeometry(dims.x, dims.y, dims.z, 0.68, 0.62), scaleMaterial(palette)));

  const nostril = new THREE.MeshStandardMaterial({ color: palette.scaleDeep, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const bump = mesh(new THREE.SphereGeometry(dims.y * 0.17, 8, 6), nostril);
    bump.position.set(dims.x * 0.42, dims.y * 0.24, side * dims.z * 0.2);
    group.add(bump);
  }

  return group;
}

function buildJaw(
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  variant: 'upper' | 'lower',
): THREE.Group {
  const group = new THREE.Group();
  const pointDown = variant === 'upper';

  group.add(mesh(createTaperedBoxGeometry(dims.x, dims.y, dims.z, 0.55, 0.5), scaleMaterial(palette)));

  const enamel = toothMaterial(palette);
  const toothHeight = dims.y * 1.15;
  for (const along of [0.38, 0.18, -0.02, -0.22]) {
    for (const side of [-1, 1]) {
      const tooth = mesh(new THREE.ConeGeometry(dims.z * 0.1, toothHeight, 5), enamel);
      tooth.position.set(
        along * dims.x,
        (pointDown ? -1 : 1) * dims.y * 0.42,
        side * dims.z * 0.32 * (1 - Math.max(0, along) * 0.4),
      );
      if (pointDown) tooth.rotation.x = Math.PI;
      group.add(tooth);
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Legs, feet, talons.
// ---------------------------------------------------------------------------

const LEG_PROFILE: readonly [number, number][] = [
  [-0.5, 0.55],
  [-0.35, 0.6],
  [-0.12, 0.52],
  [0.15, 0.72],
  [0.38, 0.95],
  [0.5, 0.88],
];

function buildLeg(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const lathe = new THREE.LatheGeometry(
    LEG_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    16,
  );
  group.add(mesh(lathe, scaleMaterial(palette)));
  return group;
}

function buildFoot(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();

  const pad = mesh(createTaperedBoxGeometry(dims.x * 0.9, dims.y, dims.z, 0.72, 0.78), scaleMaterial(palette));
  pad.position.x = -dims.x * 0.05;
  group.add(pad);

  const keratin = clawMaterial(palette);
  for (const side of [-1, 0, 1]) {
    const talon = mesh(new THREE.ConeGeometry(dims.y * 0.42, dims.x * 0.6, 6), keratin);
    talon.position.set(dims.x * 0.46, -dims.y * 0.12, side * dims.z * 0.3);
    talon.rotation.z = -Math.PI / 2 - 0.22;
    group.add(talon);
  }

  return group;
}

/** Curved two-segment talon along the local Y axis (matches the cylinder physics shape). */
function buildTalon(radius: number, length: number, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const keratin = clawMaterial(palette);

  const base = mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.85, length * 0.55, 8), keratin);
  base.position.y = -length * 0.22;
  group.add(base);

  const tipPivot = new THREE.Group();
  tipPivot.position.y = length * 0.05;
  tipPivot.rotation.z = 0.5;
  const tip = mesh(new THREE.CylinderGeometry(radius * 0.02, radius * 0.5, length * 0.5, 8), keratin);
  tip.position.y = length * 0.22;
  tipPivot.add(tip);
  group.add(tipPivot);

  return group;
}

// ---------------------------------------------------------------------------
// Wings: membrane with scalloped trailing edge, arm bone, and finger struts.
// ---------------------------------------------------------------------------

/**
 * How the membrane hangs between its bones. All values are fractions of chord
 * or span, so a wing keeps its character at every genome scale.
 */
export interface WingMembraneShape {
  /** Peak downward bow across the chord. Zero is a flat sheet. */
  camber: number;
  /** Extra droop midway between finger struts, on top of the camber. */
  fingerSag: number;
  /** Upward arc from root to tip, as a fraction of span. */
  dihedral: number;
  /** How far the trailing edge scallops inward between fingers. */
  scallop: number;
}

export const WING_SHAPES = {
  /** Nearly flat — close to the original sheet, with just enough bow to catch light. */
  taut: { camber: 0.05, fingerSag: 0.03, dihedral: 0.02, scallop: 0.1 },
  /** A single clean airfoil bow. Reads well at thumbnail size. */
  cambered: { camber: 0.12, fingerSag: 0.06, dihedral: 0.04, scallop: 0.13 },
  /** Deep scalloped sag between the fingers, like a bat at rest. */
  bat: { camber: 0.1, fingerSag: 0.17, dihedral: 0.05, scallop: 0.19 },
  /** Strong upward sweep, as if catching air. */
  soaring: { camber: 0.15, fingerSag: 0.08, dihedral: 0.17, scallop: 0.13 },
} as const satisfies Record<string, WingMembraneShape>;

/** Shipped default. Change this line to adopt a tuned shape permanently. */
export const DEFAULT_WING_SHAPE: WingMembraneShape = WING_SHAPES.cambered;

/**
 * Live tuning hook for the parts lab.
 *
 * Module-level and mutable on purpose: the lab needs to reshape the membrane
 * while a student — or you — drags a slider, and threading a parameter through
 * every caller of `createDragonProceduralObject` would put a tuning concern in
 * the genetics, arena, and thumbnail paths that none of them care about.
 * Null in production, so the shipped default is what everyone else renders.
 */
let wingShapeOverride: WingMembraneShape | null = null;

export function setWingShapeOverride(shape: WingMembraneShape | null): void {
  wingShapeOverride = shape;
}

export function getActiveWingShape(): WingMembraneShape {
  return wingShapeOverride ?? DEFAULT_WING_SHAPE;
}

/** Spanwise/chordwise tessellation of the membrane grid. */
const WING_SPAN_SEGMENTS = 26;
const WING_CHORD_SEGMENTS = 8;

function buildWing(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const span = dims.z;
  const thickness = dims.y;
  const chord = dims.x * 2.6;
  const rootSign = wingRootSign(part);
  const form = getActiveWingShape();

  // Chordwise coordinates: +x is the dragon's forward, membrane trails backward.
  const leadingAt = (s: number): number => dims.x * 0.5 - chord * 0.12 * Math.pow(s, 1.5);
  const flatTrailingAt = (s: number): number =>
    leadingAt(s) - chord * (1 - 0.62 * Math.pow(s, 1.8));
  const fingerStops = [0.42, 0.74];
  // Root, the two finger tips, and the wingtip: the membrane is pinned at each
  // and free to sag between them.
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

  // Trailing edge scallops inward between the fingers, pulling toward the
  // leading edge (larger x) where nothing holds the membrane out.
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
    // sin() pins the sheet at both edges and bows it in between.
    return form.dihedral * span * s * s - sag * Math.sin(Math.max(0, Math.min(1, c)) * Math.PI);
  };

  group.add(mesh(
    buildWingMembraneGeometry(leadingAt, trailingAt, zOf, membraneY),
    membraneMaterial(palette),
  ));

  const bone = hornMaterial(palette, THREE.DoubleSide);

  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(leadingAt(0) - 0.01, thickness * 0.1 + membraneY(0.02, 0), zOf(0.02)),
    new THREE.Vector3(leadingAt(0.45) + 0.01, thickness * 0.5 + membraneY(0.45, 0), zOf(0.45)),
    new THREE.Vector3(leadingAt(1) - 0.02, thickness * 0.2 + membraneY(0.98, 0), zOf(0.98)),
  ]);
  group.add(mesh(new THREE.TubeGeometry(armCurve, 14, thickness * 0.5, 6), bone));

  const elbow = new THREE.Vector3(
    leadingAt(0.45),
    thickness * 0.3 + membraneY(0.45, 0),
    zOf(0.45),
  );
  const fingerTargets = [...fingerStops, 0.99].map(stop => new THREE.Vector3(
    trailingAt(stop),
    membraneY(stop, 1),
    zOf(stop),
  ));
  for (const target of fingerTargets) {
    const strut = new THREE.LineCurve3(elbow, target);
    group.add(mesh(new THREE.TubeGeometry(strut, 1, thickness * 0.26, 5), bone));
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
  const indices: number[] = [];
  const columns = WING_CHORD_SEGMENTS + 1;

  for (let row = 0; row <= WING_SPAN_SEGMENTS; row += 1) {
    const s = row / WING_SPAN_SEGMENTS;
    const leading = leadingAt(s);
    const trailing = trailingAt(s);
    const z = zOf(s);

    for (let column = 0; column <= WING_CHORD_SEGMENTS; column += 1) {
      const c = column / WING_CHORD_SEGMENTS;
      positions.push(leading + (trailing - leading) * c, membraneY(s, c), z);
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

// ---------------------------------------------------------------------------
// Tails.
// ---------------------------------------------------------------------------

const TAIL_PROFILE: readonly [number, number][] = [
  [-0.5, 0.5],
  [-0.2, 0.68],
  [0.1, 0.85],
  [0.5, 1.0],
];

function buildTailSegment(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const lathe = new THREE.LatheGeometry(
    TAIL_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  group.add(mesh(lathe, scaleMaterial(palette)));
  return group;
}

function buildTailClub(dims: { x: number; y: number; z: number }, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();

  const shaft = new THREE.LatheGeometry(
    [[-0.36, 0.34], [0, 0.6], [0.5, 1.0]].map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  group.add(mesh(shaft, scaleMaterial(palette)));

  const knob = mesh(new THREE.IcosahedronGeometry(dims.z * 0.8, 1), scaleMaterial(palette));
  knob.position.y = -dims.y * 0.42;
  group.add(knob);

  const spikeMaterial = hornMaterial(palette);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const spike = mesh(new THREE.ConeGeometry(dims.z * 0.18, dims.z * 0.85, 6), spikeMaterial);
    spike.position.set(
      Math.cos(angle) * dims.z * 0.62,
      -dims.y * 0.42 - Math.sin(angle) * dims.z * 0.2,
      Math.sin(angle) * dims.z * 0.62,
    );
    spike.rotation.z = -Math.PI / 2 - angle * 0.4;
    spike.rotation.y = -angle;
    group.add(spike);
  }

  return group;
}

function buildStinger(radius: number, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();

  const knuckle = mesh(new THREE.SphereGeometry(radius * 0.72, 12, 8), scaleMaterial(palette));
  knuckle.position.y = radius * 0.18;
  group.add(knuckle);

  const blade = buildTalon(radius * 0.5, radius * 2.1, palette);
  blade.position.y = -radius * 0.1;
  blade.rotation.z = Math.PI;
  group.add(blade);

  return group;
}

// ---------------------------------------------------------------------------
// Shared geometry helpers.
// ---------------------------------------------------------------------------

/** Box whose +x face is scaled down: snouts, jaws, feet. */
function createTaperedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  frontScaleY: number,
  frontScaleZ: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 2, 1, 1);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    if (x <= 0) continue;
    const blend = x / (width / 2);
    positions.setY(index, positions.getY(index) * (1 - blend * (1 - frontScaleY)));
    positions.setZ(index, positions.getZ(index) * (1 - blend * (1 - frontScaleZ)));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
