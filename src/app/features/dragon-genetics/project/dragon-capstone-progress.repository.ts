import { EnvironmentInjector, inject, Service } from '@angular/core';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { runInFirebaseContext } from '../../../core/firebase/firebase-context';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase-firestore.provider';
import { SessionService } from '../../../core/firebase/session.service';
import { DragonAssignment } from '../adaptive/dragon-simulation.models';
import { DragonArenaMissionSnapshot } from '../capstones/arena/dragon-arena-mission.models';
import { CompanionShowSnapshot } from '../workstations/companion-show/companion-show.models';
import { IslandDiversityWorld } from '../workstations/island-diversity/island-diversity.models';
import { DragonCapstonePathId } from './dragon-capstone-paths';
import {
  DragonCapstoneProgressSummaryV1,
  summarizeDragonArena,
  summarizeIslandDiversity,
  summarizeMiniDragonShow,
} from './dragon-capstone-progress.models';

/** Publishes compact capstone outcomes without moving full workstation records off the device. */
@Service()
export class DragonCapstoneProgressRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly session = inject(SessionService);
  private readonly injector = inject(EnvironmentInjector);

  async saveSelection(
    studentId: string,
    assignment: DragonAssignment,
    selectedPathId: DragonCapstonePathId | null,
  ): Promise<void> {
    await this.merge(studentId, assignment, { selectedPathId });
  }

  async saveArena(
    snapshot: DragonArenaMissionSnapshot,
    assignment: DragonAssignment,
  ): Promise<void> {
    await this.merge(snapshot.studentId, assignment, { arena: summarizeDragonArena(snapshot) });
  }

  async saveMiniDragonShow(
    snapshot: CompanionShowSnapshot,
    assignment: DragonAssignment,
  ): Promise<void> {
    await this.merge(snapshot.studentId, assignment, {
      miniDragonShow: summarizeMiniDragonShow(snapshot),
    });
  }

  async saveIslandDiversity(
    studentId: string,
    world: IslandDiversityWorld,
    assignment: DragonAssignment,
  ): Promise<void> {
    await this.merge(studentId, assignment, {
      islandDiversity: summarizeIslandDiversity(world),
    });
  }

  private async merge(
    studentId: string,
    assignment: DragonAssignment,
    progress: Omit<Partial<DragonCapstoneProgressSummaryV1>, 'schemaVersion'>,
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
          capstoneProgress: { schemaVersion: 1, ...progress },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }
}
