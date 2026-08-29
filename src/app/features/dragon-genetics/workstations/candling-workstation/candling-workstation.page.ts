/**
 * Runtime status: ACTIVE — explicit portable Candling Workstation route container.
 * Inputs/signals: current workstation/student context and computed lesson-aware exit URL.
 * Data access: child workstation owns its repository; this page reads shared launch context only.
 * Connects to: CandlingWorkstationComponent and lesson/home navigation.
 */
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { CandlingWorkstationComponent } from './candling-workstation.component';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';

@Component({
  selector: 'app-candling-workstation-page',
  imports: [RouterLink, CandlingWorkstationComponent],
  templateUrl: './candling-workstation.page.html',
  styleUrl: './candling-workstation.page.scss',
})
export class CandlingWorkstationPage {
  readonly context = inject(DragonWorkstationContextService);
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
}
