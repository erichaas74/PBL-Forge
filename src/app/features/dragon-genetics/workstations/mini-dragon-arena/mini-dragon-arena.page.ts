import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../shared/dragon-workstation-context.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { MiniDragonKennelStore } from '../companion-show/mini-dragon-kennel.store';
import { MiniDragonArenaComponent } from './mini-dragon-arena.component';

/** Full-screen app host for the Show Arena station. */
@Component({
  selector: 'app-mini-dragon-arena-page',
  imports: [RouterLink, MiniDragonArenaComponent],
  templateUrl: './mini-dragon-arena.page.html',
  styleUrl: './mini-dragon-arena.page.scss',
})
export class MiniDragonArenaPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly store = inject(MiniDragonKennelStore);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private syncSignature = '';
  readonly studentId = this.context.studentId;
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;

  constructor() {
    effect(() => {
      if (!this.context.ready()) return;
      const snapshot = this.store.snapshot();
      if (!snapshot || snapshot.studentId === LOCAL_WORKSTATION_STUDENT_ID) return;
      const assignment = this.context.assignment();
      const signature = [
        snapshot.studentId,
        assignment.id,
        snapshot.updatedAtIso,
        snapshot.registry.length,
        snapshot.litters.length,
        snapshot.trainingSessions.length,
        snapshot.showRuns.length,
        snapshot.showDivisionId ?? '',
        snapshot.rareTraitGeneId ?? '',
        snapshot.rareCandidateIds.length,
      ].join(':');
      if (signature === this.syncSignature) return;
      this.syncSignature = signature;
      void this.capstoneProgressRepository
        .saveMiniDragonShow(snapshot, assignment)
        .catch((error: unknown) =>
          console.error('Mini Dragon Show progress could not sync.', error),
        );
    });
  }
}
