import { AssemblyBlueprint } from '../../assembly/domain/assembly.models';
import {
  identityQuaternion,
  invertQuaternion,
  multiplyQuaternions,
  rotateVectorByQuaternion,
} from '../../assembly/domain/vector-data';
import { poseSpecimenForAbility } from '../../assembly/preview/specimen-ability-pose';
import { buildSpecimenPose } from '../../assembly/preview/specimen-pose';
import {
  BattleAttackPoseSnapshot,
  BattleBodySnapshot,
} from '../models/arena.models';
import { getBodyKey } from '../utils/battle-assembly';

/**
 * Builds a physics-free articulated dragon around the physical torso.
 *
 * The torso snapshot supplies world movement, collision response, yaw, and
 * knockdown recovery. Every other part comes from an authored pose relative to
 * that torso, so feet cannot steer the dragon and attack limbs cannot ragdoll.
 *
 * Parts are measured against the blueprint's *resting* torso, not the posed
 * one. Measuring against the posed torso would silently cancel any whole-body
 * motion: a rear-up rotates the torso and every limb by the same amount about
 * the same pivot, so the two rotations divide out exactly and the dragon would
 * render flat on all fours no matter how far it reared. Against the rest frame
 * the torso's own lift and pitch survive, carried on top of whatever the
 * physics body is doing. Bends alone never move the torso — it is the root of
 * the joint tree — so this reads identically for every move that does not rear.
 */
export function buildDragonArenaPose(
  combatantId: string,
  blueprint: AssemblyBlueprint,
  corePartId: string,
  coreSnapshot: BattleBodySnapshot,
  attack: BattleAttackPoseSnapshot | undefined,
): BattleBodySnapshot[] {
  const pose = attack
    ? poseSpecimenForAbility(blueprint, attack.ability, attack.phase)
    : buildSpecimenPose(blueprint);
  const restCore = blueprint.parts.find(part => part.id === corePartId);
  if (!restCore) return [coreSnapshot];

  const restPosition = restCore.position;
  const inverseCoreRotation = invertQuaternion(restCore.rotation ?? identityQuaternion());
  return pose.parts.map(part => {
    const coreOffset = rotateVectorByQuaternion({
      x: part.position.x - restPosition.x,
      y: part.position.y - restPosition.y,
      z: part.position.z - restPosition.z,
    }, inverseCoreRotation);
    const worldOffset = rotateVectorByQuaternion(coreOffset, coreSnapshot.quaternion);
    const relativeRotation = multiplyQuaternions(inverseCoreRotation, part.rotation);
    const worldRotation = multiplyQuaternions(coreSnapshot.quaternion, relativeRotation);

    return {
      bodyKey: getBodyKey(combatantId, part.partId),
      combatantId,
      sourcePartId: part.partId,
      position: {
        x: coreSnapshot.position.x + worldOffset.x,
        y: coreSnapshot.position.y + worldOffset.y,
        z: coreSnapshot.position.z + worldOffset.z,
      },
      quaternion: worldRotation,
      velocity: { ...coreSnapshot.velocity },
    };
  });
}
