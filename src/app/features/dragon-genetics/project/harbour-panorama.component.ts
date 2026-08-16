import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The view from the academy door: a Norse island settlement at dusk.
 *
 * This is scenery, never information — it is always `aria-hidden`, carries no text, and the
 * page reads exactly the same with it switched off. It exists because the hub used to be a
 * flat dark card stack, and a student arriving at a three-week project should land somewhere
 * rather than on a form.
 *
 * ## What keeps it from looking like clip art
 *
 * Six depth planes, and every one of them differs from its neighbour in *three* ways at once —
 * value, contrast, and detail density. Distant rock is pale, low-contrast, and pure silhouette;
 * the near headland is nearly black, high-contrast, and carries longhouses, torches, and rope.
 * Haze pools at the base of each ridge (the `--haze` stop in every layer gradient), which is
 * what real air does and what flat vector art forgets.
 *
 * The other half is that nothing here is a clean geometric primitive. Ridge lines are authored
 * point by point with no repeating interval, mist is `feTurbulence` pushed through a
 * displacement map rather than a smooth ellipse, and a film of noise sits over the whole frame
 * so the large flat areas have some tooth.
 *
 * ## Transparent by construction
 *
 * There is no background rect. The sky is the host page's gradient showing through, so the
 * panorama drops onto any surface and the hero's torch glow can sit *behind* the far ridge
 * where it belongs.
 *
 * IDs are prefixed `dgh-` because gradients and filters live in a document-wide namespace and
 * this renders inside a page that has its own SVG instruments.
 */
@Component({
  selector: 'app-harbour-panorama',
  templateUrl: './harbour-panorama.component.html',
  styleUrl: './harbour-panorama.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class HarbourPanoramaComponent {}
