import { Injectable } from '@angular/core';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import { PersistedDnaLabState } from './dna-process.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.dna-comparison-lab.v2';

/** Replaceable device-backed persistence boundary for the DNA comparison bench. */
@Injectable({ providedIn: 'root' })
export class DnaComparisonRepository {
  load(studentId: string): PersistedDnaLabState {
    if (typeof localStorage === 'undefined') return {};
    try {
      const parsed = JSON.parse(
        localStorage.getItem(this.storageKey(studentId)) ?? '{}',
      ) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  save(studentId: string, state: PersistedDnaLabState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey(studentId), JSON.stringify(state));
    } catch {
      // The comparison bench remains usable when device storage is unavailable.
    }
  }

  private storageKey(studentId: string): string {
    return `${STORAGE_KEY_PREFIX}:${normalizeWorkstationStudentId(studentId)}`;
  }
}

function isRecord(value: unknown): value is PersistedDnaLabState {
  return typeof value === 'object' && value !== null;
}
