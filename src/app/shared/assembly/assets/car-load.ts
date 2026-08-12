import { AssemblyPreset } from '../domain/assembly.models';
import { assembly, joint, part, preset } from './assembly-preset-builder';

export const CAR_LOAD_PRESET: AssemblyPreset = preset(
  'car-load',
  'Car Load',
  'A simple chassis, cabin, and four wheel assembly ready for wheel joints.',
  assembly(
    [
      part(
        'car-chassis',
        'box',
        { x: 2.3, y: 0.38, z: 1.12 },
        { x: 0, y: 0.66, z: 0 },
        { mass: 4, color: '#ef4444' },
      ),
      part(
        'car-cabin',
        'box',
        { x: 0.95, y: 0.55, z: 0.82 },
        { x: -0.25, y: 1.16, z: 0 },
        { mass: 1.2, color: '#38bdf8' },
      ),
      part(
        'car-front-left-wheel',
        'cylinder',
        { x: 0.28, y: 0.18, z: 0.28 },
        { x: 0.78, y: 0.28, z: -0.68 },
        { mass: 0.55, color: '#111827' },
      ),
      part(
        'car-front-right-wheel',
        'cylinder',
        { x: 0.28, y: 0.18, z: 0.28 },
        { x: 0.78, y: 0.28, z: 0.68 },
        { mass: 0.55, color: '#111827' },
      ),
      part(
        'car-rear-left-wheel',
        'cylinder',
        { x: 0.28, y: 0.18, z: 0.28 },
        { x: -0.78, y: 0.28, z: -0.68 },
        { mass: 0.55, color: '#111827' },
      ),
      part(
        'car-rear-right-wheel',
        'cylinder',
        { x: 0.28, y: 0.18, z: 0.28 },
        { x: -0.78, y: 0.28, z: 0.68 },
        { mass: 0.55, color: '#111827' },
      ),
    ],
    [
      joint('car-cabin-fixed', 'fixed', 'car-chassis', 'car-cabin', {
        pivotOnParent: { x: -0.25, y: 0.19, z: 0 },
        pivotOnChild: { x: 0, y: -0.28, z: 0 },
      }),
      joint('car-front-left-wheel-hinge', 'hinge', 'car-chassis', 'car-front-left-wheel', {
        pivotOnParent: { x: 0.78, y: -0.08, z: -0.56 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      }),
      joint('car-front-right-wheel-hinge', 'hinge', 'car-chassis', 'car-front-right-wheel', {
        pivotOnParent: { x: 0.78, y: -0.08, z: 0.56 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      }),
      joint('car-rear-left-wheel-hinge', 'hinge', 'car-chassis', 'car-rear-left-wheel', {
        pivotOnParent: { x: -0.78, y: -0.08, z: -0.56 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      }),
      joint('car-rear-right-wheel-hinge', 'hinge', 'car-chassis', 'car-rear-right-wheel', {
        pivotOnParent: { x: -0.78, y: -0.08, z: 0.56 },
        pivotOnChild: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      }),
    ],
  ),
);
