import { AsyncPipe } from '@angular/common';
import {
  Component,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { collection, query, where } from 'firebase/firestore';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';

import { observeCollection } from '../../core/firebase/firebase-observables';
import { FIREBASE_FIRESTORE } from '../../core/firebase/firebase.providers';
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
import {
  buildDragonTeacherOperations,
  DragonStudentProgressDocument,
} from './project/dragon-teacher-operations';
import { ALLELE_VAULT_GENES } from './workstations/allele-workbench/allele-vault.models';
import {
  DRAGON_JOURNEY_PATHS,
  DRAGON_LESSONS,
  DRAGON_STARTER_PAIR_PRESETS,
} from './journey/config/dragon-journey.registry';
import {
  DragonLearningPathId,
  DragonLessonDefinition,
  DragonLessonId,
} from './journey/domain/dragon-journey.models';

@Component({
  selector: 'app-dragon-teacher-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './dragon-teacher.page.html',
  styleUrl: './dragon-teacher.page.scss',
})
export class DragonTeacherPage {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  readonly session = inject(SessionService);
  readonly adaptiveStore = inject(DragonAdaptiveStore);
  readonly error = signal<string | null>(null);
  readonly assignmentMessage = signal<string | null>(null);
  readonly simulations = DRAGON_SIMULATIONS;
  readonly instructionLevels = INSTRUCTION_LEVELS;
  readonly instructionLevelLabels = INSTRUCTION_LEVEL_LABELS;
  readonly alleleGenes = ALLELE_VAULT_GENES;
  readonly journeyPaths = DRAGON_JOURNEY_PATHS;
  readonly starterPairPresets = DRAGON_STARTER_PAIR_PRESETS;
  readonly progress$ = toObservable(this.session.user).pipe(
    switchMap((user) => {
      this.error.set(null);
      const records = collection(this.firestore, 'dragonLabProgress');
      const source = query(records, where('teacherId', '==', user?.uid ?? '__none__'));
      return observeCollection<DragonStudentProgressDocument>(source, {
        idField: 'id',
      }).pipe(
        map((documents) =>
          documents.sort(
            (a, b) =>
              (b.completedSimulationIds?.length ?? 0) - (a.completedSimulationIds?.length ?? 0) ||
              a.studentId.localeCompare(b.studentId),
          ),
        ),
        catchError((error: unknown) => {
          console.error('Dragon Genetics teacher dashboard could not load.', error);
          this.error.set('Sign in with the assigned teacher account to view student records.');
          return of([] as DragonStudentProgressDocument[]);
        }),
      );
    }),
  );
  readonly dashboard$ = combineLatest([
    this.progress$,
    toObservable(this.adaptiveStore.assignment),
  ]).pipe(
    map(([students, assignment]) =>
      buildDragonTeacherOperations(students, assignment, this.simulations),
    ),
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

  usesGeneratedCheckpoints(simulationId: DragonSimulationId): boolean {
    return simulationId === 'genome-microscope';
  }

  usesEvidenceScore(simulationId: DragonSimulationId): boolean {
    return simulationId !== 'trait-evidence';
  }

  usesInstructionLevel(simulationId: DragonSimulationId): boolean {
    return simulationId !== 'trait-evidence';
  }

  studentSimulationLevel(studentId: string, simulationId: DragonSimulationId): InstructionLevel {
    return (
      this.adaptiveStore.assignment().studentOverrides[studentId]?.simulationLevels?.[
        simulationId
      ] ?? this.adaptiveStore.settingsFor(simulationId, studentId).level
    );
  }

  studentOverrideValue(
    studentId: string,
    simulationId: DragonSimulationId,
  ): InstructionLevel | 'inherit' {
    return (
      this.adaptiveStore.assignment().studentOverrides[studentId]?.simulationLevels?.[
        simulationId
      ] ?? 'inherit'
    );
  }

  async setDefaultLevel(event: Event): Promise<void> {
    const level = this.eventLevel(event);
    if (level)
      await this.changeAssignment((assignment) => ({ ...assignment, defaultLevel: level }));
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

  journeyLessons(pathId: DragonLearningPathId): readonly DragonLessonDefinition[] {
    const setting = this.adaptiveStore.assignment().journeyPlan.pathSettings[pathId];
    const order = new Map(setting.lessonIds.map((lessonId, index) => [lessonId, index]));
    return DRAGON_LESSONS.filter((lesson) => lesson.pathId === pathId).sort((first, second) => {
      const firstOrder = order.get(first.id);
      const secondOrder = order.get(second.id);
      if (firstOrder === undefined && secondOrder === undefined)
        return first.title.localeCompare(second.title);
      if (firstOrder === undefined) return 1;
      if (secondOrder === undefined) return -1;
      return firstOrder - secondOrder;
    });
  }

  journeyPathOffered(pathId: DragonLearningPathId): boolean {
    return this.adaptiveStore.assignment().journeyPlan.offeredPathIds.includes(pathId);
  }

  journeyLessonIncluded(pathId: DragonLearningPathId, lessonId: DragonLessonId): boolean {
    return this.adaptiveStore
      .assignment()
      .journeyPlan.pathSettings[pathId].lessonIds.includes(lessonId);
  }

  journeyLessonRequired(pathId: DragonLearningPathId, lessonId: DragonLessonId): boolean {
    return this.adaptiveStore
      .assignment()
      .journeyPlan.pathSettings[pathId].requiredLessonIds.includes(lessonId);
  }

  journeyRequirementMinimum(
    pathId: DragonLearningPathId,
    lesson: DragonLessonDefinition,
    requirementId: string,
  ): number {
    const requirement = lesson.requirements.find((candidate) => candidate.id === requirementId);
    if (!requirement || requirement.kind !== 'metric') return 1;
    return (
      this.adaptiveStore.assignment().journeyPlan.pathSettings[pathId].requirementOverrides[
        requirementId
      ]?.minimum ?? requirement.minimum
    );
  }

  starterPresetsFor(pathId: DragonLearningPathId) {
    return this.starterPairPresets.filter((preset) => preset.pathId === pathId);
  }

  async setJourneySelectionMode(event: Event): Promise<void> {
    const selectionMode =
      (event.target as HTMLSelectElement).value === 'teacher-assigned'
        ? ('teacher-assigned' as const)
        : ('student-choice' as const);
    await this.changeAssignment((assignment) => ({
      ...assignment,
      journeyPlan: { ...assignment.journeyPlan, selectionMode },
    }));
  }

  async setJourneyDefaultPath(event: Event): Promise<void> {
    const pathId = (event.target as HTMLSelectElement).value as DragonLearningPathId;
    if (!this.journeyPathOffered(pathId)) return;
    await this.changeAssignment((assignment) => ({
      ...assignment,
      journeyPlan: { ...assignment.journeyPlan, defaultPathId: pathId },
    }));
  }

  async toggleJourneyPath(pathId: DragonLearningPathId): Promise<void> {
    const plan = this.adaptiveStore.assignment().journeyPlan;
    const offered = plan.offeredPathIds.includes(pathId);
    if (offered && plan.offeredPathIds.length === 1) {
      this.assignmentMessage.set('At least one journey path must remain offered.');
      return;
    }
    await this.changeAssignment((assignment) => {
      const offeredPathIds = offered
        ? assignment.journeyPlan.offeredPathIds.filter((id) => id !== pathId)
        : [...assignment.journeyPlan.offeredPathIds, pathId];
      return {
        ...assignment,
        journeyPlan: {
          ...assignment.journeyPlan,
          offeredPathIds,
          defaultPathId: offeredPathIds.includes(assignment.journeyPlan.defaultPathId)
            ? assignment.journeyPlan.defaultPathId
            : offeredPathIds[0],
        },
      };
    });
  }

  async setJourneyStarterPair(pathId: DragonLearningPathId, event: Event): Promise<void> {
    const presetId = (event.target as HTMLSelectElement).value;
    if (!this.starterPresetsFor(pathId).some((preset) => preset.id === presetId)) return;
    await this.changePathSetting(pathId, (setting) => ({
      ...setting,
      starterPairPresetId: presetId,
    }));
  }

  async toggleJourneyLesson(pathId: DragonLearningPathId, lessonId: DragonLessonId): Promise<void> {
    const path = this.journeyPaths.find((candidate) => candidate.id === pathId);
    if (!path || lessonId === path.capstoneLessonId) return;
    await this.changePathSetting(pathId, (setting) => {
      const included = setting.lessonIds.includes(lessonId);
      const withoutCapstone = setting.lessonIds.filter((id) => id !== path.capstoneLessonId);
      return {
        ...setting,
        lessonIds: included
          ? setting.lessonIds.filter((id) => id !== lessonId)
          : [...withoutCapstone, lessonId, path.capstoneLessonId],
        requiredLessonIds: included
          ? setting.requiredLessonIds.filter((id) => id !== lessonId)
          : [...setting.requiredLessonIds, lessonId],
      };
    });
  }

  async toggleJourneyLessonRequired(
    pathId: DragonLearningPathId,
    lessonId: DragonLessonId,
  ): Promise<void> {
    if (!this.journeyLessonIncluded(pathId, lessonId)) return;
    await this.changePathSetting(pathId, (setting) => ({
      ...setting,
      requiredLessonIds: setting.requiredLessonIds.includes(lessonId)
        ? setting.requiredLessonIds.filter((id) => id !== lessonId)
        : [...setting.requiredLessonIds, lessonId],
    }));
  }

  async moveJourneyLesson(
    pathId: DragonLearningPathId,
    lessonId: DragonLessonId,
    direction: -1 | 1,
  ): Promise<void> {
    const path = this.journeyPaths.find((candidate) => candidate.id === pathId);
    if (!path || lessonId === path.capstoneLessonId) return;
    await this.changePathSetting(pathId, (setting) => {
      const lessons = [...setting.lessonIds];
      const current = lessons.indexOf(lessonId);
      const target = current + direction;
      const capstoneIndex = lessons.indexOf(path.capstoneLessonId);
      if (current < 0 || target < 0 || target >= capstoneIndex) return setting;
      [lessons[current], lessons[target]] = [lessons[target], lessons[current]];
      return { ...setting, lessonIds: lessons };
    });
  }

  async setJourneyRequirementMinimum(
    pathId: DragonLearningPathId,
    requirementId: string,
    event: Event,
  ): Promise<void> {
    const minimum = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(minimum) || minimum < 1 || minimum > 100) return;
    await this.changePathSetting(pathId, (setting) => ({
      ...setting,
      requirementOverrides: {
        ...setting.requirementOverrides,
        [requirementId]: { minimum },
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
    return INSTRUCTION_LEVELS.includes(value as InstructionLevel)
      ? (value as InstructionLevel)
      : null;
  }

  private async changePathSetting(
    pathId: DragonLearningPathId,
    change: (
      setting: DragonAssignment['journeyPlan']['pathSettings'][DragonLearningPathId],
    ) => DragonAssignment['journeyPlan']['pathSettings'][DragonLearningPathId],
  ): Promise<void> {
    await this.changeAssignment((assignment) => ({
      ...assignment,
      journeyPlan: {
        ...assignment.journeyPlan,
        pathSettings: {
          ...assignment.journeyPlan.pathSettings,
          [pathId]: change(assignment.journeyPlan.pathSettings[pathId]),
        },
      },
    }));
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
