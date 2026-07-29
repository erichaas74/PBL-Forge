import { computed, inject, Injectable } from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User
} from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(Auth);
  private readonly initialization = this.initializeSession().catch((error: unknown) => {
    console.error('Firebase session initialization failed.', error);
  });

  readonly user = toSignal(authState(this.auth), { initialValue: null });
  readonly isLocal = environment.useEmulators;
  readonly isLocalTeacher = computed(() =>
    this.isLocal && this.user()?.email === 'teacher@pblforge.local');
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
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    if (this.isLocal) {
      await signInAnonymously(this.auth);
    }
  }

  async signInAsLocalTeacher(): Promise<void> {
    if (!this.isLocal) return;
    await signInWithEmailAndPassword(
      this.auth,
      'teacher@pblforge.local',
      'dragon-demo-teacher'
    );
  }

  private async initializeSession(): Promise<void> {
    await this.auth.authStateReady();
    if (this.isLocal && !this.auth.currentUser) {
      await signInAnonymously(this.auth);
    }
  }
}
