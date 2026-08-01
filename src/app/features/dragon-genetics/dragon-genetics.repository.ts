import { EnvironmentInjector, inject, Injectable } from '@angular/core';
import { doc, Firestore, getDoc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { runInFirebaseContext } from '../../core/firebase/firebase-context';
import { SessionService } from '../../core/firebase/session.service';
import { DragonGeneticsSnapshot } from './dragon-genetics.models';

@Injectable({ providedIn: 'root' })
export class DragonGeneticsRepository {
  private readonly firestore = inject(Firestore);
  private readonly session = inject(SessionService);
  private readonly injector = inject(EnvironmentInjector);

  async load(): Promise<DragonGeneticsSnapshot | null> {
    const user = await this.session.ensureUser();
    if (!user) return null;
    const snapshot = await runInFirebaseContext(this.injector, () =>
      getDoc(doc(this.firestore, `dragonLabProgress/${user.uid}`)));
    return snapshot.exists()
      ? snapshot.data()['snapshot'] as DragonGeneticsSnapshot
      : null;
  }

  async save(snapshot: DragonGeneticsSnapshot): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user) return;
    await runInFirebaseContext(this.injector, () =>
      setDoc(doc(this.firestore, `dragonLabProgress/${user.uid}`), {
        studentId: user.uid,
        projectId: 'dragon-genetics-lab',
        snapshot,
        activeModule: snapshot.activeModule,
        completedModules: snapshot.completedModules,
        mastery: snapshot.mastery,
        misconceptionFlags: Object.values(snapshot.mastery)
          .flatMap(record => record?.misconceptionFlags ?? []),
        teamRole: snapshot.teamRole,
        week1Score: snapshot.week1Score,
        week1Passed: snapshot.week1Passed,
        week2Score: snapshot.week2Score,
        week2Passed: snapshot.week2Passed,
        licensePassed: snapshot.licensePassed,
        officialAttemptsUsed: snapshot.officialAttempts.length,
        championId: snapshot.championId,
        battleResult: snapshot.battleResult,
        finalSubmitted: snapshot.finalSubmitted,
        updatedAt: serverTimestamp(),
      }, { merge: true }));
  }
}
