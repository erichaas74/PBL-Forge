import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonPedigreeLabComponent } from './dragon-pedigree-lab.component';

/**
 * Full-screen host for the Pedigree Lab.
 *
 * The workstation is a dedicated instrument, not a registry-driven quiz screen,
 * so it gets its own route rather than the adaptive experience shell: there is
 * no generated question set to prepare and no phase rail to hide.
 */
@Component({
  selector: 'app-dragon-pedigree-lab-page',
  imports: [RouterLink, DragonPedigreeLabComponent],
  template: `
    <div class="pedigree-page">
      <header class="page-header">
        <a class="exit" routerLink="/dragon-genetics" aria-label="Return to Dragon Genetics mission map"
          >←</a
        >
        <div>
          <span>DRAGON GENETICS · BLOODLINE ARCHIVE</span>
          <h1>Pedigree Lab</h1>
        </div>
      </header>
      <app-dragon-pedigree-lab
        [studentId]="studentId()"
        [openInvestigationId]="requestedInvestigationId()"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }

      .pedigree-page {
        display: grid;
        gap: 0.9rem;
        padding: 1rem clamp(0.75rem, 3vw, 2rem) 2rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 0.9rem;
      }

      .exit {
        display: grid;
        width: 2.4rem;
        height: 2.4rem;
        border: 1px solid var(--line);
        border-radius: 50%;
        color: var(--ink);
        font-size: var(--text-md);
        place-items: center;
        text-decoration: none;
      }

      .page-header span {
        color: var(--muted);
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
export class DragonPedigreeLabPage {
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);

  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');
  /** `?investigation=frost-scale` — how the mission map links straight to a bloodline. */
  readonly requestedInvestigationId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('investigation'))),
    { initialValue: this.route.snapshot.queryParamMap.get('investigation') },
  );
}
