import { AssemblyPreset } from '../domain/assembly.models';
import { assembly, joint, part, preset } from './assembly-preset-builder';

export const ROBOT_LOAD_PRESET: AssemblyPreset = preset(
  'robot-load',
  'Robot Load',
  'A simple hinged robot made from a torso, head, arms, and legs.',
  assembly(
    [
      part(
        'robot-torso',
        'box',
        { x: 1.1, y: 1.45, z: 0.55 },
        { x: 0, y: 2.25, z: 0 },
        { mass: 3, color: '#2563eb' },
      ),
      part(
        'robot-head',
        'sphere',
        { x: 0.38, y: 0.38, z: 0.38 },
        { x: 0, y: 3.25, z: 0 },
        { mass: 0.8, color: '#f59e0b' },
      ),
      part(
        'robot-left-arm',
        'box',
        { x: 0.32, y: 1.15, z: 0.32 },
        { x: -0.82, y: 2.2, z: 0 },
        { mass: 0.8, color: '#14b8a6' },
      ),
      part(
        'robot-right-arm',
        'box',
        { x: 0.32, y: 1.15, z: 0.32 },
        { x: 0.82, y: 2.2, z: 0 },
        { mass: 0.8, color: '#14b8a6' },
      ),
      part(
        'robot-left-leg',
        'cylinder',
        { x: 0.24, y: 1.05, z: 0.24 },
        { x: -0.32, y: 0.95, z: 0 },
        { mass: 1, color: '#475569' },
      ),
      part(
        'robot-right-leg',
        'cylinder',
        { x: 0.24, y: 1.05, z: 0.24 },
        { x: 0.32, y: 0.95, z: 0 },
        { mass: 1, color: '#475569' },
      ),
    ],
    [
      joint('robot-neck-fixed', 'fixed', 'robot-torso', 'robot-head', {
        pivotOnParent: { x: 0, y: 0.72, z: 0 },
        pivotOnChild: { x: 0, y: -0.38, z: 0 },
      }),
      joint('robot-left-shoulder-hinge', 'hinge', 'robot-torso', 'robot-left-arm', {
        pivotOnParent: { x: -0.55, y: 0.3, z: 0 },
        pivotOnChild: { x: 0, y: 0.48, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      }),
      joint('robot-right-shoulder-hinge', 'hinge', 'robot-torso', 'robot-right-arm', {
        pivotOnParent: { x: 0.55, y: 0.3, z: 0 },
        pivotOnChild: { x: 0, y: 0.48, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      }),
      joint('robot-left-hip-hinge', 'hinge', 'robot-torso', 'robot-left-leg', {
        pivotOnParent: { x: -0.28, y: -0.72, z: 0 },
        pivotOnChild: { x: 0, y: 0.52, z: 0 },
        axis: { x: 1, y: 0, z: 0 },
      }),
      joint('robot-right-hip-hinge', 'hinge', 'robot-torso', 'robot-right-leg', {
        pivotOnParent: { x: 0.28, y: -0.72, z: 0 },
        pivotOnChild: { x: 0, y: 0.52, z: 0 },
        axis: { x: 1, y: 0, z: 0 },
      }),
    ],
  ),
);
