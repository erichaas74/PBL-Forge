import { computed, Service, signal } from '@angular/core';
import {
  BUILT_IN_ASSEMBLY_ASSETS,
  BUILT_IN_ATTACK_MOVE_ASSETS,
  BUILT_IN_TEST_SCENARIO_ASSETS,
} from '../data/built-in-creation-assets';
import { ATTACK_MOVE_CATALOG } from '../data/attack-move-catalog';
import { AttackMoveDefinition } from '../models/attack-move.models';
import { CreationTestScenarioDefinition } from '../models/test-scenario.models';
import {
  CreationAssemblyAsset,
  CreationAttackMoveAsset,
  CreationTestScenarioAsset,
  CreationLibrarySnapshot,
  GameCreationLibraryCapability,
  GameCreationAssetBundle,
  SaveAssemblyAssetInput,
  SaveAttackMoveAssetInput,
  SaveTestScenarioAssetInput,
} from '../models/creation-library.models';
import { normalizeAssemblyRoles } from '../../assembly/domain/assembly-clone';
import { createDefaultCombatProfile } from '../../assembly/combat/assembly-combat.models';

const STORAGE_KEY = 'assembly.creationLibrary.v1';

@Service()
export class CreationLibraryService {
  private readonly localSnapshotSignal = signal<CreationLibrarySnapshot>(loadLocalSnapshot());

  readonly assemblyAssets = computed<CreationAssemblyAsset[]>(() =>
    mergeAssets(BUILT_IN_ASSEMBLY_ASSETS, this.localSnapshotSignal().assemblies),
  );

  readonly attackMoveAssets = computed<CreationAttackMoveAsset[]>(() =>
    mergeAssets(BUILT_IN_ATTACK_MOVE_ASSETS, this.localSnapshotSignal().attackMoves),
  );

  readonly testScenarioAssets = computed<CreationTestScenarioAsset[]>(() =>
    mergeAssets(BUILT_IN_TEST_SCENARIO_ASSETS, this.localSnapshotSignal().testScenarios),
  );

  readonly attackMoveDefinitions = computed<AttackMoveDefinition[]>(() =>
    this.attackMoveAssets().map(asset => cloneValue(asset.move)),
  );

  readonly testScenarioDefinitions = computed<CreationTestScenarioDefinition[]>(() =>
    this.testScenarioAssets().map(asset => cloneValue(asset.scenario)),
  );

  readonly snapshot = computed<CreationLibrarySnapshot>(() => ({
    assemblies: this.assemblyAssets().map(cloneValue),
    attackMoves: this.attackMoveAssets().map(cloneValue),
    testScenarios: this.testScenarioAssets().map(cloneValue),
  }));

  saveAssemblyAsset(input: SaveAssemblyAssetInput): CreationAssemblyAsset {
    const now = new Date().toISOString();
    const name = normalizeText(input.name, 'Custom Assembly');
    const existing = this.localSnapshotSignal().assemblies.find(asset => asset.id === toAssetId(name));
    const assembly = normalizeAssemblyRoles(input.assembly);
    const asset: CreationAssemblyAsset = {
      id: existing?.id ?? toAssetId(name),
      kind: 'assembly',
      name,
      description: normalizeText(input.description, 'A custom assembly created in the garage.'),
      tags: normalizeTags(input.tags),
      scope: 'local',
      schemaVersion: 1,
      assetVersion: (existing?.assetVersion ?? 0) + 1,
      createdAtIso: existing?.createdAtIso ?? now,
      updatedAtIso: now,
      authoringTool: 'assembly-garage',
      compatibleGameIds: normalizeOptionalList(input.compatibleGameIds),
      assembly,
      combatProfile: input.combatProfile
        ? cloneValue(input.combatProfile)
        : createDefaultCombatProfile(assembly),
    };

    this.localSnapshotSignal.update(snapshot => ({
      ...snapshot,
      assemblies: upsertAsset(snapshot.assemblies, asset),
    }));
    this.persistLocalSnapshot();
    return cloneValue(asset);
  }

  saveAttackMoveAsset(input: SaveAttackMoveAssetInput): CreationAttackMoveAsset {
    const now = new Date().toISOString();
    const name = normalizeText(input.name, input.move.name || 'Custom Attack Move');
    const existing = this.localSnapshotSignal().attackMoves.find(asset => asset.id === toAssetId(name));
    const move: AttackMoveDefinition = {
      ...input.move,
      id: existing?.id ?? toAssetId(name),
      name,
      description: normalizeText(input.description, input.move.description || 'A custom attack move.'),
      tags: normalizeTags(input.tags?.length ? input.tags : input.move.tags),
      steps: input.move.steps.map(step => ({
        action: step.action,
        durationSeconds: Math.max(0.05, step.durationSeconds),
        amount: clamp(step.amount, 0, 1.5),
      })),
    };
    const asset: CreationAttackMoveAsset = {
      id: move.id,
      kind: 'attack-move',
      name: move.name,
      description: move.description,
      tags: move.tags,
      scope: 'local',
      schemaVersion: 1,
      assetVersion: (existing?.assetVersion ?? 0) + 1,
      createdAtIso: existing?.createdAtIso ?? now,
      updatedAtIso: now,
      authoringTool: 'assembly-arena',
      compatibleGameIds: normalizeOptionalList(input.compatibleGameIds),
      move,
    };

    this.localSnapshotSignal.update(snapshot => ({
      ...snapshot,
      attackMoves: upsertAsset(snapshot.attackMoves, asset),
    }));
    this.persistLocalSnapshot();
    return cloneValue(asset);
  }

  saveAttackMoveDefinition(move: AttackMoveDefinition): CreationAttackMoveAsset {
    return this.saveAttackMoveAsset({
      name: move.name,
      description: move.description,
      tags: move.tags,
      move,
    });
  }

  saveTestScenarioAsset(input: SaveTestScenarioAssetInput): CreationTestScenarioAsset {
    const now = new Date().toISOString();
    const name = normalizeText(input.name, input.scenario.name || 'Custom Test Scenario');
    const existing = this.localSnapshotSignal().testScenarios.find(asset => asset.id === toAssetId(name));
    const scenario: CreationTestScenarioDefinition = {
      ...cloneValue(input.scenario),
      id: existing?.id ?? toAssetId(name),
      name,
      description: normalizeText(input.description, input.scenario.description || 'A custom test scenario.'),
      tags: normalizeTags(input.tags?.length ? input.tags : input.scenario.tags),
      compatibleGameIds: normalizeOptionalList(input.compatibleGameIds ?? input.scenario.compatibleGameIds),
    };
    const asset: CreationTestScenarioAsset = {
      id: scenario.id,
      kind: 'test-scenario',
      name: scenario.name,
      description: scenario.description,
      tags: scenario.tags,
      scope: 'local',
      schemaVersion: 1,
      assetVersion: (existing?.assetVersion ?? 0) + 1,
      createdAtIso: existing?.createdAtIso ?? now,
      updatedAtIso: now,
      authoringTool: 'test-scenario-builder',
      compatibleGameIds: scenario.compatibleGameIds,
      scenario,
    };

    this.localSnapshotSignal.update(snapshot => ({
      ...snapshot,
      testScenarios: upsertAsset(snapshot.testScenarios, asset),
    }));
    this.persistLocalSnapshot();
    return cloneValue(asset);
  }

  getAssemblyAsset(assetId: string | null | undefined): CreationAssemblyAsset | null {
    if (!assetId) {
      return null;
    }

    return this.assemblyAssets().find(asset => asset.id === assetId) ?? null;
  }

  getAttackMoveDefinition(moveId: string | null | undefined): AttackMoveDefinition {
    if (!moveId) {
      return cloneValue(ATTACK_MOVE_CATALOG[0]);
    }

    return cloneValue(
      this.attackMoveAssets().find(asset => asset.id === moveId)?.move ?? ATTACK_MOVE_CATALOG[0],
    );
  }

  getTestScenarioDefinition(scenarioId: string | null | undefined): CreationTestScenarioDefinition | null {
    if (!scenarioId) {
      return null;
    }

    return cloneValue(
      this.testScenarioAssets().find(asset => asset.id === scenarioId)?.scenario ?? null,
    );
  }

  assemblyAssetsForGame(gameId: string): CreationAssemblyAsset[] {
    return this.assemblyAssets().filter(asset =>
      !asset.compatibleGameIds?.length || asset.compatibleGameIds.includes(gameId),
    );
  }

  attackMoveAssetsForGame(gameId: string): CreationAttackMoveAsset[] {
    return this.attackMoveAssets().filter(asset =>
      !asset.compatibleGameIds?.length || asset.compatibleGameIds.includes(gameId),
    );
  }

  testScenarioAssetsForGame(gameId: string): CreationTestScenarioAsset[] {
    return this.testScenarioAssets().filter(asset =>
      !asset.compatibleGameIds?.length || asset.compatibleGameIds.includes(gameId),
    );
  }

  testScenarioDefinitionsForGame(gameId: string): CreationTestScenarioDefinition[] {
    return this.testScenarioAssetsForGame(gameId).map(asset => cloneValue(asset.scenario));
  }

  /**
   * Returns assembly assets compatible with a game's declared capability block,
   * ranked by preferred tag overlap (most relevant first).
   */
  assemblyAssetsForCapability(
    gameId: string,
    capability: GameCreationLibraryCapability,
  ): CreationAssemblyAsset[] {
    if (!capability.acceptsAssemblies) {
      return [];
    }

    return rankAssetsByPreferredTags(
      this.assemblyAssetsForGame(gameId),
      capability.preferredTags,
    );
  }

  attackMoveAssetsForCapability(
    gameId: string,
    capability: GameCreationLibraryCapability,
  ): CreationAttackMoveAsset[] {
    if (!capability.acceptsAttackMoves) {
      return [];
    }

    return rankAssetsByPreferredTags(
      this.attackMoveAssetsForGame(gameId),
      capability.preferredTags,
    );
  }

  /**
   * Returns test scenario assets compatible with a game's declared capability block,
   * ranked by preferred tag overlap (most relevant first).
   */
  testScenarioAssetsForCapability(
    gameId: string,
    capability: GameCreationLibraryCapability,
  ): CreationTestScenarioAsset[] {
    if (!capability.acceptsTestScenarios) {
      return [];
    }

    return rankAssetsByPreferredTags(
      this.testScenarioAssetsForGame(gameId),
      capability.preferredTags,
    );
  }

  assetsForGameCapability(
    gameId: string,
    capability: GameCreationLibraryCapability,
  ): GameCreationAssetBundle {
    return {
      assemblies: this.assemblyAssetsForCapability(gameId, capability),
      attackMoves: this.attackMoveAssetsForCapability(gameId, capability),
      testScenarios: this.testScenarioAssetsForCapability(gameId, capability),
    };
  }

  deleteLocalAsset(kind: 'assembly' | 'attack-move' | 'test-scenario', assetId: string): void {
    this.localSnapshotSignal.update(snapshot => ({
      assemblies: kind === 'assembly'
        ? snapshot.assemblies.filter(asset => asset.id !== assetId)
        : snapshot.assemblies,
      attackMoves: kind === 'attack-move'
        ? snapshot.attackMoves.filter(asset => asset.id !== assetId)
        : snapshot.attackMoves,
      testScenarios: kind === 'test-scenario'
        ? snapshot.testScenarios.filter(asset => asset.id !== assetId)
        : snapshot.testScenarios,
    }));
    this.persistLocalSnapshot();
  }

  importSnapshot(snapshot: CreationLibrarySnapshot): void {
    this.localSnapshotSignal.set({
      assemblies: snapshot.assemblies
        .filter(asset => asset.scope !== 'built-in')
        .map(asset => ({ ...cloneValue(asset), scope: 'local' })),
      attackMoves: snapshot.attackMoves
        .filter(asset => asset.scope !== 'built-in')
        .map(asset => ({ ...cloneValue(asset), scope: 'local' })),
      testScenarios: (snapshot.testScenarios ?? [])
        .filter(asset => asset.scope !== 'built-in')
        .map(asset => ({ ...cloneValue(asset), scope: 'local' })),
    });
    this.persistLocalSnapshot();
  }

  private persistLocalSnapshot(): void {
    saveLocalSnapshot(cloneValue(this.localSnapshotSignal()));
  }
}

function loadLocalSnapshot(): CreationLibrarySnapshot {
  if (typeof localStorage === 'undefined') {
    return { assemblies: [], attackMoves: [], testScenarios: [] };
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<CreationLibrarySnapshot>;
    return {
      assemblies: Array.isArray(parsed.assemblies)
        ? parsed.assemblies.filter(isCreationAssemblyAsset).map(migrateAssemblyAsset)
        : [],
      attackMoves: Array.isArray(parsed.attackMoves)
        ? parsed.attackMoves.filter(isCreationAttackMoveAsset)
        : [],
      testScenarios: Array.isArray(parsed.testScenarios)
        ? parsed.testScenarios.filter(isCreationTestScenarioAsset)
        : [],
    };
  } catch {
    return { assemblies: [], attackMoves: [], testScenarios: [] };
  }
}

function migrateAssemblyAsset(asset: CreationAssemblyAsset): CreationAssemblyAsset {
  const assembly = normalizeAssemblyRoles(asset.assembly);
  return {
    ...asset,
    assembly,
    combatProfile: asset.combatProfile
      ? cloneValue(asset.combatProfile)
      : createDefaultCombatProfile(assembly),
  };
}

function saveLocalSnapshot(snapshot: CreationLibrarySnapshot): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function mergeAssets<T extends { id: string }>(builtInAssets: readonly T[], localAssets: readonly T[]): T[] {
  const localIds = new Set(localAssets.map(asset => asset.id));
  return [
    ...builtInAssets.filter(asset => !localIds.has(asset.id)).map(cloneValue),
    ...localAssets.map(cloneValue),
  ];
}

function upsertAsset<T extends { id: string }>(assets: readonly T[], asset: T): T[] {
  return [
    ...assets.filter(item => item.id !== asset.id),
    asset,
  ];
}

function rankAssetsByPreferredTags<T extends { tags: string[] }>(
  assets: T[],
  preferredTags: readonly string[] | undefined,
): T[] {
  const preferred = new Set(preferredTags ?? []);
  if (!preferred.size) return assets;
  return [...assets].sort((a, b) =>
    b.tags.filter(tag => preferred.has(tag)).length
    - a.tags.filter(tag => preferred.has(tag)).length,
  );
}

function isCreationAssemblyAsset(value: unknown): value is CreationAssemblyAsset {
  return isRecord(value) &&
    value['kind'] === 'assembly' &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['description'] === 'string' &&
    Array.isArray(value['tags']) &&
    isRecord(value['assembly']);
}

function isCreationAttackMoveAsset(value: unknown): value is CreationAttackMoveAsset {
  return isRecord(value) &&
    value['kind'] === 'attack-move' &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['description'] === 'string' &&
    Array.isArray(value['tags']) &&
    isRecord(value['move']);
}

function isCreationTestScenarioAsset(value: unknown): value is CreationTestScenarioAsset {
  return isRecord(value) &&
    value['kind'] === 'test-scenario' &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['description'] === 'string' &&
    Array.isArray(value['tags']) &&
    isRecord(value['scenario']);
}

function normalizeText(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeTags(tags: readonly string[] | undefined): string[] {
  const normalized = (tags ?? ['custom'])
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(normalized.length ? normalized : ['custom'])];
}

function normalizeOptionalList(values: readonly string[] | undefined): string[] | undefined {
  const normalized = values?.map(value => value.trim()).filter(Boolean);
  return normalized?.length ? [...new Set(normalized)] : undefined;
}

function toAssetId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom-asset';
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
