import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { CandlingWorkstationComponent } from './candling-workstation.component';

@Component({
  selector: 'app-candling-workstation-page',
  imports: [RouterLink, CandlingWorkstationComponent],
  templateUrl: './candling-workstation.page.html',
  styleUrl: './candling-workstation.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandlingWorkstationPage {
  readonly context = inject(DragonWorkstationContextService);
}
