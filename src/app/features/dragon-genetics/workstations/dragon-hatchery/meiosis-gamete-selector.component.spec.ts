import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { SelectedMeiosisGamete } from './meiosis-gamete.models';
import { MeiosisGameteSelectorComponent } from './meiosis-gamete-selector.component';

describe('MeiosisGameteSelectorComponent', () => {
  let fixture: ComponentFixture<MeiosisGameteSelectorComponent>;
  let component: MeiosisGameteSelectorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MeiosisGameteSelectorComponent] });
    fixture = TestBed.createComponent(MeiosisGameteSelectorComponent);
    fixture.componentRef.setInput('parent', DRAGON_PARENTS[0]);
    fixture.componentRef.setInput('sex', 'female');
    fixture.componentRef.setInput('targetTraitId', 'scales');
    fixture.componentRef.setInput('baseSeed', 'selector-test');
    fixture.componentRef.setInput('roleLabel', 'Egg parent');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('starts with the parent cell and keeps gametes unavailable until meiosis is complete', () => {
    expect(component.phaseIndex()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.phase-track li').length).toBe(10);
    expect(fixture.nativeElement.querySelectorAll('.gamete-card').length).toBe(0);

    component.finishMeiosis();
    fixture.detectChanges();

    expect(component.phase().name).toBe('Four gametes');
    expect(fixture.nativeElement.querySelectorAll('.gamete-card').length).toBe(4);
  });

  it('emits exactly the inspected run and chosen gamete', () => {
    let selected: SelectedMeiosisGamete | null = null;
    component.gameteSelected.subscribe((value) => (selected = value));
    component.finishMeiosis();
    component.choose(2);
    component.reason.set('Carries the recessive target allele.');
    component.sendChosenGamete();

    expect(selected).not.toBeNull();
    expect(selected!.gamete.index).toBe(2);
    expect(selected!.run.seed).toBe(component.run()!.seed);
    expect(selected!.reason).toContain('recessive');
  });

  it('creates a different deterministic run when the student requests new random meiosis', () => {
    const firstSeed = component.run()!.seed;
    component.rerunMeiosis();
    fixture.detectChanges();

    expect(component.run()!.seed).not.toBe(firstSeed);
    expect(component.phaseIndex()).toBe(0);
  });
});
