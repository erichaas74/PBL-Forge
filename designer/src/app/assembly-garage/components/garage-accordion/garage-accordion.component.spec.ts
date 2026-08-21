import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GarageAccordionComponent } from './garage-accordion.component';

@Component({
    imports: [GarageAccordionComponent],
    template: `
    <app-garage-accordion heading="Dragon Parts" [count]="4" [startOpen]="startOpen()">
      <p class="projected">body content</p>
    </app-garage-accordion>
  `,
})
class AccordionHostComponent {
    readonly startOpen = signal(true);
}

describe('GarageAccordionComponent', () => {
    let fixture: ComponentFixture<AccordionHostComponent>;

    function trigger(): HTMLButtonElement {
        return fixture.nativeElement.querySelector('.accordion__trigger');
    }

    function body(): HTMLElement {
        return fixture.nativeElement.querySelector('.accordion__body');
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [AccordionHostComponent] }).compileComponents();
        fixture = TestBed.createComponent(AccordionHostComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('labels the trigger with its heading and count', () => {
        expect(trigger().textContent).toContain('Dragon Parts');
        expect(trigger().textContent).toContain('4');
    });

    it('collapses and reopens on click', () => {
        expect(trigger().getAttribute('aria-expanded')).toBe('true');
        expect(body().hidden).toBe(false);

        trigger().click();
        fixture.detectChanges();

        expect(trigger().getAttribute('aria-expanded')).toBe('false');
        expect(body().hidden).toBe(true);

        trigger().click();
        fixture.detectChanges();

        expect(body().hidden).toBe(false);
    });

    it('keeps the projected content mounted while collapsed, so it holds its state', () => {
        trigger().click();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.projected')).not.toBeNull();
    });

    it('points the trigger at the body it controls', () => {
        expect(trigger().getAttribute('aria-controls')).toBe(body().id);
        expect(body().id).toBeTruthy();
    });

    it('honours a section that asks to start collapsed', async () => {
        fixture.componentInstance.startOpen.set(false);
        await fixture.whenStable();

        expect(body().hidden).toBe(true);
    });
});
