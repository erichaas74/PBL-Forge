import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { BloodCompatibilityLabComponent } from './blood-compatibility-lab.component';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';

/** Full-screen app host for the portable Dragon Blood Type Compatibility workstation. */
@Component({
  selector: 'app-blood-compatibility-lab-page',
  imports: [RouterLink, BloodCompatibilityLabComponent],
  templateUrl: './blood-compatibility-lab.page.html',
  styleUrl: './blood-compatibility-lab.page.scss',
})
export class BloodCompatibilityLabPage {
  private readonly context = inject(DragonWorkstationContextService);
  readonly studentId = this.context.studentId;
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
}
