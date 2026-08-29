/**
 * Runtime status: RETIRED — /dragon-genetics/journey routes are intentionally absent.
 * Former inputs/signals: optional legacy pathId route param and DragonJourneyFacade state.
 * Former data access: retained journey facade, assignment, roster, and progress repositories.
 * Former connections: legacy journey lesson page; the facade remains active in /explore.
 */
import { Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly isProjectHome = this.route.snapshot.routeConfig?.path === 'dragon-genetics';
  readonly backUrl = '/dragon-genetics';
  readonly backLabel = 'Dragon Genetics home';

  constructor() {
    effect(() => {
      const pathId = this.routeParams().get('pathId');
      untracked(() => {
        if (pathId && !this.journey.choosePath(pathId)) {
          this.redirectToSelectedJourney();
          return;
        }
        this.journey.refresh();
      });
    });
  }

  choosePath(pathId: string): void {
    if (!this.journey.choosePath(pathId)) return;
    void this.router.navigate(['/dragon-genetics/journey', pathId]);
  }

  lessonStatus(lesson: DragonLessonViewModel): string {
    if (lesson.complete) return 'Complete';
    if (lesson.active) return 'Recommended next';
    return 'Open anytime';
  }

  private redirectToSelectedJourney(): void {
    const selectedPathId = this.journey.selectedPathId();
    const commands = selectedPathId
      ? ['/dragon-genetics/journey', selectedPathId]
      : ['/dragon-genetics/journey'];
    void this.router.navigate(commands, { replaceUrl: true });
  }
}
