import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';

/**
 * Procedural anatomy for the domesticated mini dragon.
 *
 * A separate animal from the classic dragon, not a scaled-down one: it shares no
 * builder, no silhouette module, no palette, and no texture with
 * `dragon-procedural-mesh.factory.ts`. Where that animal is a scaled reptile with
 * membranes and talons, this one is a small round-scaled quadruped with orderly
 * baby dorsal bumps, an optional inherited feather mantle, rounded cheek
 * scales, soft paws instead of talons, and wings that some genotypes lose
 * entirely.
 *
 * Everything is sized from `part.dimensions`, so the genetics pipeline can
 * rescale a specimen without any measurement drifting out of proportion, and
 * every tunable reads a `mini*` parameter key so the two animals' silent
 * `visualProfile.parameters` contracts can never collide.
 */

export const MINI_DRAGON_PROFILE_IDS = [
  'mini-dragon-body',
  'mini-dragon-dorsal-scales',
  'mini-dragon-neck',
  'mini-dragon-head',
  'mini-dragon-jaw',
  'mini-dragon-thigh',
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
    case 'mini-dragon-dorsal-scales':
      return buildMiniDorsalScales(part, palette);
    case 'mini-dragon-neck':
      return buildMiniNeck(part, palette);
    case 'mini-dragon-head':
      return buildMiniHead(part, palette);
    case 'mini-dragon-jaw':
      return buildMiniJaw(part, palette);
    case 'mini-dragon-thigh':
      return buildMiniThigh(part, palette);
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
// The hide has no tiled texture map. Its readable scale pattern is geometry.
// Feathered genotypes use a tiny generated albedo/alpha pair on instanced cards;
// the maps define one feather rather than painting reptile scales over the body.
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

/** Matte scale material with no expensive image texture. */
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

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

// ---------------------------------------------------------------------------
// Body: a short round barrel with clean scale geometry.
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

/** Surface normal for the same generated torso profile, sampled numerically. */
export function miniBodySurfaceNormal(
  dimensions: Vector3Data,
  axialFraction: number,
  angle: number,
): Vector3Data {
  const epsilon = 0.002;
  const fromAxial = miniBodySurfacePoint(dimensions, axialFraction - epsilon, angle);
  const toAxial = miniBodySurfacePoint(dimensions, axialFraction + epsilon, angle);
  const fromAngle = miniBodySurfacePoint(dimensions, axialFraction, angle - epsilon);
  const toAngle = miniBodySurfacePoint(dimensions, axialFraction, angle + epsilon);
  const axialTangent = new THREE.Vector3(
    toAxial.x - fromAxial.x,
    toAxial.y - fromAxial.y,
    toAxial.z - fromAxial.z,
  );
  const angleTangent = new THREE.Vector3(
    toAngle.x - fromAngle.x,
    toAngle.y - fromAngle.y,
    toAngle.z - fromAngle.z,
  );
  const normal = axialTangent.cross(angleTangent).normalize();
  return { x: normal.x, y: normal.y, z: normal.z };
}

/** Three orderly rows of rounded scales; the recessive form grows soft baby spikes. */
function buildMiniDorsalScales(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mini-dragon-dorsal-scale-rows';
  const dims = part.dimensions;
  const bumpy = visualNumber(part, 'miniDorsalBumps', 0) >= 0.5;
  const baseMaterial = coatMaterial(palette.coat.clone().lerp(new THREE.Color('#fff4d6'), 0.08));
  const patchMaterial = coatMaterial(palette.patch);
  const rowAngles = [Math.PI - 0.42, Math.PI, Math.PI + 0.42] as const;
  const stations = [-0.38, -0.25, -0.12, 0.01, 0.14, 0.27, 0.38] as const;

  for (const [rowIndex, angle] of rowAngles.entries()) {
    for (const [stationIndex, axial] of stations.entries()) {
      const root = miniBodySurfacePoint(dims, axial, angle);
      const material =
        !palette.patch.equals(palette.coat) && (stationIndex + rowIndex) % 4 < 2
          ? patchMaterial
          : baseMaterial;
      const scaleRadius = dims.y * (bumpy ? 0.052 : 0.045);
      const scale = mesh(new THREE.SphereGeometry(scaleRadius, 10, 7), material);
      scale.name = bumpy ? 'mini-dragon-bumpy-scale' : 'mini-dragon-smooth-scale';
      scale.position.set(root.x, root.y + scaleRadius * 0.18, root.z);
      scale.scale.set(1.25, bumpy ? 0.72 : 0.34, 0.9);
      group.add(scale);

      if (!bumpy) continue;
      const spikeHeight = dims.y * (rowIndex === 1 ? 0.105 : 0.078);
      const spike = mesh(
        new THREE.CapsuleGeometry(scaleRadius * 0.46, spikeHeight, 4, 8),
        material,
      );
      spike.name = 'mini-dragon-baby-spike';
      spike.position.set(root.x - dims.x * 0.012, root.y + spikeHeight * 0.56, root.z);
      spike.rotation.z = -0.16;
      group.add(spike);
    }
  }

  return group;
}

/** A separate neck gives learned cues a second expressive hinge behind the head. */
function buildMiniNeck(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const neck = mesh(
    new THREE.CapsuleGeometry(dims.z * 0.34, dims.x * 0.48, 6, 12),
    coatMaterial(palette.coat),
  );
  neck.name = 'mini-dragon-neck';
  neck.rotation.z = Math.PI / 2.7;
  neck.scale.set(1, 1, dims.y / Math.max(dims.z, 0.001));
  group.add(neck);
  addJointBall(
    group,
    dims.z * 0.25 * visualNumber(part, 'miniJointBall', 1),
    coatMaterial(palette.coat),
    { x: 0, y: 0, z: 0 },
  );
  return group;
}

function buildMiniBody(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);
  const twoToned = !palette.patch.equals(palette.coat);
  const patchCoat = twoToned ? coatMaterial(palette.patch) : undefined;
  // Keep these tufts sparse enough that the inherited dorsal rows remain the
  // readable silhouette feature.

  const barrel = new THREE.LatheGeometry(
    MINI_BODY_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * dims.x)),
    22,
  );
  barrel.rotateZ(-Math.PI / 2);
  barrel.scale(1, dims.y / 2, dims.z / 2);
  const torso = mesh(barrel, coat);
  torso.name = 'mini-dragon-torso';
  group.add(torso);

  // LatheGeometry leaves both axial ends open. Close those large cuts so the
  // only openings the assembled animal suggests are the deliberately sized
  // neck and tail sockets below.
  for (const side of [-1, 1] as const) {
    const endRadius = sampleMiniBodyRadius(side * 0.5);
    const cap = mesh(new THREE.CircleGeometry(1, 28), coat);
    cap.name = side > 0 ? 'mini-dragon-front-body-cap' : 'mini-dragon-rear-body-cap';
    cap.position.x = side * dims.x * 0.5;
    cap.rotation.y = (side * Math.PI) / 2;
    cap.scale.set(endRadius * dims.z * 0.5, endRadius * dims.y * 0.5, 1);
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
    const patches: readonly (readonly [number, number, number])[] = [
      [-0.2, 1.45, 0.8],
      [0.1, 2.0, 0.95],
      [0.3, 1.0, 0.66],
    ];
    for (const [axial, angle, size] of patches) {
      for (const side of [-1, 1] as const) {
        const point = miniBodySurfacePoint(dims, axial, angle * side);
        const blob = mesh(new THREE.SphereGeometry(dims.y * 0.13 * size, 12, 9), patchCoat);
        blob.name = 'mini-dragon-coat-patch';
        blob.position.set(point.x, point.y, point.z);
        // Sink the blob so only the cap shows, reading as a patch of coat rather
        // than a ball stuck to the flank.
        blob.position.multiplyScalar(0.88);
        blob.scale.set(1.6, 0.72, 0.88);
        group.add(blob);
      }
    }
  }

  addMiniBodyFeathers(group, part, palette);

  // Throat glow, tucked under the neck.
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
  const eyeSize = visualNumber(part, 'miniEyeSize', 0.62);
  const snoutLength = visualNumber(part, 'miniSnoutLength', 0.34);
  const hornCurl = visualNumber(part, 'miniHornCurl', 0);
  const hornLength = visualNumber(part, 'miniHornLength', 0.62);
  const earTuft = visualNumber(part, 'miniEarTuft', 0.6);
  const earScale = visualNumber(part, 'miniEarScale', 1);
  const cheekTuft = visualNumber(part, 'miniCheekTuft', 0.6);
  const crownCrest = visualNumber(part, 'miniCrestCrown', 0) >= 0.5;
  const sideFrill = visualNumber(part, 'miniCrestFrill', 0) >= 0.5;
  const coat = coatMaterial(palette.coat);

  // Cranium: wider than long, which is most of what makes it read as young.
  const skullRadius = dims.y * 0.5;
  const skullScale = new THREE.Vector3((dims.x / dims.y) * 0.92, 1, (dims.z / dims.y) * 1.02);
  const skull = mesh(new THREE.SphereGeometry(skullRadius, 20, 16), coat);
  skull.name = 'mini-dragon-cranium';
  skull.scale.copy(skullScale);
  group.add(skull);

  /**
   * A point on the cranium, so features sit *on* the skull rather than inside
   * it. Placing eyes by raw part fractions buried them in the head — a sphere
   * scaled on three axes has no single radius to guess at.
   */
  const skullPoint = (direction: THREE.Vector3, lift = 1): THREE.Vector3 => {
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
    const radius = dims.y * 0.075 * (0.8 + eyeSize * 0.5);
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
    const earLength = dims.y * 0.36 * earScale;
    const earRoot = skullPoint(new THREE.Vector3(-0.24, 0.9, side * 0.5), 0.9);
    const ear = new THREE.Group();
    ear.name = 'mini-dragon-ear';

    const petal = mesh(new THREE.SphereGeometry(dims.y * 0.16, 12, 10), coat);
    petal.name = 'mini-dragon-ear-petal';
    petal.scale.set(0.58, earLength / (dims.y * 0.16), 0.34);
    petal.position.y = earLength * 0.48;
    ear.add(petal);

    const tuft = mesh(new THREE.SphereGeometry(dims.y * (0.025 + earTuft * 0.018), 9, 7), coat);
    tuft.name = 'mini-dragon-ear-tuft';
    tuft.scale.set(0.75, 1.25, 0.75);
    tuft.position.y = earLength * 0.88;
    ear.add(tuft);

    ear.position.copy(earRoot);
    ear.rotation.z = side * -0.34;
    ear.rotation.x = side * -0.4;
    group.add(ear);
  }

  // Small cheek tufts keep the species youthful without carrying a gene.
  for (const side of [-1, 1] as const) {
    const cheek = skullPoint(new THREE.Vector3(0.1, -0.34, side * 0.94), 0.94);
    for (let index = 0; index < 3; index += 1) {
      const cheekScale = mesh(
        new THREE.SphereGeometry(dims.y * (0.035 + cheekTuft * 0.018), 9, 7),
        coat,
      );
      cheekScale.name = 'mini-dragon-cheek-scale';
      cheekScale.scale.set(0.72, 1, 0.48);
      cheekScale.position.set(
        cheek.x - index * dims.x * 0.035,
        cheek.y - index * dims.y * 0.018,
        cheek.z + side * index * dims.z * 0.018,
      );
      group.add(cheekScale);
    }
  }

  for (const side of [-1, 1] as const) {
    const hornRoot = skullPoint(new THREE.Vector3(-0.05, 0.82, side * 0.46), 0.9);
    const horn = buildMiniHorn(dims, palette, side, hornCurl, hornLength);
    horn.position.copy(hornRoot);
    group.add(horn);
  }

  if (crownCrest) {
    for (const [index, axial] of [-0.24, -0.08, 0.08, 0.24].entries()) {
      const bump = mesh(
        new THREE.CapsuleGeometry(dims.y * 0.055, dims.y * (0.08 + index * 0.015), 4, 8),
        coat,
      );
      bump.name = 'mini-dragon-crown-bump';
      bump.position.set(axial * dims.x, dims.y * (0.43 + index * 0.012), 0);
      bump.rotation.z = -0.18;
      group.add(bump);
    }
  }

  if (sideFrill) {
    for (const side of [-1, 1] as const) {
      for (const [index, lift] of [-0.18, 0, 0.18].entries()) {
        const petal = mesh(new THREE.SphereGeometry(dims.y * 0.13, 10, 8), coat);
        petal.name = 'mini-dragon-side-frill';
        petal.scale.set(0.48, 1.05, 1.3);
        petal.position.set(-dims.x * (0.25 + index * 0.035), lift * dims.y, side * dims.z * 0.47);
        group.add(petal);
      }
    }
  }

  return group;
}

/**
 * Soft lower muzzle with a readable mouth line and two tiny milk teeth.
 *
 * It is a separate part because the show-training rig opens it on the lantern
 * cue. Keeping it in the mini factory preserves the species' matte coat and
 * avoids borrowing the classic dragon's scaled jaw.
 */
function buildMiniJaw(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);
  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: '#351820',
    roughness: 0.82,
    metalness: 0,
  });

  const lowerMuzzle = mesh(new THREE.SphereGeometry(0.5, 14, 10), coat);
  lowerMuzzle.name = 'mini-dragon-lower-muzzle';
  lowerMuzzle.scale.set(dims.x, dims.y, dims.z);
  group.add(lowerMuzzle);
  addJointBall(group, dims.y * 0.32 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: -dims.x * 0.36,
    y: 0,
    z: 0,
  });

  const mouth = mesh(
    new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mouthMaterial,
  );
  mouth.name = 'mini-dragon-mouth';
  mouth.scale.set(dims.x * 0.78, dims.y * 0.12, dims.z * 0.72);
  mouth.position.set(dims.x * 0.06, dims.y * 0.46, 0);
  group.add(mouth);

  // A small lantern inside the articulated mouth makes ember colour readable
  // during the learned cue without turning the whole face into a light source.
  const emberLantern = mesh(
    new THREE.SphereGeometry(dims.y * 0.22, 10, 8),
    emberMaterial(palette, 1.65),
  );
  emberLantern.name = 'mini-dragon-mouth-ember';
  emberLantern.position.set(dims.x * 0.24, dims.y * 0.32, 0);
  emberLantern.scale.set(1.35, 0.65, 0.88);
  group.add(emberLantern);

  const toothMaterial = hornMaterial(palette);
  for (const side of [-1, 1] as const) {
    const tooth = mesh(new THREE.ConeGeometry(dims.y * 0.12, dims.y * 0.42, 7), toothMaterial);
    tooth.name = 'mini-dragon-milk-tooth';
    tooth.position.set(dims.x * 0.12, dims.y * 0.48, side * dims.z * 0.23);
    tooth.rotation.z = Math.PI;
    group.add(tooth);
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
  const baseRadius = dims.y * 0.065;
  const segments = 12;
  const sweep = 0.55 + curl * 4.7;
  // Radius of the coil that makes the arc come out `length` long overall.
  const coil = length / sweep;

  const start = new THREE.Vector2(0, 0);
  const heading = new THREE.Vector2(-0.42, 1).normalize();
  // Curve backward and down: the centre sits on the heading's right-hand side.
  const centre = start.clone().add(new THREE.Vector2(heading.y, -heading.x).multiplyScalar(coil));

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
        10,
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
// Two-piece leg: rounded hip and thigh, articulated knee, soft paw below.
// ---------------------------------------------------------------------------

const MINI_THIGH_PROFILE: readonly (readonly [number, number])[] = [
  [-0.5, 0.58],
  [-0.2, 0.66],
  [0.2, 0.78],
  [0.5, 0.9],
];

function buildMiniThigh(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = coatMaterial(palette.coat);
  const limb = new THREE.LatheGeometry(
    MINI_THIGH_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  const thigh = mesh(limb, coat);
  thigh.name = 'mini-dragon-thigh';
  group.add(thigh);

  // The ball is centred exactly on the body-to-thigh pivot authored by the
  // anatomy builder, so it stays seated in the hip while the leg swings.
  addJointBall(group, dims.x * 0.92 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: dims.y * 0.4,
    z: 0,
  });
  return group;
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
  const cavityMaterial = coatMaterial(palette.coatDeep.clone().multiplyScalar(0.55));
  const rimMaterial = coatMaterial(palette.coat.clone().multiplyScalar(0.86));

  const cavity = mesh(new THREE.CircleGeometry(radius * 0.82, 24), cavityMaterial);
  cavity.name = `mini-dragon-${kind}-socket-cavity`;
  cavity.position
    .set(position.x, position.y, position.z)
    .addScaledVector(direction, radius * 0.035);
  cavity.quaternion.copy(orientation);
  group.add(cavity);

  const rim = mesh(new THREE.TorusGeometry(radius * 0.88, radius * 0.13, 8, 24), rimMaterial);
  rim.name = `mini-dragon-${kind}-socket-rim`;
  rim.position.set(position.x, position.y, position.z).addScaledVector(direction, radius * 0.055);
  rim.quaternion.copy(orientation);
  group.add(rim);
}

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
  const toeCount = Math.max(2, Math.round(visualNumber(part, 'miniToeCount', 3)));
  const coat = coatMaterial(palette.coat);

  const limb = new THREE.LatheGeometry(
    MINI_LEG_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    14,
  );
  const shank = mesh(limb, coat);
  shank.name = 'mini-dragon-shank';
  group.add(shank);
  addJointBall(group, dims.x * 0.82 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: dims.y * 0.4,
    z: 0,
  });

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

  // A shallow collar blends the knee ball into the narrower shank. It sits
  // inside both meshes instead of forming a separate floating ring.
  const cuff = mesh(new THREE.SphereGeometry(dims.x * 0.68, 12, 9), coat);
  cuff.name = 'mini-dragon-leg-cuff';
  cuff.scale.set(1, 0.34, 1);
  cuff.position.y = dims.y * 0.28;
  group.add(cuff);

  return group;
}

// ---------------------------------------------------------------------------
// Wing: small, rounded, and often barely there.
// ---------------------------------------------------------------------------

function buildMiniWing(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const spread = visualNumber(part, 'miniWingSpread', 1);
  // Which flank this wing grows from, as data rather than as a substring of the
  // part id: a renamed part must not silently mirror the animal.
  const side = visualNumber(part, 'miniWingSide', 1) < 0 ? -1 : 1;
  const coat = coatMaterial(palette.coat);
  addJointBall(group, dims.y * 0.18 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: 0,
    z: 0,
  });

  /*
   * A vestigial wing is not a small wing. Below this threshold the membrane and
   * struts are gone entirely and what remains is a rounded bump — which is what
   * the recessive genotype actually produces, and what stops a student reading
   * "wingless" as "wings I cannot see at this zoom".
   */
  if (spread < 0.22) {
    const nub = mesh(new THREE.SphereGeometry(dims.y * 0.3, 10, 8), coat);
    nub.name = 'mini-dragon-wing-nub';
    nub.scale.set(1.1, 0.8, 0.7);
    group.add(nub);
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
  const bone = mesh(new THREE.CylinderGeometry(dims.y * 0.055, dims.y * 0.1, span, 8), coat);
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

  addMiniWingFeathers(group, part, palette, side, span, chord);

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
  [-0.5, 0.42],
  [-0.2, 0.5],
  [0.16, 0.66],
  [0.42, 0.82],
  [0.5, 0.94],
];

function buildMiniTail(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
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
  const jointBallScale = visualNumber(part, 'miniJointBall', 1);
  // +X is the body-facing, broad end; -X is the narrow distal end. Match each
  // socket cover to the surface beneath it so neither a gap nor a bead appears.
  addJointBall(group, dims.y * 0.48 * jointBallScale, coat, {
    x: dims.x * 0.47,
    y: 0,
    z: 0,
  });
  addJointBall(group, dims.y * 0.24 * jointBallScale, coat, {
    x: -dims.x * 0.47,
    y: 0,
    z: 0,
  });

  return group;
}

function buildMiniTailPlume(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const fan = visualNumber(part, 'miniPlumeFan', 0.8);
  const tailStyle = Math.round(visualNumber(part, 'miniTailStyle', 2));
  const coat = coatMaterial(palette.coat);

  const core = mesh(new THREE.SphereGeometry(dims.y * 0.3, 10, 8), coat);
  core.name = 'mini-dragon-plume-core';
  group.add(core);
  addJointBall(group, dims.y * 0.28 * visualNumber(part, 'miniJointBall', 1), coat, {
    x: dims.x * 0.12,
    y: 0,
    z: 0,
  });

  if (tailStyle === 0) {
    const club = mesh(new THREE.SphereGeometry(dims.y * 0.48, 14, 10), coat);
    club.name = 'mini-dragon-star-club';
    club.scale.set(1.15, 1, 1);
    club.position.x = -dims.x * 0.2;
    group.add(club);
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      const lobe = mesh(new THREE.CapsuleGeometry(dims.y * 0.11, dims.y * 0.16, 4, 8), coat);
      lobe.name = 'mini-dragon-star-lobe';
      lobe.position.set(
        -dims.x * 0.2,
        Math.cos(angle) * dims.y * 0.44,
        Math.sin(angle) * dims.z * 0.44,
      );
      lobe.rotation.x = angle;
      group.add(lobe);
    }
    return group;
  }

  if (tailStyle === 1) {
    for (const side of [-1, 1] as const) {
      const fork = mesh(new THREE.CapsuleGeometry(dims.y * 0.18, dims.x * 0.48, 5, 10), coat);
      fork.name = 'mini-dragon-tail-fork';
      fork.rotation.z = Math.PI / 2 + side * 0.42;
      fork.position.set(-dims.x * 0.28, side * dims.y * 0.19, 0);
      fork.scale.z = 0.72;
      group.add(fork);
    }
    return group;
  }

  // One soft pom with a solid heart and six overlapping dimples. The previous
  // ring duplicated its first bubble and read as loose grapes with holes.
  const pomCore = mesh(new THREE.SphereGeometry(dims.y * (0.34 + fan * 0.04), 14, 11), coat);
  pomCore.name = 'mini-dragon-pom-core';
  pomCore.position.x = -dims.x * 0.2;
  pomCore.scale.set(1.18, 1, 1);
  group.add(pomCore);

  const pomRadius = dims.y * (0.19 + fan * 0.035);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bubble = mesh(new THREE.SphereGeometry(pomRadius, 10, 8), coat);
    bubble.name = 'mini-dragon-pom-bubble';
    bubble.position.set(
      -dims.x * (0.2 + (index % 2) * 0.035),
      Math.cos(angle) * dims.y * 0.24,
      Math.sin(angle) * dims.z * 0.24,
    );
    group.add(bubble);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Feather cards. The known procedural torso and wing equations are sampled
// directly, avoiding the cost and nondeterminism of a generic surface sampler.
// Each anatomical layer is one InstancedMesh, regardless of feather count.
// ---------------------------------------------------------------------------

function addMiniBodyFeathers(
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

function addMiniWingFeathers(
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

/** Rounded socket cover seated at an attachment end so animated parts never reveal a gap. */
function addJointBall(
  group: THREE.Group,
  radius: number,
  material: THREE.Material,
  position: Vector3Data,
): void {
  const ball = mesh(new THREE.SphereGeometry(Math.max(radius, 0.001), 12, 9), material);
  ball.name = 'mini-dragon-joint-ball';
  ball.position.set(position.x, position.y, position.z);
  group.add(ball);
}

function visualNumber(part: AssemblyPart, key: string, fallback: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampedVisualNumber(part: AssemblyPart, key: string, fallback: number): number {
  return Math.max(0, Math.min(1, visualNumber(part, key, fallback)));
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

function fract(value: number): number {
  return value - Math.floor(value);
}
