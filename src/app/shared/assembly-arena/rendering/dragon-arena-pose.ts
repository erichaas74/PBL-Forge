import { AssemblyBlueprint } from '../../assembly/domain/assembly.models';
import {
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
  const posedCore = pose.parts.find(part => part.partId === corePartId);
  if (!posedCore) return [coreSnapshot];

  const inverseCoreRotation = invertQuaternion(posedCore.rotation);
  return pose.parts.map(part => {
    const coreOffset = rotateVectorByQuaternion({
      x: part.position.x - posedCore.position.x,
      y: part.position.y - posedCore.position.y,
      z: part.position.z - posedCore.position.z,
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
