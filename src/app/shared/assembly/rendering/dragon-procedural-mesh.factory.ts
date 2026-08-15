import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { DRAGON_BODY_PROFILE, sampleDragonBodyRadius } from './dragon-body-profile';
import {
  DEFAULT_HEAD_SHAPE,
  DragonHeadShape,
  dragonHeadExtent,
  dragonHeadEyeSocket,
  dragonHeadHornMount,
  dragonHeadSection,
  dragonHeadSurfacePoint,
  headShapeFor,
} from './dragon-head-profile';
import {
  DEFAULT_WING_SHAPE,
  WING_ELBOW_S,
  WingMembraneShape,
  foldWingPoint,
  wingChord,
  wingFoldEase,
  wingLeadingEdge,
} from './dragon-wing-profile';
import { detailSegments, resolveRenderQuality } from './render-quality';
import {
  DragonTextureSet,
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
  dragonSpottedScaleTextures,
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
  const palette = createDragonPalette(
    part.color,
    dragonPartSeed(part.id),
    visualNumber(part, 'scalePattern', 0) >= 0.5,
  );
  const dims = part.dimensions;

  switch (profileId) {
    case 'dragon-body':
      return buildBody(part, palette);
    // Heads work in the profile's box terms; a sphere head's dimensions are
    // radii, so they are converted before anything measures the skull.
    case 'dragon-head-horned':
      return buildHornedHead(part, dragonHeadExtent(dims, part.shape), palette);
    case 'dragon-upper-jaw':
      return buildJaw(part, palette, 'upper');
    case 'dragon-lower-jaw':
      return buildJaw(part, palette, 'lower');
    case 'dragon-leg':
      return buildLeg(dims, palette);
    case 'dragon-foot':
      return buildFoot(part, palette);
    case 'dragon-claw':
      return buildTalon(dims.x, dims.y, palette);
    case 'dragon-wing-claw':
      // A folded wing closes its hand against the flank, tucking the claw
      // inside the fold — so on a resting dragon there is nothing to draw. An
      // empty group rather than null, because null falls through to the
      // primitive fallback mesh and would put a box where the claw was.
      return visualNumber(part, 'wingFold', 0) >= 0.5
        ? new THREE.Group()
        : buildTalon(dims.x, dims.y, palette);
    case 'dragon-wing':
    case 'dragon-secondary-wing':
      return buildWing(part, palette);
    case 'dragon-tail':
      return buildTailSegment(part, palette);
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
   * Whether the `S` locus expresses its dominant phenotype on this dragon.
   * Selects the rosette-patterned scale albedo. Phenotype, never genotype —
   * `SS` and `Ss` must arrive here identical.
   */
  spotted: boolean;
  /**
   * Stable 0..1 value derived from the part id. Shifts texture UVs and nudges
   * relief depth so four legs off the same builder do not read as four copies.
   */
  seed: number;
}

/**
 * Shifts a colour in HSL and returns a new one.
 *
 * `hueDegrees` wraps; `saturationScale` and `lightnessScale` multiply. Working
 * in HSL rather than by `multiplyScalar` is the whole point of this helper —
 * see {@link createDragonPalette}.
 */
function shiftHsl(
  color: THREE.Color,
  hueDegrees: number,
  saturationScale: number,
  lightnessScale: number,
): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return new THREE.Color().setHSL(
    (hsl.h + hueDegrees / 360 + 1) % 1,
    Math.min(1, hsl.s * saturationScale),
    Math.min(1, hsl.l * lightnessScale),
  );
}

/**
 * Every tone on a dragon derives from the single colour the pigment gene wrote
 * onto the part.
 *
 * The derivations are HSL rather than scalar multiplies. `scaleDeep` used to be
 * `scale.multiplyScalar(0.55)` — the identical hue at 55% brightness — and a
 * value-only shadow is most of what made these read as painted plastic rather
 * than as an animal. Shadowed skin shifts *cool* and gains saturation as it
 * darkens, and that hue rotation is what makes one flat pigment read as a form
 * with a light on it. The rotations are small (under 20°) on purpose: this has
 * to survive being the channel a student compares two dragons through, so it
 * may add depth to a hue but must not read as a different hue.
 */
function createDragonPalette(baseColor: string, seed: number, spotted = false): DragonPalette {
  const scale = new THREE.Color(baseColor);
  return {
    spotted,
    scale,
    scaleDeep: shiftHsl(scale, -18, 1.25, 0.5),
    horn: scale.clone().lerp(new THREE.Color('#e9dcc0'), 0.72),
    claw: scale.clone().lerp(new THREE.Color('#d8c9a3'), 0.6).multiplyScalar(0.88),
    tooth: new THREE.Color('#f2ead6'),
    // Backlit skin is the most saturated surface on a real wing. Lerping toward
    // white desaturated the one part that should carry the most colour, so the
    // saturation goes up rather than down. The lightness lift is small — this is
    // drawn against a white bench, and a pale translucent membrane on a white
    // background is invisible however pretty the material is.
    membrane: shiftHsl(scale, 6, 1.2, 1.08),
    seed,
  };
}

/**
 * Segment counts for this device, resolved once and cached.
 *
 * Lazy on purpose. `resolveRenderQuality` reads `navigator` and `localStorage`,
 * so resolving it at module scope would run at import time — before a test has
 * set up a DOM, and in any environment that imports this file without a window.
 * Same reasoning as the memoised texture sizes in `dragon-textures.ts`.
 *
 * The authored counts stay in the call sites as the `base` argument, because
 * they are the tuned values and `detailSegments` only ever rounds them *up*.
 */
let cachedDetail: ((base: number) => number) | null = null;

function detail(base: number): number {
  if (!cachedDetail) {
    const quality = resolveRenderQuality();
    cachedDetail = (value: number) => detailSegments(value, quality);
  }
  return cachedDetail(base);
}

/** Test seam: drops the cached tier so a spec can exercise more than one. */
export function resetDragonGeometryDetail(): void {
  cachedDetail = null;
}

/**
 * Relief depth varies a little per part, on top of the UV offset, so repeated
 * parts catch the key light differently.
 */
function reliefScale(palette: DragonPalette, base: number): THREE.Vector2 {
  const depth = base * (0.85 + palette.seed * 0.3);
  return new THREE.Vector2(depth, depth);
}

/** Scale maps for this dragon: rosetted if the `S` phenotype shows, else plain. */
function scaleSkin(palette: DragonPalette): DragonTextureSet {
  return palette.spotted ? dragonSpottedScaleTextures() : dragonScaleTextures();
}

/**
 * `roughness` and the roughness map *multiply*, so a material carrying a map
 * has to sit at 1 and let the map speak. Leaving the old scalar in place would
 * darken every roughness value by that factor and read as uniform gloss.
 */
function scaleMaterial(palette: DragonPalette, relief = 0.9): THREE.MeshStandardMaterial {
  const skin = scaleSkin(palette);
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
    // Halved from 0.35. Transmission shows what is *behind* the membrane, and
    // behind it on the specimen bench is a white background — so the more it
    // transmitted, the closer the wing came to the backdrop. It earns its keep
    // against the arena's sky and its braziers; here it is mostly a bleach.
    transmission: 0.18,
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

/**
 * Slit pupil. Near-black and barely rough, so it stays a hole in the glow
 * rather than picking up its own highlight.
 */
function pupilMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#120802',
    roughness: 0.18,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

/**
 * The catchlight.
 *
 * A single small white sphere, and out of all proportion to its size in what it
 * does: a glossy sphere with no highlight reads as a bead, and an eye with one
 * reads as wet. This is the cheapest signal of life on the whole animal.
 */
function eyeHighlightMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.7,
    roughness: 0.1,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

/**
 * A living lantern.
 *
 * The `N` locus's whole phenotype, and the reason it can be read at any size:
 * emission does not depend on the light in the scene, on which way the dragon
 * is facing, or on how many pixels it covers. A horn at thumbnail size is a
 * bump; a lit node is still a lit node.
 *
 * The hue comes from the membrane colour rather than being fixed, so a glowing
 * dragon lights up in its *own* colour and the marking never fights the animal
 * it is on. Brightened hard in HSL first: membrane colours run dark, and an
 * emissive that dim reads as a smudge instead of a light.
 */
function glowMaterial(palette: DragonPalette): THREE.MeshStandardMaterial {
  const light = shiftHsl(palette.membrane, 0, 1.45, 1.9);
  const material = new THREE.MeshStandardMaterial({
    color: light,
    emissive: light,
    emissiveIntensity: 1.35,
    roughness: 0.28,
    metalness: 0,
  });
  // Survives team tint and damage recolour, exactly as the eyes do: a light
  // that changes colour when a part is damaged stops reading as a light.
  material.userData['preserveAppearance'] = true;
  return material;
}

/**
 * One node of the row: a flattened bead that sits proud of the hide.
 *
 * Squashed along its own axis so it domes out of the surface rather than
 * hanging off it like a berry.
 */
function buildGlowNode(palette: DragonPalette, radius: number): THREE.Mesh {
  const node = mesh(new THREE.SphereGeometry(Math.max(radius, 0.01), detail(10), detail(8)), glowMaterial(palette));
  node.scale.set(0.55, 1, 1);
  // A lantern lights its surroundings; it does not take a shadow across itself.
  node.castShadow = false;
  node.receiveShadow = false;
  return node;
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
    detail(20),
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  // Mean profile radius across the torso, so scales stay the same size from
  // shoulder to hip rather than stretching over the taper.
  revolvedUv(lathe, ((dims.y + dims.z) / 4) * 0.72, length, SCALE_TILE, palette);
  group.add(mesh(lathe, scaleMaterial(palette)));

  const bellyRadii = { x: length * 0.38, y: dims.y * 0.3, z: dims.z * 0.34 };
  const bellySkin = scaleSkin(palette);
  const belly = mesh(
    sphereUv(new THREE.SphereGeometry(1, detail(12), detail(8)), bellyRadii, SCALE_TILE, palette),
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
      revolvedUv(new THREE.ConeGeometry(spikeRadius, spikeHeight, detail(6)), spikeRadius, spikeHeight, HORN_TILE, palette),
      spikeMaterial,
    );
    spike.position.set(t * length, sampleDragonBodyRadius(t) * (dims.y / 2) * 0.96, 0);
    spike.rotation.z = style.spikeLean;
    group.add(spike);
  }

  if (visualFlag(part, 'glowMarkings')) {
    addFlankLanterns(group, dims, length, palette);
  }

  return group;
}

/**
 * The bioluminescent row down both flanks.
 *
 * Placed on the widest part of the torso and rising slightly toward the
 * shoulder, which is where an animal's own light would be least occluded by its
 * legs. Each node is seated on the sampled body radius rather than at a fixed
 * offset, so it stays flush on a stocky dragon and on a lean one alike.
 */
function addFlankLanterns(
  group: THREE.Group,
  dims: { x: number; y: number; z: number },
  length: number,
  palette: DragonPalette,
): void {
  for (const side of [-1, 1] as const) {
    for (const [index, t] of spreadPositions(6, 0.72, -0.02).entries()) {
      const radius = sampleDragonBodyRadius(t);
      // Biggest at the shoulder and tapering back, the way markings on a real
      // flank follow the body rather than marching down it evenly.
      const size = dims.y * 0.062 * (1.15 - index * 0.07);
      const node = buildGlowNode(palette, size);
      node.name = `dragon-glow-flank-${index + 1}-${side < 0 ? 'left' : 'right'}`;
      node.position.set(
        t * length,
        -dims.y * 0.06 + radius * (dims.y / 2) * 0.22,
        side * radius * (dims.z / 2) * 0.94,
      );
      node.rotation.y = Math.PI / 2;
      group.add(node);
    }
  }
}

// ---------------------------------------------------------------------------
// Heads.
// ---------------------------------------------------------------------------

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
    // A length of zero means hornless, and is drawn as nothing at all: a
    // zero-height cone still leaves its base disc sitting on the skull.
    if (style.hornLength > 0) {
      const mount = dragonHeadHornMount(dims, side, shape);
      const mainHorn = buildHorn(scaleRef * style.hornLength, scaleRef * style.hornRadius, horn, palette);
      mainHorn.position.set(mount.x, mount.y, mount.z);
      mainHorn.rotation.set(side * 0.5, 0, 0.55);
      group.add(mainHorn);
    }

    if (style.browLength > 0) {
      const browMount = dragonHeadSurfacePoint(dims, -0.02, side * 0.5, shape);
      const browSpike = buildHorn(scaleRef * style.browLength, scaleRef * 0.08, horn, palette);
      browSpike.position.set(browMount.x, browMount.y, browMount.z);
      browSpike.rotation.set(side * 0.3, 0, 0.75);
      group.add(browSpike);
    }

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
      new THREE.CylinderGeometry(baseRadius * 0.45, baseRadius, length * 0.55, detail(8)),
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
      new THREE.CylinderGeometry(baseRadius * 0.04, baseRadius * 0.45, length * 0.5, detail(8)),
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
): THREE.Object3D {
  const suffix = side < 0 ? 'left' : 'right';
  const group = new THREE.Group();
  group.name = `dragon-eye-${suffix}`;

  // Was `dims.y * 0.055`, which at viewport size is a couple of pixels and
  // reads as a dot rather than an eye. An eye is where a viewer looks first for
  // signs of life, so it is worth more of the skull than that.
  const radius = dims.y * 0.085;
  const socket = dragonHeadEyeSocket(dims, side, shape);
  const centre = new THREE.Vector3(socket.x, socket.y, socket.z);

  // Outward is lateral. The socket is sunk into the skull by
  // `dragonHeadEyeSocket`, and its position is not a radius from any centre the
  // head profile exposes, so a normalised socket vector is not the surface
  // normal here the way it is on the mini dragon's spherical cranium.
  const outward = new THREE.Vector3(0, 0, side);

  const eyeball = mesh(
    new THREE.SphereGeometry(radius, detail(14), detail(12)),
    eyeMaterial(visualString(part, 'eyeColor', '#ff9f2e')),
  );
  eyeball.name = `dragon-eyeball-${suffix}`;
  eyeball.position.copy(centre);
  group.add(eyeball);

  /*
   * Vertical slit, not a round pupil — this is the one place the classic dragon
   * deliberately parts company with the mini dragon, whose round pupil is half
   * of what makes it read as a furred companion rather than a reptile.
   *
   * Built by squashing a sphere on the axial and lateral axes and leaving it
   * tall, then pushing it just proud of the eyeball so it is not z-fighting the
   * surface it sits on.
   */
  const pupil = mesh(new THREE.SphereGeometry(radius * 0.62, detail(10), detail(8)), pupilMaterial());
  pupil.name = `dragon-pupil-${suffix}`;
  pupil.scale.set(0.42, 1, 0.42);
  pupil.position.copy(centre).addScaledVector(outward, radius * 0.52);
  group.add(pupil);

  const spark = mesh(new THREE.SphereGeometry(radius * 0.22, detail(8), detail(6)), eyeHighlightMaterial());
  spark.name = `dragon-eye-highlight-${suffix}`;
  spark.position
    .copy(centre)
    .addScaledVector(outward, radius * 0.74)
    // Up and forward, where a key light above and in front of the animal would
    // actually put it.
    .add(new THREE.Vector3(radius * 0.34, radius * 0.4, 0));
  group.add(spark);

  return group;
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

  if (visualFlag(part, 'glowMarkings')) {
    // The jaw hinge and the cheek: the two places a light on the skull is
    // visible from the front, the side, and from above.
    for (const side of [-1, 1] as const) {
      for (const [index, axial] of [-0.34, -0.05].entries()) {
        const mount = dragonHeadSurfacePoint(dims, axial, side * 0.78, shape);
        const lantern = buildGlowNode(palette, dims.y * (index === 0 ? 0.13 : 0.1));
        lantern.name = `dragon-glow-head-${index + 1}-${side < 0 ? 'left' : 'right'}`;
        lantern.position.set(mount.x, mount.y, mount.z);
        group.add(lantern);
      }
    }
  }

  const sex = visualString(part, 'sex', '');
  if (sex === 'male') {
    buildMaleCrest(group, dims, palette, shape);
  } else if (sex === 'female') {
    const material = membraneMaterial(palette);
    for (const side of [-1, 1] as const) {
      const frill = mesh(
        new THREE.ConeGeometry(dims.z * 0.12, dims.y * 0.3, detail(7)),
        material,
      );
      frill.name = `dragon-female-frill-${side < 0 ? 'left' : 'right'}`;
      frill.position.set(-dims.x * 0.3, dims.y * 0.04, side * dims.z * 0.44);
      frill.rotation.set(Math.PI / 2, 0, side * 0.35);
      group.add(frill);
    }
  }
}

/**
 * The male's head crest.
 *
 * This replaced a flat `RingGeometry` disc standing up behind the skull with a
 * ring of spikes around its rim, plus a tapered box hanging under the jaw. That
 * is a frilled lizard's collar and a lizard's dewlap, and together they were the
 * single thing making the animal read as a reptile in a costume rather than as a
 * dragon — a flat disc has no thickness from any angle, and side-on it vanished
 * to a line with spikes floating off it.
 *
 * What replaces it is a **swept-back crest**: a fan of horn spines rising from
 * the back of the skull and raked backwards, with membrane webbed between each
 * neighbouring pair. It is the same silhouette language as the dorsal ridge and
 * the wing — spines carrying a membrane — so the head now belongs to the rest of
 * the animal instead of being borrowed from another one.
 *
 * The web is built as explicit triangles rather than a ring segment because the
 * gap between two spines is a triangle, not an annulus, and filling it with an
 * annulus is what forced the flat disc in the first place.
 */
function buildMaleCrest(
  group: THREE.Group,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): void {
  const rearSection = dragonHeadSection(dims, -0.28, shape);
  const spineMaterial = hornMaterial(palette);
  const webMaterial = membraneMaterial(palette);

  const SPINE_COUNT = 7;
  const baseX = -dims.x * 0.3;
  const rootRadius = Math.max(rearSection.halfHeight, rearSection.halfWidth) * 0.78;

  /**
   * Spine tips, fanned across the back of the skull from one side to the other.
   *
   * The centre spine is the longest and they shorten toward the ears, which is
   * what gives the crest a peak instead of a rim. All of them rake backwards in
   * -x, so the crest reads as swept even from directly ahead.
   */
  const tips: THREE.Vector3[] = [];
  const roots: THREE.Vector3[] = [];

  for (let index = 0; index < SPINE_COUNT; index += 1) {
    // -1 at the left ear, 0 over the crown, +1 at the right ear.
    const across = (index / (SPINE_COUNT - 1)) * 2 - 1;
    // Cosine falloff: a smooth peak rather than a triangular gable.
    const height = dims.y * (0.34 + 0.5 * Math.cos(across * Math.PI * 0.5));
    const angle = across * Math.PI * 0.42;

    const root = new THREE.Vector3(
      baseX,
      rearSection.centerY + Math.cos(angle) * rootRadius * 0.62,
      Math.sin(angle) * rootRadius * 0.92,
    );
    const tip = new THREE.Vector3(
      // Raked back, and the outer spines rake hardest.
      baseX - height * (0.52 + 0.3 * Math.abs(across)),
      root.y + Math.cos(angle) * height * 0.92,
      root.z + Math.sin(angle) * height * 0.34,
    );

    roots.push(root);
    tips.push(tip);

    const length = root.distanceTo(tip);
    const radius = dims.z * (0.055 - 0.018 * Math.abs(across));
    const spine = mesh(
      revolvedUv(
        new THREE.ConeGeometry(radius, length, detail(7)),
        radius,
        length,
        HORN_TILE,
        palette,
      ),
      spineMaterial,
    );
    spine.name = `dragon-male-crest-spine-${index + 1}`;
    spine.position.copy(root).lerp(tip, 0.5);
    spine.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      tip.clone().sub(root).normalize(),
    );
    group.add(spine);
  }

  // Webbing: one quad per gap, split into two triangles, spanning root-to-root
  // and tip-to-tip. Double-sided via the membrane material, so it reads from
  // either side without a second surface.
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index < SPINE_COUNT - 1; index += 1) {
    const base = index * 4;
    for (const point of [roots[index], tips[index], roots[index + 1], tips[index + 1]]) {
      positions.push(point.x, point.y, point.z);
    }
    // Span across the crest, height up it — so the membrane's thin trailing
    // edge lands at the top of the web where a real one is thinnest.
    uvs.push(0, 0, 0, 1, 1, 0, 1, 1);
    indices.push(base, base + 1, base + 3, base, base + 3, base + 2);
  }

  const web = new THREE.BufferGeometry();
  web.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  web.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  web.setIndex(indices);
  web.computeVertexNormals();

  const webMesh = mesh(web, webMaterial);
  webMesh.name = 'dragon-male-crest-web';
  group.add(webMesh);

  /*
   * Jaw spines, where the hanging dewlap used to be.
   *
   * A dewlap is a pelican's throat pouch and reads as slack; a short row of
   * backswept horns along the jawline reads as armour. Same gene, same place on
   * the skull, opposite impression.
   */
  const JAW_SPINE_COUNT = 3;
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < JAW_SPINE_COUNT; index += 1) {
      const fraction = index / JAW_SPINE_COUNT;
      const length = dims.y * (0.2 - fraction * 0.05);
      const radius = dims.z * 0.03;
      const spine = mesh(
        revolvedUv(
          new THREE.ConeGeometry(radius, length, detail(6)),
          radius,
          length,
          HORN_TILE,
          palette,
        ),
        spineMaterial,
      );
      spine.name = `dragon-male-jaw-spine-${side < 0 ? 'left' : 'right'}-${index + 1}`;
      spine.position.set(
        -dims.x * (0.06 + fraction * 0.2),
        -dims.y * 0.3,
        side * dims.z * 0.3,
      );
      // Back, down, and outward from the jawline.
      spine.rotation.set(side * 0.5, 0, Math.PI * 0.62);
      group.add(spine);
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

function visualFlag(part: AssemblyPart, key: string): boolean {
  return part.visualProfile?.parameters?.[key] === true;
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

/** Length of jaw the tooth row covers, as a fraction of jaw length. */
const TOOTH_ROW_SPAN = 0.6;

/**
 * How far the jaw box narrows by its front face. Shared with the placement
 * maths below, not just handed to the geometry: anything sitting on the snout
 * has to follow the same taper or it floats.
 */
const JAW_FRONT_SCALE_Y = 0.55;
const JAW_FRONT_SCALE_Z = 0.5;

/**
 * Nostril placement, as fractions of jaw length and depth. Shared, not
 * duplicated: the fangs sit directly beneath the nostrils, so the two have to
 * move together.
 */
const NOSTRIL_ALONG = 0.38;
const NOSTRIL_LATERAL = 0.25;

/** Fangs run this much longer than the teeth in the same jaw. */
const FANG_LENGTH_RATIO = 1.5;

/**
 * Tooth positions along the jaw, front-most first, as fractions of jaw length.
 *
 * The row is anchored at its *front* rather than its centre, so `toothStart`
 * means the same thing at every count: a lone fang sits exactly where the
 * slider says, and adding teeth extends the row backwards instead of shifting
 * the one already placed.
 */
function toothRow(count: number, start: number): number[] {
  const total = Math.max(0, Math.round(count));
  if (total <= 1) return total === 1 ? [start] : [];
  const step = TOOTH_ROW_SPAN / (total - 1);
  return Array.from({ length: total }, (_, index) => start - index * step);
}

function buildJaw(
  part: AssemblyPart,
  palette: DragonPalette,
  variant: 'upper' | 'lower',
): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const pointDown = variant === 'upper';

  group.add(mesh(
    boxUv(
      createTaperedBoxGeometry(dims.x, dims.y, dims.z, JAW_FRONT_SCALE_Y, JAW_FRONT_SCALE_Z),
      SCALE_TILE,
      palette,
    ),
    scaleMaterial(palette),
  ));

  /**
   * Height of the tapered top face at a station along the jaw. The box narrows
   * only ahead of its middle, and `createTaperedBoxGeometry` blends over the
   * front half, so this mirrors that ramp exactly.
   */
  function topSurfaceY(along: number): number {
    const blend = Math.min(1, Math.max(0, along * 2));
    return dims.y * 0.5 * (1 - blend * (1 - JAW_FRONT_SCALE_Y));
  }

  // The fangs hang from these same stations, so both read one value.
  const nostrilRadius = Math.max(dims.y * 0.15, dims.z * 0.045);
  const nostrilLateralZ = dims.z * NOSTRIL_LATERAL - nostrilRadius;

  if (variant === 'upper') {
    // Nostrils stay smooth: scale relief on a 2cm sphere just reads as noise.
    const nostrilMaterial = new THREE.MeshStandardMaterial({ color: palette.scaleDeep, roughness: 0.7 });
    for (const side of [-1, 1]) {
      const nostril = mesh(new THREE.SphereGeometry(nostrilRadius, detail(10), detail(7)), nostrilMaterial);
      nostril.name = `dragon-nostril-${side < 0 ? 'left' : 'right'}`;
      nostril.scale.set(1.25, 0.45, 1);
      // Half a nostril's thickness in from the old line, and sunk to the
      // *tapered* top rather than the height of the flat rear section — the
      // snout has already dropped by this far forward, so the old fixed height
      // left them hanging above the surface.
      nostril.position.set(dims.x * NOSTRIL_ALONG, topSurfaceY(NOSTRIL_ALONG), side * nostrilLateralZ);
      group.add(nostril);
    }
  }

  const defaults = getActiveDragonStyle().jaw;
  const style: DragonJawStyle = {
    toothCount: visualNumber(part, 'toothCount', defaults.toothCount),
    toothHeight: visualNumber(part, 'toothHeight', defaults.toothHeight),
    toothRadius: visualNumber(part, 'toothRadius', defaults.toothRadius),
    toothStart: visualNumber(part, 'toothStart', defaults.toothStart),
  };
  const fangScale = visualNumber(part, 'fangScale', 1);
  const enamel = toothMaterial(palette);
  const toothHeight = dims.y * style.toothHeight * fangScale;
  // Teeth march back from the snout tip; the range matches the jaw's taper.
  const toothRadius = dims.z * style.toothRadius;
  /**
   * Every tooth is rooted on the jaw's mid-height and grows out from there —
   * fixed, not tunable. Hanging them off the bottom face made a long tooth read
   * as stuck on rather than set into the jaw, and the root drifted whenever the
   * jaw was rescaled. A cone is centred on its own position, so the mesh sits
   * half its length past the midline.
   */
  function rootedAtMidline(height: number): number {
    return (pointDown ? -1 : 1) * height * 0.5;
  }

  for (const along of toothRow(style.toothCount, style.toothStart)) {
    for (const side of [-1, 1]) {
      const tooth = mesh(
        revolvedUv(
          new THREE.ConeGeometry(toothRadius, toothHeight, detail(5)),
          toothRadius,
          toothHeight,
          KERATIN_TILE,
          palette,
        ),
        enamel,
      );
      tooth.position.set(
        along * dims.x,
        rootedAtMidline(toothHeight),
        side * dims.z * 0.32 * (1 - Math.max(0, along) * 0.4),
      );
      if (pointDown) tooth.rotation.x = Math.PI;
      group.add(tooth);
    }
  }

  if (variant === 'upper') {
    // Fangs hang under the nostrils. They are pulled further in than the tooth
    // row so they stay inside the snout, which is tapered to 0.5 depth at the
    // tip: a fang on the tooth line would break the surface here.
    const fangHeight = toothHeight * FANG_LENGTH_RATIO;
    for (const side of [-1, 1]) {
      const fang = mesh(
        revolvedUv(
          new THREE.ConeGeometry(toothRadius, fangHeight, detail(5)),
          toothRadius,
          fangHeight,
          KERATIN_TILE,
          palette,
        ),
        enamel,
      );
      fang.name = `dragon-fang-${side < 0 ? 'left' : 'right'}`;
      fang.position.set(dims.x * NOSTRIL_ALONG, rootedAtMidline(fangHeight), side * nostrilLateralZ);
      fang.rotation.x = Math.PI;
      group.add(fang);
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
    detail(16),
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
        new THREE.ConeGeometry(talonRadius, talonLength, detail(6)),
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
/**
 * How far a talon's blunt end sits behind its own origin, as a fraction of its
 * length: the base cylinder is centred at -0.22 and is 0.55 long, so it reaches
 * 0.495 back. Anything mounting a talon by its root needs this.
 */
const TALON_BLUNT_END = 0.495;

function buildTalon(radius: number, length: number, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const keratin = clawMaterial(palette);

  const base = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.85, length * 0.55, detail(8)),
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
      new THREE.CylinderGeometry(radius * 0.02, radius * 0.5, length * 0.5, detail(8)),
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
  /**
   * Position of the front-most tooth along the jaw, as a fraction of jaw length
   * measured from the jaw's centre. `+x` is the snout tip, so `0.5` sits the
   * front tooth on the very end and negative values start the row behind the
   * midpoint. The rest of the row marches back from here over
   * {@link TOOTH_ROW_SPAN}.
   */
  toothStart: number;
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
  // The row starts behind the fang station (`NOSTRIL_ALONG`): at 0.38 the front
  // tooth grew out of the same spot as the fang and disappeared inside it.
  jaw: { toothCount: 4, toothHeight: 1.15, toothRadius: 0.1, toothStart: 0.28 },
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

/**
 * Spanwise/chordwise tessellation of the membrane grid, as authored.
 * `buildWingMembraneGeometry` shadows these with the device-tiered counts.
 */
const BASE_WING_SPAN_SEGMENTS = 26;
const BASE_WING_CHORD_SEGMENTS = 8;

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

  /*
   * Folding.
   *
   * A wing at rest is not a spread wing rotated — it is a wing bent at the
   * wrist, with the membrane gathered between the fingers like a closed fan.
   * Rotating the spread part rigidly (which is what the resting stance used to
   * do on its own) leaves a fully extended wing pointing backwards, and no
   * amount of angle fixes that.
   *
   * This is geometry rather than a new part on purpose. An articulated fold
   * would need a forearm part, which means a catalog entry, a physics collider,
   * authored sockets, a joint, a regenerated model pack, and the hardcoded part
   * counts in `classic-dragon-test.spec.ts` — all to express something the
   * builder can already describe, because every point in here is a function of
   * the span fraction `s`.
   *
   * 0 is the flight pose and stays the default, so the arena is untouched.
   */
  const fold = Math.max(0, Math.min(1, visualNumber(part, 'wingFold', 0)));
  const ELBOW_S = WING_ELBOW_S;
  const outboard = wingFoldEase;

  // Trailing edge scallops inward between the fingers, pulling toward the
  // leading edge (larger x) where nothing holds the membrane out. Folding
  // gathers it further: the fingers close, so the membrane between them has
  // nowhere to be.
  const trailingAt = (s: number): number => {
    const spread = flatTrailingAt(s) + chord * form.scallop * betweenFingers(s);
    const gather = fold * 0.62 * outboard(s);
    return leadingAt(s) + (spread - leadingAt(s)) * (1 - gather);
  };

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

  /*
   * Swings everything outboard of the wrist back toward the tail.
   *
   * A rotation about the vertical through the wrist. The outboard direction is
   * -z, and this formula turns -z toward -x, so the hand ends up trailing along
   * the flank; past 90 degrees it continues inboard and tucks against the body.
   *
   * Applied as a single post-transform to every point the builder emits, which
   * is what keeps the membrane, the arm bone and the finger struts folding as
   * one piece instead of drifting apart.
   */
  const elbowX = leadingAt(ELBOW_S);
  const elbowZ = zOf(ELBOW_S);

  const foldPoint = (point: THREE.Vector3, s: number): THREE.Vector3 => {
    const folded = foldWingPoint(point, s, fold, elbowX, elbowZ);
    return point.set(folded.x, folded.y, folded.z);
  };

  group.add(mesh(
    buildWingMembraneGeometry(leadingAt, trailingAt, zOf, membraneY, foldPoint),
    membraneMaterial(palette),
  ));

  const bone = hornMaterial(palette, THREE.DoubleSide);

  // Extra samples outboard of the wrist so the arm bends around the fold as a
  // curve instead of cutting the corner with one long straight segment.
  const armCurve = new THREE.CatmullRomCurve3(
    ([0.02, ELBOW_S, 0.62, 0.8, 0.98] as const).map(s =>
      foldPoint(
        new THREE.Vector3(
          leadingAt(s) + (s === ELBOW_S ? 0.01 : -0.015),
          thickness * (s < ELBOW_S ? 0.1 : s === ELBOW_S ? 0.5 : 0.2) + membraneY(s, 0),
          zOf(s),
        ),
        s,
      ),
    ),
  );
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
    leadingAt(ELBOW_S),
    thickness * 0.3 + membraneY(ELBOW_S, 0),
    zOf(ELBOW_S),
  );
  // Folded through the same transform as the membrane they hold out, so the
  // fingers close with it rather than staying splayed across a gathered sheet.
  const fingerTargets = [...fingerStops, 0.99].map(stop =>
    foldPoint(new THREE.Vector3(trailingAt(stop), membraneY(stop, 1), zOf(stop)), stop),
  );
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
  /** Post-transform applied to every vertex; the resting fold rides on this. */
  transform: (point: THREE.Vector3, s: number) => THREE.Vector3,
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
      const point = transform(
        new THREE.Vector3(leading + (trailing - leading) * c, membraneY(s, c), z),
        s,
      );
      positions.push(point.x, point.y, point.z);
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

function buildTailSegment(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const lathe = new THREE.LatheGeometry(
    TAIL_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    detail(14),
  );
  revolvedUv(lathe, dims.x * 0.76, dims.y, SCALE_TILE, palette);
  group.add(mesh(lathe, scaleMaterial(palette)));

  // One lantern per side per segment. Across a whole tail that is a line of
  // lights trailing the animal, and it is the part of the glow a student sees
  // most in the arena, where the tail swings out past the body.
  if (visualFlag(part, 'glowMarkings')) {
    for (const side of [-1, 1] as const) {
      const node = buildGlowNode(palette, dims.x * 0.3);
      node.name = `dragon-glow-tail-${side < 0 ? 'left' : 'right'}`;
      node.position.set(0, dims.y * 0.1, side * dims.x * 0.62);
      node.rotation.y = Math.PI / 2;
      group.add(node);
    }
  }

  return group;
}

function buildTailClub(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;

  const shaft = new THREE.LatheGeometry(
    [[-0.36, 0.34], [0, 0.6], [0.5, 1.0]].map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    detail(14),
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
  const knobCentre = new THREE.Vector3(0, knob.position.y, 0);
  const coneAxis = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < spikeCount; index += 1) {
    const angle = (index / spikeCount) * Math.PI * 2;
    const spike = mesh(
      revolvedUv(new THREE.ConeGeometry(spikeRadius, spikeLength, detail(6)), spikeRadius, spikeLength, HORN_TILE, palette),
      spikeMaterial,
    );
    // The ring the spikes grow from: a circle around the knob, rolled off-axis
    // so they fan rather than sit in one flat band.
    const root = new THREE.Vector3(
      Math.cos(angle) * dims.z * 0.62,
      knobCentre.y - Math.sin(angle) * dims.z * 0.2,
      Math.sin(angle) * dims.z * 0.62,
    );
    // Each spike points straight out of the knob and is anchored by its root.
    // Both halves of that matter: a cone is centred on its own position, so the
    // ring used to bisect every spike and swallow the inner half, and the old
    // fixed rotation was not radial — past a quarter turn it aimed spikes down
    // and back into the knob, where pushing them out would have buried them
    // completely.
    const outward = root.clone().sub(knobCentre).normalize();
    spike.quaternion.setFromUnitVectors(coneAxis, outward);
    spike.position.copy(root).addScaledVector(outward, spikeLength * 0.5);
    group.add(spike);
  }

  // The brightest node on the animal, on the one part that swings out past the
  // whole silhouette. A tail sweep from a glowing dragon draws its own arc.
  if (visualFlag(part, 'glowMarkings')) {
    const beacon = buildGlowNode(palette, dims.z * 0.42);
    beacon.name = 'dragon-glow-tail-beacon';
    beacon.position.set(0, knobCentre.y - dims.z * 0.55, 0);
    beacon.scale.set(1, 0.72, 1);
    group.add(beacon);
  }

  return group;
}

function buildStinger(radius: number, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();

  const knuckleRadius = radius * 0.72;
  const knuckle = mesh(
    sphereUv(
      new THREE.SphereGeometry(knuckleRadius, detail(12), detail(8)),
      { x: knuckleRadius, y: knuckleRadius, z: knuckleRadius },
      SCALE_TILE,
      palette,
    ),
    scaleMaterial(palette),
  );
  knuckle.position.y = radius * 0.18;
  group.add(knuckle);

  const bladeLength = radius * 2.1;
  const blade = buildTalon(radius * 0.5, bladeLength, palette);
  blade.rotation.z = Math.PI;
  // Anchored by its blunt end at the knuckle's core and driven the other way,
  // out of the free end of the tail. Hung from its middle, as it was, the blunt
  // end broke back out through the top of the knuckle — a flat slab of keratin
  // sitting where the stinger joins the tail.
  blade.position.y = knuckle.position.y - TALON_BLUNT_END * bladeLength;
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
