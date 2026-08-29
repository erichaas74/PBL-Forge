/**
 * Runtime status: ACTIVE — lesson-specific Meiosis Hatchery for both breeding paths.
 * Inputs/signals: path/lesson query params, student identity, and deterministic hatchery seed.
 * Data access: workstation context selects classic or mini investigation state.
 * Connects to: full-size or mini meiosis components and the originating shared lesson.
 */
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DragonPathContextId,
  isDragonPathContextId,
} from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { DragonHatcheryBreedingLabComponent } from './dragon-hatchery-breeding-lab.component';
import { MiniMeiosisHatcheryComponent } from './mini-meiosis-hatchery.component';

@Component({
  selector: 'app-meiosis-hatchery-page',
  imports: [RouterLink, DragonHatcheryBreedingLabComponent, MiniMeiosisHatcheryComponent],
  templateUrl: './meiosis-hatchery.page.html',
  styleUrl: './meiosis-hatchery.page.scss',
})
export class MeiosisHatcheryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workstationContext = inject(DragonWorkstationContextService);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly studentId = this.workstationContext.studentId;
  readonly pathId = computed<DragonPathContextId>(() => {
    const value = this.queryParams().get('path');
    return isDragonPathContextId(value) ? value : 'arena';
  });
  readonly lessonId = computed(
    () => this.queryParams().get('lesson') ?? 'meiosis-and-dragon-eggs',
  );
  readonly returnUrl = computed(() => [
    '/dragon-genetics',
    'path',
    this.pathId(),
    'lesson',
    this.lessonId(),
  ]);
  readonly hatcherySeed = computed(
    () => `${this.pathId()}:${this.studentId()}:${this.lessonId()}`,
  );

  constructor() {
    effect(() => {
      const requested = this.queryParams().get('path');
      if (requested && !isDragonPathContextId(requested)) {
        void this.router.navigate(['/dragon-genetics'], { replaceUrl: true });
      }
    });
  }
}
