import { inject, Injectable } from '@angular/core';
import { doc, Firestore, getDoc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { SessionService } from '../../core/firebase/session.service';
import { DragonGeneticsSnapshot } from './dragon-genetics.models';

@Injectable({ providedIn: 'root' })
export class DragonGeneticsRepository {
  private readonly firestore = inject(Firestore);
  private readonly session = inject(SessionService);

  async load(): Promise<DragonGeneticsSnapshot | null> {
    const user = await this.session.ensureUser();
    if (!user) return null;
    const snapshot = await getDoc(doc(this.firestore, `dragonLabProgress/${user.uid}`));
    return snapshot.exists()
      ? snapshot.data()['snapshot'] as DragonGeneticsSnapshot
      : null;
  }

  async save(snapshot: DragonGeneticsSnapshot): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user) return;
    await setDoc(doc(this.firestore, `dragonLabProgress/${user.uid}`), {
      studentId: user.uid,
      projectId: 'dragon-genetics-lab',
      snapshot,
      activeModule: snapshot.activeModule,
      completedModules: snapshot.completedModules,
      mastery: snapshot.mastery,
      misconceptionFlags: Object.values(snapshot.mastery)
        .flatMap(record => record?.misconceptionFlags ?? []),
      licensePassed: snapshot.licensePassed,
      officialAttemptsUsed: snapshot.officialAttempts.length,
      championId: snapshot.championId,
      battleResult: snapshot.battleResult,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}
