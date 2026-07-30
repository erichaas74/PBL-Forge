import {
  AssemblyBlueprint,
  QuaternionData,
  Vector3Data,
} from '../../assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../assembly/combat/assembly-combat.models';
import { CreationAssemblyAsset } from '../../creation-library/models/creation-library.models';
import {
  CreationPhysicsProfile,
  CreationWinCondition,
} from '../../creation-library/models/test-scenario.models';

export type BattleTeam = 'red' | 'blue';
export type BattleController = 'player' | 'ai' | 'static';
export type BattlePlayMode = 'real-time' | 'turn-based';
export type ArenaSetupStyleId = string;
export type ArenaControlMode =
  | 'shove-drive'
  | 'vehicle-drive'
  | 'righting-assist'
  | 'dragon-attack'
  | 'ai-hunter'
  | 'static-target';

export interface BattleCombatant {
  id: string;
  name: string;
  team: BattleTeam;
  presetId: string;
  assembly: AssemblyBlueprint;
  combatProfile: AssemblyCombatProfile;
  corePartId: string;
  spawnPosition: Vector3Data;
  initialRotation: Vector3Data;
  controller: BattleController;
  controlMode: ArenaControlMode;
}

export interface BattlePartStatus {
  bodyKey: string;
  combatantId: string;
  sourcePartId: string;
  label: string;
  maxHealth: number;
  health: number;
  destroyed: boolean;
}

export interface BattleArenaState {
  combatants: BattleCombatant[];
  partStatuses: Record<string, BattlePartStatus>;
  isRunning: boolean;
  winnerId: string | null;
  elapsedSeconds: number;
  playMode: BattlePlayMode;
  activeTeam: BattleTeam;
  turnNumber: number;
  events: string[];
  matchId: number;
  setupStyleId: ArenaSetupStyleId;
  setup: ArenaSetupConfig;
  setupName: string;
  setupDescription: string;
}

export interface BattleBodySnapshot {
  bodyKey: string;
  combatantId: string;
  sourcePartId: string;
  position: Vector3Data;
  quaternion: QuaternionData;
  velocity: Vector3Data;
}

export interface BattleDamageEvent {
  bodyKey: string;
  amount: number;
  reason: string;
}

export interface BattlePhysicsFrame {
  snapshots: BattleBodySnapshot[];
  damageEvents: BattleDamageEvent[];
}

export interface ArenaControlFrame {
  throttle: number;
  steer: number;
  strafe: number;
  boost: boolean;
  biteAttack?: boolean;
  wingAttack?: boolean;
  tailAttack?: boolean;
}

export type ControlFrameByCombatant = Record<string, ArenaControlFrame>;

export interface BattleScoreboardEntry {
  combatantId: string;
  name: string;
  team: BattleTeam;
  controller: BattleController;
  controlMode: ArenaControlMode;
  coreHealth: number;
  coreMaxHealth: number;
  totalHealth: number;
  maxTotalHealth: number;
  destroyedParts: number;
  partCount: number;
}

export interface BattlePresetChoice {
  asset: CreationAssemblyAsset;
  team: BattleTeam;
}

export interface ArenaStaticObstacle {
  id: string;
  label: string;
  position: Vector3Data;
  size: Vector3Data;
  rotation?: Vector3Data;
  color: string;
}

export interface ArenaSetupConfig {
  id: ArenaSetupStyleId;
  name: string;
  description: string;
  floorSize: Vector3Data;
  wallHeight: number;
  defaultRedPresetId: string;
  defaultBluePresetId: string;
  redSpawn: Vector3Data;
  blueSpawn: Vector3Data;
  redInitialRotation: Vector3Data;
  blueInitialRotation: Vector3Data;
  redControlMode: ArenaControlMode;
  blueControlMode: ArenaControlMode;
  raceFinishX?: number;
  winCondition: CreationWinCondition;
  physics?: CreationPhysicsProfile;
  obstacles: ArenaStaticObstacle[];
}
