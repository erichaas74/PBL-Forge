import {
  DEFAULT_WING_SHAPE,
  WING_SHAPES,
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

describe('wing root mount', () => {
  it('finishes the membrane edge inside the torso rather than flush with it', () => {
    const mount = wingRootMount(WING, 1);

    expect(mount.z).toBeGreaterThan(0);
    expect(mount.z).toBeLessThan(WING.z / 2);
  });
});
