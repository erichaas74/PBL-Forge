import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { IslandDiversityManagerComponent } from './island-diversity-manager.component';

/** Full-screen host for the open Island Diversity Manager workstation. */
@Component({
  selector: 'app-island-diversity-manager-page',
  imports: [RouterLink, IslandDiversityManagerComponent],
  template: `
    <div class="island-diversity-page">
      <header class="page-header">
        <a
          class="exit"
          routerLink="/dragon-genetics"
          aria-label="Return to Dragon Genetics mission map"
          >←</a
        >
        <div>
          <span>DRAGON GENETICS · ARCHIPELAGO CONSERVATION STATION</span>
          <h1>Island Diversity Manager</h1>
        </div>
      </header>
      <app-island-diversity-manager [studentId]="studentId()" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at 8% 4%, rgb(95 190 157 / 13%), transparent 30rem),
          radial-gradient(circle at 95% 15%, rgb(102 160 211 / 10%), transparent 28rem), #06171d;
      }

      .island-diversity-page {
        display: grid;
        gap: 0.9rem;
        min-height: 100vh;
        padding: 1rem clamp(0.65rem, 2vw, 1.6rem) 2.5rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        color: #edf5f0;
      }

      .exit {
        display: grid;
        width: 2.55rem;
        height: 2.55rem;
        border: 1px solid #3f625b;
        border-radius: 50%;
        color: #edf5f0;
        font-size: var(--text-md);
        place-items: center;
        text-decoration: none;
      }

      .exit:hover,
      .exit:focus-visible {
        border-color: #83d5af;
      }

      .page-header span {
        color: #94aaa2;
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
export class IslandDiversityManagerPage {
  private readonly session = inject(SessionService);
  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');
}
