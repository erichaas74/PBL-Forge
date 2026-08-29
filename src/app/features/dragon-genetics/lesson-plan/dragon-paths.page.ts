/**
 * Runtime status: ACTIVE — public path chooser, published-lesson index, and optional-work list.
 * Inputs/signals: optional :pathId route parameter and the lesson-plan document signal.
 * Data access: lesson-plan and case-settings repositories read browser-local teacher choices.
 * Connects to: /dragon-genetics/path/:pathId/lesson/:lessonId routes.
 */
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragonLessonPlanRepository } from './dragon-lesson-plan.repository';
import { DragonPathContextId, isDragonPathContextId } from './dragon-lesson-plan.models';
import { DRAGON_CASES } from '../cases/dragon-case.registry';
import { DragonCaseDefinition } from '../cases/dragon-case.models';
import { DragonCaseSettingsRepository } from '../cases/dragon-case-settings.repository';

@Component({
  selector: 'app-dragon-paths-page',
  imports: [RouterLink],
  templateUrl: './dragon-paths.page.html',
  styleUrl: './dragon-paths.page.scss',
})
export class DragonPathsPage {
  readonly pathIds: readonly DragonPathContextId[] = ['arena', 'mini-show'];
  readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly caseSettings = inject(DragonCaseSettingsRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly pathId = computed(() => this.routeParams().get('pathId'));
  readonly path = computed(() => {
    const pathId = this.pathId();
    return isDragonPathContextId(pathId) ? this.lessonPlan.document().paths[pathId] : null;
  });

  constructor() {
    effect(() => {
      const pathId = this.pathId();
      if (pathId && !isDragonPathContextId(pathId)) {
        void this.router.navigate(['/dragon-genetics'], { replaceUrl: true });
      }
    });
  }

  /**
   * Field commissions a teacher has enabled for one path.
   *
   * Cases live beside the extra lessons rather than inside the lesson they branch from: both are
   * optional work, and neither takes a position in the numbered path. The case still returns to its
   * anchor lesson, which is what the route encodes.
   */
  casesFor(pathId: DragonPathContextId): readonly DragonCaseDefinition[] {
    this.caseSettings.settings();
    return DRAGON_CASES.filter(
      (definition) =>
        definition.pathIds.includes(pathId) && this.caseSettings.isEnabled(definition.id),
    );
  }

  caseUrl(pathId: DragonPathContextId, definition: DragonCaseDefinition): readonly string[] {
    return [
      '/dragon-genetics',
      'path',
      pathId,
      'lesson',
      definition.anchorLessonId,
      'branch',
      definition.id,
    ];
  }

  /** Every enabled commission, for the home list that has no path of its own. */
  readonly homeCases = computed(() => {
    this.caseSettings.settings();
    return DRAGON_CASES.filter(
      (definition) =>
        this.caseSettings.isEnabled(definition.id) &&
        definition.pathIds.some((pathId) => this.pathIds.includes(pathId)),
    );
  });
  readonly homeExtrasVisible = computed(
    () => this.lessonPlan.extraLessons().length > 0 || this.homeCases().length > 0,
  );

  offersCase(pathId: DragonPathContextId, definition: DragonCaseDefinition): boolean {
    return definition.pathIds.includes(pathId) && this.caseSettings.isEnabled(definition.id);
  }

  pathUrl(pathId: DragonPathContextId): readonly string[] {
    return ['/dragon-genetics', 'path', pathId];
  }
}
