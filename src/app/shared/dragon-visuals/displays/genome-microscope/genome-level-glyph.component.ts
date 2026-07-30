import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DragonGenomeLevelId } from '../../domain/dragon-visual.models';

/** Replaceable, curriculum-free scientific glyphs for the five microscope levels. */
@Component({
  selector: 'app-genome-level-glyph',
  template: `
    <svg viewBox="0 0 120 92" focusable="false" aria-hidden="true">
      @switch (level()) {
        @case ('cell') {
          <circle class="structure soft" cx="60" cy="46" r="34" />
          <circle class="structure strong" cx="60" cy="46" r="16" />
          <circle class="mark" cx="55" cy="42" r="3" />
          <circle class="mark" cx="65" cy="51" r="2.5" />
          <path class="detail" d="M31 41c8-5 9-13 3-18M87 59c-7 5-8 12-3 17M77 19c-4 8 0 13 8 15" />
        }
        @case ('chromosome') {
          <path class="structure strong" d="M28 14c14 9 18 21 31 32-13 11-17 23-31 32M58 14C44 23 40 35 27 46c13 11 17 23 31 32" />
          <path class="structure second" d="M63 14c14 9 18 21 31 32-13 11-17 23-31 32M93 14C79 23 75 35 62 46c13 11 17 23 31 32" />
          <circle class="mark" cx="43" cy="46" r="4" />
          <circle class="mark second-fill" cx="78" cy="46" r="4" />
        }
        @case ('dna') {
          <path class="structure strong" d="M31 8c0 21 58 21 58 38S31 63 31 84" />
          <path class="structure second" d="M89 8c0 21-58 21-58 38s58 17 58 38" />
          <path class="rung" d="M43 15h34M32 28h56M35 41h50M35 53h50M32 66h56M43 78h34" />
          <g class="bases">
            <text x="46" y="13">A</text><text x="68" y="13">T</text>
            <text x="42" y="39">C</text><text x="72" y="39">G</text>
            <text x="42" y="65">T</text><text x="72" y="65">A</text>
          </g>
        }
        @case ('gene') {
          <path class="structure" d="M22 19c25 0 51 54 76 54M98 19C73 19 47 73 22 73" />
          <path class="rung" d="M34 27l52 38M27 39l66 26M27 52l66-13M34 65l52-38" />
          <rect class="locus" x="48" y="27" width="25" height="38" rx="5" />
          <path class="pointer" d="M60 9v14m-5-5 5 5 5-5" />
        }
        @case ('allele') {
          <path class="chromosome-mini" d="M31 13c10 8 12 18 22 31-10 13-12 23-22 35M53 13c-10 8-12 18-22 31 10 13 12 23 22 35" />
          <path class="chromosome-mini second" d="M67 13c10 8 12 18 22 31-10 13-12 23-22 35M89 13c-10 8-12 18-22 31 10 13 12 23 22 35" />
          <circle class="allele-socket" cx="42" cy="45" r="13" />
          <circle class="allele-socket second" cx="78" cy="45" r="13" />
          <text class="allele-text" x="42" y="51">{{ revealed() ? alleles()[0] : '?' }}</text>
          <text class="allele-text" x="78" y="51">{{ revealed() ? alleles()[1] : '?' }}</text>
        }
      }
    </svg>
  `,
  styles: [`
    :host { display: block; width: 100%; color: var(--gm-level-accent, currentColor); }
    svg { display: block; width: 100%; height: auto; overflow: visible; }
    .structure, .detail, .rung, .pointer, .chromosome-mini {
      fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round;
      stroke-linejoin: round;
    }
    .structure.soft { fill: currentColor; fill-opacity: .08; }
    .structure.strong, .chromosome-mini { stroke-width: 4; }
    .structure.second, .chromosome-mini.second, .second { opacity: .62; }
    .detail, .rung { opacity: .58; stroke-width: 1.5; }
    .mark, .second-fill { fill: currentColor; }
    .locus { fill: currentColor; fill-opacity: .22; stroke: currentColor; stroke-width: 2; }
    .pointer { stroke-width: 2; }
    .bases text { fill: currentColor; font: 500 7px ui-monospace, monospace; text-anchor: middle; }
    .allele-socket { fill: var(--gm-console-bottom); stroke: currentColor; stroke-width: 2.5; }
    .allele-text { fill: var(--gm-ink); font: 500 18px ui-monospace, monospace; text-anchor: middle; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenomeLevelGlyphComponent {
  readonly level = input.required<DragonGenomeLevelId>();
  readonly alleles = input<readonly [string, string]>(['?', '?']);
  readonly revealed = input(false);
}
