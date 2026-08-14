import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { CompanionShowComponent } from './companion-show.component';
import { CompanionShowSnapshot } from './companion-show.models';

/** Full-screen host for the open Companion Dragon Show workstation. */
@Component({
  selector: 'app-companion-show-page',
  imports: [RouterLink, CompanionShowComponent],
  template: `
    <div class="companion-show-page">
      <header class="page-header">
        <a
          class="exit"
          routerLink="/dragon-genetics"
          aria-label="Return to Dragon Genetics mission map"
          >←</a
        >
        <div>
          <span>DRAGON GENETICS · ROYAL MINI DRAGON SOCIETY</span>
          <h1>Mini Dragon Show</h1>
        </div>
      </header>
      <app-companion-show
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
        background:
          radial-gradient(circle at 10% 4%, rgb(240 168 205 / 14%), transparent 30rem),
          radial-gradient(circle at 92% 12%, rgb(242 199 107 / 10%), transparent 28rem), #140f1d;
      }

      .companion-show-page {
        display: grid;
        gap: 0.9rem;
        min-height: 100vh;
        padding: 1rem clamp(0.65rem, 2vw, 1.6rem) 2.5rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        color: #f4ecf6;
      }

      .exit {
        display: grid;
        width: 2.55rem;
        height: 2.55rem;
        border: 1px solid #5c4668;
        border-radius: 50%;
        color: #f4ecf6;
        font-size: var(--text-md);
        place-items: center;
        text-decoration: none;
      }

      .exit:hover,
      .exit:focus-visible {
        border-color: #f0a8cd;
      }

      .page-header span {
        color: #b8a6c4;
        font-size: var(--text-xs);
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .page-header h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: var(--text-2xl);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanionShowPage {
  private readonly session = inject(SessionService);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private readonly latestSnapshot = signal<CompanionShowSnapshot | null>(null);
  private syncSignature = '';
  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');

  constructor() {
    effect(() => {
      if (!this.adaptiveStore.ready()) return;
      const snapshot = this.latestSnapshot();
      if (!snapshot || snapshot.studentId === 'local-student') return;
      const assignment = this.adaptiveStore.assignment();
      const signature = `${snapshot.studentId}:${assignment.id}:${snapshot.updatedAtIso}:${snapshot.registry.length}:${snapshot.litters.length}`;
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
