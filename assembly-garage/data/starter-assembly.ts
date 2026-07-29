import { AssemblyState, ShapeType, Vector3Data } from '../models/assembly.models';

export const DEFAULT_PART_DIMENSIONS: Record<ShapeType, Vector3Data> = {
  box: { x: 1.2, y: 0.7, z: 0.7 },
  sphere: { x: 0.45, y: 0.45, z: 0.45 },
  cylinder: { x: 0.45, y: 1.1, z: 0.45 },
};

export const DEFAULT_PART_COLORS: Record<ShapeType, string> = {
  box: '#2f80ed',
  sphere: '#2a9d8f',
  cylinder: '#f59e0b',
};

export const STARTER_ASSEMBLY_STATE: AssemblyState = {
  parts: [
    {
      id: 'part-base-box',
      roles: ['core'],
      shape: 'box',
      mass: 2,
      dimensions: { x: 1.6, y: 0.45, z: 0.8 },
      position: { x: -0.85, y: 1.4, z: 0 },
      color: '#2f80ed',
    },
    {
      id: 'part-arm-cylinder',
      roles: ['arm'],
      shape: 'cylinder',
      mass: 1,
      dimensions: { x: 0.28, y: 1.4, z: 0.28 },
      position: { x: 0.65, y: 1.4, z: 0 },
      color: '#f59e0b',
    },
  ],
  joints: [
    {
      id: 'joint-starter-hinge',
      type: 'hinge',
      parentPartId: 'part-base-box',
      childPartId: 'part-arm-cylinder',
      pivotOnParent: { x: 0.8, y: 0, z: 0 },
      pivotOnChild: { x: -0.7, y: 0, z: 0 },
      axis: { x: 0, y: 1, z: 0 },
    },
  ],
  isSimulating: false,
};
