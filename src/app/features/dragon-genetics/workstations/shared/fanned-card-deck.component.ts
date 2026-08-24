import {
  Component,
  TemplateRef,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface FannedDeckItem {
  id: string;
}

export interface FannedCardContext<T extends FannedDeckItem = FannedDeckItem> {
  $implicit: T;
  active: boolean;
  position: number;
  renderPortrait: boolean;
}

@Component({
  selector: 'app-fanned-card-deck',
  imports: [NgTemplateOutlet],
  templateUrl: './fanned-card-deck.component.html',
  styleUrl: './fanned-card-deck.component.scss',
})
export class FannedCardDeckComponent<T extends FannedDeckItem = FannedDeckItem> {
  readonly items = input.required<readonly T[]>();
  readonly activeId = input.required<string>();
  readonly cardTemplate = input.required<TemplateRef<FannedCardContext<T>>>();
  readonly labelFor = input<(item: T) => string>((item) => item.id);
  readonly subtitleFor = input<(item: T) => string>(() => '');
  readonly ariaLabel = input('Dragon card deck');
  readonly disabled = input(false);

  readonly activeItemChange = output<T>();

  readonly dragX = signal(0);
  readonly dragging = signal(false);
  readonly activeIndex = computed(() => {
    const index = this.items().findIndex((item) => item.id === this.activeId());
    return index < 0 ? 0 : index;
  });
  private readonly navigationIndex = linkedSignal(() => this.activeIndex());

  readonly activeLabel = computed(() => {
    const item = this.items()[this.activeIndex()];
    return item ? this.labelFor()(item) : '';
  });

  private dragStart: { x: number; y: number; pointerId: number } | null = null;
  private suppressClickUntil = 0;

  position(item: T): number {
    const items = this.items();
    if (items.length < 2) return 0;
    const itemIndex = items.findIndex((candidate) => candidate.id === item.id);
    if (itemIndex < 0) return 0;
    let position = itemIndex - this.activeIndex();
    const halfway = items.length / 2;
    if (position > halfway) position -= items.length;
    if (position < -halfway) position += items.length;
    return position;
  }

  templateContext(item: T): FannedCardContext<T> {
    const position = this.position(item);
    return {
      $implicit: item,
      active: position === 0,
      position,
      renderPortrait: Math.abs(position) <= 1,
    };
  }

  stackOrder(item: T): number {
    const position = this.position(item);
    if (position === 0) return 100;
    return position > 0 ? 80 - Math.abs(position) : 70 - Math.abs(position);
  }

  activate(item: T): void {
    if (
      this.disabled() ||
      item.id === this.activeId() ||
      performance.now() < this.suppressClickUntil
    ) {
      return;
    }
    this.activeItemChange.emit(item);
  }

  /** Lets card content avoid treating the click generated after a drag as an activation. */
  isClickSuppressed(): boolean {
    return performance.now() < this.suppressClickUntil;
  }

  move(direction: -1 | 1): void {
    if (this.disabled()) return;
    const items = this.items();
    if (items.length < 2) return;
    const nextIndex = (this.navigationIndex() + direction + items.length) % items.length;
    // Keep rapid keyboard/button taps moving from the last requested card while the parent input
    // catches up on the next change-detection pass.
    this.navigationIndex.set(nextIndex);
    this.activeItemChange.emit(items[nextIndex]);
  }

  handleSlotKeydown(event: KeyboardEvent, item: T): void {
    if (item.id === this.activeId()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activate(item);
    }
  }

  handleDeckKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget && isInteractiveTarget(event.target)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.move(1);
    }
  }

  handlePointerDown(event: PointerEvent): void {
    if (this.disabled() || this.items().length < 2 || isInteractiveTarget(event.target)) return;
    this.dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }

  handlePointerMove(event: PointerEvent): void {
    const start = this.dragStart;
    if (!start || start.pointerId !== event.pointerId) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (!this.dragging() && Math.abs(y) > Math.abs(x) && Math.abs(y) > 8) {
      this.cancelDrag();
      return;
    }
    if (Math.abs(x) > 7 && !this.dragging()) {
      this.dragging.set(true);
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    }
    if (!this.dragging()) return;
    event.preventDefault();
    this.dragX.set(Math.max(-110, Math.min(110, x)));
  }

  handlePointerEnd(event: PointerEvent): void {
    const start = this.dragStart;
    if (!start || start.pointerId !== event.pointerId) return;
    const x = event.clientX - start.x;
    const moved = this.dragging();
    this.cancelDrag();
    if (!moved) return;
    this.suppressClickUntil = performance.now() + 260;
    if (Math.abs(x) >= 42) this.move(x < 0 ? 1 : -1);
  }

  handlePointerCancel(): void {
    this.cancelDrag();
  }

  private cancelDrag(): void {
    this.dragStart = null;
    this.dragging.set(false);
    this.dragX.set(0);
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('button, a, input, select, textarea, label');
}
