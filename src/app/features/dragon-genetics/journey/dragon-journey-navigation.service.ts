import { computed, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Service()
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
    if (!path.startsWith('/dragon-genetics/') || path.startsWith('/dragon-genetics/path')) {
      return null;
    }
    const params = new URLSearchParams(query.split('#', 1)[0]);
    const lessonPath = params.get('path');
    const lesson = params.get('lesson');
    return lessonPath && lesson
      ? `/dragon-genetics/path/${encodeURIComponent(lessonPath)}/lesson/${encodeURIComponent(lesson)}`
      : null;
  });

  readonly workstationExitUrl = computed(() => this.lessonReturnUrl() ?? '/dragon-genetics');
}
