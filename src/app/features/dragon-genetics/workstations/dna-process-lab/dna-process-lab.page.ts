import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { DragonDnaRepairLabComponent } from './dragon-dna-repair-lab.component';

@Component({
  selector: 'app-dna-process-lab-page',
  imports: [RouterLink, DragonDnaRepairLabComponent],
  templateUrl: './dna-process-lab.page.html',
  styleUrl: './dna-process-lab.page.scss',
})
export class DnaProcessLabPage {
  readonly context = inject(DragonWorkstationContextService);
  readonly returnUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
}
