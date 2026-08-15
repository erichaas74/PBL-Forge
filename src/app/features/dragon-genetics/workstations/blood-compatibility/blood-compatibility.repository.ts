import { Injectable } from '@angular/core';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  BLOOD_TYPE_DEFINITIONS,
  BloodEmergencyRecord,
  BloodGenotype,
  BloodLabMode,
  BloodMarker,
  BloodPhenotypeId,
  BloodTestEvidence,
  StoredBloodEmergencyRecords,
  TransfusionTrial,
} from './blood-compatibility.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.blood-emergencies.v1';

/** Replaceable device-backed persistence boundary for saved emergency transfusion records. */
@Injectable({ providedIn: 'root' })
export class BloodCompatibilityRepository {
  load(studentId: string): readonly BloodEmergencyRecord[] {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    if (typeof localStorage === 'undefined') return [];
    try {
      const value = JSON.parse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`) ?? 'null',
      ) as Partial<StoredBloodEmergencyRecords> | null;
      return value?.schemaVersion === 1 && Array.isArray(value.records)
        ? value.records.filter(isEmergencyRecord)
        : [];
    } catch {
      return [];
    }
  }

  save(studentId: string, record: BloodEmergencyRecord): readonly BloodEmergencyRecord[] {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    const records = [
      record,
      ...this.load(normalizedStudentId).filter((candidate) => candidate.id !== record.id),
    ].slice(0, 30);
    if (typeof localStorage !== 'undefined') {
      try {
        const snapshot: StoredBloodEmergencyRecords = {
          schemaVersion: 1,
          studentId: normalizedStudentId,
          records,
        };
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}.${normalizedStudentId}`,
          JSON.stringify(snapshot),
        );
      } catch {
        // The workstation remains usable if device storage is unavailable or full.
      }
    }
    return records;
  }
}

function isEmergencyRecord(value: unknown): value is BloodEmergencyRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['patientId'] === 'string' &&
    typeof value['patientName'] === 'string' &&
    typeof value['patientSampleCode'] === 'string' &&
    isPhenotype(value['patientPhenotype']) &&
    isGenotypeList(value['patientPossibleGenotypes']) &&
    typeof value['donorId'] === 'string' &&
    typeof value['donorName'] === 'string' &&
    typeof value['donorSampleCode'] === 'string' &&
    isPhenotype(value['donorPhenotype']) &&
    isGenotypeList(value['donorPossibleGenotypes']) &&
    isBloodTest(value['patientTest']) &&
    isBloodTest(value['donorTest']) &&
    Array.isArray(value['transfusionTrials']) &&
    value['transfusionTrials'].every(isTransfusionTrial) &&
    isMode(value['mode']) &&
    typeof value['supplyNote'] === 'string' &&
    Array.isArray(value['codominantAlleles']) &&
    value['codominantAlleles'][0] === 'A' &&
    value['codominantAlleles'][1] === 'B' &&
    typeof value['explanation'] === 'string' &&
    typeof value['savedAtIso'] === 'string'
  );
}

function isBloodTest(value: unknown): value is BloodTestEvidence {
  if (!isRecord(value)) return false;
  return (
    typeof value['specimenId'] === 'string' &&
    typeof value['sampleCode'] === 'string' &&
    isBooleanOrNull(value['antiA']) &&
    isBooleanOrNull(value['antiB']) &&
    typeof value['testedAtIso'] === 'string'
  );
}

function isTransfusionTrial(value: unknown): value is TransfusionTrial {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['donorId'] === 'string' &&
    typeof value['donorName'] === 'string' &&
    typeof value['compatible'] === 'boolean' &&
    Array.isArray(value['unfamiliarMarkers']) &&
    value['unfamiliarMarkers'].every(isMarker) &&
    isMode(value['mode']) &&
    typeof value['unitConsumed'] === 'boolean' &&
    typeof value['testedAtIso'] === 'string'
  );
}

function isPhenotype(value: unknown): value is BloodPhenotypeId {
  return BLOOD_TYPE_DEFINITIONS.some((definition) => definition.id === value);
}

function isGenotypeList(value: unknown): value is readonly BloodGenotype[] {
  return Array.isArray(value) && value.every(isGenotype);
}

function isGenotype(value: unknown): value is BloodGenotype {
  return ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'].includes(String(value));
}

function isMarker(value: unknown): value is BloodMarker {
  return value === 'a' || value === 'b';
}

function isMode(value: unknown): value is BloodLabMode {
  return value === 'standard' || value === 'challenge';
}

function isBooleanOrNull(value: unknown): value is boolean | null {
  return value === null || typeof value === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
