import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragonJourneyFacade } from './dragon-journey.facade';
import { DragonLessonId } from './domain/dragon-journey.models';

@Component({
  selector: 'app-dragon-lesson-page',
  imports: [RouterLink],
  templateUrl: './dragon-lesson.page.html',
  styleUrl: './dragon-lesson.page.scss',
})
export class DragonLessonPage {
  readonly journey = inject(DragonJourneyFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly pathId = this.route.snapshot.paramMap.get('pathId') ?? '';
  readonly lessonId = this.route.snapshot.paramMap.get('lessonId') ?? '';
  readonly lesson = computed(() => this.journey.lessonView(this.lessonId));
  readonly nextLesson = computed(() => {
    const lesson = this.lesson();
    if (!lesson) return null;
    const lessons = this.journey.lessons();
    return (
      lessons[
        lessons.findIndex((candidate) => candidate.definition.id === lesson.definition.id) + 1
      ] ?? null
    );
  });

  constructor() {
    if (!this.journey.choosePath(this.pathId)) {
      this.redirectToSelectedJourney();
      return;
    }
    this.journey.refresh();
    if (!this.lessonId || !this.journey.lessonView(this.lessonId)) {
      void this.router.navigate(['/dragon-genetics/journey', this.pathId], { replaceUrl: true });
      return;
    }
    this.journey.visitLesson(this.lessonId as DragonLessonId);
  }

  refreshEvidence(): void {
    this.journey.refresh();
  }

  private redirectToSelectedJourney(): void {
    const selectedPathId = this.journey.selectedPathId();
    const commands = selectedPathId
      ? ['/dragon-genetics/journey', selectedPathId]
      : ['/dragon-genetics/journey'];
    void this.router.navigate(commands, { replaceUrl: true });
  }
}
