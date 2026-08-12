import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { collection, collectionData, Firestore, query, where } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { runInFirebaseContext } from '../../core/firebase/firebase-context';
import { SessionService } from '../../core/firebase/session.service';
import { DragonAdaptiveStore } from './adaptive/dragon-adaptive.store';
import {
  DragonAssignment,
  DragonSimulationId,
  InstructionLevel,
  INSTRUCTION_LEVEL_LABELS,
  INSTRUCTION_LEVELS,
} from './adaptive/dragon-simulation.models';
import { DRAGON_SIMULATIONS } from './adaptive/dragon-simulation.registry';
import { ALLELE_VAULT_GENES } from './adaptive/allele-workbench/allele-vault.models';

interface ProgressDocument {
  id: string;
  studentId: string;
  completedSimulationIds?: DragonSimulationId[];
  simulationLevels?: Partial<Record<DragonSimulationId, InstructionLevel>>;
  simulationScores?: Partial<Record<DragonSimulationId, number>>;
}

@Component({
  selector: 'app-dragon-teacher-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './dragon-teacher.page.html',
  styleUrl: './dragon-teacher.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonTeacherPage {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  readonly session = inject(SessionService);
  readonly adaptiveStore = inject(DragonAdaptiveStore);
  readonly error = signal<string | null>(null);
  readonly assignmentMessage = signal<string | null>(null);
  readonly simulations = DRAGON_SIMULATIONS;
  readonly instructionLevels = INSTRUCTION_LEVELS;
  readonly instructionLevelLabels = INSTRUCTION_LEVEL_LABELS;
  readonly alleleGenes = ALLELE_VAULT_GENES;
  readonly progress$ = toObservable(this.session.user).pipe(
    switchMap((user) => {
      this.error.set(null);
      return runInFirebaseContext(this.injector, () => {
        const records = collection(this.firestore, 'dragonLabProgress');
        const source = query(records, where('teacherId', '==', user?.uid ?? '__none__'));
        return collectionData(source, { idField: 'id' }).pipe(
          map((documents) => (documents as ProgressDocument[]).sort((a, b) =>
            (b.completedSimulationIds?.length ?? 0) - (a.completedSimulationIds?.length ?? 0)
            || a.studentId.localeCompare(b.studentId))),
          catchError((error: unknown) => {
            console.error('Dragon Genetics teacher dashboard could not load.', error);
            this.error.set('Sign in with the assigned teacher account to view student records.');
            return of([] as ProgressDocument[]);
          }),
        );
      });
    }),
  );

  isLocalTeacher(): boolean {
    return this.session.isLocalTeacher();
  }

  async signInDemoTeacher(): Promise<void> {
    await this.session.signInAsLocalTeacher();
  }

  studentLabel(studentId: string): string {
    return `Student ${studentId.slice(0, 7)}`;
  }

  averageScore(students: ProgressDocument[]): number {
    const scores = students.flatMap((student) => Object.values(student.simulationScores ?? {}));
    return scores.length ? Math.round(scores.reduce((sum, score) => sum + (score ?? 0), 0) / scores.length) : 0;
  }

  completionCount(students: ProgressDocument[]): number {
    return students.reduce((sum, student) => sum + (student.completedSimulationIds?.length ?? 0), 0);
  }

  studentSimulationLevel(studentId: string, simulationId: DragonSimulationId): InstructionLevel {
    return this.adaptiveStore.assignment().studentOverrides[studentId]
      ?.simulationLevels?.[simulationId]
      ?? this.adaptiveStore.settingsFor(simulationId, studentId).level;
  }

  studentOverrideValue(studentId: string, simulationId: DragonSimulationId): InstructionLevel | 'inherit' {
    return this.adaptiveStore.assignment().studentOverrides[studentId]
      ?.simulationLevels?.[simulationId]
      ?? 'inherit';
  }

  async setDefaultLevel(event: Event): Promise<void> {
    const level = this.eventLevel(event);
    if (level) await this.changeAssignment((assignment) => ({ ...assignment, defaultLevel: level }));
  }

  async setSimulationLevel(simulationId: DragonSimulationId, event: Event): Promise<void> {
    const level = this.eventLevel(event);
    if (!level) return;
    await this.changeAssignment((assignment) => ({
      ...assignment,
      simulationSettings: {
        ...assignment.simulationSettings,
        [simulationId]: {
          ...assignment.simulationSettings[simulationId],
          enabled: assignment.simulationSettings[simulationId]?.enabled ?? true,
          level,
        },
      },
    }));
  }

  async setQuestionCount(simulationId: DragonSimulationId, event: Event): Promise<void> {
    const questionCount = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 6) return;
    await this.changeAssignment((assignment) => ({
      ...assignment,
      simulationSettings: {
        ...assignment.simulationSettings,
        [simulationId]: {
          ...assignment.simulationSettings[simulationId],
          enabled: assignment.simulationSettings[simulationId]?.enabled ?? true,
          questionCount,
        },
      },
    }));
  }

  async toggleSimulation(simulationId: DragonSimulationId): Promise<void> {
    await this.changeAssignment((assignment) => {
      const current = assignment.simulationSettings[simulationId];
      return {
        ...assignment,
        simulationSettings: {
          ...assignment.simulationSettings,
          [simulationId]: { ...current, enabled: !(current?.enabled ?? true) },
        },
      };
    });
  }

  alleleGeneReleased(geneId: string): boolean {
    return this.adaptiveStore.assignment().alleleCatalog.availableGeneIds.includes(geneId);
  }

  async toggleAlleleGene(geneId: string): Promise<void> {
    const current = this.adaptiveStore.assignment().alleleCatalog.availableGeneIds;
    if (current.includes(geneId) && current.length === 1) {
      this.assignmentMessage.set('At least one gene record must remain available.');
      return;
    }
    await this.changeAssignment((assignment) => ({
      ...assignment,
      alleleCatalog: {
        availableGeneIds: current.includes(geneId)
          ? current.filter((id) => id !== geneId)
          : [...current, geneId],
      },
    }));
  }

  async setStudentSimulationLevel(
    studentId: string,
    simulationId: DragonSimulationId,
    event: Event,
  ): Promise<void> {
    const raw = (event.target as HTMLSelectElement).value;
    await this.changeAssignment((assignment) => {
      const student = assignment.studentOverrides[studentId] ?? {};
      const simulationLevels = { ...(student.simulationLevels ?? {}) };
      if (raw === 'inherit') delete simulationLevels[simulationId];
      else if (INSTRUCTION_LEVELS.includes(raw as InstructionLevel)) {
        simulationLevels[simulationId] = raw as InstructionLevel;
      }
      return {
        ...assignment,
        studentOverrides: {
          ...assignment.studentOverrides,
          [studentId]: { ...student, simulationLevels },
        },
      };
    });
  }

  private eventLevel(event: Event): InstructionLevel | null {
    const value = (event.target as HTMLSelectElement).value;
    return INSTRUCTION_LEVELS.includes(value as InstructionLevel) ? value as InstructionLevel : null;
  }

  private async changeAssignment(
    change: (assignment: DragonAssignment) => DragonAssignment,
  ): Promise<void> {
    const assignment = this.adaptiveStore.assignment();
    const next = change({ ...assignment, assignmentVersion: assignment.assignmentVersion + 1 });
    this.assignmentMessage.set('Saving assignment…');
    try {
      await this.adaptiveStore.saveAssignment(next);
      this.assignmentMessage.set(`Assignment v${next.assignmentVersion} saved.`);
    } catch {
      this.assignmentMessage.set('Assignment could not be saved. Check teacher permissions.');
    }
  }
}
