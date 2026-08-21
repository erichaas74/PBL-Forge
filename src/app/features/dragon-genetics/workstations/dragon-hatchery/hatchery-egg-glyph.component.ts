import { Component, computed, input } from '@angular/core';
import { DragonEggStatusId } from '../../../../shared/dragon-visuals/domain/dragon-visual.models';
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
  templateUrl: './hatchery-egg-glyph.component.html',
  styleUrl: './hatchery-egg-glyph.component.scss',
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
