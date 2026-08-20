import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChromosomeUnravelingComponent } from './chromosome-unraveling.component';

describe('ChromosomeUnravelingComponent', () => {
  let fixture: ComponentFixture<ChromosomeUnravelingComponent>;
  let component: ChromosomeUnravelingComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChromosomeUnravelingComponent] });
    fixture = TestBed.createComponent(ChromosomeUnravelingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sequence', 'ATGCCGTACCGAGCTACCGGATCA');
    fixture.detectChanges();
  });

  it('keeps five addressable biological frames in one aligned SVG viewport', () => {
    const element = fixture.nativeElement as HTMLElement;
    const svg = element.querySelector('svg');

    expect(svg?.getAttribute('viewBox')).toBe('0 0 800 340');
    expect(element.querySelectorAll('.unravel-frame').length).toBe(5);
    expect(
      [...element.querySelectorAll<SVGGElement>('.unravel-frame')].map(
        (frame) => frame.dataset['frame'],
      ),
    ).toEqual(['1', '2', '3', '4', '5']);
    expect(element.querySelector('canvas')).toBeNull();
    expect(element.querySelector('image')).toBeNull();
  });

  it('lets a student move freely between all unpacking stages', () => {
    const element = fixture.nativeElement as HTMLElement;

    for (let index = 0; index < component.stages.length; index += 1) {
      component.selectStage(index);
      fixture.detectChanges();

      expect(component.stageIndex()).toBe(index);
      expect(element.querySelectorAll('.unravel-frame.active').length).toBe(1);
      expect(element.querySelector('.unravel-frame.active')?.getAttribute('data-frame')).toBe(
        String(index + 1),
      );
    }
  });

  it('draws packed chromatin, fiber units, and scaffolded loop domains as addressable SVG parts', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.packed-particle').length).toBe(280);
    expect(element.querySelectorAll('.fiber-unit').length).toBe(70);
    expect(element.querySelectorAll('[data-loop-domain]').length).toBe(14);
    expect(element.querySelectorAll('.scaffold-anchor').length).toBe(14);
  });

  it('draws histone subunits and sequence-colored DNA chemistry as separate SVG elements', () => {
    component.selectStage(4);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[data-nucleosome]').length).toBe(16);
    expect(element.querySelectorAll('.histone-lobe').length).toBe(64);
    expect(element.querySelectorAll('.dna-backbone').length).toBe(4);
    expect(element.querySelectorAll('.base-pair').length).toBe(44);
    expect(element.querySelectorAll('.dna-phosphate').length).toBe(92);
    expect(element.querySelectorAll('.base-bond').length).toBeGreaterThan(88);
    expect(element.querySelector('.base-half[data-base="A"]')).not.toBeNull();
    expect(element.querySelector('.base-half[data-base="T"]')).not.toBeNull();
    expect(element.querySelector('.base-half[data-base="C"]')).not.toBeNull();
    expect(element.querySelector('.base-half[data-base="G"]')).not.toBeNull();
  });

  it('plays the unpacking sequence in order and stops at exposed DNA', fakeAsync(() => {
    component.toggleAnimation();
    expect(component.playing()).toBeTrue();

    tick(1250 * 4);
    fixture.detectChanges();

    expect(component.stageIndex()).toBe(4);
    tick();
    expect(component.playing()).toBeFalse();
  }));
});
