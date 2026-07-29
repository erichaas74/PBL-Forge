import { Vector3Data } from '../../shared/assembly/domain/assembly.models';

export type CreationTestScenarioKind = 'battle' | 'race' | 'practice' | 'challenge';
export type CreationWinConditionType = 'core-survival' | 'finish-line' | 'practice-open' | 'score';

export interface CreationPhysicsProfile {
  gravity?: Vector3Data;
  floorFriction?: number;
  floorRestitution?: number;
  damageEnabled?: boolean;
  jointBreakageEnabled?: boolean;
}

export interface CreationStaticObstacle {
  id: string;
  label: string;
  position: Vector3Data;
  size: Vector3Data;
  rotation?: Vector3Data;
  color: string;
  surface?: 'floor' | 'ramp' | 'rail' | 'wall' | 'marker' | 'hazard';
}

export interface CreationScenarioParticipant {
  slotId: string;
  team: 'red' | 'blue' | string;
  name: string;
  defaultAssemblyAssetId: string;
  spawnPosition: Vector3Data;
  initialRotation: Vector3Data;
  controllerRole: 'player' | 'ai' | 'static';
  defaultControlMode?: string;
}

export interface CreationWinCondition {
  type: CreationWinConditionType;
  finishX?: number;
  timeLimitSeconds?: number;
  scoreTarget?: number;
}

export interface CreationTestScenarioDefinition {
  id: string;
  name: string;
  description: string;
  kind: CreationTestScenarioKind;
  tags: string[];
  compatibleGameIds?: string[];
  environment: {
    floorSize: Vector3Data;
    wallHeight: number;
    obstacles: CreationStaticObstacle[];
  };
  participants: CreationScenarioParticipant[];
  winCondition: CreationWinCondition;
  physics?: CreationPhysicsProfile;
}
