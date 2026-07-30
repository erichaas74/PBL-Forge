import * as CANNON from 'cannon-es';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import {
  identityQuaternion,
  multiplyQuaternions,
  positiveNumber,
  quaternionFromEuler,
} from '../domain/vector-data';

export interface AssemblyBodyOptions {
  positionOffset?: Vector3Data;
  initialRotation?: Vector3Data;
  minimumMass?: number;
  linearDamping?: number;
  angularDamping?: number;
}

export function createAssemblyBody(part: AssemblyPart, options: AssemblyBodyOptions = {}): CANNON.Body {
  const offset = options.positionOffset ?? { x: 0, y: 0, z: 0 };
  const body = new CANNON.Body({
    mass: Math.max(part.mass, options.minimumMass ?? 0),
    position: new CANNON.Vec3(
      part.position.x + offset.x,
      part.position.y + offset.y,
      part.position.z + offset.z,
    ),
  });
  const rotation = options.initialRotation
    ? multiplyQuaternions(
        quaternionFromEuler(options.initialRotation),
        part.rotation ?? identityQuaternion(),
      )
    : part.rotation;
  if (rotation) body.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  body.addShape(createAssemblyShape(part), undefined, getAssemblyShapeOrientation(part));
  body.linearDamping = options.linearDamping ?? 0.08;
  body.angularDamping = options.angularDamping ?? 0.08;
  return body;
}

export function createAssemblyShape(part: AssemblyPart): CANNON.Shape {
  const dimensions = part.dimensions;
  switch (part.shape) {
    case 'box':
      return new CANNON.Box(new CANNON.Vec3(
        positiveNumber(dimensions.x, 1) / 2,
        positiveNumber(dimensions.y, 1) / 2,
        positiveNumber(dimensions.z, 1) / 2,
      ));
    case 'sphere':
      return new CANNON.Sphere(positiveNumber(dimensions.x, 0.5));
    case 'cylinder':
      return new CANNON.Cylinder(
        positiveNumber(dimensions.x, 0.5),
        positiveNumber(dimensions.z, dimensions.x),
        positiveNumber(dimensions.y, 1),
        24,
      );
  }
}

export function getAssemblyShapeOrientation(part: AssemblyPart): CANNON.Quaternion | undefined {
  if (!isWheel(part)) return undefined;
  const quaternion = new CANNON.Quaternion();
  quaternion.setFromEuler(Math.PI / 2, 0, 0);
  return quaternion;
}

function isWheel(part: AssemblyPart): boolean {
  return part.shape === 'cylinder'
    && (part.roles?.includes('wheel')
      || part.visualProfile?.profileId === 'car-wheel'
      || part.id.toLowerCase().includes('wheel'));
}
