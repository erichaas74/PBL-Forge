/**
 * Runtime status: ACTIVE — owns which optional field cases appear on this browser.
 * Inputs/signals: teacher enable/disable actions update the settings signal.
 * Data access: versioned browser-local JSON storage with registry defaults.
 * Connects to: lesson branch visibility, case route validation, and the lesson-plan editor.
 */
import { Service, signal } from '@angular/core';
import { readStoredJson, writeStoredJson } from '../../../shared/assembly/persistence/json-local-storage';
import { DRAGON_CASES } from './dragon-case.registry';
import { DragonCaseId } from './dragon-case.models';

const STORAGE_KEY = 'pbl-forge.dragon-genetics.case-settings.v1';

interface DragonCaseSettings {
  schemaVersion: 2;
  enabledCaseIds: readonly DragonCaseId[];
}

@Service()
export class DragonCaseSettingsRepository {
  private readonly settingsSignal = signal(loadSettings());
  readonly settings = this.settingsSignal.asReadonly();

  isEnabled(caseId: DragonCaseId): boolean {
    return this.settingsSignal().enabledCaseIds.includes(caseId);
  }

  setEnabled(caseId: DragonCaseId, enabled: boolean): void {
    const current = this.settingsSignal();
    const enabledCaseIds = enabled
      ? [...new Set([...current.enabledCaseIds, caseId])]
      : current.enabledCaseIds.filter((candidate) => candidate !== caseId);
    const next: DragonCaseSettings = { schemaVersion: 2, enabledCaseIds };
    this.settingsSignal.set(next);
    writeStoredJson(STORAGE_KEY, next);
  }
}

function loadSettings(): DragonCaseSettings {
  return readStoredJson(
    STORAGE_KEY,
    { schemaVersion: 2, enabledCaseIds: DRAGON_CASES.map((definition) => definition.id) },
    normalizeSettings,
  );
}

function normalizeSettings(value: unknown): DragonCaseSettings {
  if (!isRecord(value) || !Array.isArray(value['enabledCaseIds'])) {
    return { schemaVersion: 2, enabledCaseIds: DRAGON_CASES.map((definition) => definition.id) };
  }
  const enabledCaseIds = value['enabledCaseIds'].filter(
    (candidate): candidate is DragonCaseId =>
      candidate === 'dragon-in-the-ash' || candidate === 'food-that-steals-fire',
  );
  return {
    schemaVersion: 2,
    enabledCaseIds: value['schemaVersion'] === 1
      ? [...new Set([...enabledCaseIds, 'food-that-steals-fire' as const])]
      : enabledCaseIds,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
