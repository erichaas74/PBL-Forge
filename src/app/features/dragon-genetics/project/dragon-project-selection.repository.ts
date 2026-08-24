import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../shared/assembly/persistence/json-local-storage';
import { DRAGON_CAPSTONE_PATHS, DragonCapstonePathId } from './dragon-capstone-paths';
import { DragonProjectSelectionSnapshot } from './dragon-project-selection.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.project-selection.v1';

@Service()
export class DragonProjectSelectionRepository {
  load(studentId: string, assignmentId: string): DragonProjectSelectionSnapshot {
    const empty = emptySnapshot(studentId, assignmentId);
    return readStoredJson(storageKey(empty.studentId, empty.assignmentId), empty, (value) => {
      const stored = value as Partial<DragonProjectSelectionSnapshot> | null;
      return stored?.schemaVersion === 1 && isPathId(stored.selectedPathId)
        ? { ...empty, selectedPathId: stored.selectedPathId }
        : empty;
    });
  }

  save(snapshot: DragonProjectSelectionSnapshot): void {
    writeStoredJson(storageKey(snapshot.studentId, snapshot.assignmentId), snapshot);
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
