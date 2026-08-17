import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../shared/dragon-workstation-context.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { CompanionShowComponent } from './companion-show.component';
import { CompanionShowSnapshot } from './companion-show.models';

/** Full-screen app host for the portable Companion Dragon Show workstation. */
@Component({
  selector: 'app-companion-show-page',
  imports: [RouterLink, CompanionShowComponent],
  templateUrl: './companion-show.page.html',
  styleUrl: './companion-show.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanionShowPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private readonly latestSnapshot = signal<CompanionShowSnapshot | null>(null);
  private syncSignature = '';
  readonly studentId = this.context.studentId;

  constructor() {
    effect(() => {
      if (!this.context.ready()) return;
      const snapshot = this.latestSnapshot();
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

  recordSnapshot(snapshot: CompanionShowSnapshot): void {
    this.latestSnapshot.set(snapshot);
  }
}
