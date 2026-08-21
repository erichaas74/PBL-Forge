import { EnvironmentInjector, inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { runInFirebaseContext } from '../../../core/firebase/firebase-context';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.providers';
import { SessionService } from '../../../core/firebase/session.service';
import {
  DragonAssignment,
  DragonSimulationId,
  DragonSimulationRun,
} from './dragon-simulation.models';
import { DEFAULT_DRAGON_ASSIGNMENT, isDragonSimulationId } from './dragon-simulation.registry';
import {
  GeneticsNotebookSnapshot,
  normalizeGeneticsNotebook,
} from '../workstations/shared/genetics-notebook.models';
import { normalizeAlleleVaultGeneIds } from '../workstations/allele-workbench/allele-vault.models';
import { normalizeDragonClassJourneyPlan } from '../journey/config/dragon-journey.registry';

export const DEFAULT_DRAGON_ASSIGNMENT_ID = 'default';

@Injectable({ providedIn: 'root' })
export class DragonAdaptiveRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly session = inject(SessionService);
  private readonly injector = inject(EnvironmentInjector);

  async loadAssignment(assignmentId = DEFAULT_DRAGON_ASSIGNMENT_ID): Promise<DragonAssignment> {
    await this.session.ensureUser();
    const snapshot = await runInFirebaseContext(this.injector, () =>
      getDoc(doc(this.firestore, `dragonGeneticsAssignments/${assignmentId}`)),
    );
    if (!snapshot.exists()) return { ...DEFAULT_DRAGON_ASSIGNMENT, id: assignmentId };
    return normalizeAssignment(snapshot.id, snapshot.data());
  }

  async saveAssignment(assignment: DragonAssignment): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user) throw new Error('A teacher session is required to save an assignment.');
    await runInFirebaseContext(this.injector, () =>
      setDoc(
        doc(this.firestore, `dragonGeneticsAssignments/${assignment.id}`),
        {
          ...assignment,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  async loadGeneticsNotebook(): Promise<GeneticsNotebookSnapshot | null> {
    const user = await this.session.ensureUser();
    if (!user) return null;
    const snapshot = await runInFirebaseContext(this.injector, () =>
      getDoc(doc(this.firestore, `dragonLabProgress/${user.uid}`)),
    );
    return normalizeGeneticsNotebook(snapshot.data()?.['geneticsNotebook'], user.uid);
  }

  async saveGeneticsNotebook(notebook: GeneticsNotebookSnapshot, teacherId: string): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user) return;
    await runInFirebaseContext(this.injector, () =>
      setDoc(
        doc(this.firestore, `dragonLabProgress/${user.uid}`),
        {
          studentId: user.uid,
          projectId: 'dragon-genetics-lab',
          assignmentId: notebook.assignmentId,
          teacherId,
          geneticsNotebook: notebook,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  async loadRuns(): Promise<DragonSimulationRun[]> {
    const user = await this.session.ensureUser();
    if (!user) return [];
    const snapshots = await runInFirebaseContext(this.injector, () =>
      getDocs(collection(this.firestore, `dragonLabProgress/${user.uid}/simulationRuns`)),
    );
    return snapshots.docs
      .map((snapshot) => normalizeRun(snapshot.data()))
      .filter((run): run is DragonSimulationRun => !!run);
  }

  async loadRun(simulationId: DragonSimulationId): Promise<DragonSimulationRun | null> {
    const user = await this.session.ensureUser();
    if (!user) return null;
    const snapshot = await runInFirebaseContext(this.injector, () =>
      getDoc(doc(this.firestore, `dragonLabProgress/${user.uid}/simulationRuns/${simulationId}`)),
    );
    return snapshot.exists() ? normalizeRun(snapshot.data()) : null;
  }

  async saveRun(run: DragonSimulationRun, teacherId: string): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user) return;
    await runInFirebaseContext(this.injector, () =>
      setDoc(
        doc(this.firestore, `dragonLabProgress/${user.uid}/simulationRuns/${run.simulationId}`),
        {
          ...run,
          studentId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );

    const runs = await this.loadRuns();
    const completedSimulationIds = runs
      .filter((candidate) => candidate.complete)
      .map((candidate) => candidate.simulationId);
    const simulationLevels = Object.fromEntries(
      runs.map((candidate) => [candidate.simulationId, candidate.level]),
    );
    const simulationScores = Object.fromEntries(
      runs.map((candidate) => [candidate.simulationId, candidate.score]),
    );
    await runInFirebaseContext(this.injector, () =>
      setDoc(
        doc(this.firestore, `dragonLabProgress/${user.uid}`),
        {
          studentId: user.uid,
          projectId: 'dragon-genetics-lab',
          experienceSchemaVersion: 4,
          assignmentId: run.assignmentId,
          teacherId,
          activeSimulationId: run.complete ? null : run.simulationId,
          completedSimulationIds,
          simulationLevels,
          simulationScores,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }
}

function normalizeAssignment(id: string, value: Record<string, unknown>): DragonAssignment {
  const alleleCatalog = value['alleleCatalog'] as
    Partial<DragonAssignment['alleleCatalog']> | undefined;
  const storedGeneIds = Array.isArray(alleleCatalog?.availableGeneIds)
    ? alleleCatalog.availableGeneIds.filter(
        (geneId): geneId is string => typeof geneId === 'string',
      )
    : null;
  const isLegacyMockCatalog =
    value['assignmentVersion'] === 1 &&
    storedGeneIds?.length === 4 &&
    ['wings', 'fire', 'horns', 'scales'].every((geneId) => storedGeneIds.includes(geneId));
  const storedVersion =
    typeof value['assignmentVersion'] === 'number' ? value['assignmentVersion'] : 0;
  const availableGeneIds =
    storedGeneIds && !isLegacyMockCatalog
      ? normalizeAlleleVaultGeneIds(storedGeneIds)
      : [...DEFAULT_DRAGON_ASSIGNMENT.alleleCatalog.availableGeneIds];
  return {
    ...DEFAULT_DRAGON_ASSIGNMENT,
    ...value,
    id,
    assignmentVersion:
      isLegacyMockCatalog || storedVersion < DEFAULT_DRAGON_ASSIGNMENT.assignmentVersion
        ? DEFAULT_DRAGON_ASSIGNMENT.assignmentVersion
        : storedVersion,
    alleleCatalog: {
      availableGeneIds,
    },
    simulationSettings: (value['simulationSettings'] ??
      {}) as DragonAssignment['simulationSettings'],
    journeyPlan: normalizeDragonClassJourneyPlan(value['journeyPlan']),
    studentOverrides: (value['studentOverrides'] ?? {}) as DragonAssignment['studentOverrides'],
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : new Date(0).toISOString(),
  } as DragonAssignment;
}

function normalizeRun(value: Record<string, unknown>): DragonSimulationRun | null {
  if (value['schemaVersion'] !== 1 || !isDragonSimulationId(String(value['simulationId'] ?? ''))) {
    return null;
  }
  return value as unknown as DragonSimulationRun;
}
