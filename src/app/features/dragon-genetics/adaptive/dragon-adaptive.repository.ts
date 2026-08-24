import { EnvironmentInjector, inject, Service } from '@angular/core';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { runInFirebaseContext } from '../../../core/firebase/firebase-context';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase-firestore.provider';
import { SessionService } from '../../../core/firebase/session.service';
import {
  DragonAssignment,
  INSTRUCTION_LEVELS,
  InstructionLevel,
  DragonStudentOverride,
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
import {
  normalizeInquirySettings,
  normalizeStudentInquiryOverride,
} from '../inquiry/inquiry-policy';

export const DEFAULT_DRAGON_ASSIGNMENT_ID = 'default';

@Service()
export class DragonAdaptiveRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly session = inject(SessionService);
  private readonly injector = inject(EnvironmentInjector);

  async loadAssignment(assignmentId = DEFAULT_DRAGON_ASSIGNMENT_ID): Promise<DragonAssignment> {
    const user = await this.session.ensureUser();
    if (!user) return { ...DEFAULT_DRAGON_ASSIGNMENT, id: assignmentId };
    const snapshot = await runInFirebaseContext(this.injector, () =>
      getDoc(doc(this.firestore, `dragonGeneticsAssignments/${assignmentId}`)),
    );
    if (!snapshot.exists()) return { ...DEFAULT_DRAGON_ASSIGNMENT, id: assignmentId };
    const assignment = normalizeAssignment(snapshot.id, snapshot.data());
    const studentOverrides = await this.loadStudentOverrides(assignmentId, user.uid);
    return { ...assignment, studentOverrides };
  }

  async saveAssignment(assignment: DragonAssignment): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user || !this.session.isTeacher()) {
      throw new Error('A teacher session is required to save an assignment.');
    }
    const { studentOverrides, ...assignmentConfig } = assignment;
    await runInFirebaseContext(this.injector, async () => {
      const overrideCollection = collection(
        this.firestore,
        `dragonGeneticsAssignments/${assignment.id}/studentOverrides`,
      );
      const existingOverrides = await getDocs(overrideCollection);
      const batch = writeBatch(this.firestore);
      batch.set(
        doc(this.firestore, `dragonGeneticsAssignments/${assignment.id}`),
        {
          ...assignmentConfig,
          ownerId: user.uid,
          studentOverrides: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      for (const [studentId, override] of Object.entries(studentOverrides)) {
        batch.set(
          doc(
            this.firestore,
            `dragonGeneticsAssignments/${assignment.id}/studentOverrides/${studentId}`,
          ),
          { studentId, ...override, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }
      for (const existing of existingOverrides.docs) {
        if (!(existing.id in studentOverrides)) batch.delete(existing.ref);
      }
      await batch.commit();
    });
  }

  private async loadStudentOverrides(
    assignmentId: string,
    userId: string,
  ): Promise<Record<string, DragonStudentOverride>> {
    if (this.session.isTeacher()) {
      const snapshots = await runInFirebaseContext(this.injector, () =>
        getDocs(
          collection(
            this.firestore,
            `dragonGeneticsAssignments/${assignmentId}/studentOverrides`,
          ),
        ),
      );
      return Object.fromEntries(
        snapshots.docs.map((snapshot) => [snapshot.id, normalizeStudentOverride(snapshot.data())]),
      );
    }
    const snapshot = await runInFirebaseContext(this.injector, () =>
      getDoc(
        doc(
          this.firestore,
          `dragonGeneticsAssignments/${assignmentId}/studentOverrides/${userId}`,
        ),
      ),
    );
    return snapshot.exists() ? { [userId]: normalizeStudentOverride(snapshot.data()) } : {};
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
    inquirySettings: normalizeInquirySettings(value['inquirySettings']),
    studentOverrides: {},
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : new Date(0).toISOString(),
  } as DragonAssignment;
}

function normalizeStudentOverride(value: unknown): DragonStudentOverride {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const defaultLevel = INSTRUCTION_LEVELS.includes(raw['defaultLevel'] as InstructionLevel)
    ? (raw['defaultLevel'] as InstructionLevel)
    : undefined;
  const simulationLevels = normalizeSimulationLevels(raw['simulationLevels']);
  return {
    ...(defaultLevel ? { defaultLevel } : {}),
    ...(Object.keys(simulationLevels).length ? { simulationLevels } : {}),
    ...(raw['inquiry'] ? { inquiry: normalizeStudentInquiryOverride(raw['inquiry']) } : {}),
  };
}

function normalizeSimulationLevels(
  value: unknown,
): NonNullable<DragonStudentOverride['simulationLevels']> {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([simulationId, level]) =>
        isDragonSimulationId(simulationId) &&
        INSTRUCTION_LEVELS.includes(level as InstructionLevel),
    ),
  );
}

function normalizeRun(value: Record<string, unknown>): DragonSimulationRun | null {
  if (value['schemaVersion'] !== 1 || !isDragonSimulationId(String(value['simulationId'] ?? ''))) {
    return null;
  }
  return value as unknown as DragonSimulationRun;
}
