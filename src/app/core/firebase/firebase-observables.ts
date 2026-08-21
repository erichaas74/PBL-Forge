import { NgZone } from '@angular/core';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import {
  DocumentData,
  DocumentReference,
  onSnapshot,
  Query,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

export function observeAuthState(auth: Auth, zone: NgZone): Observable<User | null> {
  return new Observable((subscriber) =>
    onAuthStateChanged(
      auth,
      (user) => zone.run(() => subscriber.next(user)),
      (error) => zone.run(() => subscriber.error(error)),
      () => zone.run(() => subscriber.complete()),
    ),
  );
}

export function observeCollection<T extends DocumentData>(
  source: Query<DocumentData>,
  zone: NgZone,
  options: { idField?: string } = {},
): Observable<T[]> {
  return new Observable((subscriber) =>
    onSnapshot(
      source,
      (snapshot) => {
        const documents = snapshot.docs.map((document) => {
          const data = document.data();
          return (options.idField
            ? { ...data, [options.idField]: document.id }
            : data) as T;
        });
        zone.run(() => subscriber.next(documents));
      },
      (error) => zone.run(() => subscriber.error(error)),
      () => zone.run(() => subscriber.complete()),
    ),
  );
}

export function observeDocument<T extends DocumentData>(
  source: DocumentReference<DocumentData>,
  zone: NgZone,
  options: { idField?: string } = {},
): Observable<T | undefined> {
  return new Observable((subscriber) =>
    onSnapshot(
      source,
      (snapshot) => {
        const data = snapshot.data();
        const document = data
          ? ((options.idField ? { ...data, [options.idField]: snapshot.id } : data) as T)
          : undefined;
        zone.run(() => subscriber.next(document));
      },
      (error) => zone.run(() => subscriber.error(error)),
      () => zone.run(() => subscriber.complete()),
    ),
  );
}
