import { Component, computed, input, output, signal } from '@angular/core';
import { SpecimenThumbComponent } from '../../../../shared/assembly/preview/specimen-thumb.component';
import { MiniDragonCardStat, MiniDragonCardView } from './mini-dragon-card';

/**
 * One mini dragon, as a registry card the student picks up.
 *
 * The lab-dragon deck already has {@link DragonFlipCardComponent}; this is the
 * companion species' card and not a re-skin of it. What flips into view here is
 * a *breeder's* record — the visible form at all thirteen loci, marked against
 * the standard in force — because a mini dragon is judged on what can be seen,
 * and the chromosome back the lab dragon shows would hand a student the answer
 * their breeding is supposed to reveal.
 *
 * Selection lives on the card itself rather than on a separate button beside it:
 * every mini dragon station picks dragons out of the same kennel, and a picker
 * that shows only a name asks a student to choose a champion without looking at
 * it.
 */
@Component({
  selector: 'app-mini-dragon-card',
  imports: [SpecimenThumbComponent],
  templateUrl: './mini-dragon-card.component.html',
  styleUrl: './mini-dragon-card.component.scss',
})
export class MiniDragonCardComponent {
  readonly card = input.required<MiniDragonCardView>();
  readonly selected = input(false);
  readonly disabled = input(false);
  /** Station-specific numbers — training levels, show scores — shown on the front. */
  readonly stats = input<readonly MiniDragonCardStat[]>([]);
  /** Renders the portrait. Off for cards scrolled far out of view. */
  readonly renderPortrait = input(true);
  readonly selectLabel = input('Select');

  readonly cardSelected = output<string>();

  readonly flipped = signal(false);

  readonly standardLine = computed(() => {
    const card = this.card();
    if (!card.targetCount) return 'No breed standard written yet';
    return `${card.matchedCount}/${card.targetCount} to standard`;
  });

  select(): void {
    if (this.disabled()) return;
    this.cardSelected.emit(this.card().id);
  }

  toggleFlip(): void {
    if (this.disabled()) return;
    this.flipped.update((flipped) => !flipped);
  }
}
