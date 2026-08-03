import { CLASSIC_DRAGON_TEST_PRESET } from '../../assembly-garage/data/presets/classic-dragon-test';
import { quaternionFromEuler } from '../../assembly/domain/vector-data';
import { BattleBodySnapshot } from '../models/arena.models';
import { buildDragonArenaPose } from './dragon-arena-pose';

describe('buildDragonArenaPose', () => {
  const blueprint = CLASSIC_DRAGON_TEST_PRESET.state;
  const corePartId = 'classic-dragon-body';
  const core: BattleBodySnapshot = {
    bodyKey: `red-1:${corePartId}`,
    combatantId: 'red-1',
    sourcePartId: corePartId,
    position: { x: 8, y: 1.4, z: -3 },
    quaternion: quaternionFromEuler({ x: 0, y: Math.PI / 2, z: 0 }),
    velocity: { x: 2, y: 0, z: 0 },
  };

  it('anchors every visual part to the physical torso', () => {
    const pose = buildDragonArenaPose('red-1', blueprint, corePartId, core, undefined);
    const posedCore = pose.find(part => part.sourcePartId === corePartId);
    expect(posedCore?.position).toEqual(core.position);
    expect(posedCore?.quaternion).toEqual(core.quaternion);
    expect(pose.length).toBe(blueprint.parts.length);
  });

  it('poses jaws and legs for a bite without moving the torso', () => {
    const rest = buildDragonArenaPose('red-1', blueprint, corePartId, core, undefined);
    const bite = buildDragonArenaPose('red-1', blueprint, corePartId, core, {
      combatantId: 'red-1',
      ability: 'bite',
      phase: 0.6,
    });
    const changed = (partId: string): boolean => {
      const before = rest.find(part => part.sourcePartId === partId)!;
      const after = bite.find(part => part.sourcePartId === partId)!;
      return Math.hypot(
        after.position.x - before.position.x,
        after.position.y - before.position.y,
        after.position.z - before.position.z,
      ) > 0.001;
    };

    expect(changed('classic-dragon-lower-jaw')).toBeTrue();
    expect(changed('classic-dragon-front-left-leg')).toBeTrue();
    expect(changed('classic-dragon-front-left-lower-leg')).toBeTrue();
    expect(changed('classic-dragon-front-left-foot')).toBeTrue();
    expect(bite.find(part => part.sourcePartId === corePartId)?.position).toEqual(core.position);
  });
});
