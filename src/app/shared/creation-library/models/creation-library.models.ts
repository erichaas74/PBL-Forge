import { AssemblyBlueprint } from '../../assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../assembly/combat/assembly-combat.models';
import { AttackMoveDefinition } from './attack-move.models';
import { CreationTestScenarioDefinition } from './test-scenario.models';

export type CreationAssetKind = 'assembly' | 'attack-move' | 'test-scenario';
export type CreationAssetScope = 'built-in' | 'local' | 'school' | 'room';
export type CreationAuthoringTool = 'assembly-garage' | 'assembly-arena' | 'test-scenario-builder' | 'import';

export interface CreationAssetMetadata {
  id: string;
  kind: CreationAssetKind;
  name: string;
  description: string;
  tags: string[];
  scope: CreationAssetScope;
  schemaVersion: 1;
  assetVersion: number;
  createdAtIso: string;
  updatedAtIso: string;
  createdByUid?: string;
  compatibleGameIds?: string[];
  authoringTool: CreationAuthoringTool;
}

export interface CreationAssemblyAsset extends CreationAssetMetadata {
  kind: 'assembly';
  assembly: AssemblyBlueprint;
  combatProfile: AssemblyCombatProfile;
}

export interface CreationAttackMoveAsset extends CreationAssetMetadata {
  kind: 'attack-move';
  move: AttackMoveDefinition;
}

export interface CreationTestScenarioAsset extends CreationAssetMetadata {
  kind: 'test-scenario';
  scenario: CreationTestScenarioDefinition;
}

export type CreationLibraryAsset =
  | CreationAssemblyAsset
  | CreationAttackMoveAsset
  | CreationTestScenarioAsset;

export interface CreationLibrarySnapshot {
  assemblies: CreationAssemblyAsset[];
  attackMoves: CreationAttackMoveAsset[];
  testScenarios: CreationTestScenarioAsset[];
}

export interface SaveAssemblyAssetInput {
  name: string;
  description: string;
  tags?: string[];
  compatibleGameIds?: string[];
  assembly: AssemblyBlueprint;
  combatProfile?: AssemblyCombatProfile;
}

export interface SaveAttackMoveAssetInput {
  name: string;
  description: string;
  tags?: string[];
  compatibleGameIds?: string[];
  move: AttackMoveDefinition;
}

export interface SaveTestScenarioAssetInput {
  name: string;
  description: string;
  tags?: string[];
  compatibleGameIds?: string[];
  scenario: CreationTestScenarioDefinition;
}

export interface GameCreationLibraryCapability {
  acceptsAssemblies?: boolean;
  acceptsAttackMoves?: boolean;
  acceptsTestScenarios?: boolean;
  preferredTags?: string[];
  defaultAssemblyAssetId?: string;
  defaultAttackMoveId?: string;
  defaultTestScenarioId?: string;
}

export interface GameCreationAssetBundle {
  assemblies: CreationAssemblyAsset[];
  attackMoves: CreationAttackMoveAsset[];
  testScenarios: CreationTestScenarioAsset[];
}

export interface CreationLibraryRepository {
  load(): Promise<CreationLibrarySnapshot>;
  saveAssembly(asset: CreationAssemblyAsset): Promise<void>;
  saveAttackMove(asset: CreationAttackMoveAsset): Promise<void>;
  saveTestScenario(asset: CreationTestScenarioAsset): Promise<void>;
  deleteAsset(kind: CreationAssetKind, assetId: string): Promise<void>;
}
