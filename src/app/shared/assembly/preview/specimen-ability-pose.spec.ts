import { AssemblyBlueprint, AssemblyPart, AssemblyPartRole } from '../domain/assembly.models';
import { getAbilityDemo, poseSpecimenForAbility, resolveFireOrigin } from './specimen-ability-pose';
import { buildSpecimenPose } from './specimen-pose';

function part(id: string, roles: AssemblyPartRole[], position: {
    x: number;
    y: number;
    z: number;
}): AssemblyPart {
    return {
        id,
        roles,
        shape: 'box',
        mass: 1,
        dimensions: { x: 1, y: 1, z: 1 },
        position,
        color: '#556677',
    };
}

/**
 * Body at the origin, a head forward, a jaw on the head, a wing each side, and
 * a two-link tail. Every position is derived from its joint pivots, so the
 * blueprint starts out properly articulated.
 */
function dragon(): AssemblyBlueprint {
    return {
        parts: [
            part('body', ['core'], { x: 0, y: 2, z: 0 }),
            part('head', ['head'], { x: 1, y: 2, z: 0 }),
            part('jaw', ['jaw'], { x: 2, y: 2, z: 0 }),
            part('wing-l', ['wing'], { x: 0, y: 2.5, z: 1.5 }),
            part('wing-r', ['wing'], { x: 0, y: 2.5, z: -1.5 }),
            part('tail-1', ['tail'], { x: -1, y: 2, z: 0 }),
            part('tail-2', ['tail'], { x: -2, y: 2, z: 0 }),
        ],
        joints: [
            joint('j-head', 'body', 'head', { x: 0.5, y: 0, z: 0 }, { x: -0.5, y: 0, z: 0 }),
            joint('j-jaw', 'head', 'jaw', { x: 0.5, y: 0, z: 0 }, { x: -0.5, y: 0, z: 0 }),
            joint('j-wl', 'body', 'wing-l', { x: 0, y: 0.5, z: 0.5 }, { x: 0, y: 0, z: -1 }),
            joint('j-wr', 'body', 'wing-r', { x: 0, y: 0.5, z: -0.5 }, { x: 0, y: 0, z: 1 }),
            joint('j-t1', 'body', 'tail-1', { x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }),
            joint('j-t2', 'tail-1', 'tail-2', { x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }),
        ],
    };
}

function joint(id: string, parentPartId: string, childPartId: string, pivotOnParent: {
    x: number;
    y: number;
    z: number;
}, pivotOnChild: {
    x: number;
    y: number;
    z: number;
}) {
    return {
        id,
        type: 'hinge' as const,
        parentPartId,
        childPartId,
        pivotOnParent,
        pivotOnChild,
        axis: { x: 0, y: 0, z: 1 },
    };
}

function positionOf(pose: {
    parts: readonly {
        partId: string;
        position: {
            x: number;
            y: number;
            z: number;
        };
    }[];
}, id: string) {
    return pose.parts.find(entry => entry.partId === id)!.position;
}

/** Which way a posed part is pointing: its local +x carried into world space. */
function forwardOf(pose: {
    parts: readonly {
        partId: string;
        position: {
            x: number;
            y: number;
            z: number;
        };
        rotation: {
            x: number;
            y: number;
            z: number;
            w: number;
        };
    }[];
}, id: string) {
    const entry = pose.parts.find(part => part.partId === id)!;
    const tip = worldPoint(entry, { x: 1, y: 0, z: 0 });
    return {
        x: tip.x - entry.position.x,
        y: tip.y - entry.position.y,
        z: tip.z - entry.position.z,
    };
}

describe('ability demos', () => {
    it('defines a demo for every ability the bench can offer', () => {
        for (const ability of ['bite', 'wing-buffet', 'tail-sweep', 'fire-breath'] as const) {
            const demo = getAbilityDemo(ability);
            expect(demo.durationSeconds).toBeGreaterThan(0);
            expect(demo.strikeAt).toBeGreaterThan(0);
            expect(demo.strikeAt).toBeLessThan(1);
        }
    });

    it('starts and ends every demo at rest, so moves can be replayed', () => {
        const blueprint = dragon();
        const rest = buildSpecimenPose(blueprint);

        for (const ability of ['bite', 'wing-buffet', 'tail-sweep', 'fire-breath'] as const) {
            for (const phase of [0, 1]) {
                const posed = poseSpecimenForAbility(blueprint, ability, phase);
                for (const entry of rest.parts) {
                    const moved = positionOf(posed, entry.partId);
                    expect(distance(moved, entry.position), `${ability} at phase ${phase} left ${entry.partId} displaced`).toBeLessThan(0.02);
                }
            }
        }
    });

    it('opens the jaw and rears the body during a bite', () => {
        const blueprint = dragon();
        const posed = poseSpecimenForAbility(blueprint, 'bite', 0.3);
        const rest = buildSpecimenPose(blueprint);

        expect(distance(positionOf(posed, 'jaw'), positionOf(rest, 'jaw'))).toBeGreaterThan(0.05);
        // The whole body is up on its haunches, so the torso and the wings riding
        // on it travel too — that is the rear-up, not a leak from the jaw bend.
        expect(positionOf(posed, 'body').y).toBeGreaterThan(positionOf(rest, 'body').y);
        expect(positionOf(posed, 'wing-l').y).toBeGreaterThan(positionOf(rest, 'wing-l').y);
    });

    it('rears highest for a breath and comes back down through a bite', () => {
        const blueprint = dragon();
        const rest = buildSpecimenPose(blueprint);
        const restY = positionOf(rest, 'body').y;

        const breath = positionOf(poseSpecimenForAbility(blueprint, 'fire-breath', 0.5), 'body').y;
        const windUp = positionOf(poseSpecimenForAbility(blueprint, 'bite', 0.45), 'body').y;
        const landed = positionOf(poseSpecimenForAbility(blueprint, 'bite', 0.9), 'body').y;

        expect(breath).toBeGreaterThan(windUp);
        expect(windUp).toBeGreaterThan(restY);
        // Past the strike the chest is back down, so the bite lands with the body.
        expect(landed).toBeCloseTo(restY, 5);
    });

    it('keeps the muzzle aimed forward while the chest rears for a bite', () => {
        const blueprint = dragon();
        const posed = poseSpecimenForAbility(blueprint, 'bite', 0.45);

        // Rearing necessarily lifts the head — it is out in front of the pivot. What
        // the counter-rotation buys is *aim*: the torso pitches skyward while the
        // muzzle stays level, so the dragon bites its opponent and not the clouds.
        expect(forwardOf(posed, 'body').y).toBeGreaterThan(0.3);
        expect(forwardOf(posed, 'head').y).toBeCloseTo(0, 5);
    });

    it('sweeps paired wings symmetrically rather than both the same way', () => {
        const blueprint = dragon();
        const posed = poseSpecimenForAbility(blueprint, 'wing-buffet', 0.75);
        const rest = buildSpecimenPose(blueprint);

        const left = positionOf(posed, 'wing-l').y - positionOf(rest, 'wing-l').y;
        const right = positionOf(posed, 'wing-r').y - positionOf(rest, 'wing-r').y;

        expect(Math.abs(left)).toBeGreaterThan(0.05);
        // Mirrored about z, both wings travel the same way vertically.
        expect(Math.sign(left)).toBe(Math.sign(right));
        expect(left).toBeCloseTo(right, 5);
    });

    it('whips the tail tip further than its base', () => {
        const blueprint = dragon();
        const posed = poseSpecimenForAbility(blueprint, 'tail-sweep', 0.75);
        const rest = buildSpecimenPose(blueprint);

        const base = distance(positionOf(posed, 'tail-1'), positionOf(rest, 'tail-1'));
        const tip = distance(positionOf(posed, 'tail-2'), positionOf(rest, 'tail-2'));

        expect(tip).toBeGreaterThan(base);
    });

    it('shows the fire cone only during the breath, not the wind-up', () => {
        const demo = getAbilityDemo('fire-breath');

        expect(demo.fireConeAt?.(0.1)).toBe(false);
        expect(demo.fireConeAt?.(0.5)).toBe(true);
        expect(demo.fireConeAt?.(1)).toBe(false);
    });

    it('keeps chains joined at their pivots throughout a demo', () => {
        const blueprint = dragon();

        for (const phase of [0.2, 0.5, 0.8]) {
            const posed = poseSpecimenForAbility(blueprint, 'tail-sweep', phase);
            const byId = new Map(posed.parts.map(entry => [entry.partId, entry]));

            for (const link of blueprint.joints) {
                const parent = byId.get(link.parentPartId)!;
                const child = byId.get(link.childPartId)!;
                expect(distance(worldPoint(parent, link.pivotOnParent), worldPoint(child, link.pivotOnChild)), `${link.id} came apart at phase ${phase}`).toBeLessThan(1e-6);
            }
        }
    });
});

describe('resolveFireOrigin', () => {
    it('breathes from the front of the head, pointing forward', () => {
        const blueprint = dragon();
        const pose = buildSpecimenPose(blueprint);
        const aim = resolveFireOrigin(blueprint, pose)!;

        expect(aim.origin.x).toBeCloseTo(2, 5);
        expect(aim.direction).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('falls back to the forward extreme when there is no head or jaw', () => {
        const headless: AssemblyBlueprint = {
            parts: [part('body', ['core'], { x: 0, y: 1, z: 0 })],
            joints: [],
        };

        expect(resolveFireOrigin(headless, buildSpecimenPose(headless))).toBeTruthy();
    });

    it('returns null for an empty blueprint instead of throwing', () => {
        const empty: AssemblyBlueprint = { parts: [], joints: [] };

        expect(resolveFireOrigin(empty, buildSpecimenPose(empty))).toBeNull();
    });
});

function worldPoint(pose: {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
}, local: {
    x: number;
    y: number;
    z: number;
}) {
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

function distance(a: {
    x: number;
    y: number;
    z: number;
}, b: {
    x: number;
    y: number;
    z: number;
}): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
