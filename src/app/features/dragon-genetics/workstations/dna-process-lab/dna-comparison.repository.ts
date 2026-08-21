import { Injectable } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import { PersistedDnaLabState } from './dna-process.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.dna-comparison-lab.v2';

/** Replaceable device-backed persistence boundary for the DNA comparison bench. */
@Injectable({ providedIn: 'root' })
export class DnaComparisonRepository {
  load(studentId: string): PersistedDnaLabState {
    return readStoredJson(this.storageKey(studentId), {}, (value) =>
      isRecord(value) ? value : {},
    );
  }

  save(studentId: string, state: PersistedDnaLabState): void {
    writeStoredJson(this.storageKey(studentId), state);
  }

  private storageKey(studentId: string): string {
    return `${STORAGE_KEY_PREFIX}:${normalizeWorkstationStudentId(studentId)}`;
  }
}

function isRecord(value: unknown): value is PersistedDnaLabState {
  return typeof value === 'object' && value !== null;
}
