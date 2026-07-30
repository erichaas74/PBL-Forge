import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

  it('constructs both daughter complements base by base', fakeAsync(() => {
    expect(component.complement().join('')).toBe('TCAG');
    component.play();
    tick(480 * 4);
    expect(component.progress()).toBe(4);
    expect(component.complete()).toBeTrue();
  }));
});
