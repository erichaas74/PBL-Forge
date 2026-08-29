/**
 * Runtime status: ACTIVE — explicit full Genome Microscope open-lab route.
 * Inputs/signals: current workstation context and lesson-aware return URL.
 * Data access: GenomeMicroscopeComponent reads shared chromosome, gene, DNA, and notebook sources.
 * Connects to: retained hub progress, level investigations, and lesson/home navigation.
 */
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { GenomeMicroscopeComponent } from './genome-microscope.component';

@Component({
  selector: 'app-genome-microscope-page',
  imports: [RouterLink, GenomeMicroscopeComponent],
  templateUrl: './genome-microscope.page.html',
  styleUrl: './genome-microscope.page.scss',
})
export class GenomeMicroscopePage {
  readonly context = inject(DragonWorkstationContextService);
  readonly returnUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
}
