import { DocumentData, DocumentReference, onSnapshot, Query } from 'firebase/firestore';
import { Observable } from 'rxjs';

export function observeCollection<T extends DocumentData>(
  source: Query<DocumentData>,
  options: { idField?: string } = {},
): Observable<T[]> {
  return new Observable((subscriber) =>
    onSnapshot(
      source,
      (snapshot) => {
        const documents = snapshot.docs.map((document) => {
          const data = document.data();
          return (options.idField ? { ...data, [options.idField]: document.id } : data) as T;
        });
        subscriber.next(documents);
      },
      (error) => subscriber.error(error),
      () => subscriber.complete(),
    ),
  );
}

export function observeDocument<T extends DocumentData>(
  source: DocumentReference<DocumentData>,
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
        subscriber.next(document);
      },
      (error) => subscriber.error(error),
      () => subscriber.complete(),
    ),
  );
}
