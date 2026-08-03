import {
  AssemblyAttachmentRule,
  AssemblyJointBehavior,
  AssemblyPart,
  AssemblyPartRole,
  AssemblySnapDefinition,
  AssemblyVisualProfile,
  JointType,
  QuaternionData,
  ShapeType,
  Vector3Data,
} from '../models/assembly.models';
import { createAssemblyId } from '../utils/assembly-id';
import { quaternionFromAxisAngle } from '../utils/vector-data';
import { dragonBodySurfacePoint } from '../../assembly/rendering/dragon-body-profile';
import { wingClawAnchor, wingRootMount } from '../../assembly/rendering/dragon-wing-profile';
import { inferAssemblyPartRoles } from '../../assembly/domain/assembly-clone';

export type AssemblyPartFamily = 'primitive' | 'car' | 'robot' | 'dragon';

export interface AssemblyPartDefinition {
  id: string;
  label: string;
  family: AssemblyPartFamily;
  shape: ShapeType;
  dimensions: Vector3Data;
  mass: number;
  color: string;
  roles?: AssemblyPartRole[];
  visualProfile?: AssemblyVisualProfile;
  snapPoints: AssemblySnapDefinition[];
  attachment?: AssemblyAttachmentRule;
}

export const IDENTITY_ROTATION = { x: 0, y: 0, z: 0, w: 1 } as const;

const BREAKABLE_LIGHT: AssemblyJointBehavior = {
  profile: 'passive',
  breakForce: 240,
  breakDamage: 10,
};

const BREAKABLE_MEDIUM: AssemblyJointBehavior = {
  profile: 'passive',
  breakForce: 360,
  breakDamage: 14,
};

const CAR_SHOCK_HINGE: AssemblyJointBehavior = {
  profile: 'springHinge',
  springStiffness: 120,
  springDamping: 14,
  breakForce: 620,
  breakDamage: 10,
};

const LEG_SPRING_HINGE: AssemblyJointBehavior = {
  profile: 'springHinge',
  motorForce: 130,
  springDamping: 9,
  breakForce: 520,
  breakDamage: 12,
};

const WING_FLAP_MOTOR: AssemblyJointBehavior = {
  profile: 'oscillatingMotor',
  oscillationSpeed: 4.2,
  oscillationAmplitude: 5.5,
  motorForce: 60,
  breakForce: 320,
  breakDamage: 12,
};

const JAW_OPEN_CLOSE_MOTOR: AssemblyJointBehavior = {
  profile: 'oscillatingMotor',
  oscillationSpeed: 6,
  oscillationAmplitude: 0.65,
  motorForce: 22,
  breakForce: 120,
  breakDamage: 8,
};

/**
 * Where limbs meet the torso, in radians around the spine measured from the
 * belly: `0` is straight down, `Math.PI / 2` the flank, `Math.PI` the ridge.
 *
 * Torso sockets are measured off the body's own silhouette rather than its
 * bounding box. The box is only touched at the widest point of the lathe; by
 * the hips and the tail it stands well clear of the surface, so box-relative
 * sockets left limbs hanging in the air beside the dragon.
 */
const HIP_ANGLE = 0.66;
const WING_ROOT_ANGLE = 2.06;

/**
 * Named because the root mount and the hand claw are both derived from them,
 * and all three have to move together.
 */
const WING_DIMENSIONS: Vector3Data = { x: 0.39, y: 0.12, z: 2.025 };
const SECONDARY_WING_DIMENSIONS: Vector3Data = { x: 0.33, y: 0.105, z: 1.575 };

const TAIL_SPRING_HINGE: AssemblyJointBehavior = {
  profile: 'springHinge',
  motorForce: 56,
  springDamping: 7,
  breakForce: 260,
  breakDamage: 10,
};

export const ASSEMBLY_PART_DEFINITIONS: readonly AssemblyPartDefinition[] = [
  primitiveDefinition('box', { x: 1.2, y: 0.7, z: 0.7 }, 1.5, '#2f80ed'),
  primitiveDefinition('sphere', { x: 0.45, y: 0.45, z: 0.45 }, 1, '#2a9d8f'),
  primitiveDefinition('cylinder', { x: 0.45, y: 1.1, z: 0.45 }, 1, '#f59e0b'),
  {
    id: 'car-chassis-frame',
    label: 'Chassis Frame',
    family: 'car',
    shape: 'box',
    dimensions: { x: 2.3, y: 0.38, z: 1.12 },
    mass: 4,
    color: '#ef4444',
    visualProfile: visualProfile('car-chassis', 'paint-red'),
    snapPoints: [
      socket('car-cabin-socket', 'Cabin socket', { x: -0.25, y: 0.19, z: 0 }, 'car-cabin-mount'),
      socket('car-front-left-wheel-socket', 'Front left wheel', { x: 0.78, y: -0.08, z: -0.56 }, 'wheel-hub'),
      socket('car-front-right-wheel-socket', 'Front right wheel', { x: 0.78, y: -0.08, z: 0.56 }, 'wheel-hub'),
      socket('car-rear-left-wheel-socket', 'Rear left wheel', { x: -0.78, y: -0.08, z: -0.56 }, 'wheel-hub'),
      socket('car-rear-right-wheel-socket', 'Rear right wheel', { x: -0.78, y: -0.08, z: 0.56 }, 'wheel-hub'),
    ],
  },
  carPart('car-cabin', 'Cabin', 'box', { x: 0.95, y: 0.55, z: 0.82 }, 1.2, '#38bdf8', {
    parentSnapId: 'car-cabin-socket',
    childSnapId: 'car-cabin-mount',
    jointType: 'fixed',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: -0.28, z: 0 },
  }),
  carPart('car-front-left-wheel', 'Front Left Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-front-left-wheel-socket',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-front-right-wheel', 'Front Right Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-front-right-wheel-socket',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-rear-left-wheel', 'Rear Left Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-rear-left-wheel-socket',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-rear-right-wheel', 'Rear Right Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-rear-right-wheel-socket',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-front-left-shock', 'Front Left Shock', 'cylinder', { x: 0.07, y: 0.48, z: 0.07 }, 0.18, '#facc15', {
    parentSnapId: 'car-front-left-wheel-socket',
    childSnapId: 'car-shock-root',
    jointType: 'spring',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: 0.2, z: 0 },
    behavior: CAR_SHOCK_HINGE,
    extraSnapPoints: [
      socket('car-front-left-shock-axle', 'Front left shock axle', { x: 0, y: -0.2, z: 0 }, 'wheel-hub'),
    ],
  }),
  carPart('car-front-right-shock', 'Front Right Shock', 'cylinder', { x: 0.07, y: 0.48, z: 0.07 }, 0.18, '#facc15', {
    parentSnapId: 'car-front-right-wheel-socket',
    childSnapId: 'car-shock-root',
    jointType: 'spring',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: 0.2, z: 0 },
    behavior: CAR_SHOCK_HINGE,
    extraSnapPoints: [
      socket('car-front-right-shock-axle', 'Front right shock axle', { x: 0, y: -0.2, z: 0 }, 'wheel-hub'),
    ],
  }),
  carPart('car-rear-left-shock', 'Rear Left Shock', 'cylinder', { x: 0.07, y: 0.48, z: 0.07 }, 0.18, '#facc15', {
    parentSnapId: 'car-rear-left-wheel-socket',
    childSnapId: 'car-shock-root',
    jointType: 'spring',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: 0.2, z: 0 },
    behavior: CAR_SHOCK_HINGE,
    extraSnapPoints: [
      socket('car-rear-left-shock-axle', 'Rear left shock axle', { x: 0, y: -0.2, z: 0 }, 'wheel-hub'),
    ],
  }),
  carPart('car-rear-right-shock', 'Rear Right Shock', 'cylinder', { x: 0.07, y: 0.48, z: 0.07 }, 0.18, '#facc15', {
    parentSnapId: 'car-rear-right-wheel-socket',
    childSnapId: 'car-shock-root',
    jointType: 'spring',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: 0.2, z: 0 },
    behavior: CAR_SHOCK_HINGE,
    extraSnapPoints: [
      socket('car-rear-right-shock-axle', 'Rear right shock axle', { x: 0, y: -0.2, z: 0 }, 'wheel-hub'),
    ],
  }),
  carPart('car-front-left-suspension-wheel', 'Front Left Suspension Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-front-left-shock-axle',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-front-right-suspension-wheel', 'Front Right Suspension Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-front-right-shock-axle',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-rear-left-suspension-wheel', 'Rear Left Suspension Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-rear-left-shock-axle',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  carPart('car-rear-right-suspension-wheel', 'Rear Right Suspension Wheel', 'cylinder', { x: 0.28, y: 0.18, z: 0.28 }, 0.55, '#111827', {
    parentSnapId: 'car-rear-right-shock-axle',
    childSnapId: 'wheel-hub',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    behavior: CAR_SHOCK_HINGE,
  }),
  {
    id: 'robot-torso-frame',
    label: 'Torso Frame',
    family: 'robot',
    shape: 'box',
    dimensions: { x: 1.1, y: 1.45, z: 0.55 },
    mass: 3,
    color: '#2563eb',
    visualProfile: visualProfile('robot-torso', 'paint-blue-metal'),
    snapPoints: [
      socket('robot-head-socket', 'Head socket', { x: 0, y: 0.72, z: 0 }, 'robot-neck'),
      socket('robot-left-shoulder-socket', 'Left shoulder', { x: -0.55, y: 0.3, z: 0 }, 'robot-shoulder'),
      socket('robot-right-shoulder-socket', 'Right shoulder', { x: 0.55, y: 0.3, z: 0 }, 'robot-shoulder'),
      socket('robot-left-hip-socket', 'Left hip', { x: -0.28, y: -0.72, z: 0 }, 'robot-hip'),
      socket('robot-right-hip-socket', 'Right hip', { x: 0.28, y: -0.72, z: 0 }, 'robot-hip'),
    ],
  },
  robotPart('robot-head', 'Head', 'sphere', { x: 0.38, y: 0.38, z: 0.38 }, 0.8, '#f59e0b', {
    parentSnapId: 'robot-head-socket',
    childSnapId: 'robot-neck',
    jointType: 'fixed',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: -0.38, z: 0 },
  }),
  robotPart('robot-left-arm', 'Left Arm', 'box', { x: 0.32, y: 1.15, z: 0.32 }, 0.8, '#14b8a6', {
    parentSnapId: 'robot-left-shoulder-socket',
    childSnapId: 'robot-shoulder',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.48, z: 0 },
  }),
  robotPart('robot-right-arm', 'Right Arm', 'box', { x: 0.32, y: 1.15, z: 0.32 }, 0.8, '#14b8a6', {
    parentSnapId: 'robot-right-shoulder-socket',
    childSnapId: 'robot-shoulder',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.48, z: 0 },
  }),
  robotPart('robot-left-leg', 'Left Leg', 'cylinder', { x: 0.24, y: 1.05, z: 0.24 }, 1, '#475569', {
    parentSnapId: 'robot-left-hip-socket',
    childSnapId: 'robot-hip',
    jointType: 'hinge',
    axis: { x: 1, y: 0, z: 0 },
    childSnapPosition: { x: 0, y: 0.52, z: 0 },
  }),
  robotPart('robot-right-leg', 'Right Leg', 'cylinder', { x: 0.24, y: 1.05, z: 0.24 }, 1, '#475569', {
    parentSnapId: 'robot-right-hip-socket',
    childSnapId: 'robot-hip',
    jointType: 'hinge',
    axis: { x: 1, y: 0, z: 0 },
    childSnapPosition: { x: 0, y: 0.52, z: 0 },
  }),
  dragonBody(
    'dragon-wyvern-body',
    'Wyvern Body',
    { x: 2.625, y: 0.93, z: 1.23 },
    3.2,
    '#7c3aed',
    dimensions => [
      neckSocket(dimensions),
      tailSocket(dimensions),
      ...legSockets(dimensions, 'rear', -0.2),
      ...wingSockets(dimensions, 0.22),
    ],
  ),
  dragonBody(
    'dragon-drake-body',
    'Drake Body',
    { x: 2.85, y: 0.87, z: 1.35 },
    3.8,
    '#059669',
    dimensions => [
      neckSocket(dimensions),
      tailSocket(dimensions),
      ...legSockets(dimensions, 'front', 0.26),
      ...legSockets(dimensions, 'rear', -0.29),
    ],
  ),
  dragonBody(
    'dragon-classic-body',
    'Classic Dragon Body',
    { x: 3.075, y: 0.99, z: 1.425 },
    4.4,
    '#dc2626',
    dimensions => [
      neckSocket(dimensions),
      tailSocket(dimensions),
      ...legSockets(dimensions, 'front', 0.27),
      ...legSockets(dimensions, 'rear', -0.29),
      ...wingSockets(dimensions, 0.13),
    ],
  ),
  dragonBody(
    'dragon-four-wing-body',
    'Four Wing Body',
    { x: 3.225, y: 1.02, z: 1.5 },
    4.8,
    '#0891b2',
    dimensions => [
      neckSocket(dimensions),
      tailSocket(dimensions),
      ...legSockets(dimensions, 'front', 0.27),
      ...legSockets(dimensions, 'rear', -0.3),
      ...wingSockets(dimensions, 0.24),
      ...wingSockets(dimensions, -0.07, 'secondary'),
    ],
  ),
  dragonPart('dragon-horned-head', 'Horned Head', 'sphere', { x: 0.42, y: 0.42, z: 0.42 }, 0.75, '#f97316', {
    parentSnapId: 'dragon-head-socket',
    childSnapId: 'dragon-neck',
    jointType: 'hinge',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: -0.36, y: 0, z: 0 },
    behavior: BREAKABLE_MEDIUM,
    extraSnapPoints: [
      socket('dragon-upper-jaw-head-socket', 'Upper jaw mount', { x: 0.34, y: -0.08, z: 0 }, 'dragon-upper-jaw-root'),
    ],
  }),
  dragonPart('dragon-snout-head', 'Long Snout Head', 'box', { x: 0.68, y: 0.38, z: 0.34 }, 0.82, '#fb923c', {
    parentSnapId: 'dragon-head-socket',
    childSnapId: 'dragon-neck',
    jointType: 'hinge',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: -0.34, y: 0, z: 0 },
    behavior: BREAKABLE_MEDIUM,
    extraSnapPoints: [
      socket('dragon-upper-jaw-head-socket', 'Upper jaw mount', { x: 0.4, y: -0.08, z: 0 }, 'dragon-upper-jaw-root'),
    ],
  }),
  dragonPart('dragon-armored-head', 'Armored Head', 'box', { x: 0.54, y: 0.48, z: 0.44 }, 0.95, '#64748b', {
    parentSnapId: 'dragon-head-socket',
    childSnapId: 'dragon-neck',
    jointType: 'fixed',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: -0.28, y: 0, z: 0 },
    behavior: BREAKABLE_MEDIUM,
    extraSnapPoints: [
      socket('dragon-upper-jaw-head-socket', 'Upper jaw mount', { x: 0.32, y: -0.08, z: 0 }, 'dragon-upper-jaw-root'),
    ],
  }),
  dragonPart('dragon-upper-jaw', 'Upper Jaw', 'box', { x: 0.52, y: 0.2, z: 0.3 }, 0.28, '#fbbf24', {
    parentSnapId: 'dragon-upper-jaw-head-socket',
    childSnapId: 'dragon-upper-jaw-root',
    jointType: 'fixed',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: -0.2, y: 0, z: 0 },
    behavior: BREAKABLE_LIGHT,
    extraSnapPoints: [
      socket('dragon-lower-jaw-socket', 'Lower jaw hinge', { x: -0.01, y: -0.11, z: 0 }, 'dragon-lower-jaw-root'),
    ],
  }),
  dragonPart('dragon-lower-jaw', 'Lower Jaw', 'box', { x: 0.4, y: 0.09, z: 0.24 }, 0.15, '#f59e0b', {
    parentSnapId: 'dragon-lower-jaw-socket',
    childSnapId: 'dragon-lower-jaw-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: -0.08, y: 0.04, z: 0 },
    behavior: JAW_OPEN_CLOSE_MOTOR,
  }),
  dragonPart('dragon-front-left-leg', 'Front Left Upper Leg', 'cylinder', { x: 0.24, y: 0.6, z: 0.24 }, 0.4, '#166534', {
    parentSnapId: 'dragon-front-left-leg-socket',
    childSnapId: 'dragon-leg-hip',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    // Just below the crown of the thigh, so it sinks into the torso rather than
    // butting against it and leaving a seam as the hinge swings.
    childSnapPosition: { x: 0, y: 0.24, z: 0 },
    behavior: LEG_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-front-knee-socket', 'Front knee socket', { x: 0, y: -0.3, z: 0 }, 'dragon-knee-root'),
    ],
  }),
  dragonPart('dragon-front-right-leg', 'Front Right Upper Leg', 'cylinder', { x: 0.24, y: 0.6, z: 0.24 }, 0.4, '#166534', {
    parentSnapId: 'dragon-front-right-leg-socket',
    childSnapId: 'dragon-leg-hip',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.24, z: 0 },
    behavior: LEG_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-front-knee-socket', 'Front knee socket', { x: 0, y: -0.3, z: 0 }, 'dragon-knee-root'),
    ],
  }),
  dragonPart('dragon-rear-left-leg', 'Rear Left Upper Leg', 'cylinder', { x: 0.288, y: 0.66, z: 0.288 }, 0.48, '#14532d', {
    parentSnapId: 'dragon-rear-left-leg-socket',
    childSnapId: 'dragon-leg-hip',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.264, z: 0 },
    behavior: LEG_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-rear-knee-socket', 'Rear knee socket', { x: 0, y: -0.33, z: 0 }, 'dragon-knee-root'),
    ],
  }),
  dragonPart('dragon-rear-right-leg', 'Rear Right Upper Leg', 'cylinder', { x: 0.288, y: 0.66, z: 0.288 }, 0.48, '#14532d', {
    parentSnapId: 'dragon-rear-right-leg-socket',
    childSnapId: 'dragon-leg-hip',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.264, z: 0 },
    behavior: LEG_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-rear-knee-socket', 'Rear knee socket', { x: 0, y: -0.33, z: 0 }, 'dragon-knee-root'),
    ],
  }),
  dragonPart('dragon-front-lower-leg', 'Front Lower Leg', 'cylinder', { x: 0.192, y: 0.576, z: 0.192 }, 0.3, '#15803d', {
    parentSnapId: 'dragon-front-knee-socket',
    childSnapId: 'dragon-knee-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    // The shin is raked back, so its top is sunk past the knee: a flush butt
    // joint would open a wedge on the forward side.
    childSnapPosition: { x: 0, y: 0.238, z: 0 },
    childRotation: quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, 0.38),
    behavior: LEG_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-foot-socket', 'Foot socket', { x: 0, y: -0.288, z: 0 }, 'dragon-foot-root'),
    ],
  }),
  dragonPart('dragon-rear-lower-leg', 'Rear Lower Leg', 'cylinder', { x: 0.228, y: 0.6, z: 0.228 }, 0.38, '#166534', {
    parentSnapId: 'dragon-rear-knee-socket',
    childSnapId: 'dragon-knee-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.25, z: 0 },
    childRotation: quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, -0.48),
    behavior: LEG_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-foot-socket', 'Foot socket', { x: 0, y: -0.3, z: 0 }, 'dragon-foot-root'),
    ],
  }),
  dragonPart('dragon-clawed-foot', 'Clawed Foot', 'box', { x: 0.408, y: 0.168, z: 0.336 }, 0.22, '#365314', {
    parentSnapId: 'dragon-foot-socket',
    childSnapId: 'dragon-foot-root',
    jointType: 'fixed',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: -0.036, y: 0.06, z: 0 },
    behavior: BREAKABLE_LIGHT,
  }),
  dragonPart('dragon-left-wing', 'Left Wing', 'box', WING_DIMENSIONS, 0.55, '#a855f7', {
    parentSnapId: 'dragon-left-wing-socket',
    childSnapId: 'dragon-wing-root',
    jointType: 'hinge',
    axis: { x: 1, y: 0, z: 0 },
    childSnapPosition: wingRootMount(WING_DIMENSIONS, 1),
    behavior: WING_FLAP_MOTOR,
    extraSnapPoints: [
      socket('dragon-wing-claw-socket', 'Wing claw socket', wingClawAnchor(WING_DIMENSIONS, -1), 'dragon-wing-claw-root'),
    ],
  }),
  dragonPart('dragon-right-wing', 'Right Wing', 'box', WING_DIMENSIONS, 0.55, '#a855f7', {
    parentSnapId: 'dragon-right-wing-socket',
    childSnapId: 'dragon-wing-root',
    jointType: 'hinge',
    axis: { x: -1, y: 0, z: 0 },
    childSnapPosition: wingRootMount(WING_DIMENSIONS, -1),
    behavior: WING_FLAP_MOTOR,
    extraSnapPoints: [
      socket('dragon-wing-claw-socket', 'Wing claw socket', wingClawAnchor(WING_DIMENSIONS, 1), 'dragon-wing-claw-root'),
    ],
  }),
  dragonPart('dragon-left-secondary-wing', 'Left Second Wing', 'box', SECONDARY_WING_DIMENSIONS, 0.45, '#22d3ee', {
    parentSnapId: 'dragon-left-secondary-wing-socket',
    childSnapId: 'dragon-wing-root',
    jointType: 'hinge',
    axis: { x: 1, y: 0, z: 0 },
    childSnapPosition: wingRootMount(SECONDARY_WING_DIMENSIONS, 1),
    behavior: WING_FLAP_MOTOR,
    extraSnapPoints: [
      socket('dragon-wing-claw-socket', 'Wing claw socket', wingClawAnchor(SECONDARY_WING_DIMENSIONS, -1), 'dragon-wing-claw-root'),
    ],
  }),
  dragonPart('dragon-right-secondary-wing', 'Right Second Wing', 'box', SECONDARY_WING_DIMENSIONS, 0.45, '#22d3ee', {
    parentSnapId: 'dragon-right-secondary-wing-socket',
    childSnapId: 'dragon-wing-root',
    jointType: 'hinge',
    axis: { x: -1, y: 0, z: 0 },
    childSnapPosition: wingRootMount(SECONDARY_WING_DIMENSIONS, -1),
    behavior: WING_FLAP_MOTOR,
    extraSnapPoints: [
      socket('dragon-wing-claw-socket', 'Wing claw socket', wingClawAnchor(SECONDARY_WING_DIMENSIONS, 1), 'dragon-wing-claw-root'),
    ],
  }),
  dragonPart('dragon-wing-hand-claw', 'Wing Hand Claw', 'cylinder', { x: 0.08, y: 0.32, z: 0.08 }, 0.12, '#facc15', {
    parentSnapId: 'dragon-wing-claw-socket',
    childSnapId: 'dragon-wing-claw-root',
    jointType: 'fixed',
    axis: { x: 0, y: 1, z: 0 },
    childSnapPosition: { x: 0, y: 0.16, z: 0 },
    childRotation: quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2),
    behavior: BREAKABLE_LIGHT,
  }),
  dragonPart('dragon-whip-tail', 'Whip Tail', 'cylinder', { x: 0.12, y: 1.25, z: 0.12 }, 0.55, '#7c2d12', {
    parentSnapId: 'dragon-tail-socket',
    childSnapId: 'dragon-tail-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.62, z: 0 },
    childRotation: quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, -Math.PI / 2),
    behavior: TAIL_SPRING_HINGE,
  }),
  dragonPart('dragon-club-tail', 'Club Tail', 'cylinder', { x: 0.2, y: 1.05, z: 0.28 }, 0.9, '#92400e', {
    parentSnapId: 'dragon-tail-socket',
    childSnapId: 'dragon-tail-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.52, z: 0 },
    childRotation: quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, -Math.PI / 2),
    behavior: TAIL_SPRING_HINGE,
  }),
  dragonPart('dragon-tail-chain-root', 'Tail Chain Root', 'cylinder', { x: 0.15, y: 0.72, z: 0.15 }, 0.38, '#78350f', {
    parentSnapId: 'dragon-tail-socket',
    childSnapId: 'dragon-tail-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.36, z: 0 },
    childRotation: quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, -Math.PI / 2),
    behavior: TAIL_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-tail-tip-socket', 'Tail chain tip', { x: 0, y: -0.36, z: 0 }, 'dragon-tail-root'),
    ],
  }),
  dragonPart('dragon-tail-chain-link', 'Tail Chain Link', 'cylinder', { x: 0.12, y: 0.58, z: 0.12 }, 0.28, '#854d0e', {
    parentSnapId: 'dragon-tail-tip-socket',
    childSnapId: 'dragon-tail-root',
    jointType: 'hinge',
    axis: { x: 0, y: 0, z: 1 },
    childSnapPosition: { x: 0, y: 0.29, z: 0 },
    behavior: TAIL_SPRING_HINGE,
    extraSnapPoints: [
      socket('dragon-tail-tip-socket', 'Tail chain tip', { x: 0, y: -0.29, z: 0 }, 'dragon-tail-root'),
    ],
  }),
  dragonPart('dragon-tail-stinger', 'Tail Stinger', 'sphere', { x: 0.2, y: 0.2, z: 0.2 }, 0.34, '#b45309', {
    parentSnapId: 'dragon-tail-tip-socket',
    childSnapId: 'dragon-tail-root',
    jointType: 'fixed',
    axis: { x: 0, y: 0, z: 1 },
    behavior: BREAKABLE_LIGHT,
  }),
];

export function createPartFromDefinition(
  definition: AssemblyPartDefinition,
  position: Vector3Data,
  id = createAssemblyId('part'),
): AssemblyPart {
  return {
    id,
    label: definition.label,
    roles: definition.roles ?? inferAssemblyPartRoles(definition.id, definition.label),
    shape: definition.shape,
    mass: definition.mass,
    dimensions: { ...definition.dimensions },
    position: { ...position },
    rotation: { ...IDENTITY_ROTATION },
    color: definition.color,
    visualProfile: definition.visualProfile ? cloneVisualProfile(definition.visualProfile) : undefined,
    snapPoints: definition.snapPoints.map(snapPoint => ({
      ...snapPoint,
      localPosition: { ...snapPoint.localPosition },
      localRotation: snapPoint.localRotation ? { ...snapPoint.localRotation } : undefined,
      mateIds: snapPoint.mateIds ? [...snapPoint.mateIds] : undefined,
    })),
    attachment: definition.attachment
      ? {
          ...definition.attachment,
          axis: { ...definition.attachment.axis },
          childRotation: definition.attachment.childRotation
            ? { ...definition.attachment.childRotation }
            : undefined,
        }
      : undefined,
  };
}

export function oneWayAttachment(
  parentSnapId: string,
  childSnapId: string,
  jointType: JointType,
  axis: Vector3Data,
  parentPartId?: string,
  childRotation?: QuaternionData,
  behavior?: AssemblyJointBehavior,
): AssemblyAttachmentRule {
  return {
    parentPartId,
    parentSnapId,
    childSnapId,
    jointType,
    axis,
    childRotation: childRotation ? { ...childRotation } : { ...IDENTITY_ROTATION },
    behavior: behavior ? { ...behavior } : undefined,
  };
}

function primitiveDefinition(
  shape: ShapeType,
  dimensions: Vector3Data,
  mass: number,
  color: string,
): AssemblyPartDefinition {
  return {
    id: `primitive-${shape}`,
    label: shape,
    family: 'primitive',
    shape,
    dimensions,
    mass,
    color,
    visualProfile: visualProfile(`primitive-${shape}`, defaultMaterialForFamily('primitive'), 'primitive'),
    snapPoints: [],
  };
}

interface AttachPartOptions {
  parentSnapId: string;
  childSnapId: string;
  jointType: JointType;
  axis: Vector3Data;
  childSnapPosition?: Vector3Data;
  childRotation?: QuaternionData;
  behavior?: AssemblyJointBehavior;
  extraSnapPoints?: AssemblySnapDefinition[];
}

function carPart(
  id: string,
  label: string,
  shape: ShapeType,
  dimensions: Vector3Data,
  mass: number,
  color: string,
  options: AttachPartOptions,
): AssemblyPartDefinition {
  return attachablePart('car', id, label, shape, dimensions, mass, color, options);
}

function robotPart(
  id: string,
  label: string,
  shape: ShapeType,
  dimensions: Vector3Data,
  mass: number,
  color: string,
  options: AttachPartOptions,
): AssemblyPartDefinition {
  return attachablePart('robot', id, label, shape, dimensions, mass, color, options);
}

function dragonBody(
  id: string,
  label: string,
  dimensions: Vector3Data,
  mass: number,
  color: string,
  buildSnapPoints: (dimensions: Vector3Data) => AssemblySnapDefinition[],
): AssemblyPartDefinition {
  return {
    id,
    label,
    family: 'dragon',
    shape: 'box',
    dimensions,
    mass,
    color,
    visualProfile: visualProfile('dragon-body', defaultMaterialForFamily('dragon')),
    snapPoints: buildSnapPoints(dimensions),
  };
}

/**
 * `axialFraction` places the pair along the spine as a fraction of body length:
 * -0.5 is the tail cap, 0 the midpoint, 0.5 the nose. Sliding a mount toward
 * the head is an addition here, and stays proportionate across body sizes.
 */
function legSockets(
  dimensions: Vector3Data,
  pair: 'front' | 'rear',
  axialFraction: number,
): AssemblySnapDefinition[] {
  const point = dragonBodySurfacePoint(dimensions, axialFraction, HIP_ANGLE);
  const name = pair === 'front' ? 'Front' : 'Rear';

  return [
    socket(`dragon-${pair}-left-leg-socket`, `${name} left leg`, { ...point, z: -point.z }, 'dragon-leg-hip'),
    socket(`dragon-${pair}-right-leg-socket`, `${name} right leg`, { ...point }, 'dragon-leg-hip'),
  ];
}

function wingSockets(
  dimensions: Vector3Data,
  axialFraction: number,
  variant: 'primary' | 'secondary' = 'primary',
): AssemblySnapDefinition[] {
  const point = dragonBodySurfacePoint(dimensions, axialFraction, WING_ROOT_ANGLE);
  const infix = variant === 'secondary' ? '-secondary' : '';
  const name = variant === 'secondary' ? 'second wing' : 'wing socket';

  return [
    socket(`dragon-left${infix}-wing-socket`, `Left ${name}`, { ...point, z: -point.z }, 'dragon-wing-root'),
    socket(`dragon-right${infix}-wing-socket`, `Right ${name}`, { ...point }, 'dragon-wing-root'),
  ];
}

/**
 * Just inside the lathe's front cap, so a round skull, a long snout, and a
 * blunt armoured head all close over the opening from their own mount offsets.
 * Carried slightly above the spine axis, which reads as a raised head.
 */
function neckSocket(dimensions: Vector3Data): AssemblySnapDefinition {
  return socket(
    'dragon-head-socket',
    'Head socket',
    { x: dimensions.x * 0.49, y: dimensions.y * 0.06, z: 0 },
    'dragon-neck',
  );
}

function tailSocket(dimensions: Vector3Data): AssemblySnapDefinition {
  return socket(
    'dragon-tail-socket',
    'Tail socket',
    { x: -dimensions.x * 0.49, y: 0, z: 0 },
    'dragon-tail-root',
  );
}

function dragonPart(
  id: string,
  label: string,
  shape: ShapeType,
  dimensions: Vector3Data,
  mass: number,
  color: string,
  options: AttachPartOptions,
): AssemblyPartDefinition {
  return attachablePart('dragon', id, label, shape, dimensions, mass, color, options);
}

function attachablePart(
  family: AssemblyPartFamily,
  id: string,
  label: string,
  shape: ShapeType,
  dimensions: Vector3Data,
  mass: number,
  color: string,
  options: AttachPartOptions,
): AssemblyPartDefinition {
  return {
    id,
    label,
    family,
    shape,
    dimensions,
    mass,
    color,
    visualProfile: getDefaultVisualProfile(family, id, shape),
    snapPoints: [
      socket(
        options.childSnapId,
        `${label} mount`,
        options.childSnapPosition ?? { x: 0, y: 0, z: 0 },
        options.parentSnapId,
      ),
      ...(options.extraSnapPoints ?? []),
    ],
    attachment: oneWayAttachment(
      options.parentSnapId,
      options.childSnapId,
      options.jointType,
      options.axis,
      undefined,
      options.childRotation,
      options.behavior,
    ),
  };
}

function socket(
  id: string,
  label: string,
  localPosition: Vector3Data,
  mateId: string,
): AssemblySnapDefinition {
  return {
    id,
    label,
    localPosition,
    mateIds: [mateId],
    singleUse: true,
  };
}

function getDefaultVisualProfile(
  family: AssemblyPartFamily,
  id: string,
  shape: ShapeType,
): AssemblyVisualProfile {
  if (family === 'primitive') {
    return visualProfile(`primitive-${shape}`, defaultMaterialForFamily(family), 'primitive');
  }

  if (family === 'car') {
    if (id.includes('wheel')) {
      return visualProfile('car-wheel', 'rubber');
    }

    if (id.includes('shock')) {
      return visualProfile('car-shock', 'paint-gold');
    }

    if (id.includes('cabin')) {
      return visualProfile('car-cabin', 'glass-blue');
    }

    return visualProfile('car-chassis', 'paint-red');
  }

  if (family === 'robot') {
    if (id.includes('head')) {
      return visualProfile('robot-head', 'paint-gold');
    }

    if (id.includes('leg')) {
      return visualProfile('robot-leg', 'dark-metal');
    }

    if (id.includes('arm')) {
      return visualProfile('robot-limb', 'teal-metal');
    }

    return visualProfile('robot-torso', 'paint-blue-metal');
  }

  if (id.includes('horned-head')) {
    return visualProfile('dragon-head-horned', 'dragon-horn');
  }

  if (id.includes('upper-jaw')) {
    return visualProfile('dragon-upper-jaw', 'dragon-horn');
  }

  if (id.includes('lower-jaw')) {
    return visualProfile('dragon-lower-jaw', 'dragon-horn');
  }

  if (id.includes('snout-head')) {
    return visualProfile('dragon-head-snout', 'dragon-scale-orange');
  }

  if (id.includes('armored-head')) {
    return visualProfile('dragon-head-armored', 'dark-metal');
  }

  if (id.includes('wing-hand-claw')) {
    return visualProfile('dragon-wing-claw', 'dragon-horn');
  }

  if (id.includes('secondary-wing')) {
    return visualProfile('dragon-secondary-wing', 'dragon-wing-membrane');
  }

  if (id.includes('wing')) {
    return visualProfile('dragon-wing', 'dragon-wing-membrane');
  }

  if (id.includes('club-tail')) {
    return visualProfile('dragon-tail-club', 'dragon-scale-brown');
  }

  if (id.includes('tail-stinger')) {
    return visualProfile('dragon-tail-stinger', 'dragon-horn');
  }

  if (id.includes('clawed-foot')) {
    return visualProfile('dragon-foot', 'dragon-scale-green');
  }

  if (id.includes('claw')) {
    return visualProfile('dragon-claw', 'dragon-horn');
  }

  if (id.includes('tail')) {
    return visualProfile('dragon-tail', 'dragon-scale-brown');
  }

  if (id.includes('leg')) {
    return visualProfile('dragon-leg', 'dragon-scale-green');
  }

  return visualProfile('dragon-body', defaultMaterialForFamily('dragon'));
}

function visualProfile(
  profileId: AssemblyVisualProfile['profileId'],
  materialId = 'default',
  meshType: AssemblyVisualProfile['meshType'] = 'procedural',
): AssemblyVisualProfile {
  return {
    profileId,
    meshType,
    materialId,
  };
}

function defaultMaterialForFamily(family: AssemblyPartFamily): string {
  switch (family) {
    case 'primitive':
      return 'default';
    case 'car':
      return 'paint-red';
    case 'robot':
      return 'paint-blue-metal';
    case 'dragon':
      return 'dragon-scales';
  }
}

function cloneVisualProfile(profile: AssemblyVisualProfile): AssemblyVisualProfile {
  return {
    ...profile,
    scale: profile.scale ? { ...profile.scale } : undefined,
    offset: profile.offset ? { ...profile.offset } : undefined,
    rotation: profile.rotation ? { ...profile.rotation } : undefined,
  };
}
