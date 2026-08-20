import {
  createEducationalAssembly,
  createVisualGenome,
} from '../../simulation/domain/dragon-inheritance';
import { DragonLabGenome } from '../../simulation/domain/dragon-lab.models';
import { buildSpecimenPose } from '../../../../shared/assembly/preview/specimen-pose';
import {
  DRAGON_FIRE_REFLEX_MOTION,
  DRAGON_LEARNED_BEHAVIOR_MOTIONS,
} from './dragon-learned-behaviors';

describe('dragon learned behavior motions', () => {
  const genome: DragonLabGenome = {
    wings: ['W', 'w'],
    fire: ['F', 'f'],
    scales: ['S', 's'],
    horns: ['H', 'h'],
  };
  const blueprint = createEducationalAssembly(
    genome,
    createVisualGenome('motion-dragon', genome, 1),
  ).assembly;

  for (const motion of [
    ...Object.values(DRAGON_LEARNED_BEHAVIOR_MOTIONS),
    DRAGON_FIRE_REFLEX_MOTION,
  ]) {
    it(`${motion.id} returns to the same resting assembly`, () => {
      const before = JSON.stringify(blueprint);
      const rest = buildSpecimenPose(blueprint, { droopRadians: 0.13 });

      expect(motion.poseAt(blueprint, 0, 0.13)).toEqual(rest);
      expect(motion.poseAt(blueprint, 1, 0.13)).toEqual(rest);
      expect(motion.poseAt(blueprint, 0.5, 0.13)).not.toEqual(rest);
      expect(JSON.stringify(blueprint)).toBe(before);
    });
  }
});
