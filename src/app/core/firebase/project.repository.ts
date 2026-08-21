import { inject, Injectable, NgZone, signal } from '@angular/core';
import {
  collection,
  doc,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { ActivityResponse, PblActivity, PblProject } from '../models/pbl.models';
import { observeCollection, observeDocument } from './firebase-observables';
import { FIREBASE_FIRESTORE } from './firebase.providers';

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
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly zone = inject(NgZone);

  readonly error = signal<string | null>(null);

  readonly publishedProjects$: Observable<PblProject[]> = observeCollection<PblProject>(
    query(collection(this.firestore, 'projects'), where('status', '==', 'published')),
    this.zone,
    { idField: 'id' },
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
    return observeDocument<PblProject>(
      doc(this.firestore, `projects/${projectId}`),
      this.zone,
      { idField: 'id' },
    );
  }

  activities$(projectId: string): Observable<PblActivity[]> {
    return observeCollection<PblActivity>(
      collection(this.firestore, `projects/${projectId}/activities`),
      this.zone,
      { idField: 'id' },
    ).pipe(map((activities) => activities.sort((a, b) => a.order - b.order)));
  }

  activity$(projectId: string, activityId: string): Observable<PblActivity | undefined> {
    return observeDocument<PblActivity>(
      doc(this.firestore, `projects/${projectId}/activities/${activityId}`),
      this.zone,
      { idField: 'id' },
    );
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
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}
