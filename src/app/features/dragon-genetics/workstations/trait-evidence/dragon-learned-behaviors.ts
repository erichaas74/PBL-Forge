import { Vector3Data } from '../../../../shared/assembly/domain/assembly.models';
import { SpecimenMotionDefinition } from '../../../../shared/assembly/preview/specimen-motion';
import { buildSpecimenPose, SpecimenBend } from '../../../../shared/assembly/preview/specimen-pose';
import { LearnedBehaviorId } from './trait-evidence.models';

const AXIS_Y: Vector3Data = { x: 0, y: 1, z: 0 };
const AXIS_Z: Vector3Data = { x: 0, y: 0, z: 1 };

function motion(
  id: string,
  bendsAt: (amount: number) => readonly SpecimenBend[],
): SpecimenMotionDefinition {
  return {
    id,
    durationSeconds: 1.8,
    reducedMotionPhase: 0.5,
    poseAt: (blueprint, phase, restingDroopRadians) =>
      buildSpecimenPose(blueprint, {
        droopRadians: restingDroopRadians,
        bends: bendsAt(heldMotion(phase)),
      }),
  };
}

/** These are learned cue responses. They never appear in a genome or offspring record. */
export const DRAGON_LEARNED_BEHAVIOR_MOTIONS: Readonly<
  Record<LearnedBehaviorId, SpecimenMotionDefinition>
> = {
  'bell-bow': motion('bell-bow', (amount) => [
    { role: 'head', radians: -0.48 * amount, axis: AXIS_Z },
    { role: 'jaw', radians: 0.12 * amount, axis: AXIS_Z },
  ]),
  'target-touch': motion('target-touch', (amount) => [
    { role: 'head', radians: 0.5 * amount, axis: AXIS_Y },
    { role: 'jaw', radians: -0.08 * amount, axis: AXIS_Z },
  ]),
  'wait-release': motion('wait-release', (amount) => [
    { role: 'head', radians: -0.2 * amount, axis: AXIS_Z },
    { role: 'tail', radians: 0.24 * amount, axis: AXIS_Y },
    { role: 'wing', radians: -0.12 * amount, axis: AXIS_X, mirrorAcrossZ: true },
  ]),
};

/** Small orienting response shown when a dragon has not learned the tested cue. */
export const DRAGON_NOTICE_MOTION = motion('notice-cue', (amount) => [
  { role: 'head', radians: -0.16 * amount, axis: AXIS_Y },
]);

const AXIS_X: Vector3Data = { x: 1, y: 0, z: 0 };

function heldMotion(phase: number): number {
  const value = Math.max(0, Math.min(1, phase));
  if (value < 0.22) return smooth(value / 0.22);
  if (value > 0.78) return smooth((1 - value) / 0.22);
  return 1;
}

function smooth(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}
