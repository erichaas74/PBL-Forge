import { Injectable } from '@angular/core';
import { DRAGON_CAPSTONE_PATHS, DragonCapstonePathId } from './dragon-capstone-paths';
import { DragonProjectSelectionSnapshot } from './dragon-project-selection.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.project-selection.v1';

@Injectable({ providedIn: 'root' })
export class DragonProjectSelectionRepository {
  load(studentId: string, assignmentId: string): DragonProjectSelectionSnapshot {
    const empty = emptySnapshot(studentId, assignmentId);
    if (typeof localStorage === 'undefined') return empty;
    try {
      const value = JSON.parse(
        localStorage.getItem(storageKey(empty.studentId, empty.assignmentId)) ?? 'null',
      ) as Partial<DragonProjectSelectionSnapshot> | null;
      return value?.schemaVersion === 1 && isPathId(value.selectedPathId)
        ? { ...empty, selectedPathId: value.selectedPathId }
        : empty;
    } catch {
      return empty;
    }
  }

  save(snapshot: DragonProjectSelectionSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        storageKey(snapshot.studentId, snapshot.assignmentId),
        JSON.stringify(snapshot),
      );
    } catch {
      // Path selection remains active for the session when device storage is unavailable.
    }
  }
}

function emptySnapshot(studentId: string, assignmentId: string): DragonProjectSelectionSnapshot {
  return {
    schemaVersion: 1,
    studentId: studentId.trim() || 'local-student',
    assignmentId: assignmentId.trim() || 'default',
    selectedPathId: null,
  };
}

function storageKey(studentId: string, assignmentId: string): string {
  return `${STORAGE_KEY_PREFIX}.${studentId}.${assignmentId}`;
}

function isPathId(value: unknown): value is DragonCapstonePathId | null {
  return (
    value === null ||
    (typeof value === 'string' && DRAGON_CAPSTONE_PATHS.some((path) => path.id === value))
  );
}

