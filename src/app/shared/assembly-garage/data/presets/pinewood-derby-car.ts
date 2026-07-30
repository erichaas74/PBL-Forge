import {
  AssemblyJointBehavior,
  AssemblyPreset,
} from '../../models/assembly.models';
import { assembly, joint, part, preset } from './assembly-preset-builder';

const DERBY_SHOCK: AssemblyJointBehavior = {
  profile: 'springHinge',
  springStiffness: 180,
  springDamping: 22,
  breakForce: 2400,
  breakDamage: 8,
};

export const PINEWOOD_DERBY_CAR_PRESET: AssemblyPreset = preset(
  'pinewood-derby-car',
  'Pinewood Derby Car',
  'A light car with spring-damped wheel joints for downhill rolling tests.',
  assembly(
    [
      part(
        'derby-chassis',
        'box',
        { x: 2.6, y: 0.24, z: 0.62 },
        { x: 0, y: 0.52, z: 0 },
        { label: 'Derby Chassis', mass: 2.6, color: '#dc2626' },
      ),
      part(
        'derby-nose',
        'box',
        { x: 0.72, y: 0.16, z: 0.48 },
        { x: 0.9, y: 0.66, z: 0 },
        { label: 'Weighted Nose', mass: 1.1, color: '#f97316' },
      ),
      part(
        'front-left-shock',
        'cylinder',
        { x: 0.05, y: 0.36, z: 0.05 },
        { x: 0.84, y: 0.36, z: -0.39 },
        { label: 'Front Left Shock', mass: 0.16, color: '#facc15' },
      ),
      part(
        'front-right-shock',
        'cylinder',
        { x: 0.05, y: 0.36, z: 0.05 },
        { x: 0.84, y: 0.36, z: 0.39 },
        { label: 'Front Right Shock', mass: 0.16, color: '#facc15' },
      ),
      part(
        'rear-left-shock',
        'cylinder',
        { x: 0.05, y: 0.36, z: 0.05 },
        { x: -0.9, y: 0.36, z: -0.39 },
        { label: 'Rear Left Shock', mass: 0.16, color: '#facc15' },
      ),
      part(
        'rear-right-shock',
        'cylinder',
        { x: 0.05, y: 0.36, z: 0.05 },
        { x: -0.9, y: 0.36, z: 0.39 },
        { label: 'Rear Right Shock', mass: 0.16, color: '#facc15' },
      ),
      part(
        'front-left-wheel',
        'cylinder',
        { x: 0.2, y: 0.12, z: 0.2 },
        { x: 0.84, y: 0.2, z: -0.49 },
        { label: 'Front Left Wheel', mass: 0.42, color: '#111827' },
      ),
      part(
        'front-right-wheel',
        'cylinder',
        { x: 0.2, y: 0.12, z: 0.2 },
        { x: 0.84, y: 0.2, z: 0.49 },
        { label: 'Front Right Wheel', mass: 0.42, color: '#111827' },
      ),
      part(
        'rear-left-wheel',
        'cylinder',
        { x: 0.2, y: 0.12, z: 0.2 },
        { x: -0.9, y: 0.2, z: -0.49 },
        { label: 'Rear Left Wheel', mass: 0.42, color: '#111827' },
      ),
      part(
        'rear-right-wheel',
        'cylinder',
        { x: 0.2, y: 0.12, z: 0.2 },
        { x: -0.9, y: 0.2, z: 0.49 },
        { label: 'Rear Right Wheel', mass: 0.42, color: '#111827' },
      ),
    ],
    [
      joint('derby-nose-fixed', 'fixed', 'derby-chassis', 'derby-nose', {
        pivotOnParent: { x: 0.64, y: 0.12, z: 0 },
        pivotOnChild: { x: -0.18, y: -0.08, z: 0 },
      }),
      joint('front-left-shock-fixed', 'fixed', 'derby-chassis', 'front-left-shock', {
        pivotOnParent: { x: 0.84, y: -0.1, z: -0.31 },
        pivotOnChild: { x: 0, y: 0.16, z: 0 },
        behavior: DERBY_SHOCK,
      }),
      joint('front-right-shock-fixed', 'fixed', 'derby-chassis', 'front-right-shock', {
        pivotOnParent: { x: 0.84, y: -0.1, z: 0.31 },
        pivotOnChild: { x: 0, y: 0.16, z: 0 },
        behavior: DERBY_SHOCK,
      }),
      joint('rear-left-shock-fixed', 'fixed', 'derby-chassis', 'rear-left-shock', {
        pivotOnParent: { x: -0.9, y: -0.1, z: -0.31 },
        pivotOnChild: { x: 0, y: 0.16, z: 0 },
        behavior: DERBY_SHOCK,
      }),
      joint('rear-right-shock-fixed', 'fixed', 'derby-chassis', 'rear-right-shock', {
        pivotOnParent: { x: -0.9, y: -0.1, z: 0.31 },
        pivotOnChild: { x: 0, y: 0.16, z: 0 },
        behavior: DERBY_SHOCK,
      }),
      joint('front-left-wheel-hinge', 'hinge', 'derby-chassis', 'front-left-wheel', {
        pivotOnParent: { x: 0.84, y: -0.32, z: -0.49 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        behavior: DERBY_SHOCK,
      }),
      joint('front-right-wheel-hinge', 'hinge', 'derby-chassis', 'front-right-wheel', {
        pivotOnParent: { x: 0.84, y: -0.32, z: 0.49 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        behavior: DERBY_SHOCK,
      }),
      joint('rear-left-wheel-hinge', 'hinge', 'derby-chassis', 'rear-left-wheel', {
        pivotOnParent: { x: -0.9, y: -0.32, z: -0.49 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        behavior: DERBY_SHOCK,
      }),
      joint('rear-right-wheel-hinge', 'hinge', 'derby-chassis', 'rear-right-wheel', {
        pivotOnParent: { x: -0.9, y: -0.32, z: 0.49 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        behavior: DERBY_SHOCK,
      }),
    ],
  ),
);
