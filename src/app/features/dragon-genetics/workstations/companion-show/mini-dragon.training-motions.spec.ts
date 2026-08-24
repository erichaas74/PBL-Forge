import { buildSpecimenPose } from '../../../../shared/assembly/preview/specimen-pose';
import { companionAssembly, founderToCompanion } from './companion-show.domain';
import {
  MINI_CHAMPIONSHIP_MOTION,
  MINI_TRAINING_MOTIONS,
} from './mini-dragon.training-motions';

describe('mini dragon learned show motions', () => {
  const blueprint = companionAssembly(founderToCompanion('mini-biscuit')!);
  const splitBlueprint = companionAssembly(founderToCompanion('mini-pepper')!);
  const inheritedAttachments = [
    ['mini-brow-plates', 'mini-head'],
    ['mini-whiskers', 'mini-head'],
    ['mini-chin-tuft', 'mini-head'],
    ['mini-dewlap', 'mini-neck'],
    ['mini-neck-ruff', 'mini-neck'],
    ['mini-shoulder-plates', 'mini-body'],
    ['mini-belly-scutes', 'mini-body'],
    ['mini-flank-fins', 'mini-body'],
    ['mini-hip-fins', 'mini-body'],
    ['mini-tail-sail', 'mini-tail-1'],
  ] as const;

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

  it('perks the independently hinged ears without baking the motion into the head', () => {
    const pose = MINI_TRAINING_MOTIONS['course-cue'].poseAt(blueprint, 0.5, 0.13);
    const head = pose.parts.find((part) => part.partId === 'mini-head')!;
    const leftEar = pose.parts.find((part) => part.partId === 'mini-ear-left')!;
    const rightEar = pose.parts.find((part) => part.partId === 'mini-ear-right')!;

    expect(leftEar.rotation).not.toEqual(head.rotation);
    expect(rightEar.rotation).not.toEqual(head.rotation);
    expect(leftEar.rotation).not.toEqual(rightEar.rotation);
  });

  for (const motion of [
    ...Object.values(MINI_TRAINING_MOTIONS),
    MINI_CHAMPIONSHIP_MOTION,
  ]) {
    it(`${motion.id} keeps every inherited attachment seated on its parent`, () => {
      for (const phase of [0.28, 0.5, 0.72]) {
        const pose = motion.poseAt(blueprint, phase, 0.13);
        const posed = new Map(pose.parts.map((part) => [part.partId, part]));

        for (const [childId, parentId] of inheritedAttachments) {
          const child = posed.get(childId)!;
          const parent = posed.get(parentId)!;
          expect(child.position, `${motion.id}/${phase}/${childId}/position`).toEqual(parent.position);
          expect(child.rotation, `${motion.id}/${phase}/${childId}/rotation`).toEqual(parent.rotation);
        }
      }
    });
  }

  for (const motion of [
    ...Object.values(MINI_TRAINING_MOTIONS),
    MINI_CHAMPIONSHIP_MOTION,
  ]) {
    it(`${motion.id} keeps both split-tail branches connected through every pose`, () => {
      for (const phase of [0.28, 0.5, 0.72]) {
        const pose = motion.poseAt(splitBlueprint, phase, 0.13);
        const posed = new Map(pose.parts.map((part) => [part.partId, part]));

        for (const joint of splitBlueprint.joints) {
          const parentPivot = worldPoint(posed.get(joint.parentPartId)!, joint.pivotOnParent);
          const childPivot = worldPoint(posed.get(joint.childPartId)!, joint.pivotOnChild);
          expect(distance(parentPivot, childPivot), `${motion.id}/${phase}/${joint.id}`)
            .toBeLessThan(1e-6);
        }
      }
    });
  }
});

function worldPoint(
  pose: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } },
  local: { x: number; y: number; z: number },
) {
  const { x: qx, y: qy, z: qz, w: qw } = pose.rotation;
  const tx = 2 * (qy * local.z - qz * local.y);
  const ty = 2 * (qz * local.x - qx * local.z);
  const tz = 2 * (qx * local.y - qy * local.x);
  return {
    x: pose.position.x + local.x + qw * tx + qy * tz - qz * ty,
    y: pose.position.y + local.y + qw * ty + qz * tx - qx * tz,
    z: pose.position.z + local.z + qw * tz + qx * ty - qy * tx,
  };
}

function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
