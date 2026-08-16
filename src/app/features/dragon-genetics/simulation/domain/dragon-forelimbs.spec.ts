import {
  AssemblyBlueprint,
  AssemblyPart,
  Vector3Data,
} from '../../../../shared/assembly/domain/assembly.models';
import {
  identityQuaternion,
  rotateVectorByQuaternion,
} from '../../../../shared/assembly/domain/vector-data';
import {
  DRAGON_REARED_POSE,
  DRAGON_RESTING_POSE,
  dragonRestingPose,
  hasGraspingForelimbs,
} from '../../../../shared/assembly/preview/specimen-stance';
import { buildSpecimenPose } from '../../../../shared/assembly/preview/specimen-pose';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  ExpressiveDragonProfile,
} from './dragon-expressive-genome';
import { createExpressiveDragonBenchBuild } from './dragon-specimen.profile';

/**
 * The two forelimb body plans.
 *
 * `LL`/`Ll` walks on four legs; `ll` grows a short grasping arm instead and
 * rears onto its hind legs to carry itself. The recessive form used to be the
 * front limbs simply deleted, so most of what these pin is that the limbs are
 * still *there* — a swap, not a subtraction.
 */

function dragonWithLegs(legs: ExpressiveDragonProfile['genome']['legs']): AssemblyBlueprint {
  const build = createExpressiveDragonBenchBuild('forelimb-test', {
    ...DEFAULT_EXPRESSIVE_DRAGON,
    genome: { ...DEFAULT_EXPRESSIVE_DRAGON.genome, legs },
  });
  if (build.source.kind !== 'descriptor') throw new Error('expected a descriptor build');
  return build.source.descriptor.blueprint;
}

function frontLimbs(blueprint: AssemblyBlueprint): AssemblyPart[] {
  return blueprint.parts.filter(
    part => part.id.includes('front') && part.roles?.includes('leg'),
  );
}

function profileIds(parts: readonly AssemblyPart[]): string[] {
  return parts.map(part => part.visualProfile?.profileId ?? '');
}

/** A part-local offset in world space, which is what a joint actually joins. */
function worldPoint(part: AssemblyPart, local: Vector3Data): Vector3Data {
  const rotated = rotateVectorByQuaternion(local, part.rotation ?? identityQuaternion());
  return {
    x: part.position.x + rotated.x,
    y: part.position.y + rotated.y,
    z: part.position.z + rotated.z,
  };
}

describe('dragon forelimb body plans', () => {
  const walking = dragonWithLegs(['L', 'l']);
  const grasping = dragonWithLegs(['l', 'l']);

  it('keeps the walking chain on a dominant genotype', () => {
    expect(profileIds(frontLimbs(walking)).every(id => id === 'dragon-leg' || id === 'dragon-foot'))
      .toBe(true);
  });

  it('swaps the front chain for arms and hands rather than deleting it', () => {
    const limbs = frontLimbs(grasping);

    expect(limbs.length).toBe(frontLimbs(walking).length);
    expect(profileIds(limbs).filter(id => id === 'dragon-grasp-arm').length).toBe(4);
    expect(profileIds(limbs).filter(id => id === 'dragon-grasp-hand').length).toBe(2);
  });

  it('sizes the enlarged grasping chain and its mass consistently', () => {
    for (const arm of frontLimbs(grasping)) {
      const leg = frontLimbs(walking).find(part => part.id === arm.id)!;
      const factor = arm.id.includes('foot') ? 0.558 : 0.96;
      expect(arm.dimensions.y).withContext(arm.id).toBeCloseTo(leg.dimensions.y * factor);
      expect(arm.mass).withContext(arm.id).toBeCloseTo(leg.mass * factor ** 3);
    }
  });

  /**
   * The failure this guards is the one that made the swap hard: a pivot is a
   * distance in a part's local frame, so scaling a limb without scaling its
   * joints hangs each piece where the bigger one used to reach and the arm
   * comes apart at every seam.
   */
  it('keeps the rescaled chain connected at its joints', () => {
    const partsById = new Map(grasping.parts.map(part => [part.id, part]));

    for (const joint of grasping.joints) {
      const parent = partsById.get(joint.parentPartId);
      const child = partsById.get(joint.childPartId);
      if (!parent || !child || !child.id.includes('front')) continue;

      // Both ends of the joint have to land on the same world point. Pivots are
      // part-local, so each is rotated by its own part's rotation first — the
      // forearm is raked back, and comparing raw offsets would call a correctly
      // seated elbow broken.
      const onParent = worldPoint(parent, joint.pivotOnParent);
      const onChild = worldPoint(child, joint.pivotOnChild);

      for (const axis of ['x', 'y', 'z'] as const) {
        expect(onChild[axis]).withContext(`${joint.childPartId}.${axis}`).toBeCloseTo(onParent[axis], 5);
      }
    }
  });

  it('hangs the arms higher on the torso than the legs they replaced', () => {
    const shoulder = grasping.joints.find(
      joint => joint.childPartId.includes('front') && !joint.parentPartId.includes('front'),
    )!;
    const hip = walking.joints.find(
      joint => joint.childPartId.includes('front') && !joint.parentPartId.includes('front'),
    )!;

    expect(shoulder.pivotOnParent.y).toBeGreaterThan(hip.pivotOnParent.y);
  });

  it('claws stay available, because a grasping hand still rakes', () => {
    expect(frontLimbs(grasping).every(part => part.roles?.includes('leg'))).toBe(true);
  });
});

describe('the stance each body plan is shown in', () => {
  it('rears a grasping dragon and leaves a walking one on all fours', () => {
    const grasping = dragonWithLegs(['l', 'l']);
    const walking = dragonWithLegs(['L', 'L']);

    expect(hasGraspingForelimbs(grasping)).toBe(true);
    expect(dragonRestingPose(grasping)).toBe(DRAGON_REARED_POSE);

    expect(hasGraspingForelimbs(walking)).toBe(false);
    expect(dragonRestingPose(walking)).toBe(DRAGON_RESTING_POSE);
  });

  /**
   * The point of rearing: the head has to finish above where the quadruped
   * pose leaves it, or the tilt is not doing anything.
   */
  it('lifts the head when it rears', () => {
    const grasping = dragonWithLegs(['l', 'l']);
    const head = grasping.parts.find(part => part.roles?.includes('head'))!;

    const flat = buildSpecimenPose(grasping, DRAGON_RESTING_POSE);
    const reared = buildSpecimenPose(grasping, DRAGON_REARED_POSE);

    const flatHead = flat.parts.find(part => part.partId === head.id)!;
    const rearedHead = reared.parts.find(part => part.partId === head.id)!;

    expect(rearedHead.position.y).toBeGreaterThan(flatHead.position.y);
  });
});
