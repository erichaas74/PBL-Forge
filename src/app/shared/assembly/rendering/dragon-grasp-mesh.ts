import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildJointBall, jointBallScale, spreadPositions } from './dragon-anatomy';
import { buildDragonTalon, DRAGON_TALON_BLUNT_END } from './dragon-foot-mesh';
import { detail, mesh, revolvedUv } from './dragon-geometry';
import { addLimbJointBalls } from './dragon-leg-mesh';
import { DragonPalette, scaleMaterial } from './dragon-materials';
import { DragonGraspStyle, getActiveDragonStyle } from './dragon-style';
import { SCALE_TILE } from './dragon-texture-constants';
import { visualNumber } from './dragon-visual-parameter-readers';

/** A slender, non-weight-bearing arm profile that tapers toward the wrist. */
const GRASP_ARM_PROFILE: readonly [number, number][] = [
  [-0.5, 0.34],
  [-0.28, 0.4],
  [0.02, 0.5],
  [0.3, 0.72],
  [0.5, 0.64],
];

export function buildDragonGraspArm(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const lathe = new THREE.LatheGeometry(
    GRASP_ARM_PROFILE.map(([t, radius]) => new THREE.Vector2(radius * dims.x, t * dims.y)),
    detail(14),
  );
  revolvedUv(lathe, dims.x * 0.6, dims.y, SCALE_TILE, palette);
  const skin = mesh(lathe, scaleMaterial(palette));
  skin.name = 'dragon-grasp-arm-skin';
  group.add(skin);

  addLimbJointBalls(group, part, palette, GRASP_ARM_PROFILE, 'dragon-grasp-arm');
  return group;
}

/**
 * The hand: a wrist with two long upper fingers and an opposing lower thumb,
 * held clear of the ground.
 *
 * Each finger is a digit rather than a spike — two scaled phalanges bending at
 * a knuckle, ending in the same {@link buildDragonTalon} keratin the feet wear. The
 * whole-keratin version this replaced read as a fork: three cones stuck in a
 * brick, with nothing in the silhouette to say the thing could close. Skin on
 * the segments and claw only on the tip is what separates a talon *on a finger*
 * from a talon *for a toe*, and the two bends are what make the curl legible
 * from any distance.
 *
 * There is deliberately no palm pad. The three digits leave the rear/outer face
 * of the wrist itself, which keeps their roots attached while letting their
 * shafts project cleanly away from the arm.
 *
 * They point forward along +x and hook down, so the hand is a curl waiting to
 * close rather than a rake pointing at the floor.
 */
export function buildDragonGraspHand(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const defaults = getActiveDragonStyle().grasp;
  const style: DragonGraspStyle = {
    fingerCount: visualNumber(part, 'fingerCount', defaults.fingerCount),
    fingerLength: visualNumber(part, 'fingerLength', defaults.fingerLength),
    fingerRadius: visualNumber(part, 'fingerRadius', defaults.fingerRadius),
    palmLength: visualNumber(part, 'palmLength', defaults.palmLength),
    fingerSplay: visualNumber(part, 'fingerSplay', defaults.fingerSplay),
  };

  // The claw gene reaches the hand for the same reason it reaches the foot:
  // these are the same claws, and a dragon with big talons has big fingers.
  const clawScale = visualNumber(part, 'clawScale', 1);
  const fingerLength = dims.x * style.fingerLength * clawScale;
  const fingerRadius = dims.y * style.fingerRadius;
  const scale = jointBallScale(part);
  const wristRadius = dims.y * 0.5 * scale;
  // `palmLength` remains part of the published visual-parameter contract. With
  // the pad gone it controls the small fore-aft wrist offset instead.
  const wristX = -dims.x * style.palmLength * 0.16;
  // Matches the normalized mount inherited from the walking foot, so the wrist
  // closes around the arm joint instead of hovering below it.
  const wristY = dims.y * 0.357;

  const wrist = buildJointBall(wristRadius, palette, 'dragon-grasp-wrist-ball');
  wrist.position.set(wristX, wristY, 0);
  group.add(wrist);

  const digitCount = Math.max(1, Math.round(style.fingerCount));
  const digitSlots =
    digitCount === 3
      ? [
          {
            role: 'finger' as const,
            // The assembled reared hand rolls this local axis, so negative local
            // Y is the upper side students see.
            rootY: -0.3,
            rootZ: -(0.34 + style.fingerSplay * 0.24),
            yaw: style.fingerSplay * 0.45,
            pitch: -Math.PI / 2 + 0.18,
          },
          {
            role: 'finger' as const,
            rootY: -0.3,
            rootZ: 0.34 + style.fingerSplay * 0.24,
            yaw: -style.fingerSplay * 0.45,
            pitch: -Math.PI / 2 + 0.18,
          },
          {
            role: 'thumb' as const,
            rootY: 0.46,
            rootZ: 0,
            yaw: 0,
            // The lower digit rises toward the two upper fingers, forming the
            // opposing side of the grip instead of a third parallel tine.
            pitch: -Math.PI / 2 - 0.5,
          },
        ]
      : spreadPositions(digitCount, 2).map((side) => ({
          role: 'finger' as const,
          rootY: -0.08,
          rootZ: side * 0.72,
          yaw: -side * style.fingerSplay,
          pitch: -Math.PI / 2 - 0.2,
        }));

  for (const [index, slot] of digitSlots.entries()) {
    const finger = buildGraspFinger(fingerRadius, fingerLength, palette, index + 1, slot.role);
    // All three roots stay embedded in the wrist: two above, with the thumb
    // below and angled back toward them.
    finger.position.set(
      wristX - wristRadius * 0.35,
      wristY + wristRadius * slot.rootY,
      wristRadius * slot.rootZ,
    );
    /*
     * -90Â° about z lays the finger's own +y axis along +x. The extra fifth of a
     * radian pitches the whole digit down from there, on top of the two bends
     * inside it: the knuckle and the claw curl toward the palm, and starting
     * the chain already tipped is what aims that curl at something in front of
     * the hand rather than at the sky. The yaw fans the outer two outward, so
     * the three enclose a volume instead of lying in one plane — which is the
     * difference between a hand and a fork.
     */
    finger.rotation.set(0, slot.yaw, slot.pitch);
    group.add(finger);
  }

  return group;
}

/**
 * One finger: two scaled phalanges and a claw, curling along its own +y.
 *
 * The proportions are a hand's rather than a foot's. The proximal segment is
 * the longest and the only one that stays straight — it is what carries the
 * finger clear of the palm, and bending it would tuck the whole digit back
 * under the hand. Everything after it bends, cumulatively: the knuckle takes
 * a third of a radian and the claw another two thirds, so the tip finishes
 * about 55Â° round from where the finger left the palm. That is a grip closing
 * on something, not a hook hanging open.
 *
 * The claw is {@link buildDragonTalon} at finger scale, deliberately: a hand's claw
 * and a foot's talon are the same keratin on the same animal, and a student
 * comparing the two should see one shape used twice.
 *
 * Sized entirely from `radius` and `length` so the caller — and through it the
 * claw gene — owns the scale.
 */
function buildGraspFinger(
  radius: number,
  length: number,
  palette: DragonPalette,
  index: number,
  role: 'finger' | 'thumb' = 'finger',
): THREE.Group {
  const group = new THREE.Group();
  group.name = role === 'thumb' ? 'dragon-grasp-thumb' : `dragon-grasp-finger-${index}`;
  const skin = scaleMaterial(palette);

  const proximalLength = length * 0.46;
  const proximal = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.88, radius, proximalLength, detail(8)),
      radius,
      proximalLength,
      SCALE_TILE,
      palette,
    ),
    skin,
  );
  proximal.position.y = proximalLength * 0.5;
  group.add(proximal);

  // The base knuckle overlaps the wrist, so the finger reads as growing out of
  // the back of the hand instead of balancing on its top surface.
  const base = buildJointBall(radius * 1.04, palette, `dragon-grasp-finger-${index}-base`);
  group.add(base);

  const digitBend = role === 'thumb' ? 0.26 : -0.26;
  const knuckle = new THREE.Group();
  knuckle.name = `dragon-grasp-finger-${index}-bend`;
  knuckle.position.y = proximalLength;
  // The claw meshes are rolled 180 degrees around their digit axes, so their
  // visible hook is opposite the claw-pivot sign. Bend the phalanges with that
  // visible hook. About fifteen degrees keeps the grasp present but relaxed.
  knuckle.rotation.z = digitBend;
  group.add(knuckle);

  const knuckleBall = buildJointBall(
    radius * 0.94,
    palette,
    `dragon-grasp-finger-${index}-knuckle`,
  );
  knuckle.add(knuckleBall);

  const middleLength = length * 0.34;
  const middle = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.86, middleLength, detail(8)),
      radius * 0.74,
      middleLength,
      SCALE_TILE,
      palette,
    ),
    skin,
  );
  middle.position.y = middleLength * 0.5;
  knuckle.add(middle);

  const clawPivot = new THREE.Group();
  clawPivot.name = `dragon-grasp-claw-pivot-${index}`;
  clawPivot.position.y = middleLength;
  // This is only the hook at the end of a finger. The whole-hand downward angle
  // belongs to the reared stance, where fingers and claws rotate together.
  // Continue the phalange bend through the claw joint so the whole digit forms
  // one curve instead of changing direction abruptly at the keratin.
  clawPivot.rotation.z = (role === 'thumb' ? -0.62 : 0.62) + digitBend;
  knuckle.add(clawPivot);

  /*
   * Slimmer than the digit it grows from — about half its width — and longer
   * than either segment. A claw as wide as the finger reads as the end cap of
   * a sausage; the step down from skin to keratin is what says the tip is a
   * different material doing a different job.
   */
  // The hand was enlarged 1.5x, but the keratin should retain its former size.
  // Compensate only the talon; the wrist, fingers, and joints keep the new scale.
  const clawSizeCompensation = 1 / 1.5;
  const clawLength = length * 0.52 * clawSizeCompensation;
  const claw = buildDragonTalon(
    radius * 0.62 * clawSizeCompensation,
    clawLength,
    palette,
    role === 'thumb' ? -1 : 1,
  );
  claw.name = `dragon-grasp-claw-${index}`;
  // Reverse the hook around the digit's own axis. This is a true 180-degree
  // curl flip: it leaves the claw pointing along the finger while moving its
  // curved tip to the opposite side.
  claw.rotation.y = Math.PI;
  // Its own blunt end reaches back behind its origin; seating it that far
  // forward buries the root in the segment it grows out of instead of leaving
  // a step between keratin and skin.
  claw.position.y = clawLength * DRAGON_TALON_BLUNT_END * 0.6;
  clawPivot.add(claw);

  return group;
}
