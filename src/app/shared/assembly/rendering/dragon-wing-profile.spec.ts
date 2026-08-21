import { DEFAULT_WING_SHAPE, WING_FINGER_STATIONS, WING_SHAPES, WING_STATIONS, wingChordFraction, wingClawAnchor, wingLeadingEdge, wingRootMount, } from './dragon-wing-profile';

const WING = { x: 0.39, y: 0.12, z: 2.025 };

describe('wing hand claw anchor', () => {
    it('rides the membrane arc instead of sitting at a fixed height', () => {
        const anchor = wingClawAnchor(WING, -1);

        // The wing lifts toward the tip. A constant here is what left the claw
        // hanging below the wing it grows out of.
        expect(anchor.y).toBeCloseTo(DEFAULT_WING_SHAPE.dihedral * WING.z, 6);
        expect(anchor.y).toBeGreaterThan(0);

        const soaring = wingClawAnchor(WING, -1, WING_SHAPES.soaring);

        expect(soaring.y).toBeGreaterThan(anchor.y);
    });

    it('sits on the leading edge, so the talon projects forward off the wing', () => {
        const anchor = wingClawAnchor(WING, -1);
        const edge = wingLeadingEdge(WING, 1);

        // Just behind the edge — enough to bury the cylinder the talon starts from
        // inside the arm bone, and no more. Deeper than this and the claw emerges
        // from the membrane as a stub instead of standing out in front of the wing.
        expect(anchor.x).toBeLessThan(edge);
        expect(edge - anchor.x).toBeLessThan(WING.x * 0.1);
        // Inboard of the very tip, so the base has bone around it.
        expect(Math.abs(anchor.z)).toBeLessThan(WING.z / 2);
        expect(Math.abs(anchor.z)).toBeGreaterThan(WING.z * 0.45);
    });

    it('mounts on the tip opposite the root, on both wings', () => {
        expect(Math.sign(wingClawAnchor(WING, -1).z)).toBe(-Math.sign(wingRootMount(WING, 1).z));
        expect(Math.sign(wingClawAnchor(WING, 1).z)).toBe(-Math.sign(wingRootMount(WING, -1).z));
    });

    it('scales with the wing, so a genome-resized wing keeps its claw', () => {
        const bigger = { x: WING.x * 2, y: WING.y * 2, z: WING.z * 2 };
        const anchor = wingClawAnchor(WING, -1);
        const scaled = wingClawAnchor(bigger, -1);

        expect(scaled.x).toBeCloseTo(anchor.x * 2, 6);
        expect(scaled.y).toBeCloseTo(anchor.y * 2, 6);
        expect(scaled.z).toBeCloseTo(anchor.z * 2, 6);
    });
});

/**
 * A spread bat wing: a straight swept leading edge with the arm bone on it, a
 * membrane pinned at each finger, and curves — sag and scallop — everywhere
 * between them. The flat-panelled version these replaced was shaped to survive a
 * resting fold that no longer exists.
 */
describe('wing planform', () => {
    it('sweeps the leading edge in a straight line', () => {
        const root = wingLeadingEdge(WING, 0);
        const middle = wingLeadingEdge(WING, 0.5);
        const tip = wingLeadingEdge(WING, 1);

        expect(middle).toBeCloseTo((root + tip) / 2, 9);
        // Still swept, just not curved.
        expect(tip).toBeLessThan(root);
    });

    it('spreads the membrane over more than one finger, all of them interior', () => {
        // Each finger puts another belly and another scallop into the outline; with
        // fewer than three, the outer half of the wing is one unbroken panel.
        expect(WING_FINGER_STATIONS.length).toBeGreaterThanOrEqual(3);
        for (const station of WING_FINGER_STATIONS) {
            expect(station, `${station}`).toBeGreaterThan(0);
            expect(station, `${station}`).toBeLessThan(1);
        }
        // Sorted outward, because the mesh thins the struts in this order.
        const sorted = [...WING_FINGER_STATIONS].sort((a, b) => a - b);
        expect(WING_FINGER_STATIONS).toEqual(sorted);
    });

    it('joins the finger stations with straight chord runs', () => {
        for (let index = 1; index < WING_STATIONS.length; index += 1) {
            const from = WING_STATIONS[index - 1];
            const to = WING_STATIONS[index];
            const middle = (from + to) / 2;

            expect(wingChordFraction(middle), `${from}..${to}`).toBeCloseTo((wingChordFraction(from) + wingChordFraction(to)) / 2, 9);
        }
    });

    it('narrows from root to tip, with the corners on the fingers', () => {
        const depths = WING_STATIONS.map(s => wingChordFraction(s));

        for (let index = 1; index < depths.length; index += 1) {
            expect(depths[index], `station ${index}`).toBeLessThan(depths[index - 1]);
        }
        // A corner is a change of slope: the outer run has to taper harder than the
        // inner one, or the "angular" planform is just a straight taper.
        const inner = (depths[0] - depths[1]) / (WING_STATIONS[1] - WING_STATIONS[0]);
        const outer = (depths[2] - depths[3]) / (WING_STATIONS[3] - WING_STATIONS[2]);
        expect(outer).toBeGreaterThan(inner);
    });

    it('ships the bat shape, with the membrane sagging and scalloped between the fingers', () => {
        expect(DEFAULT_WING_SHAPE).toBe(WING_SHAPES.bat);
        // The two curves the flat-panelled wing had switched off. Without them the
        // membrane is a kite, whatever the outline does.
        expect(DEFAULT_WING_SHAPE.fingerSag).toBeGreaterThan(0.1);
        expect(DEFAULT_WING_SHAPE.scallop).toBeGreaterThan(0.1);
        // Lifts toward the tip rather than hanging level — the claw anchor rides it.
        expect(DEFAULT_WING_SHAPE.dihedral).toBeGreaterThan(0);
    });
});

describe('wing root mount', () => {
    it('finishes the membrane edge inside the torso rather than flush with it', () => {
        const mount = wingRootMount(WING, 1);

        expect(mount.z).toBeGreaterThan(0);
        expect(mount.z).toBeLessThan(WING.z / 2);
    });
});
