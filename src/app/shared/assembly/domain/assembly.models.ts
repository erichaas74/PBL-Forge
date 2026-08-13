export type ShapeType = 'box' | 'sphere' | 'cylinder';
export type JointType = 'fixed' | 'hinge' | 'spring' | 'slider';
export type JointBehaviorProfile = 'passive' | 'motor' | 'oscillatingMotor' | 'springHinge';
export type AssemblyVisualMeshType = 'primitive' | 'procedural' | 'asset';
export type AssemblyPartRole =
  | 'core'
  | 'head'
  | 'jaw'
  | 'wing'
  | 'tail'
  | 'leg'
  | 'arm'
  | 'wheel'
  | 'locomotion'
  | 'weapon'
  | 'armor'
  | 'sensor'
  | string;

export type AssemblyVisualProfileId =
  | 'primitive-box'
  | 'primitive-sphere'
  | 'primitive-cylinder'
  | 'car-chassis'
  | 'car-cabin'
  | 'car-shock'
  | 'car-wheel'
  | 'robot-torso'
  | 'robot-head'
  | 'robot-limb'
  | 'robot-leg'
  | 'dragon-body'
  | 'dragon-head-horned'
  | 'dragon-upper-jaw'
  | 'dragon-lower-jaw'
  | 'dragon-leg'
  | 'dragon-foot'
  | 'dragon-claw'
  | 'dragon-wing'
  | 'dragon-wing-claw'
  | 'dragon-secondary-wing'
  | 'dragon-tail'
  | 'dragon-tail-club'
  | 'dragon-tail-stinger';

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionData {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface AssemblySnapDefinition {
  id: string;
  label: string;
  localPosition: Vector3Data;
  localRotation?: QuaternionData;
  mateIds?: string[];
  singleUse?: boolean;
}

export interface AssemblyAttachmentRule {
  parentPartId?: string;
  parentSnapId: string;
  childSnapId: string;
  jointType: JointType;
  axis: Vector3Data;
  childRotation?: QuaternionData;
  behavior?: AssemblyJointBehavior;
  jointId?: string;
}

export interface AssemblyVisualProfile {
  profileId: AssemblyVisualProfileId | string;
  meshType: AssemblyVisualMeshType;
  materialId?: string;
  assetId?: string;
  /** Per-specimen procedural controls. Unlike the Parts Lab style override, these travel with one dragon. */
  parameters?: Record<string, string | number | boolean>;
  scale?: Vector3Data;
  offset?: Vector3Data;
  rotation?: QuaternionData;
}

/** A persistent physical part. Runtime health and damage belong in a game session. */
export interface AssemblyPart {
  id: string;
  /**
   * Catalog part this was stamped from. Authoring metadata: it lets the Garage
   * write a tuned size back to the definition it came from. Published model
   * packs drop it, because a pack is read by the renderer, not the designer.
   */
  definitionId?: string;
  label?: string;
  roles?: AssemblyPartRole[];
  shape: ShapeType;
  mass: number;
  dimensions: Vector3Data;
  position: Vector3Data;
  rotation?: QuaternionData;
  color: string;
  visualProfile?: AssemblyVisualProfile;
  snapPoints?: AssemblySnapDefinition[];
  attachment?: AssemblyAttachmentRule;
}

export interface AssemblyJoint {
  id: string;
  type: JointType;
  parentPartId: string;
  childPartId: string;
  pivotOnParent: Vector3Data;
  pivotOnChild: Vector3Data;
  axis: Vector3Data;
  behavior?: AssemblyJointBehavior;
}

export interface AssemblyJointBehavior {
  profile: JointBehaviorProfile;
  motorSpeed?: number;
  motorForce?: number;
  oscillationSpeed?: number;
  oscillationAmplitude?: number;
  springStiffness?: number;
  springDamping?: number;
  breakForce?: number;
  breakDamage?: number;
}

/** Stable, serializable data shared by authoring tools and games. */
export interface AssemblyBlueprint {
  parts: AssemblyPart[];
  joints: AssemblyJoint[];
}

/** Garage-only runtime state. Never persist this object directly as an asset. */
export interface AssemblyState extends AssemblyBlueprint {
  isSimulating: boolean;
}

export interface AssemblyPreset {
  id: string;
  name: string;
  description: string;
  state: AssemblyBlueprint;
}

export interface AssemblySelection {
  partId: string | null;
  jointId: string | null;
}

export interface AssemblyPhysicsSnapshot {
  partId: string;
  position: Vector3Data;
  quaternion: QuaternionData;
  velocity?: Vector3Data;
}

export interface AssemblySnapPoint {
  id: string;
  label: string;
  partId: string;
  localPosition: Vector3Data;
  worldPosition: Vector3Data;
  localRotation?: QuaternionData;
  worldRotation: QuaternionData;
  mateIds: string[];
  singleUse: boolean;
}

export interface AssemblyJointDraft {
  type: JointType;
  parentPartId: string | null;
  childPartId: string | null;
  parentSnapId: string;
  childSnapId: string;
  axis: Vector3Data;
}

export interface PartMoveEvent {
  partId: string;
  position: Vector3Data;
}

export interface SnapPointSelectionEvent {
  partId: string;
  snapPointId: string;
}

export const SHAPE_TYPES = ['box', 'sphere', 'cylinder'] as const satisfies readonly ShapeType[];
export const JOINT_TYPES = ['fixed', 'hinge', 'spring', 'slider'] as const satisfies readonly JointType[];
export const JOINT_BEHAVIOR_PROFILES = [
  'passive',
  'motor',
  'oscillatingMotor',
  'springHinge',
] as const satisfies readonly JointBehaviorProfile[];
