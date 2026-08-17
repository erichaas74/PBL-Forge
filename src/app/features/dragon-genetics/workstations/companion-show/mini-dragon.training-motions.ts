import { Vector3Data } from '../../../../shared/assembly/domain/assembly.models';
import { SpecimenMotionDefinition } from '../../../../shared/assembly/preview/specimen-motion';
import { SpecimenBend, buildSpecimenPose } from '../../../../shared/assembly/preview/specimen-pose';
import { MiniTrainingSkillId } from './companion-show.models';

const AXIS_X: Vector3Data = { x: 1, y: 0, z: 0 };
const AXIS_Y: Vector3Data = { x: 0, y: 1, z: 0 };
const AXIS_Z: Vector3Data = { x: 0, y: 0, z: 1 };
const isUpperMiniLeg = (id: string): boolean =>
  id.startsWith('mini-leg-') && !id.includes('lower-leg');
const isLowerMiniLeg = (id: string): boolean => id.includes('mini-leg-') && id.includes('lower-leg');

function motion(
  id: MiniTrainingSkillId,
  bendsAt: (amount: number, sway: number) => readonly SpecimenBend[],
  rootTiltAt?: (amount: number) => number,
): SpecimenMotionDefinition {
  return {
    id: `mini-training-${id}`,
    durationSeconds: 2.2,
    reducedMotionPhase: 0.5,
    poseAt: (blueprint, phase, restingDroopRadians) => {
      const amount = heldMotion(phase);
      const sway = Math.sin(Math.max(0, Math.min(1, phase)) * Math.PI * 4) * amount;
      const rootTilt = rootTiltAt?.(amount) ?? 0;
      return buildSpecimenPose(blueprint, {
        droopRadians: restingDroopRadians,
        bends: bendsAt(amount, sway),
        rootTilt: rootTilt ? { radians: rootTilt } : undefined,
      });
    },
  };
}

/** Learned show responses. They alter pose only and never enter a genome or litter record. */
export const MINI_TRAINING_MOTIONS: Readonly<
  Record<MiniTrainingSkillId, SpecimenMotionDefinition>
> = {
  'course-cue': motion('course-cue', (amount) => [
    { role: 'wing', radians: 0.62 * amount, axis: AXIS_X, mirrorAcrossZ: true },
    { role: 'neck', radians: -0.22 * amount, axis: AXIS_Z },
    { role: 'head', radians: -0.16 * amount, axis: AXIS_Z },
    { role: 'front-leg', matchPartId: isUpperMiniLeg, radians: -0.34 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'front-leg', matchPartId: isLowerMiniLeg, radians: 0.58 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'rear-leg', matchPartId: isUpperMiniLeg, radians: 0.24 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'rear-leg', matchPartId: isLowerMiniLeg, radians: -0.46 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
  ], (amount) => 0.18 * amount),
  weave: motion('weave', (amount, sway) => [
    { role: 'neck', radians: 0.28 * sway, axis: AXIS_Y },
    { role: 'head', radians: 0.38 * sway, axis: AXIS_Y },
    { role: 'tail', radians: -0.42 * sway, axis: AXIS_Y },
    {
      role: 'leg',
      matchPartId: (id) => id.includes('front') && isUpperMiniLeg(id),
      radians: 0.3 * sway,
      axis: AXIS_Z,
      mirrorAcrossZ: true,
    },
    {
      role: 'leg',
      matchPartId: (id) => id.includes('front') && isLowerMiniLeg(id),
      radians: -0.46 * sway,
      axis: AXIS_Z,
      mirrorAcrossZ: true,
    },
  ]),
  settle: motion('settle', (amount) => [
    { role: 'neck', radians: -0.22 * amount, axis: AXIS_Z },
    { role: 'head', radians: -0.34 * amount, axis: AXIS_Z },
    { role: 'front-leg', matchPartId: isUpperMiniLeg, radians: 0.38 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'front-leg', matchPartId: isLowerMiniLeg, radians: -0.54 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'rear-leg', matchPartId: isUpperMiniLeg, radians: 0.62 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'rear-leg', matchPartId: isLowerMiniLeg, radians: -0.88 * amount, axis: AXIS_Z, mirrorAcrossZ: true },
    { role: 'wing', radians: -0.28 * amount, axis: AXIS_X, mirrorAcrossZ: true },
    { role: 'tail', radians: 0.18 * amount, axis: AXIS_Y },
  ], (amount) => -0.08 * amount),
  'ember-cue': motion('ember-cue', (amount) => [
    { role: 'neck', radians: 0.22 * amount, axis: AXIS_Z },
    { role: 'head', radians: 0.18 * amount, axis: AXIS_Z },
    { role: 'jaw', radians: -0.58 * amount, axis: AXIS_Z },
    { role: 'wing', radians: 0.18 * amount, axis: AXIS_X, mirrorAcrossZ: true },
  ], (amount) => 0.28 * amount),
};

/** One ring routine that chains greeting, weave, wing display, and ember finale. */
export const MINI_CHAMPIONSHIP_MOTION: SpecimenMotionDefinition = {
  id: 'mini-championship-routine',
  durationSeconds: 5.8,
  reducedMotionPhase: 0.78,
  poseAt: (blueprint, phase, restingDroopRadians) => {
    const value = Math.max(0, Math.min(1, phase));
    const bow = stageEnvelope(value, 0.03, 0.22);
    const weave = Math.sin(stage(value, 0.2, 0.52) * Math.PI * 4)
      * stageEnvelope(value, 0.2, 0.52);
    const display = stageEnvelope(value, 0.48, 0.78);
    const finale = stageEnvelope(value, 0.74, 0.98);
    return buildSpecimenPose(blueprint, {
      droopRadians: restingDroopRadians,
      bends: [
        { role: 'neck', radians: -0.26 * bow + 0.26 * weave + 0.18 * finale, axis: AXIS_Z },
        { role: 'head', radians: -0.34 * bow + 0.38 * weave + 0.2 * finale, axis: AXIS_Z },
        { role: 'tail', radians: -0.5 * weave + 0.24 * display, axis: AXIS_Y },
        { role: 'wing', radians: 0.72 * display, axis: AXIS_X, mirrorAcrossZ: true },
        { role: 'front-leg', matchPartId: isUpperMiniLeg, radians: -0.24 * display, axis: AXIS_Z, mirrorAcrossZ: true },
        { role: 'front-leg', matchPartId: isLowerMiniLeg, radians: 0.42 * display, axis: AXIS_Z, mirrorAcrossZ: true },
        { role: 'jaw', radians: -0.62 * finale, axis: AXIS_Z },
      ],
      rootTilt: display ? { radians: 0.12 * display } : undefined,
    });
  },
};

function heldMotion(phase: number): number {
  const value = Math.max(0, Math.min(1, phase));
  if (value < 0.2) return smooth(value / 0.2);
  if (value > 0.8) return smooth((1 - value) / 0.2);
  return 1;
}

function smooth(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function stage(value: number, start: number, end: number): number {
  return smooth((value - start) / Math.max(end - start, 0.001));
}

function stageEnvelope(value: number, start: number, end: number): number {
  const midpoint = (start + end) / 2;
  return value <= midpoint ? stage(value, start, midpoint) : stage(end - value, 0, end - midpoint);
}
