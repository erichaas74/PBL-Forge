import { EnvironmentInjector, inject, Injectable } from '@angular/core';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { runInFirebaseContext } from '../../../core/firebase/firebase-context';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.providers';
import { SessionService } from '../../../core/firebase/session.service';
import { DragonAssignment } from '../adaptive/dragon-simulation.models';

export interface DragonActivityProgressSummary {
  status: 'not-started' | 'in-progress' | 'complete';
  evidenceCount: number;
  latestAtIso: string;
}

/** Publishes compact open-workstation progress without uploading the full student record. */
@Injectable({ providedIn: 'root' })
export class DragonActivityProgressRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly session = inject(SessionService);
  private readonly injector = inject(EnvironmentInjector);

  async save(
    studentId: string,
    assignment: DragonAssignment,
    activityId: string,
    progress: DragonActivityProgressSummary,
  ): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user || user.uid !== studentId || !assignment.ownerId) return;
    await runInFirebaseContext(this.injector, () =>
      setDoc(
        doc(this.firestore, `dragonLabProgress/${user.uid}`),
        {
          studentId: user.uid,
          projectId: 'dragon-genetics-lab',
          experienceSchemaVersion: 4,
          assignmentId: assignment.id,
          teacherId: assignment.ownerId,
          activityProgress: { [activityId]: progress },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }
}
