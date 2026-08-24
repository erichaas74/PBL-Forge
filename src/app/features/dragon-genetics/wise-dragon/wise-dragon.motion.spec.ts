import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../data/published-dragon-models';
import { WISE_DRAGON_MOTIONS } from './wise-dragon.motion';

describe('Wise Dragon avatar motion', () => {
  it('moves the lower jaw through distinct speech syllables and blinks', () => {
    const motion = WISE_DRAGON_MOTIONS.speaking!;
    const first = motion.poseAt(PUBLISHED_CLASSIC_DRAGON_PRESET.state, 0.28, 0.13);
    const second = motion.poseAt(PUBLISHED_CLASSIC_DRAGON_PRESET.state, 0.35, 0.13);
    const lowerJaw = (pose: typeof first) => pose.parts.find(
      (part) => part.partId.includes('lower-jaw'),
    )!.rotation;

    expect(lowerJaw(first)).not.toEqual(lowerJaw(second));
    expect(motion.expressionAt?.(0.16).blink).toBe(1);
    expect(motion.expressionAt?.(0.5).blink).toBe(0);
  });
});
