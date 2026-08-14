import { Injectable } from '@angular/core';
import {
  TRAIT_EVIDENCE_SCHEMA_VERSION,
  TraitEvidenceClaim,
  TraitEvidenceClassification,
  TraitEvidenceObservationId,
  TraitEvidenceSnapshot,
  TraitEvidenceTrial,
} from './trait-evidence.models';
import { TRAIT_EVIDENCE_OBSERVATIONS } from './trait-evidence.content';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.trait-evidence.v1';

@Injectable({ providedIn: 'root' })
export class TraitEvidenceRepository {
  load(studentId: string): TraitEvidenceSnapshot {
    const fallback = emptyTraitEvidenceSnapshot(studentId);
    if (typeof localStorage === 'undefined') return fallback;
    try {
      return normalizeSnapshot(
        JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}.${fallback.studentId}`) ?? 'null'),
        fallback,
      );
    } catch {
      return fallback;
    }
  }

  save(snapshot: TraitEvidenceSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}.${normalizeStudentId(snapshot.studentId)}`,
        JSON.stringify({ ...snapshot, studentId: normalizeStudentId(snapshot.studentId) }),
      );
    } catch {
      // The investigation remains usable if browser storage is unavailable.
    }
  }
}

export function emptyTraitEvidenceSnapshot(studentId = 'local-student'): TraitEvidenceSnapshot {
  return {
    schemaVersion: TRAIT_EVIDENCE_SCHEMA_VERSION,
    studentId: normalizeStudentId(studentId),
    observedCharacteristicIds: [],
    trials: [],
    claims: [],
    updatedAtIso: '',
  };
}

function normalizeSnapshot(value: unknown, fallback: TraitEvidenceSnapshot): TraitEvidenceSnapshot {
  if (!isRecord(value) || value['schemaVersion'] !== TRAIT_EVIDENCE_SCHEMA_VERSION) return fallback;
  return {
    schemaVersion: TRAIT_EVIDENCE_SCHEMA_VERSION,
    studentId: fallback.studentId,
    observedCharacteristicIds: stringList(value['observedCharacteristicIds']).filter(
      isObservationId,
    ),
    trials: Array.isArray(value['trials']) ? value['trials'].filter(isTrial) : [],
    claims: Array.isArray(value['claims']) ? value['claims'].filter(isClaim) : [],
    updatedAtIso: typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : '',
  };
}

function isTrial(value: unknown): value is TraitEvidenceTrial {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['specimenId'] === 'string' &&
    isObservationId(value['behaviorId']) &&
    (value['behaviorId'] === 'bell-bow' ||
      value['behaviorId'] === 'target-touch' ||
      value['behaviorId'] === 'wait-release') &&
    typeof value['responded'] === 'boolean' &&
    typeof value['result'] === 'string' &&
    typeof value['testedAtIso'] === 'string'
  );
}

function isClaim(value: unknown): value is TraitEvidenceClaim {
  return (
    isRecord(value) &&
    isObservationId(value['observationId']) &&
    typeof value['specimenId'] === 'string' &&
    isClassification(value['classification']) &&
    stringList(value['evidenceIds']).length ===
      (value['evidenceIds'] as unknown[] | undefined)?.length &&
    typeof value['supported'] === 'boolean' &&
    typeof value['updatedAtIso'] === 'string'
  );
}

function isObservationId(value: unknown): value is TraitEvidenceObservationId {
  return (
    typeof value === 'string' &&
    TRAIT_EVIDENCE_OBSERVATIONS.some((observation) => observation.id === value)
  );
}

function isClassification(value: unknown): value is TraitEvidenceClassification {
  return (
    value === 'inherited' ||
    value === 'learned' ||
    value === 'environmental' ||
    value === 'insufficient'
  );
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function normalizeStudentId(studentId: string): string {
  return studentId.trim() || 'local-student';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
