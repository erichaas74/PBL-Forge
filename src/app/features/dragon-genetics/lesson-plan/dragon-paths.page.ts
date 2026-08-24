import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragonLessonPlanRepository } from './dragon-lesson-plan.repository';
import { DragonPathContextId, isDragonPathContextId } from './dragon-lesson-plan.models';

@Component({
  selector: 'app-dragon-paths-page',
  imports: [RouterLink],
  templateUrl: './dragon-paths.page.html',
  styleUrl: './dragon-paths.page.scss',
})
export class DragonPathsPage {
  readonly pathIds: readonly DragonPathContextId[] = ['arena', 'mini-show'];
  readonly lessonPlan = inject(DragonLessonPlanRepository);
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

  pathUrl(pathId: DragonPathContextId): readonly string[] {
    return ['/dragon-genetics', 'path', pathId];
  }
}
