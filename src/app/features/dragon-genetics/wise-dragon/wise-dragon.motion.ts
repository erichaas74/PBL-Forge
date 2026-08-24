import { Vector3Data } from '../../../shared/assembly/domain/assembly.models';
import {
  SpecimenIdleMotion,
  SpecimenMotionDefinition,
} from '../../../shared/assembly/preview/specimen-motion';
import { buildSpecimenPose, SpecimenBend } from '../../../shared/assembly/preview/specimen-pose';
import { WiseDragonAnimation } from './wise-dragon.models';

const AXIS_X: Vector3Data = { x: 1, y: 0, z: 0 };
const AXIS_Y: Vector3Data = { x: 0, y: 1, z: 0 };
const AXIS_Z: Vector3Data = { x: 0, y: 0, z: 1 };

export const WISE_DRAGON_IDLE: SpecimenIdleMotion = {
  id: 'wise-dragon-listening',
  periodSeconds: 8.4,
  bendsAt: (phase) => {
    const cycle = phase * Math.PI * 2;
    const listen = Math.sin(cycle);
    const settle = Math.sin(cycle * 2 + Math.PI * 0.3);
    return [
      { role: 'head', radians: listen * 0.055, axis: AXIS_Y },
      { role: 'head', radians: settle * 0.025, axis: AXIS_Z },
      { role: 'tail', radians: listen * 0.025, axis: AXIS_Y },
      { role: 'wing', radians: settle * 0.025, axis: AXIS_X, mirrorAcrossZ: true },
    ];
  },
  expressionAt: (phase) => {
    const distance = Math.abs(phase - 0.63);
    return { blink: distance < 0.03 ? 1 - distance / 0.03 : 0 };
  },
};

export const WISE_DRAGON_MOTIONS: Partial<
  Readonly<Record<WiseDragonAnimation, SpecimenMotionDefinition>>
> = {
  thinking: motion('wise-thinking', 2.2, (amount) => [
    { role: 'head', radians: -0.18 * amount, axis: AXIS_Z },
    { role: 'tail', radians: 0.1 * amount, axis: AXIS_Y },
  ]),
  speaking: speakingMotion(),
  inquisitive: motion('wise-inquisitive', 1.8, (amount) => [
    { role: 'head', radians: 0.28 * amount, axis: AXIS_Y },
    { role: 'head', radians: -0.12 * amount, axis: AXIS_Z },
  ]),
  skeptical: motion('wise-skeptical', 1.8, (amount) => [
    { role: 'head', radians: -0.2 * amount, axis: AXIS_Y },
    { role: 'jaw', radians: -0.06 * amount, axis: AXIS_Z },
  ]),
  pleased: motion('wise-pleased', 1.65, (amount) => [
    { role: 'head', radians: -0.24 * amount, axis: AXIS_Z },
    { role: 'wing', radians: -0.06 * amount, axis: AXIS_X, mirrorAcrossZ: true },
  ]),
  warning: motion('wise-warning', 1.9, (amount) => [
    { role: 'head', radians: 0.16 * amount, axis: AXIS_Z },
    { role: 'wing', radians: 0.12 * amount, axis: AXIS_X, mirrorAcrossZ: true },
  ]),
};

function speakingMotion(): SpecimenMotionDefinition {
  return {
    id: 'wise-speaking',
    durationSeconds: 2.8,
    reducedMotionPhase: 0.52,
    poseAt: (blueprint, phase, restingDroopRadians) => {
      const envelope = heldMotion(phase);
      const syllables = (0.35 + Math.abs(Math.sin(phase * Math.PI * 8)) * 0.65) * envelope;
      const nod = Math.sin(phase * Math.PI * 4) * envelope;
      return buildSpecimenPose(blueprint, {
        droopRadians: restingDroopRadians,
        bends: [
          {
            role: 'jaw',
            matchPartId: id => id.includes('lower-jaw') || id === 'mini-jaw',
            radians: -0.24 * syllables,
            axis: AXIS_Z,
          },
          { role: 'head', radians: -0.035 * nod, axis: AXIS_Z },
          { role: 'head', radians: 0.025 * Math.sin(phase * Math.PI * 2) * envelope, axis: AXIS_Y },
          { role: 'wing', radians: 0.025 * nod, axis: AXIS_X, mirrorAcrossZ: true },
        ],
      });
    },
    expressionAt: phase => ({
      blink: Math.max(0, 1 - Math.abs(phase - 0.16) / 0.025),
    }),
  };
}

function motion(
  id: string,
  durationSeconds: number,
  bendsAt: (amount: number) => readonly SpecimenBend[],
): SpecimenMotionDefinition {
  return {
    id,
    durationSeconds,
    reducedMotionPhase: 0.55,
    poseAt: (blueprint, phase, restingDroopRadians) =>
      buildSpecimenPose(blueprint, {
        droopRadians: restingDroopRadians,
        bends: bendsAt(heldMotion(phase)),
      }),
  };
}

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
