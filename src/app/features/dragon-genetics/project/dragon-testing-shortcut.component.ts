import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SessionService } from '../../../core/firebase/session.service';
import { ProjectActivityDefinition } from '../../project/domain/project-hub.models';
import { DragonAdaptiveStore } from '../adaptive/dragon-adaptive.store';
import { DragonActivityProgressRepository } from './dragon-activity-progress.repository';
import { DragonProjectHubFacade } from './dragon-project-hub.facade';
import { DRAGON_PROJECT_HUB_DEFINITION } from './dragon-project-hub.definition';
import { DragonTestingProgressRepository } from './dragon-testing-progress.repository';

@Component({
  selector: 'app-dragon-testing-shortcut',
  template: `
    @if (activity()) {
      <button
        class="testing-shortcut"
        type="button"
        aria-label="Complete this section for testing and return to the project map"
        (click)="completeSection()"
      >
        Complete this section
      </button>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        z-index: 80;
        right: clamp(0.7rem, 2vw, 1.25rem);
        bottom: max(0.7rem, env(safe-area-inset-bottom));
        pointer-events: none;
      }

      .testing-shortcut {
        min-height: 2.75rem;
        padding: 0.65rem 0.9rem;
        border: 1px solid var(--line-strong);
        border-radius: 999px;
        background: color-mix(in srgb, var(--paper) 94%, transparent);
        color: var(--ink);
        font: inherit;
        font-size: var(--text-base);
        font-weight: 800;
        box-shadow: 0 0.3rem 1rem rgb(17 33 46 / 14%);
        cursor: pointer;
        pointer-events: auto;
        backdrop-filter: blur(12px);
      }

      .testing-shortcut:hover,
      .testing-shortcut:focus-visible {
        border-color: var(--ink);
        background: var(--paper);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonTestingShortcutComponent {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly testingProgress = inject(DragonTestingProgressRepository);
  private readonly activityProgress = inject(DragonActivityProgressRepository);
  private readonly projectHub = inject(DragonProjectHubFacade);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly activity = computed(() => resolveDragonActivityRoute(this.currentUrl()));

  completeSection(): void {
    const activity = this.activity();
    if (!activity) return;
    const studentId = this.session.user()?.uid ?? 'local-student';
    const assignment = this.adaptiveStore.assignment();
    const completedAtIso = new Date().toISOString();
    this.testingProgress.complete(studentId, assignment.id, activity.id, completedAtIso);
    this.projectHub.refresh();
    void this.activityProgress
      .save(studentId, assignment, activity.id, {
        status: 'complete',
        evidenceCount: 0,
        latestAtIso: completedAtIso,
      })
      .catch((error: unknown) => console.error('Testing completion could not sync.', error));
    void this.router.navigateByUrl('/dragon-genetics');
  }
}

export function resolveDragonActivityRoute(url: string): ProjectActivityDefinition | null {
  const path = url.split(/[?#]/, 1)[0].replace(/\/$/, '');
  return (
    DRAGON_PROJECT_HUB_DEFINITION.activities.find((activity) => activity.route === path) ?? null
  );
}
