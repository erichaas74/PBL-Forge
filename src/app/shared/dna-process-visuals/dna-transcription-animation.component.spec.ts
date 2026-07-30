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

  it('builds an RNA product with uracil at the source timing', fakeAsync(() => {
    expect(component.mrna().join('')).toBe('AUGC');
    component.play();
    tick(650 * 4);
    expect(component.complete()).toBeTrue();
  }));
});
