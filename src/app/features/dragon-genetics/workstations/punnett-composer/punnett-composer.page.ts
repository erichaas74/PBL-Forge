import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { DRAGON_SIMULATION_BY_ID } from '../../adaptive/dragon-simulation.registry';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { PunnettComposerComponent } from './punnett-composer.component';

/** Dedicated routed host for the open Punnett Composer investigation. */
@Component({
  selector: 'app-punnett-composer-page',
  imports: [RouterLink, PunnettComposerComponent],
  templateUrl: './punnett-composer.page.html',
  styleUrl: './punnett-composer.page.scss',
})
export class PunnettComposerPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);

  readonly studentId = this.context.studentId;
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
  readonly goal = DRAGON_SIMULATION_BY_ID['punnett-composer'].goal;

  recordCompletedCross(): void {
    this.adaptiveStore.completeInvestigation('punnett-composer');
  }
}
