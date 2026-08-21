import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';

import { environment } from '../../../environments/environment';
import { observeAuthState } from './firebase-auth-observable';
import { FIREBASE_APP, FIREBASE_AUTH } from './firebase.providers';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly app = inject(FIREBASE_APP);
  private readonly initialization = this.initializeSession().catch((error: unknown) => {
    console.error('Firebase session initialization failed.', error);
  });

  readonly user = toSignal(observeAuthState(this.auth), { initialValue: null });
  readonly isLocal = environment.useEmulators;
  readonly isLocalTeacher = computed(
    () => this.isLocal && this.user()?.email === 'teacher@pblforge.local',
  );
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (this.isLocal) {
      return this.isLocalTeacher() ? 'Demo teacher' : 'Local student';
    }
    return currentUser?.displayName ?? currentUser?.email ?? 'Guest';
  });

  async ensureUser(): Promise<User | null> {
    await this.initialization;
    return this.auth.currentUser;
  }

  async signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.ensureUserProfile(credential.user);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    if (this.isLocal) {
      await signInAnonymously(this.auth);
    }
  }

  async signInAsLocalTeacher(): Promise<void> {
    if (!this.isLocal) return;
    await signInWithEmailAndPassword(this.auth, 'teacher@pblforge.local', 'dragon-demo-teacher');
  }

  private async initializeSession(): Promise<void> {
    await this.auth.authStateReady();
    if (this.isLocal && !this.auth.currentUser) {
      await signInAnonymously(this.auth);
    } else if (!this.isLocal && this.auth.currentUser) {
      await this.ensureUserProfile(this.auth.currentUser);
    }
  }

  private async ensureUserProfile(user: User): Promise<void> {
    const { doc, getDoc, getFirestore, serverTimestamp, setDoc } =
      await import('firebase/firestore');
    const reference = doc(getFirestore(this.app), `users/${user.uid}`);
    const profile = await getDoc(reference);
    const publicProfile = {
      displayName: user.displayName ?? user.email ?? 'Student',
      photoURL: user.photoURL ?? null,
      lastSeenAt: serverTimestamp(),
    };
    await setDoc(
      reference,
      profile.exists() ? publicProfile : { ...publicProfile, role: 'student' },
      { merge: true },
    );
  }
}
