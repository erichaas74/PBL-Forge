import * as THREE from 'three';

const EYELID_DATA_KEY = 'specimenAnimatedEyelid';

interface AnimatedEyelidData {
  open: [number, number, number];
  closed: [number, number, number];
}

export interface SpecimenFacialExpression {
  /** 0 is fully open; 1 is fully closed. */
  blink: number;
}

export interface SpecimenFacialAnimation {
  readonly eyelids: readonly AnimatedEyelidHandle[];
}

interface AnimatedEyelidHandle {
  object: THREE.Object3D;
  open: THREE.Vector3;
  closed: THREE.Vector3;
}

export const OPEN_SPECIMEN_EXPRESSION: SpecimenFacialExpression = { blink: 0 };

/**
 * Marks an eyelid as a cheap animation handle without coupling generated
 * anatomy to the specimen viewer. The metadata travels with the mesh through
 * every factory, while thumbnails and other still renderers simply ignore it.
 */
export function markSpecimenEyelid(
  eyelid: THREE.Object3D,
  openPosition: THREE.Vector3,
  closedPosition: THREE.Vector3,
): void {
  const data: AnimatedEyelidData = {
    open: openPosition.toArray(),
    closed: closedPosition.toArray(),
  };
  eyelid.userData[EYELID_DATA_KEY] = data;
  eyelid.position.copy(openPosition);
}

/** Collect once when a specimen is built; applying a blink never traverses the model. */
export function collectSpecimenFacialAnimation(root: THREE.Object3D): SpecimenFacialAnimation {
  const eyelids: AnimatedEyelidHandle[] = [];
  root.traverse((object) => {
    const data = object.userData[EYELID_DATA_KEY] as AnimatedEyelidData | undefined;
    if (!data) return;
    eyelids.push({
      object,
      open: new THREE.Vector3().fromArray(data.open),
      closed: new THREE.Vector3().fromArray(data.closed),
    });
  });
  return { eyelids };
}

/** Applies only local lid transforms, leaving the assembly pose and joints untouched. */
export function applySpecimenFacialExpression(
  animation: SpecimenFacialAnimation,
  expression: SpecimenFacialExpression,
): void {
  const amount = THREE.MathUtils.clamp(expression.blink, 0, 1);
  // Ease both ends so the lids do not look mechanically linear as they meet.
  const eased = amount * amount * (3 - 2 * amount);
  for (const eyelid of animation.eyelids) {
    eyelid.object.position.lerpVectors(eyelid.open, eyelid.closed, eased);
  }
}
