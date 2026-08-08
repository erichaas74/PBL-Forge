import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  SpecimenRenderMode,
  setSpecimenRenderMode,
  specimenRenderMode,
} from './specimen-render-mode';

/**
 * Flips every specimen tile on the page between the flat plate and the baked
 * 3D render.
 *
 * This is a comparison instrument, not a student setting. The plate is an
 * interpretation of the genome — it exaggerates on purpose — and the only way
 * to know whether that interpretation is still honest is to put the real
 * anatomy next to it and look. Keep it somewhere an author can reach and a
 * student will not trip over.
 *
 * The choice is persisted, because comparing the two means walking between
 * stations rather than staring at one.
 */
@Component({
  selector: 'app-specimen-render-toggle',
  template: `
    <div class="toggle" role="group" aria-label="Specimen drawing mode">
      <span class="caption">Specimens</span>
      @for (option of options; track option.mode) {
        <button
          type="button"
          [class.active]="mode() === option.mode"
          [attr.aria-pressed]="mode() === option.mode"
          [title]="option.hint"
          (click)="select(option.mode)">
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: [`
    /*
     * Themed through custom properties rather than by letting hosts reach in.
     * View encapsulation means a parent stylesheet cannot select .toggle at
     * all, and custom properties inherit through the host boundary — so this is
     * both the only thing that works and the seam you would want anyway. The
     * control ships light and any dark panel overrides these four.
     */
    :host {
      display: block;

      --toggle-edge: var(--line);
      --toggle-surface: var(--surface-raised);
      --toggle-caption: var(--muted);
      --toggle-ink: var(--ink-soft);
      --toggle-active-edge: var(--line-strong);
      --toggle-active-surface: var(--surface-sunken);
      --toggle-active-ink: var(--ink);
    }
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.3rem 0.4rem;
      border: 1px solid var(--toggle-edge);
      border-radius: 999px;
      background: var(--toggle-surface);
    }
    .caption {
      padding-left: 0.35rem;
      color: var(--toggle-caption);
      font-size: var(--text-xs);
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    button {
      padding: 0.3rem 0.7rem;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: var(--toggle-ink);
      font-size: var(--text-xs);
      font-weight: 800;
      cursor: pointer;
    }
    button:hover { border-color: var(--toggle-active-edge); }
    button.active {
      border-color: var(--toggle-active-edge);
      background: var(--toggle-active-surface);
      color: var(--toggle-active-ink);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecimenRenderToggleComponent {
  protected readonly mode = specimenRenderMode;

  protected readonly options: readonly {
    mode: SpecimenRenderMode;
    label: string;
    hint: string;
  }[] = [
    {
      mode: 'plate',
      label: 'Plate',
      hint: 'Drawn field-guide plate — crisp at any size, traits exaggerated to read at thumbnail scale.',
    },
    {
      mode: 'render',
      label: 'Render',
      hint: 'Baked frame from the 3D dragon — accurate anatomy, softer at small sizes.',
    },
  ];

  protected select(mode: SpecimenRenderMode): void {
    setSpecimenRenderMode(mode);
  }
}
