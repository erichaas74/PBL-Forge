import { EnvironmentInjector, inject, Injectable } from '@angular/core';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { runInFirebaseContext } from '../../../../core/firebase/firebase-context';
import { FIREBASE_FIRESTORE } from '../../../../core/firebase/firebase-firestore.provider';
import { SessionService } from '../../../../core/firebase/session.service';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { DragonAssignment } from '../../adaptive/dragon-simulation.models';
import { DragonJourneyProgressSnapshot, DragonLessonId } from '../domain/dragon-journey.models';
import { dragonJourneyLesson, dragonJourneyPath } from '../config/dragon-journey.registry';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.journey-progress.v1';

/** Keeps local resume state and publishes a compact teacher-readable journey summary. */
@Injectable({ providedIn: 'root' })
export class DragonJourneyProgressRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly session = inject(SessionService);
  private readonly injector = inject(EnvironmentInjector);

  load(studentId: string, assignmentId: string): DragonJourneyProgressSnapshot {
    const fallback = emptyProgress(studentId, assignmentId);
    return readStoredJson(
      storageKey(fallback.studentId, fallback.assignmentId),
      fallback,
      (value) => normalizeProgress(value, fallback),
    );
  }

  save(snapshot: DragonJourneyProgressSnapshot): void {
    writeStoredJson(storageKey(snapshot.studentId, snapshot.assignmentId), snapshot);
  }

  async publish(
    snapshot: DragonJourneyProgressSnapshot,
    assignment: DragonAssignment,
    completeLessonIds: readonly DragonLessonId[],
    capstoneReady: boolean,
    bredDragonCount: number,
  ): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user || user.uid !== snapshot.studentId || !assignment.ownerId) return;
    await runInFirebaseContext(this.injector, () =>
      setDoc(
        doc(this.firestore, `dragonLabProgress/${user.uid}`),
        {
          studentId: user.uid,
          projectId: 'dragon-genetics-lab',
          experienceSchemaVersion: 4,
          assignmentId: assignment.id,
          teacherId: assignment.ownerId,
          journeyProgress: {
            schemaVersion: 1,
            selectedPathId: snapshot.selectedPathId,
            lastLessonId: snapshot.lastLessonId,
            visitedLessonIds: snapshot.visitedLessonIds,
            completeLessonIds,
            capstoneReady,
            bredDragonCount,
            updatedAtIso: snapshot.updatedAtIso,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }
}

function emptyProgress(studentId: string, assignmentId: string): DragonJourneyProgressSnapshot {
  return {
    schemaVersion: 1,
    studentId: studentId.trim() || 'local-student',
    assignmentId: assignmentId.trim() || 'default',
    selectedPathId: null,
    lastLessonId: null,
    visitedLessonIds: [],
    updatedAtIso: new Date(0).toISOString(),
  };
}

function normalizeProgress(
  value: unknown,
  fallback: DragonJourneyProgressSnapshot,
): DragonJourneyProgressSnapshot {
  if (!isRecord(value) || value['schemaVersion'] !== 1) return fallback;
  const path = dragonJourneyPath(
    typeof value['selectedPathId'] === 'string' ? value['selectedPathId'] : null,
  );
  const lastLesson = dragonJourneyLesson(
    typeof value['lastLessonId'] === 'string' ? value['lastLessonId'] : null,
  );
  const visited = Array.isArray(value['visitedLessonIds'])
    ? value['visitedLessonIds']
        .filter((id): id is string => typeof id === 'string')
        .filter((id): id is DragonLessonId => Boolean(dragonJourneyLesson(id)))
    : [];
  return {
    ...fallback,
    selectedPathId: path?.id ?? null,
    lastLessonId: lastLesson?.id ?? null,
    visitedLessonIds: [...new Set(visited)],
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : fallback.updatedAtIso,
  };
}

function storageKey(studentId: string, assignmentId: string): string {
  return `${STORAGE_KEY_PREFIX}.${studentId}.${assignmentId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
