import {
  DEFAULT_WING_SHAPE,
  WING_SHAPES,
  WING_STATIONS,
  wingChordFraction,
  wingClawAnchor,
  wingLeadingEdge,
  wingRootMount,
} from './dragon-wing-profile';

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

  it('buries the base of the talon in the arm bone at the wrist', () => {
    const anchor = wingClawAnchor(WING, -1);

    // Behind the leading edge and inboard of the tip, both by a margin, so the
    // cylinder the talon starts from is hidden inside the bone.
    expect(anchor.x).toBeLessThan(wingLeadingEdge(WING, 1));
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
 * The planform is angular on purpose: straight edges meeting at the fingers.
 * The curves these replaced — an `s^1.5` leading edge and a smooth chord taper
 * — bent the front of the wing backwards like a scythe and left the tip
 * trailing behind the last finger.
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

  it('joins the finger stations with straight chord runs', () => {
    for (let index = 1; index < WING_STATIONS.length; index += 1) {
      const from = WING_STATIONS[index - 1];
      const to = WING_STATIONS[index];
      const middle = (from + to) / 2;

      expect(wingChordFraction(middle))
        .withContext(`${from}..${to}`)
        .toBeCloseTo((wingChordFraction(from) + wingChordFraction(to)) / 2, 9);
    }
  });

  it('narrows from root to tip, with the corners on the fingers', () => {
    const depths = WING_STATIONS.map(s => wingChordFraction(s));

    for (let index = 1; index < depths.length; index += 1) {
      expect(depths[index]).withContext(`station ${index}`).toBeLessThan(depths[index - 1]);
    }
    // A corner is a change of slope: the outer run has to taper harder than the
    // inner one, or the "angular" planform is just a straight taper.
    const inner = (depths[0] - depths[1]) / (WING_STATIONS[1] - WING_STATIONS[0]);
    const outer = (depths[2] - depths[3]) / (WING_STATIONS[3] - WING_STATIONS[2]);
    expect(outer).toBeGreaterThan(inner);
  });

  it('ships the flat-panelled shape, with no sag between the fingers', () => {
    expect(DEFAULT_WING_SHAPE).toBe(WING_SHAPES.angular);
    expect(DEFAULT_WING_SHAPE.fingerSag).toBe(0);
    expect(DEFAULT_WING_SHAPE.scallop).toBe(0);
  });
});

describe('wing root mount', () => {
  it('finishes the membrane edge inside the torso rather than flush with it', () => {
    const mount = wingRootMount(WING, 1);

    expect(mount.z).toBeGreaterThan(0);
    expect(mount.z).toBeLessThan(WING.z / 2);
  });
});
