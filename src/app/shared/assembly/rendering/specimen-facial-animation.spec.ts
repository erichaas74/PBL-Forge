import * as THREE from 'three';
import {
  applySpecimenFacialExpression,
  collectSpecimenFacialAnimation,
  markSpecimenEyelid,
} from './specimen-facial-animation';

describe('specimen facial animation', () => {
  it('collects generated eyelids and closes them without rebuilding the model', () => {
    const root = new THREE.Group();
    const upper = new THREE.Object3D();
    const lower = new THREE.Object3D();
    markSpecimenEyelid(upper, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.02, 0));
    markSpecimenEyelid(lower, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -0.02, 0));
    root.add(upper, lower);

    const animation = collectSpecimenFacialAnimation(root);
    expect(animation.eyelids.length).toBe(2);

    applySpecimenFacialExpression(animation, { blink: 1 });
    expect(upper.position.y).toBeCloseTo(0.02, 6);
    expect(lower.position.y).toBeCloseTo(-0.02, 6);

    applySpecimenFacialExpression(animation, { blink: 0 });
    expect(upper.position.y).toBeCloseTo(1, 6);
    expect(lower.position.y).toBeCloseTo(-1, 6);
  });

  it('clamps expression input before applying it', () => {
    const lid = new THREE.Object3D();
    markSpecimenEyelid(lid, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
    const animation = collectSpecimenFacialAnimation(lid);

    applySpecimenFacialExpression(animation, { blink: 4 });
    expect(lid.position.y).toBe(0);
    applySpecimenFacialExpression(animation, { blink: -2 });
    expect(lid.position.y).toBe(1);
  });
});
