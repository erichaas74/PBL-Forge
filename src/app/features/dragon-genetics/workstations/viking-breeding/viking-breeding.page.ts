import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { VikingBreedingComponent } from './viking-breeding.component';

/**
 * App host for the Viking settlement breeding instrument.
 *
 * `?settlement=hall-trickster` opens the workstation straight onto one commission.
 */
@Component({
  selector: 'app-viking-breeding-page',
  imports: [RouterLink, VikingBreedingComponent],
  templateUrl: './viking-breeding.page.html',
  styleUrl: './viking-breeding.page.scss',
})
export class VikingBreedingPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly route = inject(ActivatedRoute);

  readonly studentId = this.context.studentId;
  readonly requestedRoleId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('settlement'))),
    { initialValue: this.route.snapshot.queryParamMap.get('settlement') },
  );
}
