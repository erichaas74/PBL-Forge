import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  EXPEDITION_ISLAND_IDS,
  ExpeditionAttempt,
  ExpeditionIslandId,
  StoredExpeditionAttempts,
} from './island-expedition.models';
import { EXPEDITION_QUEST_BY_ID } from './island-expedition.quests';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.island-expedition.v1';

/**
 * Device persistence for expedition attempts.
 *
 * Surveys hold the dragons that were drawn rather than a seed alone, so a completed field record
 * reads back exactly as the student saw it even if the selection model is later retuned.
 */
@Service()
export class IslandExpeditionRepository {
  load(studentId: string): StoredExpeditionAttempts {
    const normalized = normalizeWorkstationStudentId(studentId);
    const fallback = emptyExpeditionAttempts(normalized);
    return readStoredJson(`${STORAGE_KEY_PREFIX}.${normalized}`, fallback, (value) =>
      normalizeStored(value, fallback),
    );
  }

  save(stored: StoredExpeditionAttempts): void {
    const studentId = normalizeWorkstationStudentId(stored.studentId);
    writeStoredJson(`${STORAGE_KEY_PREFIX}.${studentId}`, { ...stored, studentId });
  }
}

export function emptyExpeditionAttempts(studentId: string): StoredExpeditionAttempts {
  return {
    schemaVersion: 1,
    studentId: normalizeWorkstationStudentId(studentId),
    attempts: {},
  };
}

export function createAttempt(questId: string, studentId: string): ExpeditionAttempt {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    questId,
    studentId: normalizeWorkstationStudentId(studentId),
    predictedIslandId: null,
    prediction: '',
    surveys: [],
    sequencedDragonLoci: [],
    capturedDragonId: null,
    complete: false,
    startedAtIso: now,
    updatedAtIso: now,
  };
}

function normalizeStored(
  value: unknown,
  fallback: StoredExpeditionAttempts,
): StoredExpeditionAttempts {
  if (!isRecord(value) || value['schemaVersion'] !== 1) return fallback;
  const rawAttempts = isRecord(value['attempts']) ? value['attempts'] : {};
  const attempts = Object.fromEntries(
    Object.entries(rawAttempts).flatMap(([questId, attempt]) => {
      if (!EXPEDITION_QUEST_BY_ID[questId] || !isRecord(attempt)) return [];
      return [[questId, normalizeAttempt(questId, attempt, fallback.studentId)]];
    }),
  );
  return { schemaVersion: 1, studentId: fallback.studentId, attempts };
}

function normalizeAttempt(
  questId: string,
  value: Record<string, unknown>,
  studentId: string,
): ExpeditionAttempt {
  const base = createAttempt(questId, studentId);
  const predicted = String(value['predictedIslandId'] ?? '');
  return {
    ...base,
    predictedIslandId: isIslandId(predicted) ? predicted : null,
    prediction: typeof value['prediction'] === 'string' ? value['prediction'] : '',
    surveys: Array.isArray(value['surveys'])
      ? (value['surveys'].filter(isRecord) as unknown as ExpeditionAttempt['surveys'])
      : [],
    sequencedDragonLoci: Array.isArray(value['sequencedDragonLoci'])
      ? (value['sequencedDragonLoci'].filter(
          isRecord,
        ) as unknown as ExpeditionAttempt['sequencedDragonLoci'])
      : [],
    capturedDragonId:
      typeof value['capturedDragonId'] === 'string' ? value['capturedDragonId'] : null,
    complete: value['complete'] === true,
    startedAtIso:
      typeof value['startedAtIso'] === 'string' ? value['startedAtIso'] : base.startedAtIso,
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : base.updatedAtIso,
  };
}

function isIslandId(value: string): value is ExpeditionIslandId {
  return (EXPEDITION_ISLAND_IDS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
