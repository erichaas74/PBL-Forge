import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { DRAGON_BODY_PROFILE, sampleDragonBodyRadius } from './dragon-body-profile';
import {
  DEFAULT_HEAD_SHAPE,
  DragonHeadShape,
  HEAD_SHAPE_BY_PROFILE,
  dragonHeadExtent,
  dragonHeadEyeSocket,
  dragonHeadHornMount,
  dragonHeadNostril,
  dragonHeadSection,
  dragonHeadSurfacePoint,
  headShapeFor,
} from './dragon-head-profile';
import { DEFAULT_WING_SHAPE, WingMembraneShape, wingChord, wingLeadingEdge } from './dragon-wing-profile';
import {
  HORN_TILE,
  KERATIN_TILE,
  SCALE_TILE,
  applyBoxProjectedUv,
  applyTiledUv,
  dragonHornTextures,
  dragonKeratinTextures,
  dragonMembraneTextures,
  dragonPartSeed,
  dragonScaleTextures,
  membraneUsesTransmission,
} from './dragon-textures';

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
  const palette = createDragonPalette(part.color, dragonPartSeed(part.id));
  const dims = part.dimensions;

  switch (profileId) {
    case 'dragon-body':
      return buildBody(part, palette);
    // Heads work in the profile's box terms; a sphere head's dimensions are
    // radii, so they are converted before anything measures the skull.
    case 'dragon-head-horned':
      return buildHornedHead(part, dragonHeadExtent(dims, part.shape), palette);
    case 'dragon-head-snout':
      return buildSnoutHead(part, dragonHeadExtent(dims, part.shape), palette);
    case 'dragon-head-armored':
      return buildArmoredHead(part, dragonHeadExtent(dims, part.shape), palette);
    case 'dragon-upper-jaw':
      return buildJaw(part, palette, 'upper');
    case 'dragon-lower-jaw':
      return buildJaw(part, palette, 'lower');
    case 'dragon-leg':
      return buildLeg(dims, palette);
    case 'dragon-foot':
      return buildFoot(part, palette);
    case 'dragon-claw':
    case 'dragon-wing-claw':
      return buildTalon(dims.x, dims.y, palette);
    case 'dragon-wing':
    case 'dragon-secondary-wing':
      return buildWing(part, palette);
    case 'dragon-tail':
      return buildTailSegment(dims, palette);
    case 'dragon-tail-club':
      return buildTailClub(part, palette);
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
  /**
   * Stable 0..1 value derived from the part id. Shifts texture UVs and nudges
   * relief depth so four legs off the same builder do not read as four copies.
   */
  seed: number;
}

function createDragonPalette(baseColor: string, seed: number): DragonPalette {
  const scale = new THREE.Color(baseColor);
  return {
    scale,
    scaleDeep: scale.clone().multiplyScalar(0.55),
    horn: scale.clone().lerp(new THREE.Color('#e9dcc0'), 0.72),
    claw: scale.clone().lerp(new THREE.Color('#d8c9a3'), 0.6).multiplyScalar(0.88),
    tooth: new THREE.Color('#f2ead6'),
    membrane: scale.clone().lerp(new THREE.Color('#ffffff'), 0.22),
    seed,
  };
}

/**
 * Relief depth varies a little per part, on top of the UV offset, so repeated
 * parts catch the key light differently.
 */
function reliefScale(palette: DragonPalette, base: number): THREE.Vector2 {
  const depth = base * (0.85 + palette.seed * 0.3);
  return new THREE.Vector2(depth, depth);
}

/**
 * `roughness` and the roughness map *multiply*, so a material carrying a map
 * has to sit at 1 and let the map speak. Leaving the old scalar in place would
 * darken every roughness value by that factor and read as uniform gloss.
 */
function scaleMaterial(palette: DragonPalette, relief = 0.9): THREE.MeshStandardMaterial {
  const skin = dragonScaleTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.scale,
    map: skin.map,
    normalMap: skin.normalMap,
    normalScale: reliefScale(palette, relief),
    roughnessMap: skin.roughnessMap,
    roughness: skin.roughnessMap ? 1 : 0.58,
    metalness: 0.12,
  });
}

function hornMaterial(palette: DragonPalette, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial {
  const keratin = dragonHornTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.horn,
    map: keratin.map,
    normalMap: keratin.normalMap,
    normalScale: reliefScale(palette, 0.75),
    roughnessMap: keratin.roughnessMap,
    roughness: keratin.roughnessMap ? 1 : 0.42,
    metalness: 0.08,
    side,
  });
}

function clawMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const keratin = dragonKeratinTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.claw,
    map: keratin.map,
    normalMap: keratin.normalMap,
    normalScale: reliefScale(palette, 0.5),
    roughnessMap: keratin.roughnessMap,
    roughness: keratin.roughnessMap ? 1 : 0.4,
    metalness: 0.1,
  });
}

function toothMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const keratin = dragonKeratinTextures();
  return new THREE.MeshStandardMaterial({
    color: palette.tooth,
    normalMap: keratin.normalMap,
    normalScale: reliefScale(palette, 0.35),
    roughness: 0.35,
    metalness: 0.02,
  });
}

/**
 * The membrane was a flat 78% opaque sheet, which is the one place a dragon
 * most obviously reads as plastic: a real wing is a thin skin that *glows* when
 * the sun is behind it, opaque only along its vessels.
 *
 * The alpha map carries that thickness variation, and on the high tier
 * `transmission` adds true backlit scatter. Transmission costs a second scene
 * render, so lower tiers keep plain alpha blending — the alpha map alone
 * already does most of the work.
 */
function membraneMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const skin = dragonMembraneTextures();
  const shared = {
    color: palette.membrane,
    map: skin.map,
    normalMap: skin.normalMap,
    normalScale: reliefScale(palette, 0.7),
    roughnessMap: skin.roughnessMap,
    roughness: skin.roughnessMap ? 1 : 0.62,
    alphaMap: skin.alphaMap,
    metalness: 0,
    transparent: true,
    // The alpha map now carries the thinness; opacity only trims it overall.
    opacity: skin.alphaMap ? 0.94 : 0.78,
    side: THREE.DoubleSide,
  };

  if (!membraneUsesTransmission()) {
    return new THREE.MeshStandardMaterial(shared);
  }

  return new THREE.MeshPhysicalMaterial({
    ...shared,
    transmission: 0.35,
    // Thin-walled: a wing membrane is skin, not glass.
    thickness: 0.02,
    ior: 1.35,
  });
}

function eyeMaterial(color = '#ff9f2e'): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#3a1d05',
    emissive: color,
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
// UV assignment.
//
// Every builder sizes its texture in *world units*, not in fractions of the
// part. A genome that doubles a wing span should give you twice as many scales,
// not the same scales at twice the size.
// ---------------------------------------------------------------------------

/** Bodies of revolution — lathes, cylinders, cones: `u` wraps the axis, `v` runs along it. */
function revolvedUv<T extends THREE.BufferGeometry>(
  geometry: T,
  radius: number,
  length: number,
  tile: number,
  palette: DragonPalette,
): T {
  applyTiledUv(geometry, 2 * Math.PI * Math.abs(radius), Math.abs(length), tile, palette.seed);
  return geometry;
}

/** Spheres, with the three semi-axes the mesh will be scaled to. */
function sphereUv<T extends THREE.BufferGeometry>(
  geometry: T,
  radii: { x: number; y: number; z: number },
  tile: number,
  palette: DragonPalette,
): T {
  applyTiledUv(
    geometry,
    Math.PI * (Math.abs(radii.x) + Math.abs(radii.z)),
    Math.PI * Math.abs(radii.y),
    tile,
    palette.seed,
  );
  return geometry;
}

/** Boxes and anything else without a usable seam: cube-project from object space. */
function boxUv<T extends THREE.BufferGeometry>(geometry: T, tile: number, palette: DragonPalette): T {
  applyBoxProjectedUv(geometry, tile, palette.seed);
  return geometry;
}

/** `TubeGeometry` runs `u` along the path and `v` around the tube — the opposite of a lathe. */
function tubeUv<T extends THREE.BufferGeometry>(
  geometry: T,
  length: number,
  radius: number,
  tile: number,
  palette: DragonPalette,
): T {
  applyTiledUv(geometry, Math.abs(length), 2 * Math.PI * Math.abs(radius), tile, palette.seed);
  return geometry;
}

// ---------------------------------------------------------------------------
// Body: tapered lathe along X with dorsal ridge spikes.
// ---------------------------------------------------------------------------

function buildBody(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const length = dims.x;

  const lathe = new THREE.LatheGeometry(
    DRAGON_BODY_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * length)),
    20,
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  // Mean profile radius across the torso, so scales stay the same size from
  // shoulder to hip rather than stretching over the taper.
  revolvedUv(lathe, ((dims.y + dims.z) / 4) * 0.72, length, SCALE_TILE, palette);
  group.add(mesh(lathe, scaleMaterial(palette)));

  const bellyRadii = { x: length * 0.38, y: dims.y * 0.3, z: dims.z * 0.34 };
  const bellySkin = dragonScaleTextures();
  const belly = mesh(
    sphereUv(new THREE.SphereGeometry(1, 12, 8), bellyRadii, SCALE_TILE, palette),
    new THREE.MeshStandardMaterial({
      color: palette.scaleDeep,
      map: bellySkin.map,
      normalMap: bellySkin.normalMap,
      normalScale: reliefScale(palette, 0.6),
      roughnessMap: bellySkin.roughnessMap,
      roughness: bellySkin.roughnessMap ? 1 : 0.66,
      metalness: 0.04,
    }),
  );
  belly.name = 'dragon-belly';
  belly.scale.set(bellyRadii.x, bellyRadii.y, bellyRadii.z);
  belly.position.set(length * 0.04, -dims.y * 0.22, 0);
  group.add(belly);

  const defaults = getActiveDragonStyle().body;
  const style: DragonBodyStyle = {
    spikeCount: visualNumber(part, 'spikeCount', defaults.spikeCount),
    spikeSpread: visualNumber(part, 'spikeSpread', defaults.spikeSpread),
    spikeHeight: visualNumber(part, 'spikeHeight', defaults.spikeHeight),
    spikeRadius: visualNumber(part, 'spikeRadius', defaults.spikeRadius),
    spikeLean: visualNumber(part, 'spikeLean', defaults.spikeLean),
  };
  const spikeCount = visualNumber(part, 'backSpikeCount', style.spikeCount);
  const spikeScale = visualNumber(part, 'backSpikeScale', 1);
  const spikeMaterial = hornMaterial(palette);
  const spikeRadius = length * style.spikeRadius;
  const spikeHeight = length * style.spikeHeight * spikeScale;
  for (const t of spreadPositions(spikeCount, style.spikeSpread, -0.01)) {
    const spike = mesh(
      revolvedUv(new THREE.ConeGeometry(spikeRadius, spikeHeight, 6), spikeRadius, spikeHeight, HORN_TILE, palette),
      spikeMaterial,
    );
    spike.position.set(t * length, sampleDragonBodyRadius(t) * (dims.y / 2) * 0.96, 0);
    spike.rotation.z = style.spikeLean;
    group.add(spike);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Heads.
// ---------------------------------------------------------------------------

/** Rings and radial divisions of the lofted skull. */
const HEAD_AXIAL_SEGMENTS = 22;
const HEAD_RADIAL_SEGMENTS = 18;

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
    indices.push(noseIndex, vertexAt(HEAD_AXIAL_SEGMENTS, column), vertexAt(HEAD_AXIAL_SEGMENTS, column + 1));
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
function buildSkull(
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

function buildHornedHead(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
): THREE.Group {
  const group = new THREE.Group();
  const style = headStyleFor(part);
  const { skull, shape } = buildSkull(dims, palette, style);
  group.add(skull);

  // Horn sizes stay keyed to the head's height, so a longer snout lengthens the
  // skull without also growing the horns.
  const scaleRef = dims.y / 2;
  const horn = hornMaterial(palette);
  for (const side of [-1, 1] as const) {
    const mount = dragonHeadHornMount(dims, side, shape);
    const mainHorn = buildHorn(scaleRef * style.hornLength, scaleRef * style.hornRadius, horn, palette);
    mainHorn.position.set(mount.x, mount.y, mount.z);
    mainHorn.rotation.set(side * 0.5, 0, 0.55);
    group.add(mainHorn);

    const browMount = dragonHeadSurfacePoint(dims, -0.02, side * 0.5, shape);
    const browSpike = buildHorn(scaleRef * style.browLength, scaleRef * 0.08, horn, palette);
    browSpike.position.set(browMount.x, browMount.y, browMount.z);
    browSpike.rotation.set(side * 0.3, 0, 0.75);
    group.add(browSpike);

    group.add(buildEye(part, dims, side, shape));
  }

  addExpressiveHeadFeatures(group, part, dims, palette, shape);

  return group;
}

function buildSnoutHead(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
): THREE.Group {
  const group = new THREE.Group();
  const { skull, shape } = buildSkull(dims, palette, HEAD_SHAPE_BY_PROFILE['dragon-head-snout']);
  group.add(skull);

  const nostrilMaterial = new THREE.MeshStandardMaterial({ color: palette.scaleDeep, roughness: 0.7 });
  for (const side of [-1, 1] as const) {
    const nostril = mesh(new THREE.SphereGeometry(dims.y * 0.07, 10, 7), nostrilMaterial);
    const at = dragonHeadNostril(dims, side, shape);
    nostril.scale.set(1.3, 0.5, 1);
    nostril.position.set(at.x, at.y, at.z);
    group.add(nostril);

    group.add(buildEye(part, dims, side, shape));
  }

  addExpressiveHeadFeatures(group, part, dims, palette, shape);

  return group;
}

function buildArmoredHead(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
): THREE.Group {
  const group = new THREE.Group();
  const { skull, shape } = buildSkull(dims, palette, HEAD_SHAPE_BY_PROFILE['dragon-head-armored']);
  group.add(skull);

  // Crest fins ride the crown line, so they follow the skull rather than
  // hovering at a fixed fraction of the bounding box.
  const crest = hornMaterial(palette);
  for (const [axial, height] of [[-0.3, 0.34], [-0.08, 0.42], [0.14, 0.3]] as const) {
    const crown = dragonHeadSurfacePoint(dims, axial, 0, shape);
    const finHeight = dims.y * height;
    // Built along +x and turned upright, so the taper runs to the tip: a plain
    // box reads as a paddle balanced on the skull, not a crest growing from it.
    const geometry = createTaperedBoxGeometry(finHeight, dims.x * 0.22, dims.z * 0.07, 0.3, 0.55);
    geometry.rotateZ(Math.PI / 2);
    const fin = mesh(boxUv(geometry, HORN_TILE, palette), crest);
    // Sunk into the crown, so the fin grows out of the skull rather than
    // balancing on it. The lean stays slight; much past 0.2 radians the tilt
    // swings the base clear of the head and it reads detached again.
    fin.position.set(crown.x, crown.y + finHeight * 0.06, 0);
    fin.rotation.z = 0.16;
    group.add(fin);
  }

  for (const side of [-1, 1] as const) {
    group.add(buildEye(part, dims, side, shape));
  }

  addExpressiveHeadFeatures(group, part, dims, palette, shape);

  return group;
}

function buildHorn(
  length: number,
  baseRadius: number,
  material: THREE.Material,
  palette: DragonPalette,
): THREE.Group {
  const horn = new THREE.Group();

  const base = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(baseRadius * 0.45, baseRadius, length * 0.55, 8),
      baseRadius * 0.72,
      length * 0.55,
      HORN_TILE,
      palette,
    ),
    material,
  );
  base.position.y = length * 0.275;
  horn.add(base);

  const tipPivot = new THREE.Group();
  tipPivot.position.y = length * 0.55;
  tipPivot.rotation.z = 0.55;
  const tip = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(baseRadius * 0.04, baseRadius * 0.45, length * 0.5, 8),
      baseRadius * 0.25,
      length * 0.5,
      HORN_TILE,
      palette,
    ),
    material,
  );
  tip.position.y = length * 0.25;
  tipPivot.add(tip);
  horn.add(tipPivot);

  return horn;
}

/**
 * Eye set into the skull's orbital pinch.
 *
 * The position used to be a hand-tuned multiple of the head radius, which only
 * held for a sphere: on any head the profile actually shapes, it put the eye
 * inside the bone or floating off the cheek.
 */
function buildEye(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  side: -1 | 1,
  shape: DragonHeadShape,
): THREE.Mesh {
  const eye = mesh(
    new THREE.SphereGeometry(dims.y * 0.055, 12, 8),
    eyeMaterial(visualString(part, 'eyeColor', '#ff9f2e')),
  );
  eye.name = `dragon-eye-${side < 0 ? 'left' : 'right'}`;
  const socket = dragonHeadEyeSocket(dims, side, shape);
  eye.position.set(socket.x, socket.y, socket.z);
  return eye;
}

/** Adds genotype-specific anatomy to one head without changing the global Parts Lab style. */
function addExpressiveHeadFeatures(
  group: THREE.Group,
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): void {
  const crestScale = visualNumber(part, 'crestScale', 0);
  if (crestScale > 0) {
    const material = hornMaterial(palette);
    for (const [index, axial] of [-0.3, -0.08, 0.14].entries()) {
      const crown = dragonHeadSurfacePoint(dims, axial, 0, shape);
      const height = dims.y * [0.24, 0.34, 0.22][index] * crestScale;
      const geometry = createTaperedBoxGeometry(height, dims.x * 0.18, dims.z * 0.055, 0.28, 0.52);
      geometry.rotateZ(Math.PI / 2);
      const fin = mesh(boxUv(geometry, HORN_TILE, palette), material);
      fin.name = `dragon-genetic-crest-${index + 1}`;
      fin.position.set(crown.x, crown.y + height * 0.06, 0);
      fin.rotation.z = 0.14;
      group.add(fin);
    }
  }

  const earShape = visualString(part, 'earShape', '');
  if (earShape === 'pointed' || earShape === 'rounded') {
    const material = scaleMaterial(palette, 0.35);
    for (const side of [-1, 1] as const) {
      const mount = dragonHeadSurfacePoint(dims, -0.2, side * 0.72, shape);
      const ear = earShape === 'pointed'
        ? mesh(new THREE.ConeGeometry(dims.z * 0.1, dims.y * 0.34, 7), material)
        : mesh(new THREE.SphereGeometry(dims.y * 0.13, 10, 7), material);
      ear.name = `dragon-${earShape}-ear-${side < 0 ? 'left' : 'right'}`;
      ear.position.set(mount.x - dims.x * 0.04, mount.y + dims.y * 0.08, mount.z);
      if (earShape === 'pointed') {
        ear.rotation.set(0, 0, side * -0.58);
      } else {
        ear.scale.set(0.65, 1.05, 0.45);
      }
      group.add(ear);
    }
  }

  const sex = visualString(part, 'sex', '');
  if (sex === 'male') {
    const rearSection = dragonHeadSection(dims, -0.28, shape);
    const skullFrillInnerRadius = Math.max(rearSection.halfHeight, rearSection.halfWidth) * 0.82;
    const skullFrillOuterRadius = skullFrillInnerRadius + dims.y * 0.48;
    const skullFrill = mesh(
      new THREE.RingGeometry(
        skullFrillInnerRadius,
        skullFrillOuterRadius,
        22,
        1,
        -Math.PI * 0.72,
        Math.PI * 1.44,
      ),
      membraneMaterial(palette),
    );
    skullFrill.name = 'dragon-male-skull-frill';
    skullFrill.position.set(-dims.x * 0.34, rearSection.centerY, 0);
    skullFrill.rotation.y = Math.PI / 2;
    skullFrill.scale.x = 0.82;
    group.add(skullFrill);

    const skullSpikeMaterial = hornMaterial(palette);
    const skullSpikeCount = 11;
    for (let index = 0; index < skullSpikeCount; index += 1) {
      const fraction = index / (skullSpikeCount - 1);
      const angle = -Math.PI * 0.7 + fraction * Math.PI * 1.4;
      const direction = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle)).normalize();
      const spikeHeight = dims.y * (0.22 + 0.12 * Math.cos(angle * 0.72));
      const spikeRadius = dims.z * 0.042;
      const spike = mesh(
        revolvedUv(
          new THREE.ConeGeometry(spikeRadius, spikeHeight, 7),
          spikeRadius,
          spikeHeight,
          HORN_TILE,
          palette,
        ),
        skullSpikeMaterial,
      );
      spike.name = `dragon-male-skull-frill-spike-${index + 1}`;
      spike.position.set(
        -dims.x * 0.35,
        rearSection.centerY + direction.y * skullFrillOuterRadius,
        direction.z * skullFrillOuterRadius * 0.82,
      );
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      group.add(spike);
    }

    const frillLength = dims.x * 0.58;
    const frillDepth = dims.y * 0.52;
    const dewlap = mesh(
      createTaperedBoxGeometry(frillLength, frillDepth, dims.z * 0.045, 0.12, 0.78),
      membraneMaterial(palette),
    );
    dewlap.name = 'dragon-male-spiked-frill';
    dewlap.position.set(-dims.x * 0.12, -dims.y * 0.5, 0);
    dewlap.rotation.z = -0.34;
    group.add(dewlap);

    const spikeMaterial = hornMaterial(palette);
    const spikeCount = 7;
    for (let index = 0; index < spikeCount; index += 1) {
      const fraction = index / (spikeCount - 1);
      const spikeHeight = dims.y * (0.16 + Math.sin(fraction * Math.PI) * 0.1);
      const spikeRadius = dims.z * 0.035;
      const spike = mesh(
        revolvedUv(
          new THREE.ConeGeometry(spikeRadius, spikeHeight, 6),
          spikeRadius,
          spikeHeight,
          HORN_TILE,
          palette,
        ),
        spikeMaterial,
      );
      spike.name = `dragon-male-frill-spike-${index + 1}`;
      spike.position.set(
        -dims.x * 0.36 + fraction * frillLength * 0.88,
        -dims.y * (0.67 + Math.sin(fraction * Math.PI) * 0.11),
        0,
      );
      spike.rotation.z = Math.PI + (fraction - 0.5) * 0.42;
      group.add(spike);
    }
  } else if (sex === 'female') {
    const material = membraneMaterial(palette);
    for (const side of [-1, 1] as const) {
      const frill = mesh(
        new THREE.ConeGeometry(dims.z * 0.12, dims.y * 0.3, 7),
        material,
      );
      frill.name = `dragon-female-frill-${side < 0 ? 'left' : 'right'}`;
      frill.position.set(-dims.x * 0.3, dims.y * 0.04, side * dims.z * 0.44);
      frill.rotation.set(Math.PI / 2, 0, side * 0.35);
      group.add(frill);
    }
  }
}

function visualNumber(part: AssemblyPart, key: string, fallback: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function visualString(part: AssemblyPart, key: string, fallback: string): string {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'string' ? value : fallback;
}

function headStyleFor(part: AssemblyPart): DragonHeadStyle {
  const defaults = getActiveDragonStyle().head;
  return {
    cranium: visualNumber(part, 'cranium', defaults.cranium),
    browRidge: visualNumber(part, 'browRidge', defaults.browRidge),
    muzzleDepth: visualNumber(part, 'muzzleDepth', defaults.muzzleDepth),
    muzzleWidth: visualNumber(part, 'muzzleWidth', defaults.muzzleWidth),
    muzzleDrop: visualNumber(part, 'muzzleDrop', defaults.muzzleDrop),
    cheek: visualNumber(part, 'cheek', defaults.cheek),
    eyeAxial: visualNumber(part, 'eyeAxial', defaults.eyeAxial),
    hornLength: visualNumber(part, 'hornLength', defaults.hornLength),
    hornRadius: visualNumber(part, 'hornRadius', defaults.hornRadius),
    browLength: visualNumber(part, 'browLength', defaults.browLength),
  };
}

// ---------------------------------------------------------------------------
// Jaws.
// ---------------------------------------------------------------------------

function buildJaw(
  part: AssemblyPart,
  palette: DragonPalette,
  variant: 'upper' | 'lower',
): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const pointDown = variant === 'upper';

  group.add(mesh(
    boxUv(createTaperedBoxGeometry(dims.x, dims.y, dims.z, 0.55, 0.5), SCALE_TILE, palette),
    scaleMaterial(palette),
  ));

  if (variant === 'upper') {
    // Nostrils stay smooth: scale relief on a 2cm sphere just reads as noise.
    const nostrilMaterial = new THREE.MeshStandardMaterial({ color: palette.scaleDeep, roughness: 0.7 });
    for (const side of [-1, 1]) {
      const nostril = mesh(
        new THREE.SphereGeometry(Math.max(dims.y * 0.15, dims.z * 0.045), 10, 7),
        nostrilMaterial,
      );
      nostril.name = `dragon-nostril-${side < 0 ? 'left' : 'right'}`;
      nostril.scale.set(1.25, 0.45, 1);
      nostril.position.set(dims.x * 0.38, dims.y * 0.48, side * dims.z * 0.25);
      group.add(nostril);
    }
  }

  const defaults = getActiveDragonStyle().jaw;
  const style: DragonJawStyle = {
    toothCount: visualNumber(part, 'toothCount', defaults.toothCount),
    toothHeight: visualNumber(part, 'toothHeight', defaults.toothHeight),
    toothRadius: visualNumber(part, 'toothRadius', defaults.toothRadius),
  };
  const fangScale = visualNumber(part, 'fangScale', 1);
  const enamel = toothMaterial(palette);
  const toothHeight = dims.y * style.toothHeight * fangScale;
  // Teeth march back from the snout tip; the range matches the jaw's taper.
  const toothRadius = dims.z * style.toothRadius;
  for (const along of spreadPositions(style.toothCount, 0.6, 0.08).reverse()) {
    for (const side of [-1, 1]) {
      const tooth = mesh(
        revolvedUv(
          new THREE.ConeGeometry(toothRadius, toothHeight, 5),
          toothRadius,
          toothHeight,
          KERATIN_TILE,
          palette,
        ),
        enamel,
      );
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

/**
 * Limb meshes fill their physics volume, like every other part here. They used
 * to render at half scale with a compensating lift, which left every socket on
 * the chain — hip, knee, ankle — pointing at empty space: the joints were
 * correct, the geometry attached to them was not.
 */
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
  revolvedUv(lathe, dims.x * 0.7, dims.y, SCALE_TILE, palette);
  group.add(mesh(lathe, scaleMaterial(palette)));
  return group;
}

function buildFoot(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;

  const pad = mesh(
    boxUv(createTaperedBoxGeometry(dims.x * 0.9, dims.y, dims.z, 0.72, 0.78), SCALE_TILE, palette),
    scaleMaterial(palette),
  );
  pad.position.x = -dims.x * 0.05;
  group.add(pad);

  const defaults = getActiveDragonStyle().foot;
  const style: DragonFootStyle = {
    talonCount: visualNumber(part, 'talonCount', defaults.talonCount),
    talonLength: visualNumber(part, 'talonLength', defaults.talonLength),
    talonRadius: visualNumber(part, 'talonRadius', defaults.talonRadius),
  };
  const clawScale = visualNumber(part, 'clawScale', 1);
  const keratin = clawMaterial(palette);
  const talonRadius = dims.y * style.talonRadius;
  const talonLength = dims.x * style.talonLength * clawScale;
  for (const side of spreadPositions(style.talonCount, 2)) {
    const talon = mesh(
      revolvedUv(
        new THREE.ConeGeometry(talonRadius, talonLength, 6),
        talonRadius,
        talonLength,
        KERATIN_TILE,
        palette,
      ),
      keratin,
    );
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

  const base = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.85, length * 0.55, 8),
      radius * 0.68,
      length * 0.55,
      KERATIN_TILE,
      palette,
    ),
    keratin,
  );
  base.position.y = -length * 0.22;
  group.add(base);

  const tipPivot = new THREE.Group();
  tipPivot.position.y = length * 0.05;
  tipPivot.rotation.z = 0.5;
  const tip = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.02, radius * 0.5, length * 0.5, 8),
      radius * 0.26,
      length * 0.5,
      KERATIN_TILE,
      palette,
    ),
    keratin,
  );
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
 * or span, so a wing keeps its character at every genome scale. Defined
 * alongside the planform the sockets are derived from.
 */
export {
  DEFAULT_WING_SHAPE,
  WING_SHAPES,
  type WingMembraneShape,
} from './dragon-wing-profile';

export {
  DEFAULT_HEAD_SHAPE,
  HEAD_SHAPES,
  headShapeFor,
  type DragonHeadShape,
} from './dragon-head-profile';

/**
 * Feature counts and proportions, kept out of the builders so they can be tuned
 * by eye in the parts lab.
 *
 * Every length here is a *fraction* of the part it sits on, never a world unit.
 * That is what lets the genetics pipeline scale a part without the spikes,
 * teeth, and talons drifting out of proportion with the body carrying them.
 */
export interface DragonBodyStyle {
  spikeCount: number;
  /** Length of ridge the spikes cover, as a fraction of body length. */
  spikeSpread: number;
  /** Spike height, as a fraction of body length. */
  spikeHeight: number;
  /** Spike base radius, as a fraction of body length. */
  spikeRadius: number;
  /** Backward lean, in radians. */
  spikeLean: number;
}

export interface DragonJawStyle {
  /** Teeth per side. */
  toothCount: number;
  /** Tooth height, as a fraction of jaw height. */
  toothHeight: number;
  /** Tooth base radius, as a fraction of jaw depth. */
  toothRadius: number;
}

/**
 * Horn proportions on top of the skull silhouette itself, so the parts lab can
 * drag both from one section. Extending {@link DragonHeadShape} means the style
 * *is* a valid base shape and passes straight to `headShapeFor`.
 */
export interface DragonHeadStyle extends DragonHeadShape {
  /** Main horn length, as a fraction of head height. */
  hornLength: number;
  /** Main horn base radius, as a fraction of head height. */
  hornRadius: number;
  /** Brow spike length, as a fraction of head height. */
  browLength: number;
}

export interface DragonFootStyle {
  talonCount: number;
  /** Talon length, as a fraction of foot length. */
  talonLength: number;
  /** Talon base radius, as a fraction of foot height. */
  talonRadius: number;
}

export interface DragonTailClubStyle {
  spikeCount: number;
  /** Spike length, as a fraction of club depth. */
  spikeLength: number;
  /** Spike base radius, as a fraction of club depth. */
  spikeRadius: number;
}

export interface DragonStyle {
  wing: WingMembraneShape;
  body: DragonBodyStyle;
  jaw: DragonJawStyle;
  head: DragonHeadStyle;
  foot: DragonFootStyle;
  tailClub: DragonTailClubStyle;
}

export const DEFAULT_DRAGON_STYLE: DragonStyle = {
  wing: DEFAULT_WING_SHAPE,
  // Tuned in the parts lab against the drake body: taller, thicker, more swept
  // spikes over a longer ridge than the original five nubs.
  body: { spikeCount: 6, spikeSpread: 0.73, spikeHeight: 0.2, spikeRadius: 0.051, spikeLean: 0.56 },
  jaw: { toothCount: 4, toothHeight: 1.15, toothRadius: 0.1 },
  // Horn lengths were authored against the old sphere's radius (dims.x / 2 on a
  // uniform head); they now key off head height, which is the same number on
  // the shipped horned head.
  head: { ...DEFAULT_HEAD_SHAPE, hornLength: 1.35, hornRadius: 0.16, browLength: 0.45 },
  foot: { talonCount: 3, talonLength: 0.6, talonRadius: 0.42 },
  tailClub: { spikeCount: 5, spikeLength: 0.85, spikeRadius: 0.18 },
};

/**
 * Live tuning hook for the parts lab.
 *
 * Module-level and mutable on purpose: the lab needs to reshape parts while a
 * slider moves, and threading a style parameter through every caller of
 * `createDragonProceduralObject` would put a tuning concern into the genetics,
 * arena, and thumbnail paths that none of them care about. Null in production,
 * so the shipped defaults are what everyone else renders.
 */
let styleOverride: DragonStyle | null = null;

export function setDragonStyleOverride(style: DragonStyle | null): void {
  styleOverride = style;
}

export function getActiveDragonStyle(): DragonStyle {
  return styleOverride ?? DEFAULT_DRAGON_STYLE;
}

/** Evenly spaced positions across a centred span. One item sits at the centre. */
function spreadPositions(count: number, spread: number, center = 0): number[] {
  const total = Math.max(1, Math.round(count));
  if (total === 1) return [center];
  const step = spread / (total - 1);
  return Array.from({ length: total }, (_, index) => center - spread / 2 + index * step);
}

export function getActiveWingShape(): WingMembraneShape {
  return getActiveDragonStyle().wing;
}

/** Spanwise/chordwise tessellation of the membrane grid. */
const WING_SPAN_SEGMENTS = 26;
const WING_CHORD_SEGMENTS = 8;

function buildWing(part: AssemblyPart, palette: DragonPalette): THREE.Group {
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
  group.add(mesh(
    tubeUv(
      new THREE.TubeGeometry(armCurve, 14, thickness * 0.5, 6),
      armCurve.getLength(),
      thickness * 0.5,
      HORN_TILE,
      palette,
    ),
    bone,
  ));

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
    group.add(mesh(
      tubeUv(
        new THREE.TubeGeometry(strut, 1, thickness * 0.26, 5),
        elbow.distanceTo(target),
        thickness * 0.26,
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
  revolvedUv(lathe, dims.x * 0.76, dims.y, SCALE_TILE, palette);
  group.add(mesh(lathe, scaleMaterial(palette)));
  return group;
}

function buildTailClub(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;

  const shaft = new THREE.LatheGeometry(
    [[-0.36, 0.34], [0, 0.6], [0.5, 1.0]].map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  revolvedUv(shaft, dims.x * 0.65, dims.y, SCALE_TILE, palette);
  group.add(mesh(shaft, scaleMaterial(palette)));

  // Cube projection, not the polyhedron's own UVs: those wrap a sphere onto a
  // triangle list and tear at every seam.
  const knob = mesh(
    boxUv(new THREE.IcosahedronGeometry(dims.z * 0.8, 1), SCALE_TILE, palette),
    scaleMaterial(palette),
  );
  knob.position.y = -dims.y * 0.42;
  group.add(knob);

  const defaults = getActiveDragonStyle().tailClub;
  const style: DragonTailClubStyle = {
    spikeCount: visualNumber(part, 'spikeCount', defaults.spikeCount),
    spikeLength: visualNumber(part, 'spikeLength', defaults.spikeLength),
    spikeRadius: visualNumber(part, 'spikeRadius', defaults.spikeRadius),
  };
  const spikeMaterial = hornMaterial(palette);
  const spikeCount = Math.max(0, Math.round(visualNumber(part, 'tailClubSpikeCount', style.spikeCount)));
  const spikeScale = visualNumber(part, 'tailClubSpikeScale', 1);
  const spikeRadius = dims.z * style.spikeRadius;
  const spikeLength = dims.z * style.spikeLength * spikeScale;
  for (let index = 0; index < spikeCount; index += 1) {
    const angle = (index / spikeCount) * Math.PI * 2;
    const spike = mesh(
      revolvedUv(new THREE.ConeGeometry(spikeRadius, spikeLength, 6), spikeRadius, spikeLength, HORN_TILE, palette),
      spikeMaterial,
    );
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

  const knuckleRadius = radius * 0.72;
  const knuckle = mesh(
    sphereUv(
      new THREE.SphereGeometry(knuckleRadius, 12, 8),
      { x: knuckleRadius, y: knuckleRadius, z: knuckleRadius },
      SCALE_TILE,
      palette,
    ),
    scaleMaterial(palette),
  );
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
