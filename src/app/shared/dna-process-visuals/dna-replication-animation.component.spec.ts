import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DnaReplicationAnimationComponent } from './dna-replication-animation.component';

describe('DnaReplicationAnimationComponent', () => {
    let fixture: ComponentFixture<DnaReplicationAnimationComponent>;
    let component: DnaReplicationAnimationComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [DnaReplicationAnimationComponent] });
        fixture = TestBed.createComponent(DnaReplicationAnimationComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('sequence', 'AGTC');
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('unzips the original DNA before constructing both daughter complements', () => {
        vi.useFakeTimers();
        expect(component.complement().join('')).toBe('TCAG');
        component.play();
        vi.advanceTimersByTime(240 * 4);
        expect(component.unzipProgress()).toBe(4);
        expect(component.progress()).toBe(0);
        expect(component.unzipComplete()).toBe(true);

        vi.advanceTimersByTime(240 * 4);
        expect(component.progress()).toBe(4);
        expect(component.complete()).toBe(true);
    });

    it('lets the timeline inspect the zipped, unzipping, and synthesis phases', () => {
        const element = fixture.nativeElement as HTMLElement;
        const stage = element.querySelector('.replication-stage');
        expect(stage?.getAttribute('data-phase')).toBe('zipped');

        component.setTimelineProgress(2);
        fixture.detectChanges();
        expect(stage?.getAttribute('data-phase')).toBe('unzipping');
        expect(element.querySelectorAll('.strand.original.top .open').length).toBe(2);

        component.setTimelineProgress(6);
        fixture.detectChanges();
        expect(stage?.getAttribute('data-phase')).toBe('synthesis');
        expect(component.progress()).toBe(2);
    });

    it('faces complementary connector edges toward both daughter strands', () => {
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelectorAll('.nucleotide-base.connector-bottom').length).toBe(8);
        expect(element.querySelectorAll('.nucleotide-base.connector-top').length).toBe(8);
    });

    it('places each new base row on the template-facing side of its new backbone', () => {
        const element = fixture.nativeElement as HTMLElement;
        const upperChildren = [...element.querySelector('.strand.new.upper')!.children];
        const lowerChildren = [...element.querySelector('.strand.new.lower')!.children];

        expect(upperChildren[0].classList).toContain('base-row');
        expect(upperChildren[1].classList).toContain('rail');
        expect(lowerChildren[1].classList).toContain('rail');
        expect(lowerChildren[2].classList).toContain('base-row');
    });
});
