import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { environment } from '../environments/environment';

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let storageEmulatorConnected = false;

/** Lazy Firebase connection shared by the private Designer tools. */
export async function connectDesignerFirebase(): Promise<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  authApi: typeof import('firebase/auth');
  firestoreApi: typeof import('firebase/firestore');
  storageApi: typeof import('firebase/storage');
}> {
  const [appApi, authApi, firestoreApi, storageApi] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/storage'),
  ]);
  const app = appApi.getApps().some(candidate => candidate.name === 'dragon-designer')
    ? appApi.getApp('dragon-designer')
    : appApi.initializeApp(environment.firebase, 'dragon-designer');
  const auth = authApi.getAuth(app);
  const firestore = firestoreApi.getFirestore(app);
  const storage = storageApi.getStorage(app);

  if (environment.useEmulators) {
    if (!authEmulatorConnected) {
      authApi.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      authEmulatorConnected = true;
    }
    if (!firestoreEmulatorConnected) {
      firestoreApi.connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      firestoreEmulatorConnected = true;
    }
    if (!storageEmulatorConnected) {
      storageApi.connectStorageEmulator(storage, '127.0.0.1', 9199);
      storageEmulatorConnected = true;
    }
  }

  return { app, auth, firestore, storage, authApi, firestoreApi, storageApi };
}
