import { Injectable } from '@angular/core';
import {
  DRAGON_FOODS,
  DigestionTrial,
  DragonFoodId,
  DracaseGenotype,
  ProteinRescueCaseRecord,
  ProteinRescueSampleEvidence,
  StoredProteinRescueCases,
} from './protein-rescue.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.protein-rescue.v1';

/** Replaceable device-backed persistence boundary for clinical rescue records. */
@Injectable({ providedIn: 'root' })
export class ProteinRescueRepository {
  load(studentId: string): readonly ProteinRescueCaseRecord[] {
    const normalizedStudentId = studentId.trim() || 'local-student';
    if (typeof localStorage === 'undefined') return [];
    try {
      const value = JSON.parse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`) ?? 'null',
      ) as Partial<StoredProteinRescueCases> | null;
      return value?.schemaVersion === 1 && Array.isArray(value.records)
        ? value.records.filter(isCaseRecord)
        : [];
    } catch {
      return [];
    }
  }

  save(studentId: string, record: ProteinRescueCaseRecord): readonly ProteinRescueCaseRecord[] {
    const normalizedStudentId = studentId.trim() || 'local-student';
    const records = [
      record,
      ...this.load(normalizedStudentId).filter((item) => item.id !== record.id),
    ].slice(0, 30);
    if (typeof localStorage !== 'undefined') {
      try {
        const snapshot: StoredProteinRescueCases = {
          schemaVersion: 1,
          studentId: normalizedStudentId,
          records,
        };
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}.${normalizedStudentId}`,
          JSON.stringify(snapshot),
        );
      } catch {
        // The open instrument stays usable when device storage is unavailable or full.
      }
    }
    return records;
  }
}

function isCaseRecord(value: unknown): value is ProteinRescueCaseRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['patientId'] === 'string' &&
    typeof value['patientName'] === 'string' &&
    typeof value['chartSummary'] === 'string' &&
    Array.isArray(value['observations']) &&
    value['observations'].every(isString) &&
    Array.isArray(value['sampleEvidence']) &&
    value['sampleEvidence'].every(isSampleEvidence) &&
    Array.isArray(value['digestionTrials']) &&
    value['digestionTrials'].every(isDigestionTrial) &&
    isGenotype(value['claimedGenotype']) &&
    Array.isArray(value['recommendedFoodIds']) &&
    value['recommendedFoodIds'].every(isFoodId) &&
    typeof value['explanation'] === 'string' &&
    typeof value['savedAtIso'] === 'string'
  );
}

function isSampleEvidence(value: unknown): value is ProteinRescueSampleEvidence {
  if (!isRecord(value)) return false;
  return (
    typeof value['sampleCode'] === 'string' &&
    typeof value['codingDna'] === 'string' &&
    typeof value['templateDna'] === 'string' &&
    typeof value['mrna'] === 'string' &&
    Array.isArray(value['aminoAcids']) &&
    value['aminoAcids'].every(isString) &&
    typeof value['stoppedEarly'] === 'boolean' &&
    typeof value['enzymeWorks'] === 'boolean'
  );
}

function isDigestionTrial(value: unknown): value is DigestionTrial {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    isFoodId(value['foodId']) &&
    typeof value['foodName'] === 'string' &&
    ['digested', 'managed', 'no-dracose', 'undigested'].includes(String(value['result'])) &&
    typeof value['sugarSplit'] === 'boolean' &&
    (value['energy'] === 'steady' || value['energy'] === 'reduced') &&
    typeof value['symptoms'] === 'string' &&
    typeof value['explanation'] === 'string' &&
    typeof value['testedAtIso'] === 'string'
  );
}

function isGenotype(value: unknown): value is DracaseGenotype {
  return value === 'DD' || value === 'Dd' || value === 'dd';
}

function isFoodId(value: unknown): value is DragonFoodId {
  return DRAGON_FOODS.some((food) => food.id === value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
