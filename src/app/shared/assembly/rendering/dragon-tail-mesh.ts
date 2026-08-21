import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildGlowNode, buildJointBall, jointBallScale } from './dragon-anatomy';
import {
  boxUv,
  detail,
  latheProfileRadius,
  mesh,
  revolvedUv,
  sphereUv,
} from './dragon-geometry';
import { DRAGON_TALON_BLUNT_END, buildDragonTalon } from './dragon-limb-mesh';
import { DragonPalette, hornMaterial, scaleMaterial } from './dragon-materials';
import { DragonTailClubStyle, getActiveDragonStyle } from './dragon-style';
import { HORN_TILE, SCALE_TILE } from './dragon-texture-constants';
import { visualFlag, visualNumber } from './dragon-visual-parameter-readers';


const TAIL_PROFILE: readonly [number, number][] = [
  [-0.5, 0.78],
  [-0.2, 0.84],
  [0.1, 0.92],
  [0.5, 1.0],
];

/** Radius factor of the tail lathe at `t` along its length, clamped at both ends. */
function tailProfileRadius(t: number): number {
  return latheProfileRadius(TAIL_PROFILE, t);
}

export function buildDragonTailSegment(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const lathe = new THREE.LatheGeometry(
    TAIL_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    detail(14),
  );
  revolvedUv(lathe, dims.x * 0.76, dims.y, SCALE_TILE, palette);
  const skin = mesh(lathe, scaleMaterial(palette));
  skin.name = 'dragon-tail-skin';
  group.add(skin);

  /*
   * A vertebra at each end. Tail links hinge at exactly their own ends — every
   * pivot in the chain is ±0.5 of the segment — and they are the joints that
   * bend furthest, since the droop accumulates down the chain and a sweep
   * swings all of them at once. Reading as a row of knuckles down the tail is
   * a side effect, and a welcome one.
   */
  const scale = jointBallScale(part);
  // Each hinge is shared by two links. Drawing a ball at both ends of every
  // link placed two complete spheres on each pivot and turned the tail into a
  // string of beads; the child link's root ball alone closes the same socket.
  for (const end of [0.5] as const) {
    const ball = buildJointBall(
      tailProfileRadius(end) * dims.x * scale,
      palette,
      `dragon-tail-${end < 0 ? 'tip' : 'root'}-ball`,
    );
    ball.position.y = end * dims.y;
    group.add(ball);
  }

  // One lantern per side per segment. Across a whole tail that is a line of
  // lights trailing the animal, and it is the part of the glow a student sees
  // most in the arena, where the tail swings out past the body.
  if (visualFlag(part, 'glowMarkings')) {
    // The segment is a lathe about Y: `t` runs its length and the profile gives
    // the radius there, so a node has to be seated against that radius rather
    // than at a guessed fraction of the part's width.
    const seatT = 0.1;
    const seatRadius = tailProfileRadius(seatT) * dims.x;
    for (const side of [-1, 1] as const) {
      const node = buildGlowNode(dims.x * 0.32);
      node.name = `dragon-glow-tail-${side < 0 ? 'left' : 'right'}`;
      node.position.set(0, seatT * dims.y, side * seatRadius * 1.02);
      node.rotation.y = Math.PI / 2;
      group.add(node);
    }
  }

  return group;
}

export function buildDragonTailClub(part: AssemblyPart, palette: DragonPalette): THREE.Group {
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
    const beacon = buildGlowNode(dims.z * 0.42);
    beacon.name = 'dragon-glow-tail-beacon';
    beacon.position.set(0, knobCentre.y - dims.z * 0.55, 0);
    beacon.scale.set(1, 0.72, 1);
    group.add(beacon);
  }

  return group;
}

export function buildDragonTailStinger(radius: number, palette: DragonPalette): THREE.Group {
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
  const blade = buildDragonTalon(radius * 0.5, bladeLength, palette);
  blade.rotation.z = Math.PI;
  // Anchored by its blunt end at the knuckle's core and driven the other way,
  // out of the free end of the tail. Hung from its middle, as it was, the blunt
  // end broke back out through the top of the knuckle — a flat slab of keratin
  // sitting where the stinger joins the tail.
  blade.position.y = knuckle.position.y - DRAGON_TALON_BLUNT_END * bladeLength;
  group.add(blade);

  return group;
}
