import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { BloodCompatibilityLabComponent } from './blood-compatibility-lab.component';

/** Full-screen host for the open Dragon Blood Type Compatibility workstation. */
@Component({
  selector: 'app-blood-compatibility-lab-page',
  imports: [RouterLink, BloodCompatibilityLabComponent],
  template: `
    <div class="blood-lab-page">
      <header class="page-header">
        <a
          class="exit"
          routerLink="/dragon-genetics"
          aria-label="Return to Dragon Genetics mission map"
          >←</a
        >
        <div>
          <span>DRAGON GENETICS · EMERGENCY HEALING STATION</span>
          <h1>Dragon Blood Type Compatibility Lab</h1>
        </div>
      </header>
      <app-blood-compatibility-lab [studentId]="studentId()" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at 8% 4%, rgb(230 94 88 / 12%), transparent 30rem),
          radial-gradient(circle at 95% 15%, rgb(92 205 196 / 9%), transparent 26rem), #07151b;
      }

      .blood-lab-page {
        display: grid;
        gap: 0.9rem;
        min-height: 100vh;
        padding: 1rem clamp(0.65rem, 2vw, 1.6rem) 2.5rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        color: #edf4f2;
      }

      .exit {
        display: grid;
        width: 2.55rem;
        height: 2.55rem;
        border: 1px solid #3d5960;
        border-radius: 50%;
        color: #edf4f2;
        font-size: var(--text-md);
        place-items: center;
        text-decoration: none;
      }

      .exit:hover,
      .exit:focus-visible {
        border-color: #e65e58;
      }

      .page-header span {
        color: #9aafb0;
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
export class BloodCompatibilityLabPage {
  private readonly session = inject(SessionService);
  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');
}
