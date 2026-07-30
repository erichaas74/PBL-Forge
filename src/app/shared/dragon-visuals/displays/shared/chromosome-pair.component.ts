import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CHROMOSOME_DIAGRAM,
  ChromosomeDiagramTheme,
  chromosomeViewBox,
  clampGeneIndex,
  geneBandCentre,
} from './chromosome-diagram';

/**
 * A chromosome pair drawn in the style of `docs/allelle-diagram.html`: two banded chromosomes
 * with the allele letter for the focus gene on a leader line at each side.
 *
 * The component is decorative on its own — it is always `aria-hidden`, and the host supplies the
 * accessible text. Set `concealed` to cover the focus locus with the scanner shield, and use
 * `view: 'locus'` to crop to the focus band for compact option cards.
 */
@Component({
  selector: 'app-chromosome-pair',
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true">
      <defs>
        <pattern
          [attr.id]="hatchId()"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" [attr.stroke]="theme().shield.hatch" stroke-width="3" />
        </pattern>
      </defs>

      @for (column of columns(); track column.side) {
        <g [attr.transform]="'translate(' + column.x + ',' + theme().body.top + ')'">
          <rect
            class="chromosome-body"
            x="0"
            y="0"
            [attr.width]="theme().body.width"
            [attr.height]="theme().body.height"
            [attr.rx]="theme().body.radius"
            [attr.fill]="theme().fill"
            [attr.stroke]="theme().stroke"
            [attr.stroke-width]="theme().strokeWidth" />
          <line
            x1="0"
            [attr.y1]="theme().body.height / 2"
            [attr.x2]="theme().body.width"
            [attr.y2]="theme().body.height / 2"
            [attr.stroke]="theme().stroke"
            [attr.stroke-width]="theme().strokeWidth" />
          @for (band of theme().banding; track band.y) {
            <rect
              x="1.5"
              [attr.y]="band.y"
              [attr.width]="theme().body.width - 3"
              [attr.height]="band.height"
              [attr.fill]="band.fill" />
          }
          @for (band of theme().geneBands; track band.id) {
            <rect
              class="gene-band"
              [class.focus]="$index === focusIndex()"
              x="1"
              [attr.y]="band.y"
              [attr.width]="theme().body.width - 2"
              [attr.height]="band.height"
              [attr.fill]="band.fill" />
          }
        </g>
      }

      <line
        class="leader"
        [attr.x1]="theme().labels.leftLeader"
        [attr.y1]="bandCentre()"
        [attr.x2]="theme().columns.left"
        [attr.y2]="bandCentre()" />
      <line
        class="leader"
        [attr.x1]="theme().columns.right + theme().body.width"
        [attr.y1]="bandCentre()"
        [attr.x2]="theme().labels.rightLeader"
        [attr.y2]="bandCentre()" />

      @if (concealed()) {
        <g class="shield">
          <rect
            [attr.x]="2"
            [attr.y]="bandCentre() - 15"
            [attr.width]="theme().viewportWidth - 4"
            height="30"
            rx="6"
            [attr.fill]="theme().shield.fill" />
          <rect
            [attr.x]="2"
            [attr.y]="bandCentre() - 15"
            [attr.width]="theme().viewportWidth - 4"
            height="30"
            rx="6"
            [attr.fill]="'url(#' + hatchId() + ')'"
            opacity="0.55" />
          <rect
            [attr.x]="2"
            [attr.y]="bandCentre() - 15"
            [attr.width]="theme().viewportWidth - 4"
            height="30"
            rx="6"
            fill="none"
            [attr.stroke]="theme().shield.stroke"
            stroke-width="1.4" />
          <g [attr.transform]="'translate(' + (theme().viewportWidth / 2 - 6) + ',' + (bandCentre() - 7) + ')'">
            <rect x="1" y="6" width="10" height="8" rx="1.6" [attr.fill]="theme().shield.stroke" />
            <path
              d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6"
              fill="none"
              [attr.stroke]="theme().shield.stroke"
              stroke-width="1.4" />
          </g>
        </g>
      } @else {
        <text
          class="allele-letter"
          [attr.x]="theme().labels.leftText"
          [attr.y]="bandCentre()"
          text-anchor="end"
          dominant-baseline="central">{{ alleles()[0] }}</text>
        <text
          class="allele-letter"
          [attr.x]="theme().labels.rightText"
          [attr.y]="bandCentre()"
          text-anchor="start"
          dominant-baseline="central">{{ alleles()[1] }}</text>
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    /* The view box already includes the label gutters, so the locus crop must clip. */
    svg { display: block; width: 100%; height: 100%; overflow: hidden; }
    .gene-band { opacity: .35; transition: opacity .25s ease; }
    .gene-band.focus { opacity: 1; }
    .leader { stroke: currentColor; stroke-width: 1; opacity: .8; }
    .allele-letter { fill: currentColor; font-family: ui-monospace, monospace; font-size: 17px; font-weight: 800; }
    :host(.dim) .chromosome-body { opacity: .85; }
    @media (prefers-reduced-motion: reduce) { .gene-band { transition: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChromosomePairComponent {
  readonly alleles = input.required<readonly [string, string]>();
  /** Zero-based gene band, matching `chromosomeModel - 1` on the analysis sample. */
  readonly geneIndex = input(0);
  readonly view = input<'full' | 'locus'>('full');
  readonly concealed = input(false);
  readonly theme = input<ChromosomeDiagramTheme>(CHROMOSOME_DIAGRAM);
  /** Keeps SVG pattern IDs unique when several pairs are on one page. */
  readonly instanceId = input('pair');

  readonly focusIndex = computed(() => clampGeneIndex(this.theme(), this.geneIndex()));
  readonly bandCentre = computed(() => geneBandCentre(this.theme(), this.geneIndex()));
  readonly viewBox = computed(() =>
    chromosomeViewBox(this.theme(), this.geneIndex(), this.view()));
  readonly hatchId = computed(() => `shield-hatch-${this.instanceId()}`);
  readonly columns = computed(() => [
    { side: 'left' as const, x: this.theme().columns.left },
    { side: 'right' as const, x: this.theme().columns.right },
  ]);
}
