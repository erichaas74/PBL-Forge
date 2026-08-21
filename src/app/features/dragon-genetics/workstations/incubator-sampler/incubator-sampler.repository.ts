import { Injectable } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { DRAGON_TRAITS } from '../../simulation/domain/dragon-inheritance';
import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import { IncubatorBatchRecord, IncubatorSamplerSnapshot } from './incubator-sampler.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.incubator-sampler.v2';

@Injectable({ providedIn: 'root' })
export class IncubatorSamplerRepository {
  load(studentId: string): IncubatorSamplerSnapshot {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    const fallback = emptyIncubatorSnapshot(normalizedStudentId);
    return readStoredJson(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`, fallback, (value) =>
      normalizeSnapshot(value, fallback),
    );
  }

  save(snapshot: IncubatorSamplerSnapshot): void {
    const studentId = normalizeWorkstationStudentId(snapshot.studentId);
    writeStoredJson(`${STORAGE_KEY_PREFIX}.${studentId}`, { ...snapshot, studentId });
  }
}

export function emptyIncubatorSnapshot(studentId: string): IncubatorSamplerSnapshot {
  return {
    schemaVersion: 2,
    studentId: normalizeWorkstationStudentId(studentId),
    originalParentIds: [null, null],
    activeParentIds: [null, null],
    activeBreedingPoolIds: [],
    selectedTraitId: DRAGON_TRAITS[0].id,
    sampleSize: 8,
    nextRunNumber: 1,
    batches: [],
  };
}

function normalizeSnapshot(
  value: unknown,
  fallback: IncubatorSamplerSnapshot,
): IncubatorSamplerSnapshot {
  if (!isRecord(value) || value['schemaVersion'] !== 2) return fallback;
  const traitId = isTraitId(value['selectedTraitId'])
    ? value['selectedTraitId']
    : fallback.selectedTraitId;
  const size = isSampleSize(value['sampleSize']) ? value['sampleSize'] : fallback.sampleSize;
  const batches = Array.isArray(value['batches'])
    ? value['batches'].filter(isBatchRecord).map(normalizeBatchRecord)
    : [];
  const activeParentIds = normalizeParentIds(value['activeParentIds']);
  return {
    schemaVersion: 2,
    studentId: fallback.studentId,
    originalParentIds: normalizeParentIds(value['originalParentIds']),
    activeParentIds,
    activeBreedingPoolIds: normalizeStringArray(value['activeBreedingPoolIds']).length
      ? normalizeStringArray(value['activeBreedingPoolIds'])
      : activeParentIds.filter((id): id is string => Boolean(id)),
    selectedTraitId: traitId,
    sampleSize: size,
    nextRunNumber:
      typeof value['nextRunNumber'] === 'number' && value['nextRunNumber'] > 0
        ? Math.floor(value['nextRunNumber'])
        : Math.max(1, ...batches.map((batch) => batch.runNumber + 1)),
    batches,
  };
}

function isBatchRecord(value: unknown): value is IncubatorBatchRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['generation'] === 'number' &&
    typeof value['runNumber'] === 'number' &&
    isStringPair(value['parentIds']) &&
    isTraitId(value['traitId']) &&
    isSampleSize(value['size']) &&
    Array.isArray(value['offspring']) &&
    Array.isArray(value['results']) &&
    Array.isArray(value['selectedForLaterBreedingIds']) &&
    value['inheritanceModel'] === 'balanced-punnett-v2' &&
    typeof value['createdAtIso'] === 'string'
  );
}

function normalizeBatchRecord(record: IncubatorBatchRecord): IncubatorBatchRecord {
  const breedingPoolIds = normalizeStringArray(record['breedingPoolIds']);
  return {
    ...record,
    breedingPoolIds: breedingPoolIds.length >= 2 ? breedingPoolIds : [...record.parentIds],
    inheritanceModel: 'balanced-punnett-v2',
  };
}

function isTraitId(value: unknown): value is DragonTraitId {
  return typeof value === 'string' && DRAGON_TRAITS.some((trait) => trait.id === value);
}

function isSampleSize(value: unknown): value is number {
  return typeof value === 'number' && [4, 8, 12, 25, 50, 100].includes(value);
}

function normalizeParentIds(value: unknown): readonly [string | null, string | null] {
  if (!Array.isArray(value) || value.length !== 2) return [null, null];
  return [
    typeof value[0] === 'string' ? value[0] : null,
    typeof value[1] === 'string' ? value[1] : null,
  ];
}

function isStringPair(value: unknown): value is readonly [string, string] {
  return (
    Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'string')
  );
}

function normalizeStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string'))]
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
