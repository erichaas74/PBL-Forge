import { Service } from '@angular/core';
import { DragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { MysteryPairNotebookSnapshot } from './mystery-pair.models';

const KEY = 'pbl-forge.dragon-genetics.mystery-pair.v1';

@Service()
export class MysteryPairRepository {
  load(studentId: string, pathId: DragonPathContextId): MysteryPairNotebookSnapshot {
    const empty = emptySnapshot(studentId, pathId);
    if (typeof localStorage === 'undefined') return empty;
    try {
      const value = JSON.parse(localStorage.getItem(`${KEY}.${studentId}.${pathId}`) ?? 'null') as Partial<MysteryPairNotebookSnapshot> | null;
      if (value?.schemaVersion !== 1 || !Array.isArray(value.entries)) return empty;
      return { ...empty, ...value, studentId, pathId, entries: value.entries };
    } catch {
      return empty;
    }
  }

  save(snapshot: MysteryPairNotebookSnapshot): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${KEY}.${snapshot.studentId}.${snapshot.pathId}`, JSON.stringify(snapshot));
    }
  }
}

export function emptySnapshot(studentId: string, pathId: DragonPathContextId): MysteryPairNotebookSnapshot {
  return { schemaVersion: 1, studentId, pathId, openedSpecimenIds: [], testedComparisonIds: [], entries: [], updatedAtIso: new Date(0).toISOString() };
}
