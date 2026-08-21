import { Component, input, linkedSignal } from '@angular/core';

let accordionCount = 0;

/**
 * One collapsible section of a garage side panel.
 *
 * The panels stack a lot of controls into a narrow column, and most of them are
 * not in play at once. Collapsing the long ones keeps the whole panel reachable
 * without scrolling past the parts you actually came for.
 *
 * The body stays in the DOM and hides, rather than being destroyed, so nothing
 * inside loses its state on the way back open.
 */
@Component({
  selector: 'app-garage-accordion',
  templateUrl: './garage-accordion.component.html',
  styleUrl: './garage-accordion.component.css',
})
export class GarageAccordionComponent {
  readonly heading = input.required<string>();
  /** Shown as a pill beside the heading. Null hides it. */
  readonly count = input<number | null>(null);
  readonly startOpen = input(true);
  /** Heading level for assistive tech, so a section nests under its panel title. */
  readonly level = input(2);

  readonly open = linkedSignal(() => this.startOpen());
  readonly bodyId = `garage-accordion-${(accordionCount += 1)}`;

  toggle(): void {
    this.open.update(open => !open);
  }
}
