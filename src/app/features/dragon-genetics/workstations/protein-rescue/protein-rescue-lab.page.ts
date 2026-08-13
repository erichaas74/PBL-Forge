import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { ProteinRescueLabComponent } from './protein-rescue-lab.component';

/** Full-screen host for the open Protein Synthesis and Dragon Diet Rescue workstation. */
@Component({
  selector: 'app-protein-rescue-lab-page',
  imports: [RouterLink, ProteinRescueLabComponent],
  template: `
    <div class="protein-rescue-page">
      <header class="page-header">
        <a
          class="exit"
          routerLink="/dragon-genetics"
          aria-label="Return to Dragon Genetics mission map"
          >←</a
        >
        <div>
          <span>DRAGON GENETICS · CLINICAL RESCUE BAY</span>
          <h1>Protein Synthesis &amp; Diet Rescue</h1>
        </div>
      </header>
      <app-protein-rescue-lab [studentId]="studentId()" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at 8% 4%, rgb(88 209 190 / 11%), transparent 30rem),
          radial-gradient(circle at 95% 15%, rgb(255 139 114 / 9%), transparent 26rem), #06161b;
      }

      .protein-rescue-page {
        display: grid;
        gap: 0.9rem;
        min-height: 100vh;
        padding: 1rem clamp(0.65rem, 2vw, 1.6rem) 2.5rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        color: #e8f3f1;
      }

      .exit {
        display: grid;
        width: 2.55rem;
        height: 2.55rem;
        border: 1px solid #34565a;
        border-radius: 50%;
        color: #e8f3f1;
        font-size: var(--text-md);
        place-items: center;
        text-decoration: none;
      }

      .exit:hover,
      .exit:focus-visible {
        border-color: #58d1be;
      }

      .page-header span {
        color: #8ea7a6;
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
export class ProteinRescueLabPage {
  private readonly session = inject(SessionService);
  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');
}
