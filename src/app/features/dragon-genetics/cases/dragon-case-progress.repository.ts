/**
 * Runtime status: ACTIVE — persistence boundary for student case plans and outcomes.
 * Inputs/signals: case page saves path/lesson/case-scoped evidence selections and written claims.
 * Data access: student-keyed browser-local JSON records with normalization.
 * Connects to: DragonCasePage and case-specific outcome evaluators.
 */
import { Service } from '@angular/core';
import { readStoredJson, writeStoredJson } from '../../../shared/assembly/persistence/json-local-storage';
import { DragonPathContextId, isDragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';
import {
  DragonCaseId,
  DragonCaseOutcome,
  DragonCasePlan,
  DragonCaseProgress,
  DragonCaseRuntimeState,
} from './dragon-case.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.case-progress.v1';

@Service()
export class DragonCaseProgressRepository {
  load(studentId: string, pathId: DragonPathContextId, caseId: DragonCaseId): DragonCaseProgress {
    return readStoredJson(
      storageKey(studentId, pathId, caseId),
      emptyProgress(studentId, pathId, caseId),
      (value) => normalizeProgress(value, studentId, pathId, caseId),
    );
  }

  save(progress: DragonCaseProgress): DragonCaseProgress {
    const next = { ...progress, updatedAtIso: new Date().toISOString() };
    writeStoredJson(storageKey(next.studentId, next.pathId, next.caseId), next);
    return next;
  }
}

export function emptyProgress(
  studentId: string,
  pathId: DragonPathContextId,
  caseId: DragonCaseId,
): DragonCaseProgress {
  return {
    schemaVersion: 1,
    studentId,
    pathId,
    caseId,
    runtimeState: 'offered',
    acceptedAtIso: null,
    plans: [],
    latestOutcome: null,
    earnedRewardIds: [],
    updatedAtIso: new Date().toISOString(),
  };
}

function normalizeProgress(
  value: unknown,
  studentId: string,
  pathId: DragonPathContextId,
  caseId: DragonCaseId,
): DragonCaseProgress {
  if (!isRecord(value) || value['schemaVersion'] !== 1) {
    return emptyProgress(studentId, pathId, caseId);
  }
  return {
    schemaVersion: 1,
    studentId,
    pathId: isDragonPathContextId(String(value['pathId'])) ? String(value['pathId']) as DragonPathContextId : pathId,
    caseId,
    runtimeState: normalizeState(value['runtimeState']),
    acceptedAtIso: typeof value['acceptedAtIso'] === 'string' ? value['acceptedAtIso'] : null,
    plans: Array.isArray(value['plans']) ? value['plans'].flatMap(normalizePlan) : [],
    latestOutcome: normalizeOutcome(value['latestOutcome']),
    earnedRewardIds: Array.isArray(value['earnedRewardIds'])
      ? value['earnedRewardIds'].filter((candidate): candidate is string => typeof candidate === 'string')
      : [],
    updatedAtIso: typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : new Date().toISOString(),
  };
}

function normalizePlan(value: unknown): DragonCasePlan[] {
  if (!isRecord(value)) return [];
  const citedEvidenceIds = Array.isArray(value['citedEvidenceIds'])
    ? value['citedEvidenceIds'].filter((candidate): candidate is string => typeof candidate === 'string')
    : [];
  const caseId = normalizeCaseId(value['caseId']);
  if (
    typeof value['id'] !== 'string' ||
    !caseId ||
    !citedEvidenceIds.length ||
    typeof value['diagnosis'] !== 'string' ||
    typeof value['recommendation'] !== 'string' ||
    typeof value['lockedAtIso'] !== 'string'
  ) {
    return [];
  }
  if (
    caseId === 'dragon-in-the-ash' &&
    (typeof value['patientEvidenceId'] !== 'string' || typeof value['donorEvidenceId'] !== 'string')
  ) return [];
  if (
    caseId === 'food-that-steals-fire' &&
    (typeof value['rescueEvidenceId'] !== 'string' ||
      !['supported', 'contradicted', 'insufficient'].includes(String(value['claimReview'])))
  ) return [];
  return [{
    id: value['id'],
    caseId,
    ...(typeof value['patientEvidenceId'] === 'string'
      ? { patientEvidenceId: value['patientEvidenceId'] }
      : {}),
    ...(typeof value['donorEvidenceId'] === 'string'
      ? { donorEvidenceId: value['donorEvidenceId'] }
      : {}),
    ...(typeof value['rescueEvidenceId'] === 'string'
      ? { rescueEvidenceId: value['rescueEvidenceId'] }
      : {}),
    citedEvidenceIds,
    diagnosis: value['diagnosis'],
    recommendation: value['recommendation'],
    ...(['supported', 'contradicted', 'insufficient'].includes(String(value['claimReview']))
      ? { claimReview: value['claimReview'] as DragonCasePlan['claimReview'] }
      : {}),
    lockedAtIso: value['lockedAtIso'],
  }];
}

function normalizeOutcome(value: unknown): DragonCaseOutcome | null {
  if (!isRecord(value)) return null;
  if (
    typeof value['id'] !== 'string' ||
    !normalizeCaseId(value['caseId']) ||
    typeof value['planId'] !== 'string' ||
    (value['reasoning'] !== 'supported' && value['reasoning'] !== 'unsupported') ||
    !['stable', 'treatment-paused', 'recovering', 'diet-paused'].includes(String(value['patientOutcome'])) ||
    typeof value['compatible'] !== 'boolean' ||
    typeof value['explanation'] !== 'string' ||
    typeof value['resolvedAtIso'] !== 'string'
  ) return null;
  return value as unknown as DragonCaseOutcome;
}

function normalizeCaseId(value: unknown): DragonCaseId | null {
  return value === 'dragon-in-the-ash' || value === 'food-that-steals-fire' ? value : null;
}

function normalizeState(value: unknown): DragonCaseRuntimeState {
  return ['offered', 'investigating', 'revision-needed', 'resolved'].includes(String(value))
    ? value as DragonCaseRuntimeState
    : 'offered';
}

function storageKey(studentId: string, pathId: DragonPathContextId, caseId: DragonCaseId): string {
  return `${STORAGE_KEY_PREFIX}.${encodeURIComponent(studentId)}.${pathId}.${caseId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
