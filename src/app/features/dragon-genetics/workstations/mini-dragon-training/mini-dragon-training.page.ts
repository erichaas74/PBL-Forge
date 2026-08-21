import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../shared/dragon-workstation-context.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { MiniDragonKennelStore } from '../companion-show/mini-dragon-kennel.store';
import { MiniDragonTrainingComponent } from './mini-dragon-training.component';

/** Full-screen app host for the Training Ground station. */
@Component({
  selector: 'app-mini-dragon-training-page',
  imports: [RouterLink, MiniDragonTrainingComponent],
  templateUrl: './mini-dragon-training.page.html',
  styleUrl: './mini-dragon-training.page.scss',
})
export class MiniDragonTrainingPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly store = inject(MiniDragonKennelStore);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private syncSignature = '';
  readonly studentId = this.context.studentId;

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
