import { AssemblyBlueprint, AssemblyPart } from '../domain/assembly.models';
import {
  buildSpecimenPose,
  estimateSpecimenFloor,
  estimateSpecimenFrame,
  mergeSpecimenFrames,
} from './specimen-pose';

function part(id: string, x: number, roles: string[] = [], size = 1): AssemblyPart {
  return {
    id,
    roles,
    shape: 'box',
    mass: 1,
    dimensions: { x: size, y: size, z: size },
    position: { x, y: 2, z: 0 },
    color: '#888888',
  };
}

/**
 * A body with a three-link tail. Positions satisfy the joint pivots exactly, the
 * way real blueprints do after snap-point assembly or joint realignment — the
 * droop test checks that the bend preserves that.
 */
function chainBlueprint(): AssemblyBlueprint {
  return {
    parts: [
      part('body', 0, ['core'], 2),
      part('tail-1', -1.5, ['tail']),
      part('tail-2', -2.5, ['tail']),
      part('tail-3', -3.5, ['tail']),
    ],
    joints: [
      joint('j1', 'body', 'tail-1', { x: -1, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }),
      joint('j2', 'tail-1', 'tail-2', { x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }),
      joint('j3', 'tail-2', 'tail-3', { x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }),
    ],
  };
}

function joint(
  id: string,
  parentPartId: string,
  childPartId: string,
  pivotOnParent: { x: number; y: number; z: number },
  pivotOnChild: { x: number; y: number; z: number },
) {
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

describe('buildSpecimenPose', () => {
  it('keeps authored positions when no droop is requested', () => {
    const pose = buildSpecimenPose(chainBlueprint());

    expect(pose.parts.length).toBe(4);
    expect(pose.parts.map(entry => entry.position.x)).toEqual([0, -1.5, -2.5, -3.5]);
  });

  it('leaves parts outside the droop role untouched', () => {
    const pose = buildSpecimenPose(chainBlueprint(), { droopRadians: 0.2 });
    const body = pose.parts.find(entry => entry.partId === 'body');

    expect(body?.position).toEqual({ x: 0, y: 2, z: 0 });
  });

  it('bends a chain into an arc that falls further at each link', () => {
    const pose = buildSpecimenPose(chainBlueprint(), { droopRadians: 0.2 });
    const heightOf = (id: string) => pose.parts.find(entry => entry.partId === id)!.position.y;

    // The chain extends along -x and rotates about +z, so each link sits lower
    // than the one before it, and the drop accelerates down the chain.
    const drop1 = 2 - heightOf('tail-1');
    const drop2 = 2 - heightOf('tail-2');
    const drop3 = 2 - heightOf('tail-3');

    expect(drop1).toBeGreaterThan(0);
    expect(drop2).toBeGreaterThan(drop1);
    expect(drop3).toBeGreaterThan(drop2);
  });

  it('keeps bent links joined at their pivots', () => {
    const blueprint = chainBlueprint();
    const pose = buildSpecimenPose(blueprint, { droopRadians: 0.25 });
    const posed = new Map(pose.parts.map(entry => [entry.partId, entry]));

    for (const link of blueprint.joints) {
      const parent = posed.get(link.parentPartId)!;
      const child = posed.get(link.childPartId)!;
      const parentPivot = worldPoint(parent, link.pivotOnParent);
      const childPivot = worldPoint(child, link.pivotOnChild);

      expect(distance(parentPivot, childPivot)).toBeLessThan(1e-6);
    }
  });

  it('rotates parts as well as moving them', () => {
    const pose = buildSpecimenPose(chainBlueprint(), { droopRadians: 0.3 });
    const tip = pose.parts.find(entry => entry.partId === 'tail-3')!;

    expect(Math.abs(tip.rotation.z)).toBeGreaterThan(0);
  });
});

describe('estimateSpecimenFrame', () => {
  it('contains every part', () => {
    const frame = estimateSpecimenFrame(chainBlueprint());

    // Body spans x [-1, 1], the tail reaches x = -4.
    expect(frame.center.x).toBeCloseTo(-1.5, 5);
    expect(frame.radius).toBeGreaterThan(2);
  });

  it('grows with the specimen, so bigger genomes read as bigger', () => {
    const small = estimateSpecimenFrame({ parts: [part('a', 0, [], 1)], joints: [] });
    const large = estimateSpecimenFrame({ parts: [part('a', 0, [], 2)], joints: [] });

    expect(large.radius).toBeGreaterThan(small.radius);
  });

  it('inflates wing bounds so membranes are not cropped', () => {
    const plain: AssemblyPart = { ...part('wing', 0, ['wing']) };
    const winged: AssemblyPart = {
      ...plain,
      visualProfile: { profileId: 'dragon-wing', meshType: 'procedural' },
    };

    const plainFrame = estimateSpecimenFrame({ parts: [plain], joints: [] });
    const wingedFrame = estimateSpecimenFrame({ parts: [winged], joints: [] });

    expect(wingedFrame.radius).toBeGreaterThan(plainFrame.radius);
  });

  it('includes a mini dragon\'s procedural face and sail ears in its frame', () => {
    const plain: AssemblyPart = { ...part('head', 0, ['head']) };
    const miniHead: AssemblyPart = {
      ...plain,
      visualProfile: { profileId: 'mini-dragon-head', meshType: 'procedural' },
    };

    const plainFrame = estimateSpecimenFrame({ parts: [plain], joints: [] });
    const miniFrame = estimateSpecimenFrame({ parts: [miniHead], joints: [] });

    expect(miniFrame.halfExtents.x).toBeGreaterThan(plainFrame.halfExtents.x);
    expect(miniFrame.halfHeight).toBeGreaterThan(plainFrame.halfHeight * 2);
  });

  it('includes inherited Mini Dragon whisker reach in its frame', () => {
    const plain: AssemblyPart = { ...part('whiskers', 0, ['head']) };
    const whiskers: AssemblyPart = {
      ...plain,
      visualProfile: { profileId: 'mini-dragon-whiskers', meshType: 'procedural' },
    };

    const plainFrame = estimateSpecimenFrame({ parts: [plain], joints: [] });
    const whiskerFrame = estimateSpecimenFrame({ parts: [whiskers], joints: [] });

    expect(whiskerFrame.halfExtents.x).toBeGreaterThan(plainFrame.halfExtents.x * 3);
    expect(whiskerFrame.halfExtents.z).toBeGreaterThan(plainFrame.halfExtents.z);
  });

  it('uses the posed positions when a pose is supplied', () => {
    const blueprint = chainBlueprint();
    const pose = buildSpecimenPose(blueprint, { droopRadians: 0.4 });

    const posed = estimateSpecimenFrame(blueprint, pose);
    const authored = estimateSpecimenFrame(blueprint);

    expect(posed.center.y).toBeLessThan(authored.center.y);
  });

  it('falls back to a unit frame for an empty blueprint', () => {
    expect(estimateSpecimenFrame({ parts: [], joints: [] })).toEqual({
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 1, y: 1, z: 1 },
      radius: 1,
      halfHeight: 1,
    });
  });

  /**
   * Creatures are flat and wide — the classic dragon measures about 6 x 2 x 4.
   * Framing it as a sphere left it filling under a quarter of the viewport, so
   * height is measured separately from width.
   */
  it('measures a flat wide specimen as short, not as a big sphere', () => {
    const flat = estimateSpecimenFrame({
      parts: [{ ...part('body', 0, [], 1), dimensions: { x: 6, y: 1, z: 4 } }],
      joints: [],
    });

    expect(flat.halfHeight).toBeCloseTo(0.5, 5);
    expect(flat.halfExtents).toEqual({ x: 3, y: 0.5, z: 2 });
    expect(flat.radius).toBeCloseTo(0.5 * Math.hypot(6, 4), 5);
    // The sphere radius would have been ~3.6; height must not inherit that.
    expect(flat.halfHeight).toBeLessThan(flat.radius / 3);
  });

  it('ignores depth when measuring height, so a long body stays short', () => {
    const long = estimateSpecimenFrame({
      parts: [{ ...part('body', 0, [], 1), dimensions: { x: 20, y: 2, z: 1 } }],
      joints: [],
    });

    expect(long.halfHeight).toBeCloseTo(1, 5);
  });
});

describe('mergeSpecimenFrames', () => {
  it('produces one frame containing all of them', () => {
    const merged = mergeSpecimenFrames([
      { center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 1, y: 1, z: 1 }, radius: 1, halfHeight: 1 },
      { center: { x: 4, y: 0, z: 0 }, halfExtents: { x: 1, y: 1, z: 1 }, radius: 1, halfHeight: 1 },
    ]);

    expect(merged.center.x).toBeCloseTo(2, 5);
    expect(merged.radius).toBeGreaterThanOrEqual(3);
  });

  it('is at least as large as its largest member, so nothing is cropped', () => {
    const large = {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 4, y: 2, z: 3 },
      radius: 5,
      halfHeight: 2,
    };
    const merged = mergeSpecimenFrames([
      large,
      { center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 1, y: 1, z: 1 }, radius: 1, halfHeight: 1 },
    ]);

    expect(merged.radius).toBeGreaterThanOrEqual(large.radius);
    expect(merged.halfHeight).toBeGreaterThanOrEqual(large.halfHeight);
  });

  it('merges height independently of width', () => {
    const merged = mergeSpecimenFrames([
      { center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 4, y: 0.5, z: 0.1 }, radius: 4, halfHeight: 0.5 },
      { center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 0.5, y: 3, z: 0.1 }, radius: 0.5, halfHeight: 3 },
    ]);

    expect(merged.radius).toBeCloseTo(Math.hypot(4, 0.1), 5);
    expect(merged.halfHeight).toBeCloseTo(3, 5);
  });
});

describe('estimateSpecimenFloor', () => {
  it('returns the lowest point of the specimen', () => {
    expect(estimateSpecimenFloor(chainBlueprint())).toBeCloseTo(1, 5);
  });
});

function worldPoint(
  pose: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } },
  local: { x: number; y: number; z: number },
) {
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

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
