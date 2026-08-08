import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DragonEggStatusId } from '../../domain/dragon-visual.models';
import { DRAGON_HATCHERY_THEME, DragonHatcheryTheme } from './dragon-hatchery.theme';

interface Speckle {
  cx: number;
  cy: number;
  r: number;
}

/**
 * One egg in the tray: a curriculum-free shell that shows how far a student has taken it.
 *
 * The glyph draws instrument state only — candling light for an examined egg, a sampling
 * needle and helix for a sampled egg, a crack for a hatched one. It never draws a hatchling,
 * and it is always `aria-hidden`; the host supplies the accessible text.
 */
@Component({
  selector: 'app-hatchery-egg-glyph',
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + theme().shell.viewBoxWidth + ' ' + theme().shell.viewBoxHeight"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <clipPath [attr.id]="clipId()">
          <path [attr.d]="theme().shell.path" />
        </clipPath>
      </defs>

      @if (status() !== 'intact') {
        <ellipse class="aura" cx="32" cy="48" rx="27" ry="36" />
      }

      <path class="shell" [attr.d]="theme().shell.path" />

      <g [attr.clip-path]="'url(#' + clipId() + ')'">
        @for (speckle of speckles(); track $index) {
          <circle
            class="speckle"
            [attr.cx]="speckle.cx"
            [attr.cy]="speckle.cy"
            [attr.r]="speckle.r"
          />
        }

        @if (status() === 'examined' || status() === 'sampled') {
          <!-- Candling light: the shell is lit from behind so the trait record can be read. -->
          <ellipse class="candle" cx="32" cy="47" rx="17" ry="24" />
          <path class="candle-edge" d="M20 33c7-5 17-5 24 0" />
        }

        @if (status() === 'sampled') {
          <!-- Sampling needle and the strand it drew out. -->
          <path class="needle" d="M52 20 36 41" />
          <circle class="needle-tip" cx="35" cy="42" r="2.4" />
          <path class="strand" d="M25 50c0 6 14 6 14 12s-14 6-14 12" />
          <path class="strand second" d="M39 50c0 6-14 6-14 12s14 6 14 12" />
          <path class="rung" d="M27 56h10M25 62h14M27 68h10" />
        }

        @if (status() === 'hatched') {
          <path class="crack" d="M4 46l10-6 7 8 8-10 7 9 9-8 8 7 8-5" />
          <path class="crack minor" d="M22 42l4-12 6 9 5-11" />
        }

        @for (label of alleleLabels().slice(0, 3); track $index) {
          <g class="allele-locus" [attr.transform]="'translate(32 ' + locusY($index) + ')'">
            <rect x="-11" y="-7" width="22" height="14" rx="3" />
            <text x="0" y="3.2" text-anchor="middle">{{ label }}</text>
          </g>
        }
      </g>

      @if (locked()) {
        <g class="lock" transform="translate(26,38)">
          <rect x="1" y="7" width="12" height="10" rx="2" />
          <path class="shackle" d="M3.6 7V4.8a3.4 3.4 0 0 1 6.8 0V7" />
        </g>
      }

      @if (staged()) {
        <path class="stage-ring" [attr.d]="theme().shell.path" />
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      /* Height comes from the viewBox aspect ratio, so a shell keeps its shape in any tray cell. */
      svg {
        display: block;
        width: 100%;
        height: auto;
        overflow: visible;
      }

      .shell {
        fill: var(--dh-shell, #e6ecf5);
        stroke: var(--dh-shell-edge, #8fa7bf);
        stroke-width: 2;
      }

      .speckle {
        fill: var(--dh-speckle, #7d93ac);
        opacity: 0.5;
      }
      .aura {
        fill: currentColor;
        opacity: 0.16;
      }
      .allele-locus rect {
        fill: var(--dh-console, #20384f);
        stroke: var(--dh-staged, #67e8f9);
        stroke-width: 1;
      }
      /*
       * SVG user units, not CSS pixels: this scales with the viewBox. At the
       * glyph's 5.5rem cap against a 64-unit box the factor is ~1.375, so 9
       * units lands at ~12px on screen — the same floor --text-xs sets for
       * everything laid out in CSS. Allele letters are content, not decoration;
       * they may not fall below it. Raising this means growing the locus rect
       * in the template to match.
       */
      .allele-locus text {
        fill: #fff;
        font-family: ui-monospace, monospace;
        font-size: 9px;
        font-weight: 800;
      }

      .candle {
        fill: var(--dh-examined, #efc668);
        opacity: 0.5;
        animation: candle-warm var(--dh-candle-ms, 900ms) ease-out 1;
      }

      .candle-edge {
        fill: none;
        stroke: var(--dh-examined, #efc668);
        stroke-width: 1.6;
        opacity: 0.8;
      }

      .needle,
      .strand,
      .rung,
      .crack {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .needle {
        stroke: var(--dh-muted, #a4bcd0);
        stroke-width: 2.2;
      }
      .needle-tip {
        fill: var(--dh-sampled, #b49cf2);
      }
      .strand {
        stroke: var(--dh-sampled, #b49cf2);
        stroke-width: 2.4;
      }
      .strand.second {
        opacity: 0.62;
      }
      .rung {
        stroke: var(--dh-sampled, #b49cf2);
        stroke-width: 1.2;
        opacity: 0.7;
      }

      .crack {
        stroke: var(--dh-hatched, #58cba6);
        stroke-width: 3;
        animation: crack-open var(--dh-hatch-ms, 1400ms) ease-out 1;
      }

      .crack.minor {
        stroke-width: 1.8;
        opacity: 0.7;
      }

      .lock rect {
        fill: var(--dh-locked, #6d8098);
      }
      .lock .shackle {
        fill: none;
        stroke: var(--dh-locked, #6d8098);
        stroke-width: 1.6;
      }

      .stage-ring {
        fill: none;
        stroke: var(--dh-staged, #67e8f9);
        stroke-width: 2.6;
        stroke-dasharray: 7 5;
      }

      @keyframes candle-warm {
        from {
          opacity: 0;
        }
        to {
          opacity: 0.5;
        }
      }
      @keyframes crack-open {
        from {
          stroke-dasharray: 0 90;
        }
        to {
          stroke-dasharray: 90 0;
        }
      }

      :host(.reduced-motion) .candle,
      :host(.reduced-motion) .crack {
        animation: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .candle,
        .crack {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HatcheryEggGlyphComponent {
  readonly status = input.required<DragonEggStatusId>();
  readonly staged = input(false);
  readonly locked = input(false);
  /** Keeps every shell in a clutch individual, and keeps a given egg identical across replays. */
  readonly speckleSeed = input(0);
  readonly theme = input<DragonHatcheryTheme>(DRAGON_HATCHERY_THEME);
  /** Keeps SVG clip-path IDs unique when a whole tray is on one page. */
  readonly instanceId = input('egg');
  /** Optional inherited allele symbols shown at stable loci inside the existing egg shell. */
  readonly alleleLabels = input<readonly string[]>([]);

  readonly clipId = computed(() => `hatchery-shell-${this.instanceId()}`);
  readonly speckles = computed<readonly Speckle[]>(() =>
    buildSpeckles(this.speckleSeed(), this.theme().shell.speckleCount),
  );

  locusY(index: number): number {
    return [31, 48, 65][index] ?? 48;
  }
}

/** Deterministic shell markings: the same seed always draws the same egg. */
function buildSpeckles(seed: number, count: number): Speckle[] {
  const speckles: Speckle[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = fraction(seed, index * 3 + 1) * Math.PI * 2;
    const radius = 0.35 + fraction(seed, index * 3 + 2) * 0.6;
    speckles.push({
      cx: Number((32 + Math.cos(angle) * radius * 19).toFixed(2)),
      cy: Number((48 + Math.sin(angle) * radius * 27).toFixed(2)),
      r: Number((1.5 + fraction(seed, index * 3 + 3) * 1.8).toFixed(2)),
    });
  }
  return speckles;
}

function fraction(seed: number, salt: number): number {
  const hash = Math.imul(seed + salt * 2654435761, 2246822519) >>> 0;
  return (hash % 10000) / 10000;
}
