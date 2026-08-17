import * as THREE from 'three';
import { RenderQuality } from '../../assembly/rendering/render-quality';
import { seaStackFooting } from './berk-sea-stack';

/**
 * The spectators' stand, on the landward side of the ring.
 *
 * Berk watches its dragons; a training ring with a walkway and nobody's seat is
 * a rig rather than a place. This is the seating, and it goes on *one* side on
 * purpose — the other side of the island is the drop, and a stand that ringed
 * the pit would either float over the sea or quietly cancel the overhang the
 * island exists for.
 *
 * Built the way the village would build it: straight timber chorded around the
 * curve rather than steam-bent to it, every tier carried on a raker driven into
 * the rock, and a carved dragon prow at each end of the run — the same stem a
 * longship gets, because these are people who put a dragon on the front of
 * anything they are proud of.
 *
 * Scenery only. It stands outside the ring the physics holds the dragons
 * inside, and nothing here is ever collided with.
 */

/**
 * The arena's timber, repeated rather than imported.
 *
 * The renderer service holds the same values for the palisade and the gallery,
 * and this file cannot import them without a cycle. Kept in step by hand: a
 * stand in a different brown reads as a different building.
 */
const TIMBER = {
  beam: 0x6b563c,
  beamDark: 0x4e3f2c,
  bench: 0x7a6344,
  bone: 0xc0aa7c,
  iron: 0x292d2d,
  eye: 0xd9a441,
} as const;

/** Shield facings, matching the ones hung on the palisade. */
const SHIELD_FACINGS = [0x8a6a34, 0x3f5568, 0x7a3a2c, 0xa39a86] as const;

const STAND = {
  /**
   * Clear of the gallery's outer edge, which sits at `pitRadius + 2.1` with a
   * fascia hanging under it.
   */
  frontOffset: 2.9,
  tiers: 5,
  tierDepth: 0.85,
  tierRise: 0.72,
  /**
   * Front bench clear of the gallery rail, so the back rows are looking over
   * the heads on the walkway rather than into them.
   *
   * Set high on purpose. The palisade tops out around four units and the
   * gallery rail just above it, so a stand that started level with them was
   * hidden behind the fence from inside the pit — which is where the arena is
   * actually watched from. Starting above the rail and climbing steeply is what
   * makes it read as seating rather than as more scaffolding.
   */
  frontHeight: 4.4,
  /**
   * Widest the run may be, before the rock has its say. A stand much longer
   * than this starts to wrap the pit, and the point of it is that it faces the
   * fight from one side.
   */
  maxHalfSpan: 0.85,
  bays: 14,
  baysLow: 9,
} as const;

export interface BerkGrandstandOptions {
  pitRadius: number;
  quality: RenderQuality;
}

/**
 * How far around the ring the stand runs, given the rock it has to stand on.
 *
 * Derived rather than authored: the seaward side of the island is a drop, so
 * the arc is whatever fits on the footing with its back corners still on rock.
 * Moving the island under it therefore moves the stand instead of leaving it
 * hanging over the water.
 */
export interface GrandstandFootprint {
  /** Half the arc the run covers, in radians, centred on the landward side. */
  halfSpan: number;
  /** Radius of the front row. */
  frontRadius: number;
  /** Radius of the back row. */
  backRadius: number;
}

export function grandstandFootprint(pitRadius: number): GrandstandFootprint {
  const footing = seaStackFooting(pitRadius);
  const frontRadius = pitRadius + STAND.frontOffset;
  const backRadius = frontRadius + (STAND.tiers - 1) * STAND.tierDepth;
  const corner = new THREE.Vector2();
  let halfSpan = 0.2;

  for (let candidate = STAND.maxHalfSpan; candidate > 0.2; candidate -= 0.02) {
    corner.set(
      Math.cos(Math.PI - candidate) * backRadius,
      Math.sin(Math.PI - candidate) * backRadius,
    );
    // Inside the footing with a little to spare: the rock's edge is craggy, and
    // a back post landing exactly on the nominal circle can find air.
    if (corner.distanceTo(footing.center) <= footing.radius * 0.97) {
      halfSpan = candidate;
      break;
    }
  }

  return { halfSpan, frontRadius, backRadius };
}

export function createBerkGrandstand(options: BerkGrandstandOptions): THREE.Group {
  const group = new THREE.Group();
  const { halfSpan, frontRadius } = grandstandFootprint(options.pitRadius);
  const bays = options.quality === 'low' ? STAND.baysLow : STAND.bays;
  const bayAngle = (halfSpan * 2) / bays;
  // Centred on -x, the landward side, which is where the rock is.
  const angleAt = (index: number): number => Math.PI - halfSpan + index * bayAngle;
  // A chord is shorter than the arc it spans; overlap the planks a little so no
  // daylight shows between two bays.
  const chord = 2 * frontRadius * Math.sin(bayAngle / 2) * 1.06;

  const beam = new THREE.MeshStandardMaterial({
    color: TIMBER.beam,
    roughness: 0.94,
    metalness: 0,
  });
  const beamDark = new THREE.MeshStandardMaterial({
    color: TIMBER.beamDark,
    roughness: 1,
    metalness: 0,
  });
  const benchTimber = new THREE.MeshStandardMaterial({
    color: TIMBER.bench,
    roughness: 0.92,
    metalness: 0,
  });

  addSeating(group, { bays, halfSpan, frontRadius, chord, angleAt, benchTimber, beamDark });
  addUnderframe(group, { bays, frontRadius, angleAt, beam, beamDark });
  addFrontRail(group, { bays, frontRadius, chord, angleAt, beamDark });
  addShields(group, { bays, frontRadius, angleAt });

  if (options.quality !== 'low') {
    addCanopy(group, { bays, frontRadius, chord, angleAt, beam, beamDark });
  }

  // The signature: a carved stem at each end of the run, facing the pit.
  for (const index of [0, bays]) {
    const angle = angleAt(index);
    const prow = createDragonProw(beamDark);
    prow.position.set(Math.cos(angle) * frontRadius, 0, Math.sin(angle) * frontRadius);
    prow.rotation.y = -angle;
    group.add(prow);
  }

  return group;
}

interface BayLayout {
  bays: number;
  frontRadius: number;
  angleAt(index: number): number;
}

/**
 * The tiers themselves: a foot plank and a bench above and behind it, repeated
 * up and back.
 *
 * Instanced, because this is seventy pieces of timber that differ only in where
 * they are — drawing them one at a time would cost more than everything else in
 * the arena put together, for the part of it nobody looks directly at.
 */
function addSeating(
  group: THREE.Group,
  layout: BayLayout & {
    halfSpan: number;
    chord: number;
    benchTimber: THREE.Material;
    beamDark: THREE.Material;
  },
): void {
  const count = layout.bays * STAND.tiers;
  const decks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(STAND.tierDepth * 0.92, 0.14, layout.chord),
    layout.beamDark,
    count,
  );
  const benches = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.18, layout.chord),
    layout.benchTimber,
    count,
  );
  decks.castShadow = true;
  decks.receiveShadow = true;
  benches.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();
  let instance = 0;

  for (let tier = 0; tier < STAND.tiers; tier += 1) {
    const radius = layout.frontRadius + tier * STAND.tierDepth;
    const height = STAND.frontHeight + tier * STAND.tierRise;

    for (let bay = 0; bay < layout.bays; bay += 1) {
      // Mid-bay, so a plank spans its bay rather than straddling two posts.
      const angle = (layout.angleAt(bay) + layout.angleAt(bay + 1)) / 2;
      euler.set(0, -angle, 0);
      quaternion.setFromEuler(euler);

      position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      decks.setMatrixAt(instance, matrix.compose(position, quaternion, scale));

      // Set back into the step, so the row behind has somewhere for its feet.
      const benchRadius = radius + STAND.tierDepth * 0.3;
      position.set(
        Math.cos(angle) * benchRadius,
        height + 0.4,
        Math.sin(angle) * benchRadius,
      );
      benches.setMatrixAt(instance, matrix.compose(position, quaternion, scale));
      instance += 1;
    }
  }

  decks.instanceMatrix.needsUpdate = true;
  benches.instanceMatrix.needsUpdate = true;
  group.add(decks);
  group.add(benches);
}

/**
 * What holds the tiers up: a raker per bay boundary running the whole rise, and
 * a pair of uprights under each end of it.
 *
 * The raker is the honest member — a stepped stand is a sloped beam with the
 * seating notched into it — and it is also the one that reads from the pit,
 * because it is the diagonal in a structure that is otherwise all verticals.
 */
function addUnderframe(
  group: THREE.Group,
  layout: BayLayout & { beam: THREE.Material; beamDark: THREE.Material },
): void {
  const backRadius = layout.frontRadius + (STAND.tiers - 1) * STAND.tierDepth;
  const backHeight = STAND.frontHeight + (STAND.tiers - 1) * STAND.tierRise;
  const rise = backHeight - STAND.frontHeight;
  const run = backRadius - layout.frontRadius;
  const rakerLength = Math.hypot(rise, run) + 0.6;
  const posts = layout.bays + 1;

  const uprights = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.17, 0.21, 1, 7),
    layout.beam,
    posts * 2,
  );
  const rakers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(rakerLength, 0.26, 0.24),
    layout.beamDark,
    posts,
  );
  uprights.castShadow = true;
  rakers.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();

  for (let index = 0; index <= layout.bays; index += 1) {
    const angle = layout.angleAt(index);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    euler.set(0, -angle, 0);
    quaternion.setFromEuler(euler);

    // Uprights are scaled rather than remade: one unit-height cylinder stretched
    // to whatever this end of the frame needs.
    for (const [slot, radius, height] of [
      [0, layout.frontRadius, STAND.frontHeight],
      [1, backRadius, backHeight],
    ] as const) {
      position.set(cos * radius, height / 2, sin * radius);
      scale.set(1, height, 1);
      uprights.setMatrixAt(index * 2 + slot, matrix.compose(position, quaternion, scale));
    }
    scale.set(1, 1, 1);

    const midRadius = (layout.frontRadius + backRadius) / 2;
    position.set(cos * midRadius, (STAND.frontHeight + backHeight) / 2, sin * midRadius);
    // Pitched up along the run, in the bay's own radial plane.
    euler.set(0, -angle, Math.atan2(rise, run));
    quaternion.setFromEuler(euler);
    rakers.setMatrixAt(index, matrix.compose(position, quaternion, scale));
  }

  uprights.instanceMatrix.needsUpdate = true;
  rakers.instanceMatrix.needsUpdate = true;
  group.add(uprights);
  group.add(rakers);
}

/** A rail along the front row, so the front bench is not a ledge over the pit. */
function addFrontRail(
  group: THREE.Group,
  layout: BayLayout & { chord: number; beamDark: THREE.Material },
): void {
  const radius = layout.frontRadius - STAND.tierDepth * 0.55;
  const rails = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.16, layout.chord),
    layout.beamDark,
    layout.bays,
  );
  rails.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();

  for (let bay = 0; bay < layout.bays; bay += 1) {
    const angle = (layout.angleAt(bay) + layout.angleAt(bay + 1)) / 2;
    euler.set(0, -angle, 0);
    quaternion.setFromEuler(euler);
    position.set(
      Math.cos(angle) * radius,
      STAND.frontHeight + 0.85,
      Math.sin(angle) * radius,
    );
    rails.setMatrixAt(bay, matrix.compose(position, quaternion, scale));
  }

  rails.instanceMatrix.needsUpdate = true;
  group.add(rails);
}

/**
 * Shields hung off the front rail.
 *
 * The same cheap trick as the ones on the palisade, and worth repeating here
 * for the same reason: painted wood at the front of an empty stand says the
 * seats belong to somebody.
 */
function addShields(group: THREE.Group, layout: BayLayout): void {
  const count = Math.max(3, Math.floor(layout.bays / 2));
  const shields = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.07, 12),
    new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.06 }),
    count,
  );
  shields.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const facing = new THREE.Vector3();
  const colour = new THREE.Color();
  const radius = layout.frontRadius - STAND.tierDepth * 0.62;

  for (let index = 0; index < count; index += 1) {
    // Seeded wobble, the same one the palisade uses, so the hanging is uneven
    // in the same way and stays put between matches.
    const wobble = Math.sin(index * 12.9898) * 0.5 + Math.sin(index * 4.1414) * 0.5;
    const bay = (index + 0.5) * (layout.bays / count);
    const angle = layout.angleAt(bay) + wobble * 0.04;

    position.set(
      Math.cos(angle) * radius,
      STAND.frontHeight + 0.5 + wobble * 0.12,
      Math.sin(angle) * radius,
    );
    // The disc's local +y becomes the inward normal, so a face looks at the pit.
    facing.set(-Math.cos(angle), 0, -Math.sin(angle));
    quaternion.setFromUnitVectors(up, facing);
    shields.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    shields.setColorAt(index, colour.setHex(SHIELD_FACINGS[index % SHIELD_FACINGS.length]));
  }

  shields.instanceMatrix.needsUpdate = true;
  if (shields.instanceColor) shields.instanceColor.needsUpdate = true;
  group.add(shields);
}

/**
 * A shingled roof over the back rows, on posts rising off the top tier.
 *
 * Berk is weather. A stand with no roof over the good seats reads as a set
 * built for a sunny day, and the roof is also what gives the structure a
 * silhouette against the sky from inside the pit — without it the stand is a
 * low wedge that disappears behind the palisade.
 */
function addCanopy(
  group: THREE.Group,
  layout: BayLayout & { chord: number; beam: THREE.Material; beamDark: THREE.Material },
): void {
  const backRadius = layout.frontRadius + (STAND.tiers - 1) * STAND.tierDepth;
  const backHeight = STAND.frontHeight + (STAND.tiers - 1) * STAND.tierRise;
  const eaveRadius = backRadius - STAND.tierDepth * 1.6;
  const postHeight = 2.6;
  const ridgeHeight = backHeight + postHeight + 0.9;

  const posts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.16, postHeight, 6),
    layout.beam,
    layout.bays + 1,
  );
  const shingles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(backRadius - eaveRadius + 1.5, 0.16, layout.chord),
    layout.beamDark,
    layout.bays,
  );
  posts.castShadow = true;
  shingles.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();

  for (let index = 0; index <= layout.bays; index += 1) {
    const angle = layout.angleAt(index);
    euler.set(0, -angle, 0);
    quaternion.setFromEuler(euler);
    position.set(
      Math.cos(angle) * eaveRadius,
      backHeight + postHeight / 2,
      Math.sin(angle) * eaveRadius,
    );
    posts.setMatrixAt(index, matrix.compose(position, quaternion, scale));
  }

  // The roof falls from a ridge at the back to an eave over the seats, which is
  // the pitch a lean-to gets when it is built against nothing.
  const pitch = Math.atan2(
    ridgeHeight - (backHeight + postHeight),
    backRadius - eaveRadius,
  );

  for (let bay = 0; bay < layout.bays; bay += 1) {
    const angle = (layout.angleAt(bay) + layout.angleAt(bay + 1)) / 2;
    euler.set(0, -angle, pitch);
    quaternion.setFromEuler(euler);
    position.set(
      Math.cos(angle) * (eaveRadius + backRadius) / 2,
      (backHeight + postHeight + ridgeHeight) / 2,
      Math.sin(angle) * (eaveRadius + backRadius) / 2,
    );
    shingles.setMatrixAt(bay, matrix.compose(position, quaternion, scale));
  }

  posts.instanceMatrix.needsUpdate = true;
  shingles.instanceMatrix.needsUpdate = true;
  group.add(posts);
  group.add(shingles);
}

/**
 * A carved dragon stem, of the kind that goes on the front of a longship.
 *
 * The post leans back and the neck curls forward over the pit, so the head is
 * looking down at the fight rather than out to sea — which is the whole joke of
 * putting one on a dragon arena.
 *
 * Built from primitives at a size meant to be read from across the ring: a
 * blunt wedge of a skull, a jaw under it, two horns raked back, and an eye that
 * catches the brazier light. Anything finer than this is invisible at twenty
 * metres and costs the same to draw.
 */
function createDragonProw(timber: THREE.Material): THREE.Group {
  const prow = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({
    color: TIMBER.bone,
    roughness: 0.88,
    metalness: 0,
  });

  const stemHeight = 5.4;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.26, stemHeight, 7),
    timber,
  );
  stem.position.set(-0.35, stemHeight / 2, 0);
  stem.rotation.z = -0.13;
  stem.castShadow = true;
  prow.add(stem);

  /*
   * The curl: four short lengths stepping forward and flattening out, each one
   * leaning a little less than the last. A single bent tube would be smoother
   * and would look machined; this is a stem somebody shaped with an adze.
   */
  const neck = new THREE.Group();
  let x = -0.2;
  let y = stemHeight - 0.1;
  for (let index = 0; index < 4; index += 1) {
    const lean = 0.95 - index * 0.22;
    const length = 0.62 - index * 0.05;
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155 - index * 0.012, 0.175 - index * 0.012, length, 6),
      timber,
    );
    segment.position.set(x + Math.sin(lean) * length / 2, y + Math.cos(lean) * length / 2, 0);
    segment.rotation.z = -lean;
    segment.castShadow = true;
    neck.add(segment);
    x += Math.sin(lean) * length;
    y += Math.cos(lean) * length;
  }
  prow.add(neck);

  const head = new THREE.Group();
  head.position.set(x, y, 0);
  // Nose down over the pit.
  head.rotation.z = -0.62;

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.36, 0.34), timber);
  skull.position.set(0.3, 0.06, 0);
  skull.castShadow = true;
  head.add(skull);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 5), timber);
  snout.position.set(0.86, 0.02, 0);
  snout.rotation.z = -Math.PI / 2;
  head.add(snout);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.26), timber);
  jaw.position.set(0.36, -0.2, 0);
  jaw.rotation.z = 0.12;
  head.add(jaw);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.62, 5), bone);
    horn.position.set(-0.06, 0.2, side * 0.13);
    horn.rotation.set(side * 0.22, 0, 1.05);
    head.add(horn);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 8, 6),
      new THREE.MeshStandardMaterial({
        color: TIMBER.eye,
        emissive: TIMBER.eye,
        emissiveIntensity: 0.35,
        roughness: 0.5,
      }),
    );
    eye.position.set(0.42, 0.11, side * 0.17);
    head.add(eye);

    // A row of teeth, as one notched plate rather than individual fangs.
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.04), bone);
    teeth.position.set(0.4, -0.11, side * 0.11);
    head.add(teeth);
  }

  prow.add(head);
  return prow;
}
