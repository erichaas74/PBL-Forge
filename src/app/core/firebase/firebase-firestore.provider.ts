import { inject, InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';

import { environment } from '../../../environments/environment';
import { FIREBASE_APP } from './firebase.providers';

let firestoreEmulatorConnected = false;

export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FirebaseFirestore', {
  providedIn: 'root',
  factory: () => createFirestore(inject(FIREBASE_APP)),
});

function createFirestore(app: FirebaseApp): Firestore {
  const firestore = getFirestore(app);
  if (environment.useEmulators && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    firestoreEmulatorConnected = true;
  }
  return firestore;
}
