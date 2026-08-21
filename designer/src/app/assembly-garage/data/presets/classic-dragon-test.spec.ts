import { sampleDragonBodyRadius } from '@pbl/assembly/rendering/dragon-body-profile';
import { DEFAULT_DRAGON_STYLE } from '@pbl/assembly/rendering/dragon-style';
import { CLASSIC_DRAGON_TEST_PRESET } from './classic-dragon-test';

describe('CLASSIC_DRAGON_TEST_PRESET', () => {
    it('builds a complete catalog dragon with chained tail joints', () => {
        const state = CLASSIC_DRAGON_TEST_PRESET.state;

        expect(state.parts.length).toBe(24);
        expect(state.joints.length).toBe(23);
        expect(state.parts.some(part => part.id === 'classic-dragon-body')).toBe(true);
        expect(state.parts.some(part => part.id === 'classic-dragon-snap-snout')).toBe(false);

        const bodyChildren = state.joints
            .filter(joint => joint.parentPartId === 'classic-dragon-body')
            .map(joint => joint.childPartId);

        expect(bodyChildren).toContain('classic-dragon-horned-head');
        expect(bodyChildren).toContain('classic-dragon-left-wing');
        expect(bodyChildren).toContain('classic-dragon-right-wing');
        expect(bodyChildren).toContain('classic-dragon-tail-chain-root');

        expect(state.joints.some(joint => joint.parentPartId === 'classic-dragon-tail-chain-root'
            && joint.childPartId === 'classic-dragon-tail-link-1')).toBe(true);
        expect(state.joints.some(joint => joint.parentPartId === 'classic-dragon-tail-link-1'
            && joint.childPartId === 'classic-dragon-tail-link-2')).toBe(true);
        expect(state.joints.some(joint => joint.parentPartId === 'classic-dragon-tail-link-2'
            && joint.childPartId === 'classic-dragon-tail-stinger')).toBe(true);

        const tailRoot = state.parts.find(part => part.id === 'classic-dragon-tail-chain-root');
        const tailLink1 = state.parts.find(part => part.id === 'classic-dragon-tail-link-1');
        const tailLink2 = state.parts.find(part => part.id === 'classic-dragon-tail-link-2');
        const tailRootJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-tail-chain-root');
        const tailLinkJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-tail-link-1');

        expect(tailRootJoint?.axis).toEqual({ x: 0, y: 0, z: 1 });
        expect(tailLinkJoint?.axis).toEqual({ x: 0, y: 0, z: 1 });
        expect(tailLink1?.rotation).toEqual(tailRoot?.rotation);
        expect(tailLink2?.rotation).toEqual(tailRoot?.rotation);
        expect(tailLink1?.position.x ?? 0).toBeLessThan(tailRoot?.position.x ?? 0);
        expect(tailLink2?.position.x ?? 0).toBeLessThan(tailLink1?.position.x ?? 0);

        const leftWingJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-left-wing');
        const rightWingJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-right-wing');
        const legJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-front-left-leg');

        expect(leftWingJoint?.axis).toEqual({ x: 1, y: 0, z: 0 });
        expect(rightWingJoint?.axis).toEqual({ x: -1, y: 0, z: 0 });
        expect(leftWingJoint?.behavior?.profile).toBe('oscillatingMotor');
        expect(rightWingJoint?.behavior?.profile).toBe('oscillatingMotor');
        expect(legJoint?.behavior?.profile).toBe('springHinge');

        const frontKnee = state.joints.find(joint => joint.parentPartId === 'classic-dragon-front-left-leg'
            && joint.childPartId === 'classic-dragon-front-left-lower-leg');
        const rearKnee = state.joints.find(joint => joint.parentPartId === 'classic-dragon-rear-left-leg'
            && joint.childPartId === 'classic-dragon-rear-left-lower-leg');
        const frontAnkle = state.joints.find(joint => joint.parentPartId === 'classic-dragon-front-left-lower-leg'
            && joint.childPartId === 'classic-dragon-front-left-foot');

        expect(frontKnee?.type).toBe('hinge');
        expect(frontKnee?.axis).toEqual({ x: 0, y: 0, z: 1 });
        expect(frontKnee?.behavior?.profile).toBe('springHinge');
        expect(rearKnee?.type).toBe('hinge');
        expect(frontAnkle).toBeDefined();

        const upperJaw = state.parts.find(part => part.id === 'classic-dragon-upper-jaw')!;
        const lowerJaw = state.parts.find(part => part.id === 'classic-dragon-lower-jaw')!;
        const upperJawJoint = state.joints.find(joint => joint.childPartId === upperJaw.id);
        const lowerJawJoint = state.joints.find(joint => joint.childPartId === lowerJaw.id);

        expect(upperJawJoint?.parentPartId).toBe('classic-dragon-horned-head');
        expect(lowerJawJoint?.parentPartId).toBe(upperJaw.id);
        expect(upperJaw.snapPoints?.some(point => point.id === 'dragon-snout-socket') ?? false).toBe(false);
        expect(lowerJaw.position.y + lowerJaw.dimensions.y / 2)
            .toBeLessThanOrEqual(upperJaw.position.y - upperJaw.dimensions.y / 2);

        // The mouth shuts flush: same length, ends aligned, and the lower jaw's top
        // face against the upper's underside with no gap. The teeth are longer than
        // either jaw is tall and pass through the opposite one, so the jaws — not
        // the tooth rows — are what decide where the mouth closes.
        const upperUnderside = upperJaw.position.y - upperJaw.dimensions.y / 2;
        const lowerTop = lowerJaw.position.y + lowerJaw.dimensions.y / 2;

        expect(lowerJaw.dimensions.x).toBe(upperJaw.dimensions.x);
        expect(lowerTop).toBeCloseTo(upperUnderside, 6);
        expect(lowerJaw.position.x).toBeCloseTo(upperJaw.position.x, 6);

        // Hinged on the shared back corner, so the jaws stay aligned through the
        // swing rather than sliding out of register as they open.
        const hinge = lowerJawJoint!.pivotOnParent;

        expect(hinge.x).toBeCloseTo(-upperJaw.dimensions.x / 2, 6);
        expect(hinge.y).toBeCloseTo(-upperJaw.dimensions.y / 2, 6);
        expect(upperJaw.position.y - upperJaw.dimensions.y * DEFAULT_DRAGON_STYLE.jaw.toothHeight)
            .toBeLessThan(lowerTop);

        // The head is at +x and the tail at -x, and a talon runs along its own +y.
        // A wing claw rolled the wrong way about z rakes backwards down the wing,
        // which is silent in every other check: the joint is still valid.
        for (const clawId of ['classic-dragon-left-wing-claw', 'classic-dragon-right-wing-claw']) {
            const claw = state.parts.find(part => part.id === clawId)!;
            const { x, y, z, w } = claw.rotation!;
            // The x component of the claw's own +y turned into world space:
            // q · (0,1,0) · q⁻¹ reduces to this for that one axis.
            const pointsForward = 2 * (x * y - z * w);

            expect(pointsForward).toBeGreaterThan(0.5);
        }

        const body = state.parts.find(part => part.id === 'classic-dragon-body')!;
        const upperLegIds = [
            'classic-dragon-front-left-leg',
            'classic-dragon-front-right-leg',
            'classic-dragon-rear-left-leg',
            'classic-dragon-rear-right-leg',
        ];

        for (const upperLegId of upperLegIds) {
            const upperLeg = state.parts.find(part => part.id === upperLegId)!;
            const upperLegTop = upperLeg.position.y + upperLeg.dimensions.y / 2;
            const hipJoint = state.joints.find(joint => joint.childPartId === upperLegId)!;
            const hip = hipJoint.pivotOnParent;
            const radius = sampleDragonBodyRadius(hip.x / body.dimensions.x);

            expect(hipJoint.parentPartId).toBe(body.id);

            // The hip rides the torso's own silhouette, not its bounding box: the two
            // are only the same at the widest point of the lathe, and legs mounted off
            // the box floated clear of the body everywhere else.
            const onSurface = Math.hypot(hip.y / (radius * body.dimensions.y / 2), hip.z / (radius * body.dimensions.z / 2));

            expect(onSurface).toBeCloseTo(1, 2);
            expect(hip.y).toBeLessThan(0);

            // Crown of the thigh sunk just inside that surface — enough to close the
            // seam as the hinge swings, not enough to push the leg through the belly.
            const sink = upperLegTop - (body.position.y + hip.y);

            expect(sink).toBeGreaterThan(0);
            expect(sink).toBeLessThan(0.12);
        }
    });
});
