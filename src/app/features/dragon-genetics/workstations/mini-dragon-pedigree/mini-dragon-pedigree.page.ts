/**
 * Runtime status: ACTIVE — explicit Mini Dragon Pedigree route within the shared kennel workflow.
 * Inputs/signals: kennel snapshot, student/assignment context, and pedigree-record changes.
 * Data access: MiniDragonKennelStore locally; CapstoneProgressRepository publishes show progress.
 * Connects to: MiniDragonPedigreeComponent, Companion Show kennel, and teacher summaries.
 */
import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../shared/dragon-workstation-context.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { MiniDragonKennelStore } from '../companion-show/mini-dragon-kennel.store';
import { MiniDragonPedigreeComponent } from './mini-dragon-pedigree.component';

/** Full-screen app host for the Pedigree Lab station. */
@Component({
  selector: 'app-mini-dragon-pedigree-page',
  imports: [RouterLink, MiniDragonPedigreeComponent],
  templateUrl: './mini-dragon-pedigree.page.html',
  styleUrl: './mini-dragon-pedigree.page.scss',
})
export class MiniDragonPedigreePage {
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
