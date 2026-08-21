import { Injectable } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { starterPairPreset } from '../config/dragon-journey.registry';
import { DragonJourneyRosterSnapshot, DragonLearningPathId } from '../domain/dragon-journey.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.journey-roster.v1';

/** Assignment-scoped index for the two starters that anchor a student's breeding line. */
@Injectable({ providedIn: 'root' })
export class DragonJourneyRosterRepository {
  loadOrCreate(
    studentId: string,
    assignmentId: string,
    pathId: DragonLearningPathId,
    presetId: string,
  ): DragonJourneyRosterSnapshot {
    const stored = this.load(studentId, assignmentId, pathId);
    if (stored) return stored;
    const preset = starterPairPreset(presetId);
    if (!preset || preset.pathId !== pathId) {
      throw new Error(`Starter pair ${presetId} is not valid for ${pathId}.`);
    }
    const snapshot: DragonJourneyRosterSnapshot = {
      schemaVersion: 1,
      studentId: normalizeId(studentId, 'local-student'),
      assignmentId: normalizeId(assignmentId, 'default'),
      pathId,
      starterPairPresetId: preset.id,
      starters: [{ ...preset.starters[0] }, { ...preset.starters[1] }],
      createdAtIso: new Date().toISOString(),
    };
    this.save(snapshot);
    return snapshot;
  }

  load(
    studentId: string,
    assignmentId: string,
    pathId: DragonLearningPathId,
  ): DragonJourneyRosterSnapshot | null {
    return readStoredJson(storageKey(studentId, assignmentId, pathId), null, (value) =>
      normalizeRoster(value, studentId, assignmentId, pathId),
    );
  }

  save(snapshot: DragonJourneyRosterSnapshot): void {
    writeStoredJson(
      storageKey(snapshot.studentId, snapshot.assignmentId, snapshot.pathId),
      snapshot,
    );
  }
}

function normalizeRoster(
  value: unknown,
  studentId: string,
  assignmentId: string,
  pathId: DragonLearningPathId,
): DragonJourneyRosterSnapshot | null {
  if (!isRecord(value) || value['schemaVersion'] !== 1 || value['pathId'] !== pathId) return null;
  const preset = starterPairPreset(String(value['starterPairPresetId'] ?? ''));
  if (!preset || preset.pathId !== pathId) return null;
  return {
    schemaVersion: 1,
    studentId: normalizeId(studentId, 'local-student'),
    assignmentId: normalizeId(assignmentId, 'default'),
    pathId,
    starterPairPresetId: preset.id,
    starters: [{ ...preset.starters[0] }, { ...preset.starters[1] }],
    createdAtIso:
      typeof value['createdAtIso'] === 'string' ? value['createdAtIso'] : new Date(0).toISOString(),
  };
}

function storageKey(studentId: string, assignmentId: string, pathId: DragonLearningPathId): string {
  return `${STORAGE_KEY_PREFIX}.${normalizeId(studentId, 'local-student')}.${normalizeId(assignmentId, 'default')}.${pathId}`;
}

function normalizeId(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
