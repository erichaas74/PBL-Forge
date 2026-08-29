/**
 * Runtime status: ACTIVE — explicit Trait Evidence open-investigation route.
 * Inputs/signals: current workstation context and latest saved evidence snapshot.
 * Data access: child repository locally; DragonActivityProgressRepository publishes completion.
 * Connects to: TraitEvidenceWorkstationComponent, project hub, teacher reporting, and navigation.
 */
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonActivityProgressRepository } from '../../project/dragon-activity-progress.repository';
import { DragonProjectHubFacade } from '../../project/dragon-project-hub.facade';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../shared/dragon-workstation-context.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { supportedClaimCount, traitEvidenceStatus } from './trait-evidence.domain';
import { TraitEvidenceSnapshot } from './trait-evidence.models';
import { TraitEvidenceWorkstationComponent } from './trait-evidence-workstation.component';

@Component({
  selector: 'app-trait-evidence-page',
  imports: [RouterLink, TraitEvidenceWorkstationComponent],
  templateUrl: './trait-evidence.page.html',
  styleUrl: './trait-evidence.page.scss',
})
export class TraitEvidencePage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly progressRepository = inject(DragonActivityProgressRepository);
  private readonly projectHub = inject(DragonProjectHubFacade);
  private readonly latestSnapshot = signal<TraitEvidenceSnapshot | null>(null);
  private syncSignature = '';

  readonly studentId = this.context.studentId;
  readonly workstationExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;

  constructor() {
    effect(() => {
      if (!this.context.ready()) return;
      const snapshot = this.latestSnapshot();
      if (!snapshot || snapshot.studentId === LOCAL_WORKSTATION_STUDENT_ID) return;
      const assignment = this.context.assignment();
      const status = traitEvidenceStatus(snapshot);
      const evidenceCount = supportedClaimCount(snapshot);
      const signature = `${snapshot.studentId}:${assignment.id}:${snapshot.updatedAtIso}:${status}:${evidenceCount}`;
      if (signature === this.syncSignature) return;
      this.syncSignature = signature;
      void this.progressRepository
        .save(snapshot.studentId, assignment, 'trait-evidence', {
          status,
          evidenceCount,
          latestAtIso: snapshot.updatedAtIso,
        })
        .catch((error: unknown) => console.error('Trait Evidence progress could not sync.', error));
    });
  }

  recordSnapshot(snapshot: TraitEvidenceSnapshot): void {
    this.latestSnapshot.set(snapshot);
    this.projectHub.refresh();
  }
}
