import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { ProteinRescueLabComponent } from './protein-rescue-lab.component';

/** Full-screen app host for the portable Protein Synthesis and Dragon Diet Rescue workstation. */
@Component({
  selector: 'app-protein-rescue-lab-page',
  imports: [RouterLink, ProteinRescueLabComponent],
  templateUrl: './protein-rescue-lab.page.html',
  styleUrl: './protein-rescue-lab.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProteinRescueLabPage {
  private readonly context = inject(DragonWorkstationContextService);
  readonly studentId = this.context.studentId;
}
