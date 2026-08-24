import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonLessonPlanRepository } from './dragon-lesson-plan.repository';
import { DragonPathContextId, DragonSharedLesson } from './dragon-lesson-plan.models';
import {
  MICROSCOPE_LEVEL_WORKSTATIONS,
  MicroscopeLevelWorkstationDefinition,
} from '../workstations/genome-microscope/microscope-level-workstations';

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

  addLesson(): void { this.lessonPlan.addLesson(); }
  moveLesson(id: string, direction: -1 | 1): void { this.lessonPlan.moveLesson(id, direction); }
  updateText(lesson: DragonSharedLesson, field: 'title' | 'learningGoal' | 'guide', event: Event): void {
    this.lessonPlan.updateLesson(lesson.id, { [field]: (event.target as HTMLInputElement).value });
  }
  togglePublished(lesson: DragonSharedLesson): void {
    this.lessonPlan.updateLesson(lesson.id, { published: !lesson.published });
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
