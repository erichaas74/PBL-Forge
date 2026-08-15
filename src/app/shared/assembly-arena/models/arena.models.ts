import {
  AssemblyBlueprint,
  QuaternionData,
  Vector3Data,
} from '../../assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../assembly/combat/assembly-combat.models';
import { AssemblyAbilityId } from '../../assembly/combat/assembly-abilities';
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
  /** Set when a defensive move absorbed part of the blow, for the event log. */
  mitigatedBy?: 'guard';
}

/** Active fire-breath cone, reported by physics so the renderer can draw it. */
export interface FireConeSnapshot {
  combatantId: string;
  origin: Vector3Data;
  direction: Vector3Data;
}

/** Scripted visual pose for an attack; physics still owns the torso transform. */
export interface BattleAttackPoseSnapshot {
  combatantId: string;
  ability: AssemblyAbilityId;
  /** Normalized authored move timeline from 0 through 1. */
  phase: number;
}

/** What a combatant is doing defensively right now, for the HUD and the AI. */
export interface BattleDefenseSnapshot {
  combatantId: string;
  /** Braced: absorbing damage, barely mobile, cannot attack. */
  guarding: boolean;
  /** Fraction of the guard's hold budget already spent, 0 through 1. */
  guardFatigue: number;
  /** Mid-roll. Null when not dodging. */
  dodgePhase: number | null;
  /** Inside the roll's invulnerable window. */
  invulnerable: boolean;
  /** Down after a knockdown, unable to act. */
  knockedDown: boolean;
}

/**
 * A combatant's live combat state, published so controllers can react to it.
 *
 * Without this an AI can only see where its opponent *is*, never what it is
 * *doing* — which is why the old challenger had exactly one plan and ran it
 * into the player's face regardless of what the player did.
 */
export interface BattleCombatantAwareness {
  combatantId: string;
  /** The move currently being performed, if any. */
  ability: AssemblyAbilityId | null;
  /** How far through that move, 0 through 1. */
  phase: number;
  /** True once the wind-up is done and the blow is about to land. */
  striking: boolean;
  defense: BattleDefenseSnapshot;
  /** Riding on top of another combatant's torso. */
  mounted: boolean;
  /** Off the ground under its own power. */
  airborne: boolean;
  /** Seconds until this combatant may next use each ability. */
  cooldowns: Partial<Record<AssemblyAbilityId, number>>;
}

export type CombatAwarenessByCombatant = Record<string, BattleCombatantAwareness>;

export interface BattlePhysicsFrame {
  snapshots: BattleBodySnapshot[];
  damageEvents: BattleDamageEvent[];
  fireCones?: FireConeSnapshot[];
  attackPoses?: BattleAttackPoseSnapshot[];
  defenses?: BattleDefenseSnapshot[];
}

export interface ArenaControlFrame {
  throttle: number;
  steer: number;
  strafe: number;
  boost: boolean;
  biteAttack?: boolean;
  clawAttack?: boolean;
  wingAttack?: boolean;
  tailAttack?: boolean;
  hornCharge?: boolean;
  fireAttack?: boolean;
  /** Held, not tapped: the brace lasts as long as the button is down. */
  guard?: boolean;
  dodge?: boolean;
}

/**
 * Moves a combatant's genotype permits. Absent means "no genome on file" — the
 * assembly sandbox loads creations that were never bred — and nothing is gated.
 */
export interface CombatantMoveLicense {
  wings: boolean;
  fire: boolean;
  horns: boolean;
}

export type MoveLicenseByCombatant = Record<string, CombatantMoveLicense>;

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
