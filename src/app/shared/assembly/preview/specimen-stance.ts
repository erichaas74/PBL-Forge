import { SpecimenIdleMotion } from './specimen-motion';
import { SpecimenBend, SpecimenPoseOptions } from './specimen-pose';

/**
 * The resting stance every specimen viewer poses a dragon into.
 *
 * Blueprints are authored for the *arena*, where a solver and gravity settle
 * the animal. The viewer has neither, so an unposed blueprint stands with its
 * legs perfectly vertical, its back dead level, and its wings folded flat — a
 * parts diagram rather than an animal. This is the layer that puts weight into
 * it, and it is deliberately static: it costs nothing per frame, so it applies
 * everywhere, including baked thumbnails.
 *
 * ## Reading the angles
 *
 * The body runs along X with the head at +X, Y is up, and Z is lateral.
 *
 * Most bends rotate about +Z, the sagittal axis, and swing a part in the
 * side-on plane. A positive angle rotates counter-clockwise seen from +Z, which
 * means it swings a **hanging** part forward toward the head, lifts anything
 * ahead of its pivot, and drops anything trailing behind it. Both of those
 * signs were wrong on the first pass here, in opposite directions, so trust the
 * measurements in the stance spec over the intuition.
 *
 * Bends accumulate down a chain: a joint's rotation is inherited by every part
 * below it. So the numbers below are **deltas**, not absolute angles. This is
 * why a leg needs three entries — a limb alternates direction at each joint,
 * and a single role bend would curl it into an arc.
 *
 * ## The silhouette this is aiming at
 *
 * A heavy quadruped standing at rest. Hind limbs gathered under the hips and
 * taking the weight, forelimbs straighter and further forward, chest slightly
 * lower than the hips, feet flat on the ground, tail falling from the base and
 * levelling out, wings folded against the flank rather than held out.
 */

/** Every dragon leg id contains its position; ids are semantic by convention. */
const isRear = (partId: string): boolean => partId.includes('rear');
const isFront = (partId: string): boolean => partId.includes('front');
const isLowerLeg = (partId: string): boolean => partId.includes('lower-leg');
const isFoot = (partId: string): boolean => partId.includes('foot');
/** Upper leg: carries neither the lower-leg nor the foot marker. */
const isUpperLeg = (partId: string): boolean => !isLowerLeg(partId) && !isFoot(partId);

/** Side-on plane: swings a part forward and back. */
const SAGITTAL = { x: 0, y: 0, z: 1 };
/** Roll plane: swings a part out to the side and down. */
const LATERAL = { x: 1, y: 0, z: 0 };
/** Yaw plane: swings a part from pointing sideways to pointing fore or aft. */
const VERTICAL = { x: 0, y: 1, z: 0 };

/**
 * Hind limb. Femur forward under the hip, tibia back beneath it, foot flat.
 *
 * Absolute angles +0.24 / −0.22 / 0. Gathering the femur forward is what puts
 * the hind foot under the hip instead of behind it, and is most of what makes
 * the animal look like it is carrying its own weight.
 */
const HIND_LIMB: readonly SpecimenBend[] = [
  { role: 'leg', matchPartId: id => isRear(id) && isUpperLeg(id), radians: 0.24, axis: SAGITTAL },
  { role: 'leg', matchPartId: id => isRear(id) && isLowerLeg(id), radians: -0.46, axis: SAGITTAL },
  // Back to level: the sole has to meet the ground, not point at it. Every
  // bend also *shortens* the limb's vertical reach, so this last one is tuned
  // against the measured foot height, not by eye — see the stance spec.
  { role: 'leg', matchPartId: id => isRear(id) && isFoot(id), radians: 0.22, axis: SAGITTAL },
];

/**
 * Fore limb. Straighter than the hind, and set slightly back under the chest.
 *
 * Absolute angles −0.12 / +0.08 / 0. A quadruped's forelimb is a prop rather
 * than a spring, so it stays much closer to vertical; bending it as far as the
 * hind reads as a crouch.
 */
const FORE_LIMB: readonly SpecimenBend[] = [
  { role: 'leg', matchPartId: id => isFront(id) && isUpperLeg(id), radians: -0.12, axis: SAGITTAL },
  { role: 'leg', matchPartId: id => isFront(id) && isLowerLeg(id), radians: 0.2, axis: SAGITTAL },
  { role: 'leg', matchPartId: id => isFront(id) && isFoot(id), radians: -0.08, axis: SAGITTAL },
];

/**
 * Wings folded down along the flank.
 *
 * The authored blueprint holds them straight out sideways, which is the pose a
 * wing is in only in flight — at rest it is the single most artificial thing
 * about the silhouette, and it also splays the framing sphere wide enough to
 * shrink the animal in every viewport.
 *
 * Two bends, and the order between them is the whole trick.
 *
 * **Yaw**, about the vertical, swings the wing from pointing straight out
 * sideways to trailing along the flank. This is the fold: a wing that projects
 * laterally cannot be folded by rolling it, which only hangs it off the side
 * like a flag — and hangs it straight through the hind leg. `mirrorAcrossZ`
 * turns both wings the same way relative to the body rather than both the same
 * way in world space.
 *
 * **Then a sagittal drop**, to settle the folded wing against the flank instead
 * of leaving it level with the spine. It has to come second and it has to be
 * sagittal: once the yaw has swung the wing to point aft, the wing lies almost
 * along the lateral axis, so a lateral roll barely moves it — which is exactly
 * what the first attempt at this did, to no visible effect. No mirroring here;
 * both wings drop the same way in world space, and mirroring would lift one.
 */
const FOLDED_WINGS: readonly SpecimenBend[] = [
  { role: 'wing', radians: -1.25, axis: VERTICAL, mirrorAcrossZ: true },
  { role: 'wing', radians: 0.3, axis: SAGITTAL },
];

/**
 * Head lifted a little off the neutral axis, so the animal looks ahead rather
 * than through the floor. Small: the head is a long lever and a few hundredths
 * more here reads as a rearing threat rather than a resting animal.
 */
const RAISED_HEAD: readonly SpecimenBend[] = [
  { role: 'head', radians: 0.12, axis: SAGITTAL },
];

/**
 * Resting droop per tail link, in radians.
 *
 * Applied by `buildSpecimenPose` to every `tail` chain and accumulated, so the
 * tail leaves the hips falling and flattens out along its length rather than
 * bending at one hinge.
 */
export const TAIL_DROOP_RADIANS = 0.13;

/**
 * The shared resting pose.
 *
 * Passed as the mount-time default by every specimen surface, so the dragon a
 * student meets in the hatchery is standing the same way as the one on the
 * pedigree card and the one in the test bench.
 */
export const DRAGON_RESTING_POSE: SpecimenPoseOptions = {
  droopRadians: TAIL_DROOP_RADIANS,
  bends: [...HIND_LIMB, ...FORE_LIMB, ...FOLDED_WINGS, ...RAISED_HEAD],
};

/**
 * The resting breath.
 *
 * A standing animal that is perfectly still reads as a model of an animal, and
 * no amount of material work fixes that. This is the cheapest available fix:
 * three small oscillations laid over the resting stance.
 *
 * Every amplitude here is at or below 0.03 radians — under two degrees. That is
 * deliberately below the threshold where a reader consciously notices movement,
 * because this plays permanently beside text a student is trying to read. The
 * intent is that the dragon reads as alive without ever asking to be watched.
 *
 * The three channels run at different rates and are offset from one another, so
 * they never line up into a single pulsing beat — which is what makes a loop
 * read as breathing rather than as an animation.
 */
export const DRAGON_IDLE_BREATH: SpecimenIdleMotion = {
  id: 'dragon-breath',
  // Slow. A resting animal this size does not pant.
  periodSeconds: 5.2,
  bendsAt(phase) {
    const breath = Math.sin(phase * Math.PI * 2);
    /*
     * Double rate with a quarter-cycle offset, so the tail is on its own beat.
     *
     * Any second channel has to complete a **whole number** of cycles over the
     * period or the loop does not close, and the pose jumps the instant phase
     * wraps from 1 back to 0. The first version of this ran at half rate, which
     * put a visible flick in the tail once every 5.2 seconds — slow enough to
     * look like a glitch rather than a movement.
     */
    const settle = Math.sin(phase * Math.PI * 4 + Math.PI * 0.25);

    return [
      // Chest rising and falling, taken at the head because the body is the
      // root of the rig and no bend can reach it.
      { role: 'head', radians: breath * 0.022, axis: SAGITTAL },
      // The tail is a long lever, so the smallest angle here travels furthest
      // and is the part most likely to be seen from the corner of an eye.
      { role: 'tail', radians: settle * 0.012, axis: SAGITTAL },
      // Wings ride the ribcage they are attached to.
      { role: 'wing', radians: breath * 0.03, axis: SAGITTAL },
    ];
  },
};
