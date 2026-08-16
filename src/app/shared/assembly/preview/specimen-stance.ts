import { AssemblyBlueprint } from '../domain/assembly.models';
import { SpecimenIdleMotion } from './specimen-motion';
import { SpecimenBend, SpecimenPoseOptions } from './specimen-pose';

/**
 * The resting stance every specimen viewer poses a dragon into.
 *
 * Blueprints are authored for the *arena*, where a solver and gravity settle
 * the animal. The viewer has neither, so an unposed blueprint stands with its
 * legs perfectly vertical, its back dead level, and its wings dead square — a
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
 * levelling out, and the wings spread out from the shoulders, swept a little aft
 * and riding just above the spine.
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
 * Wings held out from the flank, spread like a bat's.
 *
 * These used to fold: a big yaw that swung each wing back along the body, plus
 * a drop to settle it against the flank. It read as a resting animal and it cost
 * the wings everything that made them worth looking at — the membrane was
 * gathered, the fingers closed, and the hand claw had to be hidden because the
 * fold left it hanging where the spread tip used to be. A dragon's wings are the
 * largest and most interesting thing about it, and a viewer that exists to show
 * a student what a genome built should show them.
 *
 * So the wing stays extended, and the two bends only give the spread some life:
 *
 * **Yaw**, a modest sweep aft about the vertical — the wing stays out at arm's
 * length, but rakes back from the shoulder rather than standing at a dead right
 * angle. `mirrorAcrossZ` sweeps both wings back relative to the body rather than
 * both the same way in world space, which would swing one forward.
 *
 * **Then a lateral raise into a V**, and this is the bend that actually makes the
 * wings visible. The authored wing is a *horizontal* sheet: span across the body,
 * chord fore-and-aft, membrane in the ground plane. The viewer's camera sits only
 * about 17° above that plane, so a wing left flat is seen edge-on and collapses
 * into a bundle of struts laid over the back — which is what the first pass at
 * this looked like, and no amount of yaw fixes it. Lifting the wings tilts the
 * membrane toward the reader and puts the fingers and the scalloped edge in view.
 * Mirrored, so both wings rise instead of one rising and one dropping through the
 * hind leg.
 *
 * The cost is framing — extended wings splay the bounding sphere and the animal
 * sits smaller in a fixed viewport. `estimateSpecimenFrame` absorbs it, and it
 * is the right trade for a view whose whole job is to be looked at.
 */
const SPREAD_WINGS: readonly SpecimenBend[] = [
  { role: 'wing', radians: -0.35, axis: VERTICAL, mirrorAcrossZ: true },
  { role: 'wing', radians: -0.7, axis: LATERAL, mirrorAcrossZ: true },
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
  bends: [...HIND_LIMB, ...FORE_LIMB, ...SPREAD_WINGS, ...RAISED_HEAD],
};

/**
 * The other body plan: a dragon whose forelimbs grasp instead of walking.
 *
 * It cannot stand as a quadruped, because two of its four props are now arms
 * held clear of the ground — posed as a quadruped it either floats on invisible
 * front legs or noses into the floor. So it rears: weight on the hind limbs,
 * spine pitched up, tail swung down behind as the counterweight, arms folded in
 * at the chest.
 *
 * The pitch is the one number here that had to be measured rather than chosen.
 * Too little and it reads as a quadruped whose front legs fell off; too much
 * and the animal is standing to attention. 0.62 puts the spine at about
 * thirty-five degrees, which is where the hind foot is still under the hip.
 */
const REARED_PITCH_RADIANS = 0.55;

/**
 * Hind limb under a reared body.
 *
 * Not the quadruped's angles rotated: once the torso pitches up, the same femur
 * angle swings the foot out behind the animal. The femur is therefore gathered
 * further forward and the tibia straightened to put the foot back under the
 * hip, which is what carrying your own weight on two legs looks like.
 */
const REARED_HIND_LIMB: readonly SpecimenBend[] = [
  { role: 'leg', matchPartId: id => isRear(id) && isUpperLeg(id), radians: 0.52, axis: SAGITTAL },
  { role: 'leg', matchPartId: id => isRear(id) && isLowerLeg(id), radians: -0.72, axis: SAGITTAL },
  { role: 'leg', matchPartId: id => isRear(id) && isFoot(id), radians: 0.2, axis: SAGITTAL },
];

/**
 * Arms folded at the chest.
 *
 * The chain alternates, exactly like a leg: the upper arm swings back and down
 * against the ribs, the forearm comes forward and up off it, and the hand turns
 * the fingers forward with a slight downward pitch. Three bends because one
 * role bend would curl the whole arm into a hoop —
 * the same reason the walking limbs need three.
 */
const TUCKED_ARMS: readonly SpecimenBend[] = [
  { role: 'leg', matchPartId: id => isFront(id) && isUpperLeg(id), radians: -0.62, axis: SAGITTAL },
  { role: 'leg', matchPartId: id => isFront(id) && isLowerLeg(id), radians: 1.45, axis: SAGITTAL },
  // Rotate the whole hand, not each talon: fingers and claws should aim toward
  // the ground as one grasping unit.
  {
    role: 'leg',
    matchPartId: id => isFront(id) && isFoot(id),
    radians: 0.35 - Math.PI / 2,
    axis: SAGITTAL,
  },
];

/**
/**
 * Tail as a counterweight.
 *
 * Droop accumulates down the chain, so across three links this is roughly the
 * rear-up pitch again, in the opposite direction — which is the point: the
 * torso rotates the whole tail up with it, and the droop has to spend itself
 * putting the tail back out level behind the animal. The quadruped's gentle
 * 0.13 leaves it pointing at the sky along the dragon's own back; anything much
 * past this and it curls under the feet.
 */
const REARED_TAIL_DROOP_RADIANS = 0.22;

export const DRAGON_REARED_POSE: SpecimenPoseOptions = {
  droopRadians: REARED_TAIL_DROOP_RADIANS,
  bends: [...REARED_HIND_LIMB, ...TUCKED_ARMS, ...SPREAD_WINGS, ...RAISED_HEAD],
  rootTilt: {
    radians: REARED_PITCH_RADIANS,
    pivotMatchPartId: id => isRear(id) && isFoot(id),
  },
};

/**
 * The stance a given animal should be shown in.
 *
 * Read off the blueprint rather than passed in, because every surface that
 * shows a dragon — bench, hatchery, pedigree card, baked thumbnail — would
 * otherwise have to know the body plan and ask for the right pose, and the
 * first one to forget would show a reared dragon standing on hands it does not
 * have. The blueprint already carries the answer.
 */
export function dragonRestingPose(blueprint: AssemblyBlueprint): SpecimenPoseOptions {
  return hasGraspingForelimbs(blueprint) ? DRAGON_REARED_POSE : DRAGON_RESTING_POSE;
}

/** Grasping arms are named by their profile, not by a role: they are still limbs. */
export function hasGraspingForelimbs(blueprint: AssemblyBlueprint): boolean {
  return blueprint.parts.some(part => part.visualProfile?.profileId === 'dragon-grasp-arm');
}

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
