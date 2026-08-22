import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DragonJourneyNavigationService {
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly lessonReturnUrl = computed(() => {
    const [path, query = ''] = this.currentUrl().split('?', 2);
    if (!path.startsWith('/dragon-genetics/') || path.startsWith('/dragon-genetics/journey')) {
      return null;
    }
    const params = new URLSearchParams(query.split('#', 1)[0]);
    const journeyPath = params.get('journeyPath');
    const lesson = params.get('lesson');
    return journeyPath && lesson
      ? `/dragon-genetics/journey/${encodeURIComponent(journeyPath)}/lesson/${encodeURIComponent(lesson)}`
      : null;
  });

  readonly workstationExitUrl = computed(() => this.lessonReturnUrl() ?? '/dragon-genetics');
}
