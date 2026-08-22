import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragonLessonViewModel } from './domain/dragon-journey.models';
import { DragonJourneyFacade } from './dragon-journey.facade';

@Component({
  selector: 'app-dragon-journey-page',
  imports: [RouterLink],
  templateUrl: './dragon-journey.page.html',
  styleUrl: './dragon-journey.page.scss',
})
export class DragonJourneyPage {
  readonly journey = inject(DragonJourneyFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const pathId = this.route.snapshot.paramMap.get('pathId');
    if (pathId && !this.journey.choosePath(pathId)) {
      this.redirectToSelectedJourney();
      return;
    }
    this.journey.refresh();
  }

  choosePath(pathId: string): void {
    if (!this.journey.choosePath(pathId)) return;
    void this.router.navigate(['/dragon-genetics/journey', pathId]);
  }

  lessonStatus(lesson: DragonLessonViewModel): string {
    if (lesson.complete) return 'Complete';
    if (lesson.active) return 'Recommended next';
    return lesson.required ? 'Required' : 'Optional';
  }

  private redirectToSelectedJourney(): void {
    const selectedPathId = this.journey.selectedPathId();
    const commands = selectedPathId
      ? ['/dragon-genetics/journey', selectedPathId]
      : ['/dragon-genetics/journey'];
    void this.router.navigate(commands, { replaceUrl: true });
  }
}
