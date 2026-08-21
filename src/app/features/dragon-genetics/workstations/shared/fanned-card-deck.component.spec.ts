import { Component, ViewChild, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FannedCardDeckComponent, FannedDeckItem } from './fanned-card-deck.component';

@Component({
    imports: [FannedCardDeckComponent],
    template: `
    <ng-template #card let-item>
      <span class="test-card">{{ item.id }}</span>
    </ng-template>
    <app-fanned-card-deck
      [items]="items()"
      [activeId]="activeId()"
      [cardTemplate]="card"
      [labelFor]="labelFor"
      (activeItemChange)="select($event)"
    />
  `,
})
class FannedDeckTestHost {
    readonly items = signal<readonly FannedDeckItem[]>([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
    readonly activeId = signal('b');
    readonly labelFor = (item: FannedDeckItem) => `Dragon ${item.id.toUpperCase()}`;

    @ViewChild(FannedCardDeckComponent)
    deck!: FannedCardDeckComponent;

    select(item: FannedDeckItem): void {
        this.activeId.set(item.id);
    }
}

describe('FannedCardDeckComponent', () => {
    let fixture: ComponentFixture<FannedDeckTestHost>;
    let host: FannedDeckTestHost;

    beforeEach(async () => {
        TestBed.configureTestingModule({ imports: [FannedDeckTestHost] });
        fixture = TestBed.createComponent(FannedDeckTestHost);
        host = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('centres one card and exposes the previous and next names', () => {
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('.is-active .test-card')?.textContent).toContain('b');
        expect(element.querySelector('.is-next .fanned-deck__peek')?.textContent).toContain('Dragon C');
        expect(element.querySelector('.is-previous .fanned-deck__peek')?.textContent).toContain('Dragon A');
    });

    it('brings an exposed card forward and wraps arrow navigation', async () => {
        (fixture.nativeElement as HTMLElement)
            .querySelector<HTMLElement>('.is-next .fanned-deck__peek')
            ?.click();
        await fixture.whenStable();
        expect(host.activeId()).toBe('c');

        host.activeId.set('a');
        await fixture.whenStable();
        host.deck.move(-1);
        await fixture.whenStable();
        expect(host.activeId()).toBe('d');
    });

    it('shuffles forward and backward when a drag crosses the swipe threshold', () => {
        const surface = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.fanned-deck')!;
        swipe(host.deck, surface, 200, 120);
        fixture.detectChanges();
        expect(host.activeId()).toBe('c');

        swipe(host.deck, surface, 120, 200);
        fixture.detectChanges();
        expect(host.activeId()).toBe('b');
    });

    it('keeps the centred stack for decks of up to ten cards', () => {
        host.items.set(Array.from({ length: 10 }, (_, index) => ({ id: `dragon-${index}` })));
        host.activeId.set('dragon-5');
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelectorAll('.fanned-deck__slot')).toHaveLength(10);
        expect(element.querySelector('.is-active .test-card')?.textContent).toContain('dragon-5');
        expect(element.querySelector('.is-next')).not.toBeNull();
        expect(element.querySelector('.is-previous')).not.toBeNull();
        expect(element.querySelectorAll('.is-later, .is-earlier').length).toBe(7);
    });
});

function swipe(deck: FannedCardDeckComponent, surface: HTMLElement, startX: number, endX: number): void {
    surface.setPointerCapture = () => undefined;
    deck.handlePointerDown(pointerEvent(surface, startX));
    deck.handlePointerMove(pointerEvent(surface, endX));
    deck.handlePointerEnd(pointerEvent(surface, endX));
}

function pointerEvent(surface: HTMLElement, clientX: number): PointerEvent {
    return {
        clientX,
        clientY: 100,
        pointerId: 1,
        currentTarget: surface,
        target: surface,
        preventDefault: () => undefined,
    } as unknown as PointerEvent;
}
