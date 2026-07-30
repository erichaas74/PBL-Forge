import { QuaternionData, Vector3Data } from './assembly.models';

export type VectorAxis = keyof Vector3Data;

export function vector3(x = 0, y = 0, z = 0): Vector3Data {
  return { x, y, z };
}

export function cloneVector3(vector: Vector3Data): Vector3Data {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function cloneQuaternion(quaternion: QuaternionData): QuaternionData {
  return { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
}

export function identityQuaternion(): QuaternionData {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function normalizeQuaternion(quaternion: QuaternionData): QuaternionData {
  const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  if (length <= Number.EPSILON) return identityQuaternion();
  return {
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length,
  };
}

export function multiplyQuaternions(a: QuaternionData, b: QuaternionData): QuaternionData {
  return normalizeQuaternion({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  });
}

export function invertQuaternion(quaternion: QuaternionData): QuaternionData {
  const normalized = normalizeQuaternion(quaternion);
  return { x: -normalized.x, y: -normalized.y, z: -normalized.z, w: normalized.w };
}

export function rotateVectorByQuaternion(vector: Vector3Data, quaternion: QuaternionData): Vector3Data {
  const rotation = normalizeQuaternion(quaternion);
  const { x: vx, y: vy, z: vz } = vector;
  const { x: qx, y: qy, z: qz, w: qw } = rotation;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return {
    x: vx + qw * tx + qy * tz - qz * ty,
    y: vy + qw * ty + qz * tx - qx * tz,
    z: vz + qw * tz + qx * ty - qy * tx,
  };
}

export function quaternionFromAxisAngle(axis: Vector3Data, radians: number): QuaternionData {
  const normalizedAxis = normalizeVector3(axis);
  const halfAngle = radians / 2;
  const sin = Math.sin(halfAngle);
  return normalizeQuaternion({
    x: normalizedAxis.x * sin,
    y: normalizedAxis.y * sin,
    z: normalizedAxis.z * sin,
    w: Math.cos(halfAngle),
  });
}

export function quaternionFromEuler(rotation: Vector3Data): QuaternionData {
  const cx = Math.cos(rotation.x / 2);
  const sx = Math.sin(rotation.x / 2);
  const cy = Math.cos(rotation.y / 2);
  const sy = Math.sin(rotation.y / 2);
  const cz = Math.cos(rotation.z / 2);
  const sz = Math.sin(rotation.z / 2);
  return normalizeQuaternion({
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  });
}

export function normalizeVector3(vector: Vector3Data): Vector3Data {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length <= Number.EPSILON) return vector3(1, 0, 0);
  return vector3(vector.x / length, vector.y / length, vector.z / length);
}

export function positiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function roundedNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
