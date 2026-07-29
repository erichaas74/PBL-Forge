import { inject, Injectable, signal } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  query,
  serverTimestamp,
  setDoc,
  where
} from '@angular/fire/firestore';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { ActivityResponse, PblActivity, PblProject } from '../models/pbl.models';

@Injectable({ providedIn: 'root' })
export class ProjectRepository {
  private readonly firestore = inject(Firestore);

  readonly error = signal<string | null>(null);

  readonly publishedProjects$: Observable<PblProject[]> = collectionData(
    query(collection(this.firestore, 'projects'), where('status', '==', 'published')),
    { idField: 'id' }
  ).pipe(
    map((projects) => (projects as PblProject[]).sort((a, b) => a.title.localeCompare(b.title))),
    catchError((error: unknown) => {
      console.error(error);
      this.error.set('The project catalog could not be loaded. Check that the Firebase emulators are running.');
      return of([]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  project$(projectId: string): Observable<PblProject | undefined> {
    return docData(doc(this.firestore, `projects/${projectId}`), { idField: 'id' }).pipe(
      map((project) => project as PblProject | undefined)
    );
  }

  activities$(projectId: string): Observable<PblActivity[]> {
    return collectionData(collection(this.firestore, `projects/${projectId}/activities`), {
      idField: 'id'
    }).pipe(
      map((activities) =>
        (activities as PblActivity[]).sort((a, b) => a.order - b.order)
      )
    );
  }

  activity$(projectId: string, activityId: string): Observable<PblActivity | undefined> {
    return docData(doc(this.firestore, `projects/${projectId}/activities/${activityId}`), {
      idField: 'id'
    }).pipe(map((activity) => activity as PblActivity | undefined));
  }

  async saveResponse(
    studentId: string,
    projectId: string,
    activityId: string,
    response: ActivityResponse
  ): Promise<void> {
    const submissionId = `${studentId}_${projectId}_${activityId}`;
    await setDoc(
      doc(this.firestore, `submissions/${submissionId}`),
      {
        studentId,
        projectId,
        activityId,
        response,
        status: 'in-progress',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }
}
