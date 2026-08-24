import { TestBed } from '@angular/core/testing';
import { GeneticsProgramResolver } from '../shared/genetics-program.resolver';
import { GeneticsIncubatorComponent } from './genetics-incubator.component';

describe('GeneticsIncubatorComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [GeneticsIncubatorComponent] });
  });

  it('prepares the Mini program outside specimen computation and renders its shared deck', async () => {
    const fixture = TestBed.createComponent(GeneticsIncubatorComponent);
    const program = TestBed.inject(GeneticsProgramResolver).resolve('mini-show');
    fixture.componentRef.setInput('program', program);
    fixture.componentRef.setInput('studentId', 'mini-incubator-regression');

    expect(() => fixture.detectChanges()).not.toThrow();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.specimens().length).toBeGreaterThanOrEqual(2);
    expect(fixture.componentInstance.cardBundles()).toHaveLength(
      fixture.componentInstance.specimens().length,
    );
    expect(fixture.nativeElement.querySelector('app-genetics-card-deck')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-mini-incubator-sampler')).toBeNull();
  });
});
