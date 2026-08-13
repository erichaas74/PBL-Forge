import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';

/**
 * Procedural anatomy for the domesticated mini dragon.
 *
 * A separate animal from the classic dragon, not a scaled-down one: it shares no
 * builder, no silhouette module, no palette, and no texture with
 * `dragon-procedural-mesh.factory.ts`. Where that animal is a scaled reptile with
 * membranes and talons, this one is a small furred quadruped — a thick coat built
 * from geometry rather than a scale texture, soft paws instead of talons, and
 * wings that some genotypes lose entirely.
 *
 * Everything is sized from `part.dimensions`, so the genetics pipeline can
 * rescale a specimen without any measurement drifting out of proportion, and
 * every tunable reads a `mini*` parameter key so the two animals' silent
 * `visualProfile.parameters` contracts can never collide.
 */

export const MINI_DRAGON_PROFILE_IDS = [
  'mini-dragon-body',
  'mini-dragon-head',
  'mini-dragon-leg',
  'mini-dragon-wing',
  'mini-dragon-tail',
  'mini-dragon-tail-plume',
] as const;

export type MiniDragonProfileId = (typeof MINI_DRAGON_PROFILE_IDS)[number];

export function isMiniDragonProfileId(value: string): value is MiniDragonProfileId {
  return (MINI_DRAGON_PROFILE_IDS as readonly string[]).includes(value);
}

export function createMiniDragonProceduralObject(part: AssemblyPart): THREE.Object3D | null {
  const profileId = part.visualProfile?.profileId ?? '';
  if (!isMiniDragonProfileId(profileId)) return null;
  const palette = createMiniDragonPalette(part);

  switch (profileId) {
    case 'mini-dragon-body':
      return buildMiniBody(part, palette);
    case 'mini-dragon-head':
      return buildMiniHead(part, palette);
    case 'mini-dragon-leg':
      return buildMiniLeg(part, palette);
    case 'mini-dragon-wing':
      return buildMiniWing(part, palette);
    case 'mini-dragon-tail':
      return buildMiniTail(part, palette);
    case 'mini-dragon-tail-plume':
      return buildMiniTailPlume(part, palette);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Palette and materials.
//
// No texture maps anywhere. A tiled scale map is the single thing that most
// makes the classic dragon read as a reptile, so the mini dragon carries none:
// its surface is matte, and the coat is geometry.
// ---------------------------------------------------------------------------

interface MiniDragonPalette {
  coat: THREE.Color;
  coatDeep: THREE.Color;
  /** Second coat colour. Equal to `coat` unless the specimen is two-toned. */
  patch: THREE.Color;
  horn: THREE.Color;
  paw: THREE.Color;
  ember: string;
  /** Stable 0..1 from the part id, so repeated limbs are not exact copies. */
  seed: number;
}

function createMiniDragonPalette(part: AssemblyPart): MiniDragonPalette {
  const coat = new THREE.Color(part.color);
  const patch = new THREE.Color(visualString(part, 'miniPatchColor', part.color));
  return {
    coat,
    coatDeep: coat.clone().multiplyScalar(0.62),
    patch,
    horn: coat.clone().lerp(new THREE.Color('#efe2c4'), 0.78),
    paw: coat.clone().lerp(new THREE.Color('#f0b9c4'), 0.66),
    ember: visualString(part, 'miniEmberColor', '#ffb45e'),
    seed: partSeed(part.id),
  };
}

/** Soft, unlit-looking coat. High roughness and no map is what reads as fur. */
function coatMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0 });
}

function hornMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.horn, roughness: 0.52, metalness: 0.04 });
}

function pawMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: palette.paw, roughness: 0.78, metalness: 0 });
}

/**
 * Eyes and throat glow. The ember gene is the only locus that reaches this
 * material, which is why an ember colour is worth a whole channel: it is the one
 * trait a student can read on a specimen at thumbnail size in a dark room.
 */
function emberMaterial(palette: MiniDragonPalette, intensity = 1.2): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#2a1508',
    emissive: new THREE.Color(palette.ember),
    emissiveIntensity: intensity,
    roughness: 0.22,
    metalness: 0,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}

function wingSkinMaterial(palette: MiniDragonPalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: palette.coat.clone().lerp(new THREE.Color('#ffffff'), 0.18),
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

// ---------------------------------------------------------------------------
// Coat.
//
// Fur is built, not painted. A tuft is one tapered spike; rings of them along
// the spine, throat, cheeks, haunches, and tail are what carry the coat gene.
// `miniCoatDepth` runs 0 (sleek, tufts almost absent) to 1 (fluffy).
// ---------------------------------------------------------------------------

const TUFT_RADIAL_SEGMENTS = 5;

/**
 * One clump of coat.
 *
 * A truncated cone, not a cone. The first version used cones and the animal came
 * back a porcupine: a sharp point reads as a spine however short you make it,
 * and the eye needs a blunt tip to see fur. Keeping ~45% of the radius at the
 * top is the whole difference between a coat and a defensive weapon.
 */
function tuftMesh(radius: number, length: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius * 0.45, radius, length, TUFT_RADIAL_SEGMENTS);
  // Shift so the base sits at the origin and a tuft can be placed by its root.
  geometry.translate(0, length / 2, 0);
  return mesh(geometry, material);
}

interface TuftRingOptions {
  /** Where along the local X axis the ring sits. */
  x: number;
  /** Distance from the X axis to the skin at this station. */
  radiusY: number;
  radiusZ: number;
  count: number;
  length: number;
  thickness: number;
  /** Radians around the axis: 0 is straight down, PI is the spine. */
  fromAngle: number;
  toAngle: number;
  /** Extra backward lean, radians. Fur lies along the animal, it does not bristle. */
  sweep: number;
  seed: number;
  /**
   * Second coat colour for a two-toned animal. Supplied, roughly half the ring
   * takes it in contiguous blocks — a codominant coat is patchy *fur*, and
   * painting the skin underneath leaves the trait invisible on a fluffy dragon.
   */
  patchMaterial?: THREE.Material;
}

/**
 * Places one arc of tufts around the body axis. Each tuft is rooted on the skin
 * and points outward along the surface normal, then leans back by `sweep`.
 */
function addTuftRing(
  group: THREE.Group,
  material: THREE.Material,
  options: TuftRingOptions,
): void {
  // A tuft barely longer than it is wide is a bump, not fur. Sleek coats fall
  // through here and leave the animal smooth rather than pebbled.
  if (options.count < 1 || options.length <= options.thickness * 1.15) return;
  const span = options.toAngle - options.fromAngle;

  for (let index = 0; index < options.count; index += 1) {
    const step = options.count === 1 ? 0.5 : index / (options.count - 1);
    const jitter = hashUnit(`${options.seed}:${options.x}:${index}`);
    const drift = hashUnit(`${options.seed}:${options.x}:${index}:drift`);
    /*
     * Evenly spaced tufts of equal length tile like roof shingles. Scattering
     * the angle, the length, the axial station, and the lean is the whole
     * difference between a coat and a set of overlapping plates.
     */
    const angle = options.fromAngle + span * step + (drift - 0.5) * (span / options.count) * 0.9;
    const length = options.length * (0.62 + jitter * 0.8);
    // Bucketed by station and angle so neighbours agree: the patch reads as a
    // blotch of another colour rather than as pepper.
    const patched =
      options.patchMaterial &&
      hashUnit(`${Math.round(options.x * 7)}:${Math.round(angle * 2.1)}`) > 0.5;

    const tuft = tuftMesh(
      options.thickness * (0.78 + drift * 0.5),
      length,
      patched && options.patchMaterial ? options.patchMaterial : material,
    );
    tuft.position.set(
      options.x + (jitter - 0.5) * options.thickness * 2.2,
      -Math.cos(angle) * options.radiusY,
      Math.sin(angle) * options.radiusZ,
    );
    // Point the tuft's local +Y along the outward normal, then lean it back.
    const normal = new THREE.Vector3(0, -Math.cos(angle), Math.sin(angle)).normalize();
    tuft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    tuft.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), options.sweep * (0.7 + jitter * 0.6));
    tuft.rotateOnAxis(new THREE.Vector3(0, 1, 0), (drift - 0.5) * 1.4);
    group.add(tuft);
  }
}

/** Fan of tufts radiating in a plane — ear tips, cheeks, and the tail plume. */
function addTuftFan(
  group: THREE.Group,
  material: THREE.Material,
  options: {
    origin: Vector3Data;
    count: number;
    length: number;
    thickness: number;
    /** Direction the fan points, before spreading. */
    direction: THREE.Vector3;
    spread: number;
    seed: number;
  },
): void {
  if (options.count < 1 || options.length <= 0.001) return;
  const direction = options.direction.clone().normalize();

  for (let index = 0; index < options.count; index += 1) {
    const step = options.count === 1 ? 0 : index / (options.count - 1) - 0.5;
    const jitter = hashUnit(`${options.seed}:fan:${index}`);
    const tuft = tuftMesh(options.thickness, options.length * (0.68 + jitter * 0.6), material);
    tuft.position.set(options.origin.x, options.origin.y, options.origin.z);
    tuft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    // Spread within the fan plane, then a little out of it so it reads as volume.
    tuft.rotateOnAxis(new THREE.Vector3(0, 0, 1), step * options.spread);
    tuft.rotateOnAxis(new THREE.Vector3(1, 0, 0), (jitter - 0.5) * options.spread * 0.7);
    group.add(tuft);
  }
}

// ---------------------------------------------------------------------------
// Body: a short round barrel with a neck ruff.
// ---------------------------------------------------------------------------

/** `[fraction along the spine, radius as a fraction of the half extents]`. */
const MINI_BODY_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.34],
  [-0.38, 0.62],
  [-0.2, 0.88],
  [0, 1.0],
  [0.18, 0.98],
  [0.34, 0.86],
  [0.46, 0.66],
  [0.5, 0.5],
];

export function sampleMiniBodyRadius(axialFraction: number): number {
  return sampleProfile(MINI_BODY_PROFILE, axialFraction);
}

/** A point on the torso surface in body-local space. Angle 0 is the belly. */
export function miniBodySurfacePoint(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
): Vector3Data {
  const radius = sampleMiniBodyRadius(axialFraction);
  return {
    x: axialFraction * dimensions.x,
    y: (-Math.cos(angle) * radius * dimensions.y) / 2,
    z: (Math.sin(angle) * radius * dimensions.z) / 2,
  };
}

function buildMiniBody(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coatDepth = visualNumber(part, 'miniCoatDepth', 0.5);
  const coat = coatMaterial(palette.coat);
  const twoToned = !palette.patch.equals(palette.coat);
  const patchCoat = twoToned ? coatMaterial(palette.patch) : undefined;
  // Fur thins as well as shortens on a sleek coat; a fixed thickness leaves a
  // sleek animal covered in stubby pebbles.
  const tuftWidth = 0.045 + coatDepth * 0.075;

  const barrel = new THREE.LatheGeometry(
    MINI_BODY_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * dims.x)),
    22,
  );
  barrel.rotateZ(-Math.PI / 2);
  barrel.scale(1, dims.y / 2, dims.z / 2);
  const torso = mesh(barrel, coat);
  torso.name = 'mini-dragon-torso';
  group.add(torso);

  /*
   * Two-tone coat. A codominant specimen carries both alleles' colours at once,
   * so the second colour has to appear as its own area on the animal rather than
   * as a blend — a blended midpoint would be indistinguishable from a third
   * allele, which is exactly the confusion this locus exists to break.
   *
   * Blotches on the hide carry it for a sleek dragon; the tuft rings below carry
   * it for a fluffy one, whose hide is not visible at all.
   */
  if (patchCoat) {
    const patches: readonly (readonly [number, number, number])[] = [
      [-0.2, 1.45, 0.8],
      [0.1, 2.0, 0.95],
      [0.3, 1.0, 0.66],
    ];
    for (const [axial, angle, size] of patches) {
      for (const side of [-1, 1] as const) {
        const point = miniBodySurfacePoint(dims, axial, angle * side);
        const blob = mesh(new THREE.SphereGeometry(dims.y * 0.2 * size, 10, 8), patchCoat);
        blob.name = 'mini-dragon-coat-patch';
        blob.position.set(point.x, point.y, point.z);
        // Sink the blob so only the cap shows, reading as a patch of coat rather
        // than a ball stuck to the flank.
        blob.position.multiplyScalar(0.88);
        blob.scale.set(1.35, 0.85, 0.85);
        group.add(blob);
      }
    }
  }

  /*
   * Dorsal coat. Short, fat, densely packed, and laid almost flat along the
   * back — fur, not a crest. Length is capped well under a fifth of the body
   * height for the same reason: anything longer stands off the silhouette and
   * the animal stops reading as something you would pick up.
   */
  const spineStations = [-0.34, -0.2, -0.06, 0.08, 0.22];
  for (const axial of spineStations) {
    const radius = sampleMiniBodyRadius(axial);
    addTuftRing(group, coat, {
      x: axial * dims.x,
      radiusY: (radius * dims.y) / 2,
      radiusZ: (radius * dims.z) / 2,
      count: 9,
      length: dims.y * (0.04 + coatDepth * 0.15),
      thickness: dims.y * tuftWidth,
      fromAngle: Math.PI * 0.5,
      toAngle: Math.PI * 1.5,
      sweep: -1.05,
      seed: palette.seed + axial,
      patchMaterial: patchCoat,
    });
  }

  /*
   * The neck ruff, and the reason a fluffy specimen reads as fluffy at thumbnail
   * size: one dense collar at the shoulders, fanning all the way round rather
   * than only over the spine.
   */
  const ruffRadius = sampleMiniBodyRadius(0.34);
  addTuftRing(group, coat, {
    x: dims.x * 0.34,
    radiusY: (ruffRadius * dims.y) / 2,
    radiusZ: (ruffRadius * dims.z) / 2,
    count: 20,
    length: dims.y * (0.07 + coatDepth * 0.28),
    thickness: dims.y * (tuftWidth * 1.25),
    fromAngle: -Math.PI * 0.92,
    toAngle: Math.PI * 0.92,
    sweep: 0.75,
    seed: palette.seed + 7,
    patchMaterial: patchCoat,
  });

  // Haunch feathering at the hips.
  const haunchRadius = sampleMiniBodyRadius(-0.3);
  addTuftRing(group, coat, {
    x: -dims.x * 0.3,
    radiusY: (haunchRadius * dims.y) / 2,
    radiusZ: (haunchRadius * dims.z) / 2,
    count: 13,
    length: dims.y * (0.05 + coatDepth * 0.2),
    thickness: dims.y * (tuftWidth * 1.1),
    fromAngle: Math.PI * 0.2,
    toAngle: Math.PI * 1.8,
    sweep: -1.15,
    seed: palette.seed + 13,
    patchMaterial: patchCoat,
  });

  // Throat glow, tucked under the ruff.
  const throat = mesh(new THREE.SphereGeometry(dims.y * 0.11, 10, 8), emberMaterial(palette, 0.7));
  throat.name = 'mini-dragon-throat-ember';
  const throatPoint = miniBodySurfacePoint(dims, 0.3, 0.25);
  throat.position.set(throatPoint.x, throatPoint.y * 0.94, throatPoint.z);
  group.add(throat);

  return group;
}

// ---------------------------------------------------------------------------
// Head: oversized round skull, huge eyes, stub snout, tufted ears, curling horns.
// ---------------------------------------------------------------------------

function buildMiniHead(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coatDepth = visualNumber(part, 'miniCoatDepth', 0.5);
  const eyeSize = visualNumber(part, 'miniEyeSize', 0.62);
  const snoutLength = visualNumber(part, 'miniSnoutLength', 0.34);
  const hornCurl = visualNumber(part, 'miniHornCurl', 0);
  const hornLength = visualNumber(part, 'miniHornLength', 0.62);
  const earTuft = visualNumber(part, 'miniEarTuft', 0.6);
  const coat = coatMaterial(palette.coat);

  // Cranium: wider than long, which is most of what makes it read as young.
  const skullRadius = dims.y * 0.5;
  const skullScale = new THREE.Vector3(
    (dims.x / dims.y) * 0.92,
    1,
    (dims.z / dims.y) * 1.02,
  );
  const skull = mesh(new THREE.SphereGeometry(skullRadius, 20, 16), coat);
  skull.name = 'mini-dragon-cranium';
  skull.scale.copy(skullScale);
  group.add(skull);

  /**
   * A point on the cranium, so features sit *on* the skull rather than inside
   * it. Placing eyes by raw part fractions buried them in the head — a sphere
   * scaled on three axes has no single radius to guess at.
   */
  const skullPoint = (
    direction: THREE.Vector3,
    lift = 1,
  ): THREE.Vector3 => {
    const unit = direction.clone().normalize();
    return new THREE.Vector3(
      unit.x * skullRadius * skullScale.x * lift,
      unit.y * skullRadius * skullScale.y * lift,
      unit.z * skullRadius * skullScale.z * lift,
    );
  };

  // Snout: short, blunt, and set low so the forehead stays big.
  const snoutRoot = skullPoint(new THREE.Vector3(1, -0.34, 0), 0.8);
  const snout = mesh(new THREE.SphereGeometry(dims.y * 0.21, 14, 12), coat);
  snout.name = 'mini-dragon-snout';
  snout.scale.set(0.85 + snoutLength * 1.1, 0.78, 0.86);
  snout.position.set(snoutRoot.x + dims.x * 0.1, snoutRoot.y - dims.y * 0.02, 0);
  group.add(snout);

  const nostrilMaterial = coatMaterial(palette.coatDeep);
  for (const side of [-1, 1] as const) {
    const nostril = mesh(new THREE.SphereGeometry(dims.y * 0.034, 8, 6), nostrilMaterial);
    nostril.name = 'mini-dragon-nostril';
    nostril.position.set(
      snout.position.x + dims.y * 0.17 * (0.7 + snoutLength),
      snout.position.y + dims.y * 0.02,
      side * dims.z * 0.1,
    );
    group.add(nostril);
  }

  /*
   * A three-part eye: an ember-coloured iris, a dark pupil, and a catchlight.
   *
   * The first version was one emissive sphere, which on this bright stage
   * saturated to a flat white ball — the animal had two blank dots for eyes. The
   * iris carries the ember gene as a *surface* colour rather than as glow, so it
   * survives the lighting, and the pupil is what actually makes it read as an
   * eye looking back at you.
   */
  const iris = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.ember),
    emissive: new THREE.Color(palette.ember),
    emissiveIntensity: 0.3,
    roughness: 0.28,
    metalness: 0,
  });
  iris.userData['preserveAppearance'] = true;

  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: '#150c06',
    roughness: 0.18,
    metalness: 0,
  });
  pupilMaterial.userData['preserveAppearance'] = true;

  const highlight = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.7,
    roughness: 0.1,
  });
  highlight.userData['preserveAppearance'] = true;

  /*
   * Eyes. Forward on the face, not out on the widest point of the skull, and a
   * sixth of the cranium rather than half of it — the first pass sized them off
   * the part height and produced two balloons larger than the snout.
   */
  for (const side of [-1, 1] as const) {
    const radius = dims.y * 0.085 * (0.8 + eyeSize * 0.5);
    const socket = skullPoint(new THREE.Vector3(1, 0.12, side * 0.52), 0.94);
    const outward = socket.clone().normalize();

    const eye = mesh(new THREE.SphereGeometry(radius, 14, 12), iris);
    eye.name = 'mini-dragon-eye';
    eye.position.copy(socket);
    group.add(eye);

    const pupil = mesh(new THREE.SphereGeometry(radius * 0.52, 10, 8), pupilMaterial);
    pupil.name = 'mini-dragon-pupil';
    pupil.position.copy(socket).addScaledVector(outward, radius * 0.62);
    group.add(pupil);

    const spark = mesh(new THREE.SphereGeometry(radius * 0.24, 8, 6), highlight);
    spark.name = 'mini-dragon-eye-highlight';
    spark.position
      .copy(socket)
      .addScaledVector(outward, radius * 0.78)
      .add(new THREE.Vector3(0, radius * 0.4, side * radius * 0.24));
    group.add(spark);
  }

  /*
   * Ears. The cone and its tuft ride in one group, so the tufts follow the ear
   * when it tilts — placed independently they hung in the air above the head.
   */
  for (const side of [-1, 1] as const) {
    const earLength = dims.y * 0.5;
    const earRoot = skullPoint(new THREE.Vector3(-0.24, 0.9, side * 0.5), 0.9);
    const ear = new THREE.Group();
    ear.name = 'mini-dragon-ear';

    const cone = mesh(new THREE.ConeGeometry(dims.y * 0.13, earLength, 9), coat);
    cone.position.y = earLength * 0.5;
    ear.add(cone);

    addTuftFan(ear, coat, {
      origin: { x: 0, y: earLength * 0.86, z: 0 },
      count: 4,
      length: dims.y * (0.05 + earTuft * coatDepth * 0.2),
      thickness: dims.y * 0.05,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 1.1,
      seed: palette.seed + side,
    });

    ear.position.copy(earRoot);
    ear.rotation.z = side * -0.34;
    ear.rotation.x = side * -0.4;
    group.add(ear);
  }

  // Cheek fluff, the second-strongest read of the coat gene after the ruff.
  for (const side of [-1, 1] as const) {
    const cheek = skullPoint(new THREE.Vector3(0.1, -0.34, side * 0.94), 0.94);
    addTuftFan(group, coat, {
      origin: { x: cheek.x, y: cheek.y, z: cheek.z },
      count: 6,
      length: dims.y * (0.05 + coatDepth * 0.24),
      thickness: dims.y * 0.075,
      direction: new THREE.Vector3(-0.5, -0.15, side * 1),
      spread: 1.35,
      seed: palette.seed + 3 + side,
    });
  }

  for (const side of [-1, 1] as const) {
    const hornRoot = skullPoint(new THREE.Vector3(-0.05, 0.82, side * 0.46), 0.9);
    const horn = buildMiniHorn(dims, palette, side, hornCurl, hornLength);
    horn.position.copy(hornRoot);
    group.add(horn);
  }

  return group;
}

/**
 * One horn, swept along a curve whose arc is set by the curl gene.
 *
 * `curl` 0 is a short straight spike angled back; 1 is a full ram coil that
 * wraps down and forward past the ear. The curve is walked as tapered cylinder
 * segments rather than a tube because a tube cannot narrow toward its tip, and a
 * horn that does not taper reads as a pipe.
 */
function buildMiniHorn(
  dims: Vector3Data,
  palette: MiniDragonPalette,
  side: -1 | 1,
  curl: number,
  lengthFactor: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-horn';

  const material = hornMaterial(palette);
  const length = dims.y * 0.72 * Math.max(lengthFactor, 0.15);
  const baseRadius = dims.y * 0.1;
  const segments = 9;
  const sweep = 0.55 + curl * 4.7;
  // Radius of the coil that makes the arc come out `length` long overall.
  const coil = length / sweep;

  const start = new THREE.Vector2(0, 0);
  const heading = new THREE.Vector2(-0.42, 1).normalize();
  // Curve backward and down: the centre sits on the heading's right-hand side.
  const centre = start
    .clone()
    .add(new THREE.Vector2(heading.y, -heading.x).multiplyScalar(coil));

  const pointAt = (t: number): THREE.Vector3 => {
    const angle = sweep * t;
    const offset = start.clone().sub(centre);
    const rotated = new THREE.Vector2(
      offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
      offset.x * Math.sin(angle) + offset.y * Math.cos(angle),
    );
    const planar = centre.clone().add(rotated);
    // Drift outward as it coils, so a curled horn wraps around the ear rather
    // than through the skull.
    return new THREE.Vector3(planar.x, planar.y, side * t * length * 0.34 * curl);
  };

  for (let index = 0; index < segments; index += 1) {
    const from = pointAt(index / segments);
    const to = pointAt((index + 1) / segments);
    const axis = new THREE.Vector3().subVectors(to, from);
    const height = axis.length();
    if (height < 1e-5) continue;

    const taper = (value: number): number => baseRadius * (1 - 0.74 * value);
    const segment = mesh(
      new THREE.CylinderGeometry(
        taper((index + 1) / segments),
        taper(index / segments),
        height,
        8,
      ),
      material,
    );
    segment.position.copy(from).addScaledVector(axis, 0.5);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    group.add(segment);
  }

  // Cap the tip so a coiled horn does not end in a visible open cylinder.
  const tip = pointAt(1);
  const cap = mesh(new THREE.SphereGeometry(baseRadius * 0.3, 8, 6), material);
  cap.position.copy(tip);
  group.add(cap);

  return group;
}

// ---------------------------------------------------------------------------
// Leg: stubby, feathered at the top, soft paw at the bottom.
// ---------------------------------------------------------------------------

const MINI_LEG_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.62],
  [-0.32, 0.5],
  [-0.05, 0.46],
  [0.22, 0.66],
  [0.42, 0.86],
  [0.5, 0.78],
];

function buildMiniLeg(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coatDepth = visualNumber(part, 'miniCoatDepth', 0.5);
  const toeCount = Math.max(2, Math.round(visualNumber(part, 'miniToeCount', 3)));
  const coat = coatMaterial(palette.coat);

  const limb = new THREE.LatheGeometry(
    MINI_LEG_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  const shank = mesh(limb, coat);
  shank.name = 'mini-dragon-shank';
  group.add(shank);

  // Paw: a squashed ball with soft toe beans. No talons — this animal is bred
  // to sit on a lap.
  const paw = mesh(new THREE.SphereGeometry(dims.x * 0.78, 12, 10), coat);
  paw.name = 'mini-dragon-paw';
  paw.scale.set(1, 0.72, 1.05);
  paw.position.y = -dims.y * 0.5;
  group.add(paw);

  const beans = pawMaterial(palette);
  for (let index = 0; index < toeCount; index += 1) {
    const step = toeCount === 1 ? 0 : index / (toeCount - 1) - 0.5;
    const toe = mesh(new THREE.SphereGeometry(dims.x * 0.28, 8, 6), beans);
    toe.name = 'mini-dragon-toe';
    toe.scale.set(1.15, 0.7, 1);
    toe.position.set(dims.x * 0.62, -dims.y * 0.56, step * dims.x * 1.05);
    group.add(toe);
  }

  /*
   * Leg feathering: a cuff where the limb meets the body. The ring is authored
   * around the X axis, so it rides in its own group lifted to the top of the
   * limb rather than being nudged mesh by mesh.
   */
  const cuff = new THREE.Group();
  cuff.name = 'mini-dragon-leg-cuff';
  cuff.position.y = dims.y * 0.3;
  addTuftRing(cuff, coat, {
    x: 0,
    radiusY: dims.x * 0.58,
    radiusZ: dims.x * 0.58,
    count: 8,
    length: dims.x * (0.3 + coatDepth * 1.15),
    thickness: dims.x * 0.2,
    fromAngle: -Math.PI,
    toAngle: Math.PI,
    sweep: 0,
    seed: palette.seed,
  });
  group.add(cuff);

  return group;
}

// ---------------------------------------------------------------------------
// Wing: small, rounded, furred along the leading edge — and often barely there.
// ---------------------------------------------------------------------------

function buildMiniWing(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const spread = visualNumber(part, 'miniWingSpread', 1);
  const coatDepth = visualNumber(part, 'miniCoatDepth', 0.5);
  // Which flank this wing grows from, as data rather than as a substring of the
  // part id: a renamed part must not silently mirror the animal.
  const side = visualNumber(part, 'miniWingSide', 1) < 0 ? -1 : 1;
  const coat = coatMaterial(palette.coat);

  /*
   * A vestigial wing is not a small wing. Below this threshold the membrane and
   * struts are gone entirely and what remains is a furred bump — which is what
   * the recessive genotype actually produces, and what stops a student reading
   * "wingless" as "wings I cannot see at this zoom".
   */
  if (spread < 0.22) {
    const nub = mesh(new THREE.SphereGeometry(dims.y * 0.3, 10, 8), coat);
    nub.name = 'mini-dragon-wing-nub';
    nub.scale.set(1.1, 0.8, 0.7);
    group.add(nub);
    addTuftFan(group, coat, {
      origin: { x: 0, y: dims.y * 0.16, z: side * dims.y * 0.1 },
      count: 4,
      length: dims.y * (0.16 + coatDepth * 0.42),
      thickness: dims.y * 0.07,
      direction: new THREE.Vector3(-0.3, 0.55, side * 1),
      spread: 1.0,
      seed: palette.seed,
    });
    return group;
  }

  const span = dims.z * spread;
  const chord = dims.x;

  const shape = new THREE.Shape();
  shape.moveTo(chord * 0.34, 0);
  shape.quadraticCurveTo(chord * 0.46, span * 0.58, chord * 0.06, span);
  shape.quadraticCurveTo(-chord * 0.34, span * 0.96, -chord * 0.5, span * 0.42);
  shape.quadraticCurveTo(-chord * 0.52, span * 0.1, chord * 0.34, 0);
  const membrane = new THREE.ShapeGeometry(shape, 14);
  // The shape is authored in XY; stand it up so its span (+Y) runs along +Z.
  membrane.rotateX(Math.PI / 2);
  const skin = mesh(membrane, wingSkinMaterial(palette));
  skin.name = 'mini-dragon-wing-membrane';
  skin.scale.z = side;
  group.add(skin);

  // Leading-edge bone, tapering to the tip.
  const bone = mesh(
    new THREE.CylinderGeometry(dims.y * 0.055, dims.y * 0.1, span, 8),
    coat,
  );
  bone.name = 'mini-dragon-wing-bone';
  bone.position.set(chord * 0.2, 0, (side * span) / 2);
  bone.rotation.x = (side * Math.PI) / 2;
  group.add(bone);

  // Two short finger struts, not the classic dragon's four: this wing is a
  // rounded paddle, not a hand.
  for (const at of [0.42, 0.74] as const) {
    const strut = mesh(
      new THREE.CylinderGeometry(dims.y * 0.028, dims.y * 0.042, chord * 0.52, 6),
      coat,
    );
    strut.name = 'mini-dragon-wing-strut';
    strut.position.set(-chord * 0.1, 0, side * span * at);
    strut.rotation.z = Math.PI / 2;
    strut.rotation.y = side * -0.5;
    group.add(strut);
  }

  // Fur along the shoulder and the leading edge.
  addTuftFan(group, coat, {
    origin: { x: chord * 0.24, y: 0, z: side * span * 0.08 },
    count: 6,
    length: dims.y * (0.08 + coatDepth * 0.28),
    thickness: dims.y * 0.085,
    direction: new THREE.Vector3(0.35, 0.3, side * 1),
    spread: 1.3,
    seed: palette.seed + 5,
  });

  // Lift the outer edge. A wing built flat in the XZ plane is a card seen
  // edge-on from every angle the specimen camera uses.
  group.rotation.x = -side * 0.5;
  group.rotation.y = side * 0.2;
  return group;
}

// ---------------------------------------------------------------------------
// Tail and plume.
// ---------------------------------------------------------------------------

const MINI_TAIL_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.94],
  [-0.2, 0.82],
  [0.16, 0.66],
  [0.42, 0.5],
  [0.5, 0.42],
];

function buildMiniTail(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coatDepth = visualNumber(part, 'miniCoatDepth', 0.5);
  const coat = coatMaterial(palette.coat);

  const lathe = new THREE.LatheGeometry(
    MINI_TAIL_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * dims.x)),
    16,
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  const segment = mesh(lathe, coat);
  segment.name = 'mini-dragon-tail-segment';
  group.add(segment);

  for (const axial of [-0.3, -0.08, 0.14, 0.34] as const) {
    addTuftRing(group, coat, {
      x: axial * dims.x,
      radiusY: (sampleProfile(MINI_TAIL_PROFILE, axial) * dims.y) / 2,
      radiusZ: (sampleProfile(MINI_TAIL_PROFILE, axial) * dims.z) / 2,
      count: 8,
      length: dims.y * (0.08 + coatDepth * 0.34),
      thickness: dims.y * 0.14,
      fromAngle: Math.PI * 0.35,
      toAngle: Math.PI * 1.65,
      sweep: -1.15,
      seed: palette.seed + axial,
    });
  }

  return group;
}

function buildMiniTailPlume(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coatDepth = visualNumber(part, 'miniCoatDepth', 0.5);
  const fan = visualNumber(part, 'miniPlumeFan', 0.8);
  const coat = coatMaterial(palette.coat);

  const core = mesh(new THREE.SphereGeometry(dims.y * 0.3, 10, 8), coat);
  core.name = 'mini-dragon-plume-core';
  group.add(core);

  // Four overlapping fans read as a plume; one flat fan reads as a comb.
  const layers = [
    { direction: new THREE.Vector3(-1, 0.5, 0), count: 7 },
    { direction: new THREE.Vector3(-1, 0.05, 0.42), count: 6 },
    { direction: new THREE.Vector3(-1, 0.05, -0.42), count: 6 },
    { direction: new THREE.Vector3(-1, -0.42, 0), count: 6 },
  ] as const;

  for (const [index, layer] of layers.entries()) {
    addTuftFan(group, coat, {
      origin: { x: -dims.x * 0.08, y: 0, z: 0 },
      count: layer.count,
      length: dims.x * (0.3 + coatDepth * 0.72),
      thickness: dims.y * 0.2,
      direction: layer.direction,
      spread: 0.8 + fan * 0.8,
      seed: palette.seed + index * 11,
    });
  }

  return group;
}

// ---------------------------------------------------------------------------
// Shared helpers. Deliberately local: the mini dragon owns its own plumbing so
// a change to the classic dragon's factory can never reshape this animal.
// ---------------------------------------------------------------------------

function sampleProfile(
  profile: readonly (readonly [number, number])[],
  axialFraction: number,
): number {
  for (let index = 1; index < profile.length; index += 1) {
    const [fromT, fromRadius] = profile[index - 1];
    const [toT, toRadius] = profile[index];
    if (axialFraction <= toT) {
      const blend = (axialFraction - fromT) / Math.max(toT - fromT, 1e-6);
      return fromRadius + (toRadius - fromRadius) * Math.max(0, Math.min(1, blend));
    }
  }
  return profile[profile.length - 1][1];
}

function visualNumber(part: AssemblyPart, key: string, fallback: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function visualString(part: AssemblyPart, key: string, fallback: string): string {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'string' && value.length ? value : fallback;
}

function partSeed(id: string): number {
  return hashUnit(id);
}

function hashUnit(value: string | number): number {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}
