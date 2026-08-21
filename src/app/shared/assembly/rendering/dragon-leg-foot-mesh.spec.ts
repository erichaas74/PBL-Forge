import * as THREE from 'three';
import { buildLimb, childNamed, limbPart } from './dragon-limb-mesh.spec-helpers';

describe('dragon limb meshes', () => {
  /**
   * These used to render at half scale with a compensating lift, which put the
   * visible thigh nowhere near the hip, knee, and ankle sockets the joints are
   * built from. Every socket on a limb sits on the face of its own physics
   * volume, so the mesh has to fill that volume for the chain to read as
   * connected.
   */
  it('fills the physics volume so limb sockets land on the mesh', () => {
    const leg = buildLimb(limbPart('dragon-leg', { x: 0.22, y: 0.72, z: 0.22 }))!;
    const foot = buildLimb({
      ...limbPart('dragon-leg', { x: 0.34, y: 0.14, z: 0.28 }),
      visualProfile: { profileId: 'dragon-foot', meshType: 'procedural' },
    })!;
    const claw = buildLimb(limbPart('dragon-claw', { x: 0.08, y: 0.2, z: 0.08 }))!;

    for (const limb of [leg, foot, claw]) {
      expect(limb.scale.toArray()).toEqual([1, 1, 1]);
      expect(limb.position.toArray()).toEqual([0, 0, 0]);
    }

    // The limb's own skin, not the group: the joint balls are *supposed* to
    // overrun the collider, since a ball that stops at the rim cannot reach
    // into the part it is closing the gap against.
    const legBounds = new THREE.Box3().setFromObject(childNamed(leg, 'dragon-leg-skin'));

    expect(legBounds.min.y).toBeCloseTo(-0.72 / 2, 2);
    expect(legBounds.max.y).toBeCloseTo(0.72 / 2, 2);
  });

  it('builds feet from an organic pad, heel, toes, and curved talons', () => {
    const foot = buildLimb({
      ...limbPart('dragon-leg', { x: 0.34, y: 0.14, z: 0.28 }),
      visualProfile: { profileId: 'dragon-foot', meshType: 'procedural' },
    })!;

    expect(childNamed(foot, 'dragon-foot-pad')).toBeTruthy();
    expect(childNamed(foot, 'dragon-foot-heel')).toBeTruthy();
    expect(foot.children.filter((child) => child.name.startsWith('dragon-foot-toe-')).length).toBe(
      3,
    );
    expect(
      foot.children.filter((child) => child.name.startsWith('dragon-foot-talon-')).length,
    ).toBe(3);
  });
});
