import * as THREE from 'three';
import { buildHead, headPart } from './dragon-head-mesh.spec-helpers';

describe('dragon head mesh', () => {
  /**
   * The horns point *forward*, along the snout. They used to rake back over the
   * neck, and the difference is not a matter of degree: a horn whose tip finishes
   * behind its own root reads as swept, whatever its angle.
   */
  it('drives the horns forward off the skull rather than back over the neck', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const head = buildHead(headPart('box', dims))!;

    for (const side of ['left', 'right']) {
      const horn = head.getObjectByName(`dragon-horn-${side}`)!;
      expect(horn, side).toBeTruthy();
      const tip = new THREE.Box3().setFromObject(horn).max.x;

      // The whole horn finishes ahead of the root it grows from.
      expect(tip, side).toBeGreaterThan(horn.position.x);
      // And ahead of the brow, not merely leaning off vertical.
      expect(tip, side).toBeGreaterThan(dims.x * 0.1);
    }
  });

  it('roots the horns above the ear, forward of the back of the skull', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const head = buildHead(headPart('box', dims))!;
    const horn = head.getObjectByName('dragon-horn-left')!;

    // Behind the eye but well clear of the occiput: the old mount at -0.22 grew
    // them off the back of the braincase.
    expect(horn.position.x).toBeGreaterThan(-dims.x * 0.18);
    expect(horn.position.x).toBeLessThan(0);
    // High on the skull rather than out on the cheek.
    expect(horn.position.y).toBeGreaterThan(0);
  });

  /**
   * The hornless phenotype used to be a second profile, `dragon-head-snout`.
   * With one skull left it rides the horn lengths instead, so zero has to mean
   * no mesh at all — a zero-height cone still leaves its base disc on the bone.
   */
  it('grows nothing where a hornless skull would carry horns', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const horned = buildHead(headPart('box', dims))!;
    const hornless = buildHead({
      ...headPart('box', dims),
      visualProfile: {
        profileId: 'dragon-head-horned',
        meshType: 'procedural',
        parameters: { hornLength: 0, browLength: 0 },
      },
    })!;

    const meshes = (head: THREE.Object3D) => {
      let count = 0;
      head.traverse((child) => {
        if (child instanceof THREE.Mesh) count += 1;
      });
      return count;
    };

    // A main horn and a brow spike on each side stop being built. Counted as a
    // difference rather than an exact number: a horn is a group of segments.
    expect(meshes(hornless)).toBeLessThan(meshes(horned));
    // And nothing is left standing above the bone where they were.
    expect(new THREE.Box3().setFromObject(hornless).max.y).toBeLessThan(
      new THREE.Box3().setFromObject(horned).max.y,
    );
  });
});
