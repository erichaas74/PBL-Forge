import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { DragonActivityProgressRepository } from '../../project/dragon-activity-progress.repository';
import { DragonProjectHubFacade } from '../../project/dragon-project-hub.facade';
import { supportedClaimCount, traitEvidenceStatus } from './trait-evidence.domain';
import { TraitEvidenceSnapshot } from './trait-evidence.models';
import { TraitEvidenceWorkstationComponent } from './trait-evidence-workstation.component';

@Component({
  selector: 'app-trait-evidence-page',
  imports: [RouterLink, TraitEvidenceWorkstationComponent],
  template: `
    <div class="trait-page">
      <header class="page-header">
        <a class="exit" routerLink="/dragon-genetics" aria-label="Return to Dragon Genetics">←</a>
        <div>
          <span>DRAGON GENETICS · OBSERVATION LAB</span>
          <strong>Trait Evidence</strong>
        </div>
      </header>
      <app-trait-evidence-workstation
        [studentId]="studentId()"
        (snapshotChange)="recordSnapshot($event)"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }

      .trait-page {
        display: grid;
        gap: 0.8rem;
        min-height: 100vh;
        padding: 0.8rem clamp(0.65rem, 2vw, 1.5rem) 2.5rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: min(74rem, 100%);
        margin: 0 auto;
      }

      .exit {
        display: grid;
        width: 2.45rem;
        height: 2.45rem;
        border: 1px solid var(--line-strong);
        border-radius: 50%;
        color: var(--ink);
        font-size: var(--text-md);
        place-items: center;
        text-decoration: none;
      }

      .page-header div {
        display: grid;
      }

      .page-header span {
        color: var(--muted);
        font-size: var(--text-xs);
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .page-header strong {
        font-family: var(--font-display);
        font-size: var(--text-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraitEvidencePage {
  private readonly session = inject(SessionService);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly progressRepository = inject(DragonActivityProgressRepository);
  private readonly projectHub = inject(DragonProjectHubFacade);
  private readonly latestSnapshot = signal<TraitEvidenceSnapshot | null>(null);
  private syncSignature = '';

  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');

  constructor() {
    effect(() => {
      if (!this.adaptiveStore.ready()) return;
      const snapshot = this.latestSnapshot();
      if (!snapshot || snapshot.studentId === 'local-student') return;
      const assignment = this.adaptiveStore.assignment();
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
