import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '@pbl/assembly/domain/assembly.models';
import { SpecimenFrame, estimateSpecimenFrame } from '@pbl/assembly/preview/specimen-pose';
import {
  createAssemblyObject,
  disposeAssemblyObject,
} from '@pbl/assembly/rendering/three-assembly-mesh.factory';

/**
 * Fits an isolated Parts Lab preview to the mesh itself instead of its parent-sized collider.
 *
 * Overlay anatomy such as whiskers and belly scutes deliberately uses the head/body dimensions
 * so its procedural builder can place details in the assembled animal. Those dimensions are not
 * the detail's visible bounds, however, and framing from them leaves small or offset parts blank.
 */
export function exactPartPreviewFrame(part: AssemblyPart): SpecimenFrame {
  const object = createAssemblyObject(part, { proceduralOnly: true });
  object.position.set(part.position.x, part.position.y, part.position.z);
  if (part.rotation) {
    object.quaternion.set(part.rotation.x, part.rotation.y, part.rotation.z, part.rotation.w);
  }
  object.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(object);
  disposeAssemblyObject(object);
  if (bounds.isEmpty()) return estimateSpecimenFrame({ parts: [part], joints: [] });

  // Preserve a little authoring-room around the true mesh. Exact screen-space
  // fitting is too tight for bevels at three-quarter angles and makes tall
  // petals appear clipped even though their mathematical bounds are present.
  const rawSize = bounds.getSize(new THREE.Vector3());
  bounds.expandByScalar(Math.max(rawSize.x, rawSize.y, rawSize.z) * 0.06);

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const halfExtents = {
    x: Math.max(size.x / 2, 0.001),
    y: Math.max(size.y / 2, 0.001),
    z: Math.max(size.z / 2, 0.001),
  };

  return {
    center: { x: center.x, y: center.y, z: center.z },
    halfExtents,
    points: boxCorners(bounds),
    radius: Math.max(Math.hypot(halfExtents.x, halfExtents.z), 0.001),
    halfHeight: halfExtents.y,
  };
}

function boxCorners(bounds: THREE.Box3): Vector3Data[] {
  const points: Vector3Data[] = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) points.push({ x, y, z });
    }
  }
  return points;
}
