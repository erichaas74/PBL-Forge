/**
 * Runtime status: ACTIVE — explicit full-size Pedigree Lab open-investigation route.
 * Inputs/signals: optional investigation query param and current workstation/student context.
 * Data access: child pedigree repository and released account-genetics records.
 * Connects to: DragonPedigreeLabComponent, retained progress/inquiry systems, and navigation.
 */
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { DragonPedigreeLabComponent } from './dragon-pedigree-lab.component';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';

/**
 * App host for the portable Pedigree Lab instrument.
 *
 * The dedicated route keeps app navigation and route adaptation out of the workstation itself.
 */
@Component({
  selector: 'app-dragon-pedigree-lab-page',
  imports: [RouterLink, DragonPedigreeLabComponent],
  templateUrl: './dragon-pedigree-lab.page.html',
  styleUrl: './dragon-pedigree-lab.page.scss',
})
export class DragonPedigreeLabPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly route = inject(ActivatedRoute);

  readonly studentId = this.context.studentId;
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
  /** `?investigation=frost-scale` — how the mission map links straight to a bloodline. */
  readonly requestedInvestigationId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('investigation'))),
    { initialValue: this.route.snapshot.queryParamMap.get('investigation') },
  );
}
