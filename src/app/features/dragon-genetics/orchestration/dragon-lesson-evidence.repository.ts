import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../shared/assembly/persistence/json-local-storage';
import { DragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';
import {
  DragonLessonEvidenceDraft,
  DragonLessonEvidenceRecord,
  normalizeDragonLessonEvidence,
} from './dragon-lesson-evidence.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.lesson-evidence.v1';

@Service()
export class DragonLessonEvidenceRepository {
  load(
    studentId: string,
    pathId: DragonPathContextId,
    lessonId: string,
  ): readonly DragonLessonEvidenceRecord[] {
    return readStoredJson(storageKey(studentId, pathId, lessonId), [], normalizeEvidenceList);
  }

  capture(
    studentId: string,
    pathId: DragonPathContextId,
    lessonId: string,
    draft: DragonLessonEvidenceDraft,
  ): DragonLessonEvidenceRecord {
    const evidenceId = evidenceIdFor(draft);
    const record: DragonLessonEvidenceRecord = {
      ...draft,
      schemaVersion: 1,
      evidenceId,
      studentId,
      pathId,
      lessonId,
      source: 'student',
      capturedAtIso: new Date().toISOString(),
    };
    const existing = this.load(studentId, pathId, lessonId);
    const next = existing.some((candidate) => candidate.evidenceId === evidenceId)
      ? existing.map((candidate) => (candidate.evidenceId === evidenceId ? record : candidate))
      : [...existing, record];
    writeStoredJson(storageKey(studentId, pathId, lessonId), next);
    return record;
  }

  remove(
    studentId: string,
    pathId: DragonPathContextId,
    lessonId: string,
    evidenceId: string,
  ): readonly DragonLessonEvidenceRecord[] {
    const next = this.load(studentId, pathId, lessonId).filter(
      (candidate) => candidate.evidenceId !== evidenceId,
    );
    writeStoredJson(storageKey(studentId, pathId, lessonId), next);
    return next;
  }
}

function normalizeEvidenceList(value: unknown): DragonLessonEvidenceRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const normalized = normalizeDragonLessonEvidence(candidate);
    return normalized ? [normalized] : [];
  });
}

function evidenceIdFor(draft: DragonLessonEvidenceDraft): string {
  return draft.evidenceType === 'allele-expression'
    ? `allele-expression:${draft.geneId}:${[...draft.pairIds].sort().join('+')}`
    : `breeding-batch:${draft.batchId}`;
}

function storageKey(studentId: string, pathId: DragonPathContextId, lessonId: string): string {
  return `${STORAGE_KEY_PREFIX}.${encodeURIComponent(studentId)}.${pathId}.${encodeURIComponent(lessonId)}`;
}
