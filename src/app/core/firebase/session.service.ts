import { computed, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';

import { environment } from '../../../environments/environment';
import { observeAuthState } from './firebase-auth-observable';
import { FIREBASE_APP, FIREBASE_AUTH } from './firebase.providers';

export type UserRole = 'student' | 'teacher' | 'admin';

@Service()
export class SessionService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly app = inject(FIREBASE_APP);
  private readonly roleSignal = signal<UserRole | null>(null);
  private readonly readySignal = signal(false);
  private roleUserId: string | null = null;
  private readonly initialization = this.initializeSession().catch((error: unknown) => {
    console.error('Firebase session initialization failed.', error);
  }).finally(() => this.readySignal.set(true));

  readonly user = toSignal(observeAuthState(this.auth), { initialValue: null });
  readonly role = this.roleSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();
  readonly isLocal = environment.useEmulators;
  readonly isLocalTeacher = computed(
    () => this.isLocal && this.user()?.email === 'teacher@pblforge.local',
  );
  readonly isLocalStudent = computed(
    () => this.isLocal && this.user()?.email === 'student@pblforge.local',
  );
  readonly isTeacher = computed(
    () => this.isLocalTeacher() || this.role() === 'teacher' || this.role() === 'admin',
  );
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (this.isLocal) {
      if (!currentUser) return 'Local guest';
      return this.isLocalTeacher()
        ? 'Demo teacher'
        : this.isLocalStudent()
          ? 'Demo student'
          : (currentUser.displayName ?? currentUser.email ?? 'Local user');
    }
    return currentUser?.displayName ?? currentUser?.email ?? 'Guest';
  });

  async ensureUser(): Promise<User | null> {
    await this.initialization;
    const user = this.auth.currentUser;
    if (user && this.roleUserId !== user.uid) await this.ensureUserProfile(user);
    return user;
  }

  async signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.ensureUserProfile(credential.user);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.roleUserId = null;
    this.roleSignal.set(null);
  }

  async signInAsLocalTeacher(): Promise<void> {
    if (!this.isLocal) return;
    const credential = await signInWithEmailAndPassword(
      this.auth,
      'teacher@pblforge.local',
      'dragon-demo-teacher',
    );
    await this.ensureUserProfile(credential.user);
  }

  async signInAsLocalStudent(): Promise<void> {
    if (!this.isLocal) return;
    const email = 'student@pblforge.local';
    const password = 'dragon-demo-student';
    const credential = await signInWithEmailAndPassword(this.auth, email, password).catch(() =>
      createUserWithEmailAndPassword(this.auth, email, password),
    );
    await this.ensureUserProfile(credential.user);
  }

  private async initializeSession(): Promise<void> {
    await this.auth.authStateReady();
    if (this.auth.currentUser) {
      await this.ensureUserProfile(this.auth.currentUser);
    }
  }

  private async ensureUserProfile(user: User): Promise<void> {
    const { doc, getDoc, getFirestore, serverTimestamp, setDoc } =
      await import('firebase/firestore');
    const reference = doc(getFirestore(this.app), `users/${user.uid}`);
    const profile = await getDoc(reference);
    const storedRole = profile.data()?.['role'];
    const role: UserRole =
      storedRole === 'teacher' || storedRole === 'admin' ? storedRole : 'student';
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
    this.roleUserId = user.uid;
    this.roleSignal.set(role);
  }
}
