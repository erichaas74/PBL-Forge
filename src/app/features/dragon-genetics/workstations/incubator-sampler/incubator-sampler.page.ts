import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { IncubatorSamplerComponent } from './incubator-sampler.component';

@Component({
  selector: 'app-incubator-sampler-page',
  imports: [RouterLink, IncubatorSamplerComponent],
  templateUrl: './incubator-sampler.page.html',
  styleUrl: './incubator-sampler.page.scss',
})
export class IncubatorSamplerPage {
  readonly context = inject(DragonWorkstationContextService);
  readonly returnUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
  readonly revealedGeneIds = computed(() =>
    Object.keys(this.context.geneticsNotebook().discoveries),
  );
}
