import { buildSpecimenPose } from '../../../../shared/assembly/preview/specimen-pose';
import { companionAssembly, founderToCompanion } from './companion-show.domain';
import {
  MINI_CHAMPIONSHIP_MOTION,
  MINI_TRAINING_MOTIONS,
} from './mini-dragon.training-motions';

describe('mini dragon learned show motions', () => {
  const blueprint = companionAssembly(founderToCompanion('mini-biscuit')!);

  for (const motion of Object.values(MINI_TRAINING_MOTIONS)) {
    it(`${motion.id} moves the real rig and returns it to rest`, () => {
      const before = JSON.stringify(blueprint);
      const rest = buildSpecimenPose(blueprint, { droopRadians: 0.13 });

      expect(motion.poseAt(blueprint, 0, 0.13)).toEqual(rest);
      expect(motion.poseAt(blueprint, 1, 0.13)).toEqual(rest);
      expect(motion.poseAt(blueprint, 0.5, 0.13)).not.toEqual(rest);
      expect(JSON.stringify(blueprint)).toBe(before);
    });
  }

  it('chains the learned skills into a championship routine and returns to rest', () => {
    const rest = buildSpecimenPose(blueprint, { droopRadians: 0.13 });

    expect(MINI_CHAMPIONSHIP_MOTION.poseAt(blueprint, 0, 0.13)).toEqual(rest);
    expect(MINI_CHAMPIONSHIP_MOTION.poseAt(blueprint, 0.55, 0.13)).not.toEqual(rest);
    expect(MINI_CHAMPIONSHIP_MOTION.poseAt(blueprint, 1, 0.13)).toEqual(rest);
  });

  it('bends the knee separately from the thigh during the course cue', () => {
    const pose = MINI_TRAINING_MOTIONS['course-cue'].poseAt(blueprint, 0.5, 0.13);
    const thigh = pose.parts.find((part) => part.partId === 'mini-leg-front-left')!;
    const lower = pose.parts.find(
      (part) => part.partId === 'mini-leg-front-left-lower-leg',
    )!;

    expect(lower.rotation).not.toEqual(thigh.rotation);
  });
});
