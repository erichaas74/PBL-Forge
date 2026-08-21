import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { SpecimenFrame } from './specimen-pose';
import { SpecimenProfileRegistry } from './specimen-profile.registry';
import { SpecimenSource } from './specimen.models';
import { SpecimenThumbnailService } from './specimen-thumbnail.service';

/**
 * A specimen as a still image.
 *
 * The small, cheap sibling of {@link SpecimenViewComponent}: no orbit, no trait
 * panel, no live WebGL context — just a baked PNG. Use it anywhere a specimen
 * appears as an *illustration* rather than as the thing being examined: card
 * grids, sample pickers, clutch trays, comparison rows.
 *
 * Why this and not a live viewer per tile: browsers cap WebGL contexts at
 * roughly sixteen and silently drop the oldest, so a grid of live viewers turns
 * into blank squares as the student scrolls. {@link SpecimenThumbnailService}
 * bakes every tile through one shared offscreen context, so a clutch of eight
 * costs one context and scrolling afterwards is free.
 *
 * Reserve the live viewer for the one specimen a student has actually opened.
 */
@Component({
  selector: 'app-specimen-thumb',
  template: `
    @if (image(); as source) {
      <img [src]="source" [alt]="alt()" [style.--specimen-accent]="accent()" />
    } @else {
      <!--
        No WebGL, or a source this screen has no profile for. A silhouette plus
        the label is honest about what is missing; a blank box reads as a broken
        image and a fake dragon would misreport the genotype.
      -->
      <div class="fallback" [style.--specimen-accent]="accent()" role="img" [attr.aria-label]="alt()">
        <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false">
          <path
            d="M6 34c6-2 10-6 14-11 3-4 7-7 12-7s9 3 12 7c4 5 8 9 14 11-6 3-12 4-18 3-2 4-5 6-8 6s-6-2-8-6c-6 1-12 0-18-3Z" />
        </svg>
      </div>
    }
    @if (showLabel()) {
      <span class="nameplate">{{ label() }}</span>
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: block;
      min-width: 0;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 0.9rem;
      /* A warm ground so a transparent bake reads as lit, not as a hole. */
      background:
        radial-gradient(circle at 50% 118%, rgb(226 98 42 / 12%), transparent 62%),
        linear-gradient(168deg, var(--surface-raised), var(--surface-sunken));
    }
    img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .fallback { display: grid; width: 100%; height: 100%; place-items: center; padding: 18%; }
    .fallback svg { width: 100%; height: auto; fill: var(--specimen-accent, var(--muted)); opacity: 0.42; }
    .nameplate {
      position: absolute;
      right: 0.4rem;
      bottom: 0.4rem;
      left: 0.4rem;
      overflow: hidden;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: rgb(31 42 48 / 74%);
      color: var(--on-dark);
      font-size: var(--text-xs);
      font-weight: 800;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class SpecimenThumbComponent {
  readonly source = input.required<SpecimenSource>();
  /** Baked pixel size. Raise it for a hero tile, not for a grid. */
  readonly size = input(160);
  /** Shared framing, so a row of tiles shows real size differences. */
  readonly frame = input<SpecimenFrame | null>(null);
  /** Mutes every part the trait did not shape. */
  readonly focusedTraitId = input<string | null>(null);
  readonly showLabel = input(true);
  /** Overrides the label baked into the source. */
  readonly labelOverride = input<string | null>(null);

  private readonly registry = inject(SpecimenProfileRegistry);
  private readonly thumbnails = inject(SpecimenThumbnailService);

  private readonly resolution = computed(() => this.registry.resolve(this.source()));

  readonly label = computed(() => {
    const resolved = this.resolution();
    return this.labelOverride()
      ?? (resolved.status === 'ready' ? resolved.descriptor.label : 'Unavailable');
  });

  readonly accent = computed(() => {
    const resolved = this.resolution();
    return resolved.status === 'ready' ? resolved.descriptor.accentColor ?? null : null;
  });

  readonly alt = computed(() => `${this.label()} phenotype`);

  private readonly bakedImage = signal<string | null>(null);
  readonly image = this.bakedImage.asReadonly();

  /**
   * Baking is a side effect, so it runs in an effect and not in a computed.
   *
   * `bake` lazily mounts an offscreen WebGL renderer, and mounting writes a
   * signal (`contextLost`). Doing that inside a `computed` throws NG0600 —
   * correctly, because a computed is supposed to be a pure derivation that can
   * be re-evaluated or discarded at will, and spinning up a GPU context is
   * neither.
   */
  constructor() {
    effect(() => {
      const resolved = this.resolution();
      if (resolved.status !== 'ready') {
        this.bakedImage.set(null);
        return;
      }

      const size = this.size();
      const frame = this.frame();
      const focusedTraitId = this.focusedTraitId();

      // Untracked: the bake reads nothing reactive of its own, and letting it
      // register dependencies would re-enter this effect on its own writes.
      this.bakedImage.set(untracked(() => this.thumbnails.bake(resolved.descriptor, {
        size,
        frame,
        focusedTraitId,
        transparent: true,
      })));
    });
  }
}
