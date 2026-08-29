/**
 * Runtime status: ACTIVE — lesson-specific cell-to-gene microscope route.
 * Inputs/signals: path/lesson query params and discoveries from the shared genetics notebook signal.
 * Data access: GeneticsProgramResolver and DragonWorkstationContextService provide released records.
 * Connects to: GeneticsMicroscopeComponent and the originating shared lesson.
 */
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DragonPathContextId,
  isDragonPathContextId,
} from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { GeneticsProgramResolver } from '../shared/genetics-program.resolver';
import { GeneticsMicroscopeComponent } from './genetics-microscope.component';

@Component({
  selector: 'app-cell-gene-microscope-page',
  imports: [RouterLink, GeneticsMicroscopeComponent],
  templateUrl: './cell-gene-microscope.page.html',
  styleUrl: './cell-gene-microscope.page.scss',
})
export class CellGeneMicroscopePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly context = inject(DragonWorkstationContextService);
  private readonly programs = inject(GeneticsProgramResolver);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly pathId = computed<DragonPathContextId>(() => {
    const value = this.queryParams().get('path');
    return isDragonPathContextId(value) ? value : 'arena';
  });
  readonly lessonId = computed(() => this.queryParams().get('lesson') ?? 'where-genes-live');
  readonly studentId = this.context.studentId;
  readonly program = computed(() => this.programs.resolve(this.pathId()));
  readonly revealedGeneIds = computed(() => Object.keys(this.context.geneticsNotebook().discoveries));
  readonly returnUrl = computed(() => [
    '/dragon-genetics',
    'path',
    this.pathId(),
    'lesson',
    this.lessonId(),
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
