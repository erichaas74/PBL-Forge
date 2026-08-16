import {
  AssemblyAbilityId,
  SCRIPTED_ASSEMBLY_ATTACKS,
} from '../combat/assembly-abilities';
import { AssemblyBlueprint, Vector3Data } from '../domain/assembly.models';
import { SpecimenBend, SpecimenPose, buildSpecimenPose } from './specimen-pose';

/**
 * Scripted, physics-free demonstrations of each attack.
 *
 * A student pressing "Bite" wants to see the jaws work, not run a battle. Each
 * ability is a function from normalised time to a set of joint bends, replayed
 * by the renderer as pose updates — the same articulated-bend primitive the
 * resting droop uses, so nothing new has to be trusted.
 *
 * These are demonstrations, not simulations. The damage numbers beside them
 * come from the arena's real tuning; the motion is illustration.
 */

export interface AbilityDemo {
  ability: AssemblyAbilityId;
  durationSeconds: number;
  /** Fraction of the timeline where the blow lands, for the impact cue. */
  strikeAt: number;
  /** Bends at a given point in the demo, `phase` running 0..1. */
  bendsAt(phase: number): SpecimenBend[];
  /**
   * Whole-body rear-up in radians at this phase, if the move has one. Positive
   * pitches the nose up over the hind legs.
   */
  rearUpAt?(phase: number): number;
  /** Whether the fire cone should be drawn at this phase. */
  fireConeAt?(phase: number): boolean;
}

const AXIS_X: Vector3Data = { x: 1, y: 0, z: 0 };
const AXIS_Y: Vector3Data = { x: 0, y: 1, z: 0 };
const AXIS_Z: Vector3Data = { x: 0, y: 0, z: 1 };

/**
 * Every curve here must return exactly 0 at phase 0 and phase 1.
 *
 * A demo that does not start and end at rest makes the limb jump the moment a
 * student presses the button and snap back when it finishes. `specimen-ability-
 * pose.spec.ts` enforces this for all of them.
 */

/** Two beats: open, then snap shut through the resting position. */
function biteCurve(phase: number): number {
  if (phase < 0.45) return -Math.sin((phase / 0.45) * Math.PI * 0.5);
  const t = (phase - 0.45) / 0.55;
  return -Math.cos(t * Math.PI * 0.5) + Math.sin(t * Math.PI) * 0.35;
}

/**
 * Wind one way, strike the other, return: `-sin(2*pi*phase)` is zero at both
 * ends by construction, with the wind-up damped so the strike reads as the
 * bigger movement.
 */
function windAndStrikeCurve(phase: number, windUpScale: number): number {
  return -Math.sin(phase * Math.PI * 2) * (phase < 0.5 ? windUpScale : 1);
}

/** Rears back to inhale by `peak`, then eases back to rest as the breath spends. */
function inhaleCurve(phase: number, peak = 0.32): number {
  return phase < peak
    ? Math.sin((phase / peak) * Math.PI * 0.5)
    : Math.cos(((phase - peak) / Math.max(1 - peak, 1e-6)) * Math.PI * 0.5);
}

/** Jaw gape: opens, is held open through the breath, closes at the end. */
function gapeCurve(phase: number): number {
  if (phase < 0.25) return phase / 0.25;
  if (phase < 0.9) return 1;
  return Math.max(0, (1 - phase) / 0.1);
}

/**
 * Rear, hold, settle. Rises to full by `peak`, stands there until `hold`, then
 * eases back down onto the forelegs — the shape of a dragon planting itself to
 * breathe, where the stance is held for as long as the fire flows.
 */
function rearCurve(phase: number, peak: number, hold: number): number {
  if (phase <= 0) return 0;
  if (phase < peak) return Math.sin((phase / peak) * Math.PI * 0.5);
  if (phase < hold) return 1;
  return Math.cos(((phase - hold) / Math.max(1 - hold, 1e-6)) * Math.PI * 0.5);
}

/**
 * Rear, then drop through the target. Unlike {@link rearCurve} there is no
 * hold: the dragon comes down as the jaws close, so the body weight lands with
 * the bite instead of the head snapping on its own while the torso hangs back.
 * Flat after `drop` so the recovery is still and the move ends at rest.
 */
function lungeCurve(phase: number): number {
  const rise = 0.45;
  const drop = 0.78;
  if (phase < rise) return Math.sin((phase / rise) * Math.PI * 0.5);
  if (phase < drop) return Math.cos(((phase - rise) / (drop - rise)) * Math.PI * 0.5);
  return 0;
}

/**
 * Coil and crack.
 *
 * A plain sinusoid sweeps at a constant rate, which reads as a turntable
 * spinning the tail rather than a whip. This spends most of the timeline
 * winding away from the target and then returns fast and overshoots through
 * rest, so the tip is at its quickest exactly when the strike lands.
 */
function whipCurve(phase: number): number {
  const coil = 0.55;
  if (phase < coil) return -Math.sin((phase / coil) * Math.PI * 0.5) * 0.75;
  const t = (phase - coil) / (1 - coil);
  return -0.75 * Math.cos(t * Math.PI * 0.5) + Math.sin(t * Math.PI) * 0.9;
}

/**
 * The vertical half of the whip: the tail gathers upward on the coil and slams
 * down through the strike. Combined with {@link whipCurve} the tip travels a
 * helix rather than a flat circle, which is what separates a whip from a sweep.
 */
function whipLiftCurve(phase: number): number {
  const coil = 0.55;
  if (phase < coil) return Math.sin((phase / coil) * Math.PI * 0.5);
  const t = (phase - coil) / (1 - coil);
  return Math.cos(t * Math.PI * 0.5) - Math.sin(t * Math.PI) * 0.55;
}

/**
 * Peak rear-up angles, in radians.
 *
 * A breath plants hardest — the dragon is stationary and committed for the
 * whole cone. A lunge rears less because it is about to travel forward, and the
 * tail sweep only lifts enough to keep the tip off the floor at the bottom of
 * its arc. Much past 0.7 the hind feet slide out from under the body and it
 * reads as toppling rather than rearing.
 */
const BITE_REAR_RADIANS = 0.42;
const FIRE_REAR_RADIANS = 0.6;
const TAIL_REAR_RADIANS = 0.16;
/**
 * The charge's crouch, applied as a *negative* rear. Shallower than any of the
 * rears above: a dragon that pitched its nose much further down than this drove
 * its own jaw into the floor before it reached anything.
 */
const CHARGE_CROUCH_RADIANS = 0.2;

/**
 * Rake: one forelimb sweep, out and back, with none of the wind-up a bite has.
 * The whole curve is a single lobe so the move reads as a flick rather than a
 * committed swing — which is what separates a jab from a haymaker on screen.
 */
function rakeCurve(phase: number): number {
  return Math.sin(phase * Math.PI) ** 2;
}

/**
 * Charge: gather onto the hindquarters, then drive the head through. Held low
 * and flat through the strike, because a charge is horizontal — the rear here
 * is a crouch, not a rise, which is why the curve is negative.
 */
function chargeCurve(phase: number): number {
  const gather = 0.42;
  if (phase < gather) return Math.sin((phase / gather) * Math.PI * 0.5);
  const t = (phase - gather) / (1 - gather);
  return Math.cos(t * Math.PI * 0.5) - Math.sin(t * Math.PI) * 0.45;
}

const ABILITY_DEMOS: Readonly<Record<AssemblyAbilityId, AbilityDemo>> = {
  'claw-rake': {
    ability: 'claw-rake',
    durationSeconds: SCRIPTED_ASSEMBLY_ATTACKS['claw-rake'].durationSeconds,
    strikeAt: SCRIPTED_ASSEMBLY_ATTACKS['claw-rake'].strikeAt,
    bendsAt: phase => {
      const rake = rakeCurve(phase);
      return [
        // The forelimbs do the work; nothing else commits, which is the point.
        { role: 'leg', radians: rake * 0.52, axis: AXIS_Z, mirrorAcrossZ: true },
        // A short head dip follows the claw in, so the strike has a direction.
        { role: 'head', radians: rake * 0.12, axis: AXIS_Z },
        // Just enough jaw to snarl.
        { role: 'jaw', radians: -rake * 0.18, axis: AXIS_Z },
      ];
    },
  },
  'horn-charge': {
    ability: 'horn-charge',
    durationSeconds: SCRIPTED_ASSEMBLY_ATTACKS['horn-charge'].durationSeconds,
    strikeAt: SCRIPTED_ASSEMBLY_ATTACKS['horn-charge'].strikeAt,
    bendsAt: phase => {
      const drive = chargeCurve(phase);
      return [
        // Head tucked so the horns lead, and held there through the run.
        { role: 'head', radians: drive * 0.38, axis: AXIS_Z },
        { role: 'jaw', radians: -drive * 0.22, axis: AXIS_Z },
        // Legs drive back underneath as the body launches forward.
        { role: 'leg', radians: -drive * 0.34, axis: AXIS_Z, mirrorAcrossZ: true },
        // Wings sweep back out of the way rather than catching air.
        { role: 'wing', radians: -drive * 0.3, axis: AXIS_X, mirrorAcrossZ: true },
        // Tail streams out behind as a counterweight.
        { role: 'tail', radians: drive * 0.16, axis: AXIS_Z },
      ];
    },
    // Negative: the chest drops toward the floor for the run instead of rearing.
    rearUpAt: phase => -chargeCurve(phase) * CHARGE_CROUCH_RADIANS,
  },
  bite: {
    ability: 'bite',
    durationSeconds: SCRIPTED_ASSEMBLY_ATTACKS.bite.durationSeconds,
    strikeAt: SCRIPTED_ASSEMBLY_ATTACKS.bite.strikeAt,
    bendsAt: phase => {
      const open = biteCurve(phase);
      const rear = lungeCurve(phase);
      return [
        // Jaws hinge apart around the head joint, then close through it.
        { role: 'jaw', radians: open * 0.5, axis: AXIS_Z },
        // The legs rake forward as part of the pounce. They communicate attack
        // intent visually; arena locomotion remains rooted in the torso.
        {
          role: 'leg',
          radians: windAndStrikeCurve(phase, 0.4) * 0.28,
          axis: AXIS_Z,
          mirrorAcrossZ: true,
        },
        // Counter-rotated by the full rear-up so the head holds its resting
        // aim while the chest comes up. Without it the dragon rears and bites
        // the sky.
        { role: 'head', radians: -rear * BITE_REAR_RADIANS, axis: AXIS_Z },
      ];
    },
    // Up on the haunches through the wind-up, then down through the target.
    rearUpAt: phase => lungeCurve(phase) * BITE_REAR_RADIANS,
  },
  'wing-buffet': {
    ability: 'wing-buffet',
    durationSeconds: SCRIPTED_ASSEMBLY_ATTACKS['wing-buffet'].durationSeconds,
    // The slam lands on the second half of the swing.
    strikeAt: SCRIPTED_ASSEMBLY_ATTACKS['wing-buffet'].strikeAt,
    bendsAt: phase => [
      {
        role: 'wing',
        // Lift on the way up, drive down hard on the way through.
        radians: windAndStrikeCurve(phase, 0.55) * 0.85,
        axis: AXIS_X,
        mirrorAcrossZ: true,
      },
    ],
  },
  'tail-sweep': {
    ability: 'tail-sweep',
    durationSeconds: SCRIPTED_ASSEMBLY_ATTACKS['tail-sweep'].durationSeconds,
    strikeAt: SCRIPTED_ASSEMBLY_ATTACKS['tail-sweep'].strikeAt,
    bendsAt: phase => [
      // Horizontal whip: each link adds to the arc, so the tip travels furthest.
      { role: 'tail', radians: whipCurve(phase) * 0.5, axis: AXIS_Y },
      // Gathered up on the coil and driven down through the strike, so the tip
      // arrives on a diagonal rather than skimming a flat circle.
      { role: 'tail', radians: whipLiftCurve(phase) * 0.24, axis: AXIS_Z },
      // Hind legs brace and the forelegs come off the floor as the mass swings
      // round — the counterweight to a tail that heavy has to go somewhere.
      {
        role: 'leg',
        radians: whipLiftCurve(phase) * -0.16,
        axis: AXIS_Z,
        mirrorAcrossZ: true,
      },
    ],
    // A shallow rear keeps the tail clear of the floor at the bottom of its arc.
    rearUpAt: phase => whipLiftCurve(phase) * TAIL_REAR_RADIANS,
  },
  'fire-breath': {
    ability: 'fire-breath',
    durationSeconds: SCRIPTED_ASSEMBLY_ATTACKS['fire-breath'].durationSeconds,
    strikeAt: SCRIPTED_ASSEMBLY_ATTACKS['fire-breath'].strikeAt,
    bendsAt: phase => [
      // Head rears back to inhale, then levels as the cone opens.
      { role: 'head', radians: -0.3 * inhaleCurve(phase), axis: AXIS_Z },
      // Jaw gapes and stays open for as long as the fire is flowing.
      { role: 'jaw', radians: -0.4 * gapeCurve(phase), axis: AXIS_Z },
      // Forelegs tuck once they leave the floor, rather than hanging down like
      // a dropped puppet's.
      {
        role: 'leg',
        radians: rearCurve(phase, 0.3, 0.85) * -0.34,
        axis: AXIS_Z,
        mirrorAcrossZ: true,
      },
    ],
    // Planted on the hind legs for the whole breath: the chest comes up before
    // the cone opens and stays up until the fire is spent.
    rearUpAt: phase => rearCurve(phase, 0.3, 0.85) * FIRE_REAR_RADIANS,
    fireConeAt: phase => phase >= 0.12 && phase <= 0.98,
  },
};

export function getAbilityDemo(ability: AssemblyAbilityId): AbilityDemo {
  return ABILITY_DEMOS[ability];
}

/** The specimen's pose partway through an ability demonstration. */
export function poseSpecimenForAbility(
  blueprint: AssemblyBlueprint,
  ability: AssemblyAbilityId,
  phase: number,
  restingDroopRadians = 0,
): SpecimenPose {
  const demo = ABILITY_DEMOS[ability];
  const clamped = Math.max(0, Math.min(1, phase));
  const rearUp = demo.rearUpAt?.(clamped) ?? 0;
  return buildSpecimenPose(blueprint, {
    droopRadians: restingDroopRadians,
    bends: demo.bendsAt(clamped),
    rootTilt: rearUp === 0 ? undefined : { radians: rearUp },
  });
}

/**
 * Where the fire cone starts and which way it points: the forward-most head or
 * jaw part. Falls back to the whole assembly's forward extreme so a headless
 * creation still demonstrates something rather than throwing.
 */
export function resolveFireOrigin(blueprint: AssemblyBlueprint, pose: SpecimenPose): {
  origin: Vector3Data;
  direction: Vector3Data;
} | null {
  if (!blueprint.parts.length) return null;

  const positions = new Map(pose.parts.map(part => [part.partId, part.position]));
  const mouthParts = blueprint.parts.filter(
    part => part.roles?.includes('jaw') || part.roles?.includes('head'),
  );
  const candidates = (mouthParts.length ? mouthParts : blueprint.parts)
    .map(part => positions.get(part.id) ?? part.position);

  // +x is forward for these blueprints, so the mouth is the furthest-forward
  // candidate; the cone leaves along the same axis.
  let origin = candidates[0];
  for (const candidate of candidates) {
    if (candidate.x > origin.x) origin = candidate;
  }

  return { origin, direction: { x: 1, y: 0, z: 0 } };
}
