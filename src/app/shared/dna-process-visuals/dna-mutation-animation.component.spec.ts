import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DnaMutationAnimationComponent } from './dna-mutation-animation.component';

describe('DnaMutationAnimationComponent', () => {
  let fixture: ComponentFixture<DnaMutationAnimationComponent>;
  let component: DnaMutationAnimationComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DnaMutationAnimationComponent] });
    fixture = TestBed.createComponent(DnaMutationAnimationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', 'insertion');
    fixture.componentRef.setInput('sequence', 'AGTCAT');
    fixture.detectChanges();
  });

  it('plays the incoming-pair mutation choreography to completion', fakeAsync(() => {
    component.play();
    tick(650);
    expect(component.phase()).toBe(1);
    tick(800);
    expect(component.phase()).toBe(2);
    expect(component.result().length).toBe(component.bases().length + 1);
  }));

  it('keeps keyed connectors on starting, incoming, and result pairs', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.original-ladder .connector-bottom')).not.toBeNull();
    expect(element.querySelector('.incoming-pair .connector-top')).not.toBeNull();
    expect(element.querySelector('.result-ladder .connector-bottom')).not.toBeNull();
  });

  it('only completes mismatch repair with the complementary base', fakeAsync(() => {
    fixture.componentRef.setInput('mode', 'repair');
    fixture.detectChanges();
    component.chooseRepair('C');
    expect(component.repairCorrect()).toBeFalse();
    component.chooseRepair(component.correctRepairBase());
    tick(720);
    expect(component.repairCorrect()).toBeTrue();
    expect(component.phase()).toBe(2);
  }));
});
