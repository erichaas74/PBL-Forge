/**
 * Runtime status: ACTIVE — explicit full Dragon Hatchery open-lab and Arena-entry route.
 * Inputs/signals: current student/assignment context and lesson-aware return URL.
 * Data access: DragonHatcheryBreedingLabComponent owns local breeding/roster persistence.
 * Connects to: account genetics, Arena champion selection, retained progress, and navigation.
 */
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { DragonHatcheryBreedingLabComponent } from './dragon-hatchery-breeding-lab.component';

@Component({
  selector: 'app-dragon-hatchery-page',
  imports: [RouterLink, DragonHatcheryBreedingLabComponent],
  templateUrl: './dragon-hatchery.page.html',
  styleUrl: './dragon-hatchery.page.scss',
})
export class DragonHatcheryPage {
  readonly context = inject(DragonWorkstationContextService);
  readonly returnUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
}
