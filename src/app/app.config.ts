import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { Auth, connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  provideFirestore
} from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function createAuth(): Auth {
  const auth = getAuth();
  if (environment.useEmulators && !authEmulatorConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    authEmulatorConnected = true;
  }
  return auth;
}

function createFirestore(): Firestore {
  const firestore = getFirestore();
  if (environment.useEmulators && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    firestoreEmulatorConnected = true;
  }
  return firestore;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(createAuth),
    provideFirestore(createFirestore)
  ]
};
