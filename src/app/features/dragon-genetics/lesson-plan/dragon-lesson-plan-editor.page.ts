/**
 * Runtime status: ACTIVE — guarded teacher editor for the current shared lesson plan.
 * Inputs/signals: lesson-plan document changes and case enablement toggles from teacher controls.
 * Data access: DragonLessonPlanRepository and DragonCaseSettingsRepository use browser storage.
 * Connects to: public path/lesson pages, case branches, and attachable microscope workstations.
 */
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonLessonPlanRepository } from './dragon-lesson-plan.repository';
import { DragonPathContextId, DragonSharedLesson } from './dragon-lesson-plan.models';
import {
  MICROSCOPE_LEVEL_WORKSTATIONS,
  MicroscopeLevelWorkstationDefinition,
} from '../workstations/genome-microscope/microscope-level-workstations';
import { DRAGON_CASES } from '../cases/dragon-case.registry';
import { DragonCaseDefinition } from '../cases/dragon-case.models';
import { DragonCaseSettingsRepository } from '../cases/dragon-case-settings.repository';

@Component({
  selector: 'app-dragon-lesson-plan-editor-page',
  imports: [RouterLink],
  templateUrl: './dragon-lesson-plan-editor.page.html',
  styleUrl: './dragon-lesson-plan-editor.page.scss',
})
export class DragonLessonPlanEditorPage {
  readonly pathIds: readonly DragonPathContextId[] = ['arena', 'mini-show'];
  readonly microscopeWorkstations = MICROSCOPE_LEVEL_WORKSTATIONS;
  readonly lessonPlan = inject(DragonLessonPlanRepository);
  readonly caseSettings = inject(DragonCaseSettingsRepository);

  addLesson(): void { this.lessonPlan.addLesson(); }
  moveLesson(id: string, direction: -1 | 1): void { this.lessonPlan.moveLesson(id, direction); }
  updateText(lesson: DragonSharedLesson, field: 'title' | 'learningGoal' | 'guide', event: Event): void {
    this.lessonPlan.updateLesson(lesson.id, { [field]: (event.target as HTMLInputElement).value });
  }
  togglePublished(lesson: DragonSharedLesson): void {
    this.lessonPlan.updateLesson(lesson.id, { published: !lesson.published });
  }

  /** Sequence number in the numbered path. Extra lessons never take one. */
  coreLessonNumber(lesson: DragonSharedLesson): number {
    return (
      this.lessonPlan
        .document()
        .lessons.filter((candidate) => !candidate.optional)
        .findIndex((candidate) => candidate.id === lesson.id) + 1
    );
  }

  anchorLessonTitle(lesson: DragonSharedLesson): string {
    const anchor = this.lessonPlan
      .document()
      .lessons.find((candidate) => candidate.id === lesson.anchorLessonId);
    return anchor?.title ?? 'the learning path';
  }

  casesForLesson(lesson: DragonSharedLesson): readonly DragonCaseDefinition[] {
    return DRAGON_CASES.filter((definition) => definition.anchorLessonId === lesson.id);
  }

  toggleCase(definition: DragonCaseDefinition): void {
    this.caseSettings.setEnabled(definition.id, !this.caseSettings.isEnabled(definition.id));
  }

  microscopeAttached(
    lesson: DragonSharedLesson,
    workstation: MicroscopeLevelWorkstationDefinition,
  ): boolean {
    return lesson.workstations.some((candidate) => candidate.id === workstation.id);
  }

  toggleMicroscope(
    lesson: DragonSharedLesson,
    workstation: MicroscopeLevelWorkstationDefinition,
  ): void {
    const attached = this.microscopeAttached(lesson, workstation);
    const workstations = attached
      ? lesson.workstations.filter((candidate) => candidate.id !== workstation.id)
      : [
          ...lesson.workstations,
          {
            id: workstation.id,
            title: workstation.title,
            route: workstation.route,
            guide: workstation.lessonGuide,
            required: false,
          },
        ];
    this.lessonPlan.setLessonWorkstations(lesson.id, workstations);
  }
}
