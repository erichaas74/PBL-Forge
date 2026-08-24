import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragonPathContextId, isDragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { MysteryPairComponent } from './mystery-pair.component';

@Component({
  selector: 'app-mystery-pair-page',
  imports: [RouterLink, MysteryPairComponent],
  templateUrl: './mystery-pair.page.html',
  styleUrl: './mystery-pair.page.scss',
})
export class MysteryPairPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly context = inject(DragonWorkstationContextService);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly pathId = computed<DragonPathContextId>(() => {
    const value = this.queryParams().get('path');
    return isDragonPathContextId(value) ? value : 'arena';
  });
  readonly lessonId = computed(() => this.queryParams().get('lesson') ?? 'meet-the-dragons');
  readonly studentId = this.context.studentId;
  readonly returnUrl = computed(() => [
    '/dragon-genetics', 'path', this.pathId(), 'lesson', this.lessonId(),
  ]);

  constructor() {
    effect(() => {
      const requested = this.queryParams().get('path');
      if (requested && !isDragonPathContextId(requested)) {
        void this.router.navigate(['/dragon-genetics'], { replaceUrl: true });
      }
    });
  }
}
