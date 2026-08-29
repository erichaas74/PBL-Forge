/**
 * Runtime status: RETIRED — legacy journey lesson URLs are not registered by the router.
 * Former inputs/signals: legacy pathId/lessonId params and computed lesson/progression state.
 * Former data access: DragonJourneyFacade and its retained evidence/progress sources.
 * Former connections: legacy journey map and workstation launch routes.
 */
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly pathId = computed(() => this.routeParams().get('pathId') ?? '');
  readonly lessonId = computed(() => this.routeParams().get('lessonId') ?? '');
  readonly lesson = computed(() => this.journey.lessonView(this.lessonId()));
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
    effect(() => {
      const pathId = this.pathId();
      const lessonId = this.lessonId();
      untracked(() => {
        if (!this.journey.choosePath(pathId)) {
          this.redirectToSelectedJourney();
          return;
        }
        this.journey.refresh();
        if (!lessonId || !this.journey.lessonView(lessonId)) {
          void this.router.navigate(['/dragon-genetics/journey', pathId], { replaceUrl: true });
          return;
        }
        this.journey.visitLesson(lessonId as DragonLessonId);
      });
    });
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
