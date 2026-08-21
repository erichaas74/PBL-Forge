import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildLimb, childNamed, limbPart } from './dragon-limb-mesh.spec-helpers';

/**
 * The grasping forelimb — the `ll` body plan's arm and hand.
 *
 * What separates the hand from a foot is proportion: a talon on a foot is a
 * stub against a broad pad, and a finger here is longer than the palm it grows
 * from. That is the whole silhouette, so it is what these pin.
 */
describe('dragon grasping forelimb', () => {
  function handPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
    return {
      id: 'grasp-hand',
      label: 'Grasping Hand',
      roles: ['leg'],
      shape: 'box',
      mass: 0.07,
      dimensions: { x: 0.2, y: 0.11, z: 0.17 },
      position: { x: 0, y: 0, z: 0 },
      color: '#a855f7',
      visualProfile: { profileId: 'dragon-grasp-hand', meshType: 'procedural' },
      ...overrides,
    };
  }

  it('builds an arm segment with a joint ball at each end', () => {
    const arm = buildLimb(limbPart('dragon-leg', { x: 0.14, y: 0.33, z: 0.14 }));
    const grasp = buildLimb({
      ...limbPart('dragon-leg', { x: 0.14, y: 0.33, z: 0.14 }),
      visualProfile: { profileId: 'dragon-grasp-arm', meshType: 'procedural' },
    })!;

    expect(arm).toBeTruthy();
    expect(childNamed(grasp, 'dragon-grasp-arm-skin')).toBeTruthy();
    expect(childNamed(grasp, 'dragon-grasp-arm-socket-ball')).toBeTruthy();
    expect(childNamed(grasp, 'dragon-grasp-arm-heel-ball')).toBeTruthy();
  });

  it('is slimmer than the walking leg it replaces', () => {
    const dims = { x: 0.2, y: 0.5, z: 0.2 };
    const leg = new THREE.Box3().setFromObject(
      childNamed(buildLimb(limbPart('dragon-leg', dims))!, 'dragon-leg-skin'),
    );
    const arm = new THREE.Box3().setFromObject(
      childNamed(
        buildLimb({
          ...limbPart('dragon-leg', dims),
          visualProfile: { profileId: 'dragon-grasp-arm', meshType: 'procedural' },
        })!,
        'dragon-grasp-arm-skin',
      ),
    );

    expect(arm.max.x - arm.min.x).toBeLessThan(leg.max.x - leg.min.x);
    // Same length, though: it is a limb segment, not a stub.
    expect(arm.max.y - arm.min.y).toBeCloseTo(leg.max.y - leg.min.y, 4);
  });

  it('gives the padless hand two fingers and an opposing thumb', () => {
    const hand = buildLimb(handPart())!;

    expect(hand.getObjectByName('dragon-grasp-palm')).toBeFalsy();
    expect(childNamed(hand, 'dragon-grasp-wrist-ball')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-finger-1')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-finger-2')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-thumb')).toBeTruthy();
    expect(hand.getObjectByName('dragon-grasp-finger-4')).toBeFalsy();
  });

  /**
   * A finger is skin with keratin on the end, not a keratin spike. The claw is
   * a separate child so it can carry the claw material — lose it and the whole
   * digit renders as scale, which is the failure that made the old hand read as
   * three toes stuck on a brick.
   */
  it('tips each finger with a claw of its own', () => {
    const hand = buildLimb(handPart())!;

    expect(childNamed(hand, 'dragon-grasp-claw-1')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-claw-3')).toBeTruthy();

    /*
     * Past the knuckle: the claw is the last thing on the finger, so it has to
     * reach further forward than the joint it grows from.
     *
     * The explicit `updateMatrixWorld` is load-bearing. Both of these sit two
     * groups deep — the finger, then the knuckle that bends inside it — and
     * `Box3.setFromObject` refreshes an object's descendants but not its
     * ancestors, so without this both boxes come back measured in a frame with
     * the finger's own rotation missing and the comparison is meaningless.
     */
    hand.updateMatrixWorld(true);
    const knuckle = new THREE.Box3().setFromObject(
      childNamed(hand, 'dragon-grasp-finger-2-knuckle'),
    );
    const claw = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-claw-2'));

    expect(claw.max.x).toBeGreaterThan(knuckle.max.x);
  });

  it('uses an opposing thumb curve and flips every hook 180 degrees', () => {
    const hand = buildLimb(handPart())!;

    for (const index of [1, 2]) {
      const pivot = childNamed(hand, `dragon-grasp-claw-pivot-${index}`);
      expect(pivot.rotation.z).toBeCloseTo(0.36);
    }
    expect(childNamed(hand, 'dragon-grasp-claw-pivot-3').rotation.z).toBeCloseTo(-0.36);
    for (const index of [1, 2, 3]) {
      expect(childNamed(hand, `dragon-grasp-claw-${index}`).rotation.y).toBeCloseTo(Math.PI);
    }
  });

  it('bends each digit toward the direction of its claw curl', () => {
    const hand = buildLimb(handPart())!;

    expect(childNamed(hand, 'dragon-grasp-finger-1-bend').rotation.z).toBeCloseTo(-0.26);
    expect(childNamed(hand, 'dragon-grasp-finger-2-bend').rotation.z).toBeCloseTo(-0.26);
    expect(childNamed(hand, 'dragon-grasp-finger-3-bend').rotation.z).toBeCloseTo(0.26);
  });

  it('projects its long fingers well beyond the wrist', () => {
    const hand = buildLimb(handPart())!;
    const wrist = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-wrist-ball'));
    const finger = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-2'));

    expect(finger.max.x).toBeGreaterThan(wrist.max.x + handPart().dimensions.x);
  });

  it('seats the finger roots around the back of the wrist instead of on top', () => {
    const hand = buildLimb(handPart())!;
    hand.updateMatrixWorld(true);
    const wrist = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-wrist-ball'));
    const wristCenter = wrist.getCenter(new THREE.Vector3());

    for (const index of [1, 2, 3]) {
      const base = new THREE.Box3().setFromObject(
        childNamed(hand, `dragon-grasp-finger-${index}-base`),
      );
      const baseCenter = base.getCenter(new THREE.Vector3());
      expect(Math.abs(baseCenter.y - wristCenter.y)).toBeLessThan(
        wrist.getSize(new THREE.Vector3()).y * 0.35,
      );
      expect(base.intersectsBox(wrist)).toBe(true);
    }
  });

  it('grows the fingers with the claw gene, the same one the feet read', () => {
    const plain = buildLimb(handPart())!;
    const clawed = buildLimb(
      handPart({
        visualProfile: {
          profileId: 'dragon-grasp-hand',
          meshType: 'procedural',
          parameters: { clawScale: 1.6 },
        },
      }),
    )!;

    const reach = (object: THREE.Object3D): number =>
      new THREE.Box3().setFromObject(childNamed(object, 'dragon-grasp-finger-2')).max.x;

    expect(reach(clawed)).toBeGreaterThan(reach(plain));
  });

  it('places two finger roots above one opposing thumb root', () => {
    const hand = buildLimb(handPart())!;
    hand.updateMatrixWorld(true);
    const first = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-1-base'));
    const second = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-2-base'));
    const thumb = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-3-base'));
    const firstCenter = first.getCenter(new THREE.Vector3());
    const secondCenter = second.getCenter(new THREE.Vector3());
    const thumbCenter = thumb.getCenter(new THREE.Vector3());

    // The reared pose rolls this local axis: lower local Y becomes the visible
    // upper side, so these roots render above the thumb on the dragon.
    expect(firstCenter.y).toBeLessThan(thumbCenter.y);
    expect(secondCenter.y).toBeLessThan(thumbCenter.y);
    expect(firstCenter.z * secondCenter.z).toBeLessThan(0);
  });
});
