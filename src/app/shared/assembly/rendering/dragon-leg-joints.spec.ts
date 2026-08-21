import * as THREE from 'three';
import { buildLimb, childNamed, limbPart } from './dragon-limb-mesh.spec-helpers';

/** Joint collars belong to limb construction and scale with the owning part. */
describe('dragon limb joint balls', () => {
  function ballBounds(object: THREE.Object3D, name: string): THREE.Box3 {
    return new THREE.Box3().setFromObject(childNamed(object, name));
  }

  it('caps a leg at the hip socket and at the heel', () => {
    const dims = { x: 0.22, y: 0.72, z: 0.22 };
    const leg = buildLimb(limbPart('dragon-leg', dims))!;

    const socket = ballBounds(leg, 'dragon-leg-socket-ball');
    const heel = ballBounds(leg, 'dragon-leg-heel-ball');

    // Centres: the upper joint sits at 0.4 of the segment, the lower at its end.
    expect(socket.getCenter(new THREE.Vector3()).y).toBeCloseTo(0.4 * dims.y, 4);
    expect(heel.getCenter(new THREE.Vector3()).y).toBeCloseTo(-0.5 * dims.y, 4);

    // Wider than the limb at that station, so the seam is always covered.
    expect(socket.max.x - socket.min.x).toBeGreaterThan(dims.x);
    expect(heel.max.x - heel.min.x).toBeGreaterThan(dims.x);
    expect(socket.max.y - socket.min.y).toBeLessThan(socket.max.x - socket.min.x);
  });

  it('scales the balls with the part, not in world units', () => {
    const small = buildLimb(limbPart('dragon-leg', { x: 0.22, y: 0.72, z: 0.22 }))!;
    const large = buildLimb(limbPart('dragon-leg', { x: 0.44, y: 1.44, z: 0.44 }))!;

    const smallBall = ballBounds(small, 'dragon-leg-socket-ball');
    const largeBall = ballBounds(large, 'dragon-leg-socket-ball');

    expect(largeBall.max.x - largeBall.min.x).toBeCloseTo(
      (smallBall.max.x - smallBall.min.x) * 2,
      4,
    );
  });

  it('takes a per-part override for the ball width', () => {
    const dims = { x: 0.22, y: 0.72, z: 0.22 };
    const standard = ballBounds(buildLimb(limbPart('dragon-leg', dims))!, 'dragon-leg-socket-ball');
    const wide = ballBounds(
      buildLimb({
        ...limbPart('dragon-leg', dims),
        visualProfile: {
          profileId: 'dragon-leg',
          meshType: 'procedural',
          parameters: { jointBall: 2.12 },
        },
      })!,
      'dragon-leg-socket-ball',
    );

    expect(wide.max.x - wide.min.x).toBeGreaterThan((standard.max.x - standard.min.x) * 1.8);
  });
});
