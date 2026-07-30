import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pure geometry for an instrument icon. Themes own the paths, so replacing artwork never
 * touches station logic.
 */
export interface StationGlyph {
  viewBox: string;
  /** Stroked outline paths, drawn with `fill: none`. */
  strokes: readonly string[];
  /** Filled paths for solid shapes. */
  fills?: readonly string[];
}

@Component({
  selector: 'app-station-glyph',
  template: `
    <svg
      [attr.viewBox]="glyph().viewBox"
      [attr.stroke-width]="strokeWidth()"
      focusable="false"
      aria-hidden="true">
      @for (path of glyph().fills ?? []; track $index) {
        <path class="glyph-fill" [attr.d]="path" />
      }
      @for (path of glyph().strokes; track $index) {
        <path class="glyph-stroke" [attr.d]="path" />
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .glyph-stroke { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }
    .glyph-fill { fill: currentColor; stroke: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationGlyphComponent {
  readonly glyph = input.required<StationGlyph>();
  readonly strokeWidth = input(1.6);
}
