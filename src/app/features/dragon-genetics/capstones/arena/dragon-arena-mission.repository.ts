import { Injectable } from '@angular/core';
import {
  DragonArenaMissionSnapshot,
  DragonArenaScoreBreakdown,
  DragonArenaTraitEvidence,
  DragonArenaTrialRecord,
} from './dragon-arena-mission.models';
import { scoreDragonArenaTrial } from './dragon-arena-evidence';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.arena-mission.v1';

@Injectable({ providedIn: 'root' })
export class DragonArenaMissionRepository {
  load(studentId: string): DragonArenaMissionSnapshot {
    const normalizedStudentId = studentId.trim() || 'local-student';
    const empty = emptySnapshot(normalizedStudentId);
    if (typeof localStorage === 'undefined') return empty;
    try {
      const value = JSON.parse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`) ?? 'null',
      ) as unknown;
      return normalizeSnapshot(value, normalizedStudentId) ?? empty;
    } catch {
      return empty;
    }
  }

  save(snapshot: DragonArenaMissionSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}.${snapshot.studentId}`,
        JSON.stringify(snapshot),
      );
    } catch {
      // A finished arena trial remains visible even if device storage is unavailable or full.
    }
  }
}

function emptySnapshot(studentId: string): DragonArenaMissionSnapshot {
  return {
    schemaVersion: 2,
    studentId,
    selectedChampionId: null,
    trials: [],
  };
}

function normalizeSnapshot(
  value: unknown,
  studentId: string,
): DragonArenaMissionSnapshot | null {
  if (
    !isRecord(value) ||
    (value['schemaVersion'] !== 1 && value['schemaVersion'] !== 2) ||
    (value['selectedChampionId'] !== null && typeof value['selectedChampionId'] !== 'string') ||
    !Array.isArray(value['trials']) ||
    !value['trials'].every(isBaseTrial)
  ) {
    return null;
  }
  const trials = value['trials'].map(migrateTrial);
  return {
    schemaVersion: 2,
    studentId,
    selectedChampionId: value['selectedChampionId'],
    trials,
  };
}

function migrateTrial(
  trial: Omit<DragonArenaTrialRecord, 'score' | 'scoreBreakdown' | 'traitEvidence'> &
    Record<string, unknown>,
): DragonArenaTrialRecord {
  if (isTrial(trial)) return trial;
  const scoreBreakdown = scoreDragonArenaTrial(trial);
  return { ...trial, score: scoreBreakdown.total, scoreBreakdown, traitEvidence: [] };
}

function isTrial(value: unknown): value is DragonArenaTrialRecord {
  if (!isBaseTrial(value)) return false;
  return (
    typeof value['score'] === 'number' &&
    isScoreBreakdown(value['scoreBreakdown']) &&
    Array.isArray(value['traitEvidence']) &&
    value['traitEvidence'].every(isTraitEvidence)
  );
}

function isBaseTrial(value: unknown): value is Omit<
  DragonArenaTrialRecord,
  'score' | 'scoreBreakdown' | 'traitEvidence'
> &
  Record<string, unknown> {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['championId'] === 'string' &&
    typeof value['won'] === 'boolean' &&
    typeof value['winnerName'] === 'string' &&
    typeof value['elapsedSeconds'] === 'number' &&
    typeof value['remainingHealthPercent'] === 'number' &&
    typeof value['completedAtIso'] === 'string'
  );
}

function isScoreBreakdown(value: unknown): value is DragonArenaScoreBreakdown {
  return (
    isRecord(value) &&
    typeof value['outcomePoints'] === 'number' &&
    typeof value['conditionPoints'] === 'number' &&
    typeof value['pacePoints'] === 'number' &&
    typeof value['total'] === 'number'
  );
}

function isTraitEvidence(value: unknown): value is DragonArenaTraitEvidence {
  return (
    isRecord(value) &&
    ['wings', 'fire', 'scales', 'horns'].includes(String(value['traitId'])) &&
    typeof value['traitName'] === 'string' &&
    typeof value['genotype'] === 'string' &&
    typeof value['phenotype'] === 'string' &&
    typeof value['arenaEffect'] === 'string' &&
    ['ability', 'defense', 'appearance'].includes(String(value['kind']))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
