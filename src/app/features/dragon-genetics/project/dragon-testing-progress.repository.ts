import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../shared/assembly/persistence/json-local-storage';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.testing-progress.v1';

export interface DragonTestingProgressSnapshot {
  schemaVersion: 1;
  studentId: string;
  assignmentId: string;
  completedAtByActivityId: Readonly<Record<string, string>>;
}

/**
 * Device-local completion overrides used during the long-running testing phase.
 *
 * These records deliberately do not invent experiment evidence, answers, or
 * scores. They only tell the project map that a tester has finished a section.
 */
@Service()
export class DragonTestingProgressRepository {
  load(studentId: string, assignmentId: string): DragonTestingProgressSnapshot {
    const fallback = emptyDragonTestingProgress(studentId, assignmentId);
    return readStoredJson(storageKey(fallback), fallback, (value) => {
      if (!isRecord(value) || value['schemaVersion'] !== 1) return fallback;
      return {
        ...fallback,
        completedAtByActivityId: stringRecord(value['completedAtByActivityId']),
      };
    });
  }

  complete(
    studentId: string,
    assignmentId: string,
    activityId: string,
    completedAtIso = new Date().toISOString(),
  ): DragonTestingProgressSnapshot {
    const current = this.load(studentId, assignmentId);
    const next: DragonTestingProgressSnapshot = {
      ...current,
      completedAtByActivityId: {
        ...current.completedAtByActivityId,
        [activityId]: completedAtIso,
      },
    };
    writeStoredJson(storageKey(next), next);
    return next;
  }
}

export function emptyDragonTestingProgress(
  studentId = 'local-student',
  assignmentId = 'default',
): DragonTestingProgressSnapshot {
  return {
    schemaVersion: 1,
    studentId: normalizeId(studentId, 'local-student'),
    assignmentId: normalizeId(assignmentId, 'default'),
    completedAtByActivityId: {},
  };
}

function storageKey(snapshot: DragonTestingProgressSnapshot): string {
  return `${STORAGE_KEY_PREFIX}.${snapshot.studentId}.${snapshot.assignmentId}`;
}

function normalizeId(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => Boolean(entry[0]) && typeof entry[1] === 'string',
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
