import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DnaTranscriptionAnimationComponent } from './dna-transcription-animation.component';

describe('DnaTranscriptionAnimationComponent', () => {
  let fixture: ComponentFixture<DnaTranscriptionAnimationComponent>;
  let component: DnaTranscriptionAnimationComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DnaTranscriptionAnimationComponent] });
    fixture = TestBed.createComponent(DnaTranscriptionAnimationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sequence', 'ATGC');
    fixture.detectChanges();
  });

  it('opens the DNA before building an RNA product with uracil', fakeAsync(() => {
    expect(component.mrna().join('')).toBe('AUGC');
    component.play();
    tick(300 * 4);
    expect(component.unzipProgress()).toBe(4);
    expect(component.progress()).toBe(0);
    expect(component.unzipComplete()).toBeTrue();

    tick(300 * 4);
    expect(component.complete()).toBeTrue();
  }));

  it('exposes unzipping before transcription on the shared timeline', () => {
    const element = fixture.nativeElement as HTMLElement;
    const stage = element.querySelector('.transcription-stage');
    expect(stage?.getAttribute('data-phase')).toBe('zipped');

    component.setTimelineProgress(3);
    fixture.detectChanges();
    expect(stage?.getAttribute('data-phase')).toBe('unzipping');
    expect(element.querySelectorAll('.dna-strand.coding .open').length).toBe(3);
    expect(component.progress()).toBe(0);

    component.setTimelineProgress(5);
    fixture.detectChanges();
    expect(stage?.getAttribute('data-phase')).toBe('transcription');
    expect(component.progress()).toBe(1);
  });

  it('uses the same complementary edge geometry for DNA and RNA bases', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.mrna-strand [data-base="U"].connector-bottom')).not.toBeNull();
    expect(element.querySelector('.template [data-base="T"].connector-top')).not.toBeNull();
  });
});
