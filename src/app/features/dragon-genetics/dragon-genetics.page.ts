import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/firebase/session.service';
import { DragonAdaptiveStore } from './adaptive/dragon-adaptive.store';
import { INSTRUCTION_LEVEL_LABELS } from './adaptive/dragon-simulation.models';
import { DRAGON_SIMULATIONS } from './adaptive/dragon-simulation.registry';
import { SpecimenRenderToggleComponent } from '../../shared/assembly/preview';

@Component({
  selector: 'app-dragon-genetics-page',
  imports: [RouterLink, SpecimenRenderToggleComponent],
  templateUrl: './dragon-genetics.page.html',
  styleUrl: './dragon-genetics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonGeneticsPage {
  readonly store = inject(DragonAdaptiveStore);
  readonly session = inject(SessionService);
  readonly simulations = DRAGON_SIMULATIONS;
  readonly levelLabels = INSTRUCTION_LEVEL_LABELS;
  readonly progressPercent = computed(() => Math.round(100 * this.store.completedCount() / this.simulations.length));
}
