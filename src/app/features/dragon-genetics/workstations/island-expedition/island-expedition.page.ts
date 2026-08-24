import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { IslandExpeditionComponent } from './island-expedition.component';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';

/**
 * App host for the Island Expedition instrument.
 *
 * Route adaptation stays out of the workstation: `?brief=hidden-line` opens the map straight onto
 * one expedition brief.
 */
@Component({
  selector: 'app-island-expedition-page',
  imports: [RouterLink, IslandExpeditionComponent],
  templateUrl: './island-expedition.page.html',
  styleUrl: './island-expedition.page.scss',
})
export class IslandExpeditionPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly route = inject(ActivatedRoute);

  readonly studentId = this.context.studentId;
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
  readonly requestedQuestId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('brief'))),
    { initialValue: this.route.snapshot.queryParamMap.get('brief') },
  );
}
