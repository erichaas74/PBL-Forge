import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../data/published-dragon-models';
import { quaternionFromEuler } from '../../assembly/domain/vector-data';
import { BattleBodySnapshot } from '../models/arena.models';
import { buildDragonArenaPose } from './dragon-arena-pose';

describe('buildDragonArenaPose', () => {
    const blueprint = PUBLISHED_CLASSIC_DRAGON_PRESET.state;
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

    it('rears the rendered torso off the physics body for a breath', () => {
        const rest = buildDragonArenaPose('red-1', blueprint, corePartId, core, undefined);
        const breath = buildDragonArenaPose('red-1', blueprint, corePartId, core, {
            combatantId: 'red-1',
            ability: 'fire-breath',
            phase: 0.5,
        });

        const before = rest.find(part => part.sourcePartId === corePartId)!;
        const after = breath.find(part => part.sourcePartId === corePartId)!;

        // The physics core has not moved; the *drawn* torso has, because a rear-up
        // is a whole-body transform measured against the resting rig rather than
        // the posed one. Measured against the posed torso this would be zero.
        expect(after.position.y).toBeGreaterThan(before.position.y);
    });

    it('poses jaws and legs for a bite', () => {
        const rest = buildDragonArenaPose('red-1', blueprint, corePartId, core, undefined);
        const bite = buildDragonArenaPose('red-1', blueprint, corePartId, core, {
            combatantId: 'red-1',
            ability: 'bite',
            phase: 0.6,
        });
        const changed = (partId: string): boolean => {
            const before = rest.find(part => part.sourcePartId === partId)!;
            const after = bite.find(part => part.sourcePartId === partId)!;
            return Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y, after.position.z - before.position.z) > 0.001;
        };

        expect(changed('classic-dragon-lower-jaw')).toBe(true);
        expect(changed('classic-dragon-front-left-leg')).toBe(true);
        expect(changed('classic-dragon-front-left-lower-leg')).toBe(true);
        expect(changed('classic-dragon-front-left-foot')).toBe(true);
    });

    it('leaves the drawn torso on the physics body when nothing is rearing', () => {
        const sweep = buildDragonArenaPose('red-1', blueprint, corePartId, core, {
            combatantId: 'red-1',
            ability: 'wing-buffet',
            phase: 0.5,
        });

        // A wing buffet is pure articulation, so the torso stays exactly where
        // physics put it.
        expect(sweep.find(part => part.sourcePartId === corePartId)?.position).toEqual(core.position);
    });
});
