import { AssemblyAbilityId } from '../combat/assembly-abilities';
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

const ABILITY_DEMOS: Readonly<Record<AssemblyAbilityId, AbilityDemo>> = {
  bite: {
    ability: 'bite',
    durationSeconds: 1.1,
    strikeAt: 0.6,
    bendsAt: phase => {
      const open = biteCurve(phase);
      return [
        // Jaws hinge apart around the head joint, then close through it.
        { role: 'jaw', radians: open * 0.5, axis: AXIS_Z },
      ];
    },
  },
  'wing-buffet': {
    ability: 'wing-buffet',
    durationSeconds: 1.2,
    // The slam lands on the second half of the swing.
    strikeAt: 0.75,
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
    durationSeconds: 1.2,
    strikeAt: 0.75,
    bendsAt: phase => [
      // Horizontal whip: each link adds to the arc, so the tip travels furthest.
      { role: 'tail', radians: windAndStrikeCurve(phase, 0.5) * 0.45, axis: AXIS_Y },
    ],
  },
  'fire-breath': {
    ability: 'fire-breath',
    durationSeconds: 1.6,
    strikeAt: 0.4,
    bendsAt: phase => [
      // Head rears back to inhale, then levels as the cone opens.
      { role: 'head', radians: -0.3 * inhaleCurve(phase), axis: AXIS_Z },
      // Jaw gapes and stays open for as long as the fire is flowing.
      { role: 'jaw', radians: -0.4 * gapeCurve(phase), axis: AXIS_Z },
    ],
    fireConeAt: phase => phase >= 0.32 && phase <= 0.92,
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
  return buildSpecimenPose(blueprint, {
    droopRadians: restingDroopRadians,
    bends: demo.bendsAt(clamped),
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
