import { EnvironmentInjector, inject, Injectable, signal } from '@angular/core';
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
import { runInFirebaseContext } from './firebase-context';

const BUILT_IN_PROJECTS: readonly PblProject[] = [{
  id: 'dragon-genetics-lab',
  title: 'Dragon Genetics: Breed for the Arena',
  summary: 'Decode heredity, predict offspring, protect genetic diversity, and defend a team-bred dragon in a physics arena.',
  essentialQuestion: 'How are traits passed from parents to offspring, why do siblings vary, and how can evidence guide responsible breeding?',
  status: 'published',
  ownerId: 'pbl-forge',
  subject: ['Life Science', 'Genetics'],
  gradeBand: '7',
  durationMinutes: 900,
  durationLabel: '3 weeks',
  activityCount: 10,
  accent: 'gold',
  experienceType: 'dragon-genetics',
}];

@Injectable({ providedIn: 'root' })
export class ProjectRepository {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  readonly error = signal<string | null>(null);

  readonly publishedProjects$: Observable<PblProject[]> = collectionData(
    query(collection(this.firestore, 'projects'), where('status', '==', 'published')),
    { idField: 'id' }
  ).pipe(
    map((projects) => {
      const merged = new Map(BUILT_IN_PROJECTS.map(project => [project.id, project]));
      for (const project of projects as PblProject[]) merged.set(project.id, project);
      return [...merged.values()].sort((a, b) => a.title.localeCompare(b.title));
    }),
    catchError((error: unknown) => {
      console.error(error);
      this.error.set('Firestore could not be reached. Built-in learning experiences remain available.');
      return of([...BUILT_IN_PROJECTS]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  project$(projectId: string): Observable<PblProject | undefined> {
    return runInFirebaseContext(this.injector, () =>
      docData(doc(this.firestore, `projects/${projectId}`), { idField: 'id' }).pipe(
        map((project) => project as PblProject | undefined)
      ));
  }

  activities$(projectId: string): Observable<PblActivity[]> {
    return runInFirebaseContext(this.injector, () =>
      collectionData(collection(this.firestore, `projects/${projectId}/activities`), {
        idField: 'id'
      }).pipe(
        map((activities) =>
          (activities as PblActivity[]).sort((a, b) => a.order - b.order)
        )
      ));
  }

  activity$(projectId: string, activityId: string): Observable<PblActivity | undefined> {
    return runInFirebaseContext(this.injector, () =>
      docData(doc(this.firestore, `projects/${projectId}/activities/${activityId}`), {
        idField: 'id'
      }).pipe(map((activity) => activity as PblActivity | undefined)));
  }

  async saveResponse(
    studentId: string,
    projectId: string,
    activityId: string,
    response: ActivityResponse
  ): Promise<void> {
    const submissionId = `${studentId}_${projectId}_${activityId}`;
    await runInFirebaseContext(this.injector, () =>
      setDoc(
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
      ));
  }
}
