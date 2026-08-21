import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { environment } from '../../../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FirebaseAuth');
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FirebaseFirestore');

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_APP,
      useFactory: createFirebaseApp,
    },
    {
      provide: FIREBASE_AUTH,
      deps: [FIREBASE_APP],
      useFactory: createAuth,
    },
    {
      provide: FIREBASE_FIRESTORE,
      deps: [FIREBASE_APP],
      useFactory: createFirestore,
    },
  ]);
}

function createFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
}

function createAuth(app: FirebaseApp): Auth {
  const auth = getAuth(app);
  if (environment.useEmulators && !authEmulatorConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    authEmulatorConnected = true;
  }
  return auth;
}

function createFirestore(app: FirebaseApp): Firestore {
  const firestore = getFirestore(app);
  if (environment.useEmulators && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    firestoreEmulatorConnected = true;
  }
  return firestore;
}
