import { Injectable } from '@angular/core';
import { DRAGON_TRAITS } from '../../simulation/domain/dragon-inheritance';
import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  createEmptyPunnettSnapshot,
  PunnettComposerSnapshot,
  PunnettGameteSlots,
  PunnettSavedCross,
} from './punnett-composer.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.punnett-composer.v1';

@Injectable({ providedIn: 'root' })
export class PunnettComposerRepository {
  load(studentId: string): PunnettComposerSnapshot {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    if (typeof localStorage === 'undefined') return createEmptyPunnettSnapshot(normalizedStudentId);
    try {
      const stored = JSON.parse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`) ?? 'null',
      );
      return normalizePunnettSnapshot(stored, normalizedStudentId);
    } catch {
      return createEmptyPunnettSnapshot(normalizedStudentId);
    }
  }

  save(snapshot: PunnettComposerSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}.${snapshot.studentId}`, JSON.stringify(snapshot));
  }
}

function normalizePunnettSnapshot(value: unknown, studentId: string): PunnettComposerSnapshot {
  const empty = createEmptyPunnettSnapshot(studentId);
  if (!isRecord(value) || value['schemaVersion'] !== 1) return empty;
  return {
    schemaVersion: 1,
    studentId,
    parent1Id: typeof value['parent1Id'] === 'string' ? value['parent1Id'] : null,
    parent2Id: typeof value['parent2Id'] === 'string' ? value['parent2Id'] : null,
    traitId: isTraitId(value['traitId']) ? value['traitId'] : empty.traitId,
    parent1Gametes: normalizeGametes(value['parent1Gametes']),
    parent2Gametes: normalizeGametes(value['parent2Gametes']),
    savedCrosses: Array.isArray(value['savedCrosses'])
      ? value['savedCrosses'].filter(isSavedCross).slice(0, 24)
      : [],
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : empty.updatedAtIso,
  };
}

function normalizeGametes(value: unknown): PunnettGameteSlots {
  if (!Array.isArray(value) || value.length !== 2) return [null, null];
  return [normalizeAllele(value[0]), normalizeAllele(value[1])];
}

function normalizeAllele(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 4 ? value : null;
}

function isTraitId(value: unknown): value is DragonTraitId {
  return DRAGON_TRAITS.some((trait) => trait.id === value);
}

function isSavedCross(value: unknown): value is PunnettSavedCross {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['parent1Id'] === 'string' &&
    typeof value['parent1Name'] === 'string' &&
    typeof value['parent2Id'] === 'string' &&
    typeof value['parent2Name'] === 'string' &&
    isTraitId(value['traitId']) &&
    typeof value['traitName'] === 'string' &&
    isRecord(value['genotypeCounts']) &&
    isRecord(value['phenotypeCounts']) &&
    typeof value['savedAtIso'] === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
