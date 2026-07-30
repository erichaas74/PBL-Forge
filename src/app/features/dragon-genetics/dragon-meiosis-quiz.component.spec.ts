import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DRAGON_PARENTS, DRAGON_TRAITS } from './simulation/domain/dragon-inheritance';
import { DragonMeiosisQuizComponent } from './dragon-meiosis-quiz.component';

describe('DragonMeiosisQuizComponent', () => {
  let fixture: ComponentFixture<DragonMeiosisQuizComponent>;
  let component: DragonMeiosisQuizComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragonMeiosisQuizComponent] });
    fixture = TestBed.createComponent(DragonMeiosisQuizComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parents', DRAGON_PARENTS);
    fixture.componentRef.setInput('selectedParents', [DRAGON_PARENTS[0], DRAGON_PARENTS[1]]);
    fixture.componentRef.setInput('traits', DRAGON_TRAITS);
    fixture.componentRef.setInput('focusTraitId', 'wings');
    fixture.componentRef.setInput('eggOptions', ['WW', 'Ww', 'ww']);
    fixture.componentRef.setInput('possibleEggs', new Set(['Ww', 'ww']));
    fixture.componentRef.setInput('predictions', ['Ww', 'ww']);
    fixture.componentRef.setInput('locked', false);
    fixture.componentRef.setInput('predictionCorrect', true);
    fixture.detectChanges();
  });

  it('tracks up to three genes through four gametes from each parent', () => {
    expect(component.selectedTraits().length).toBe(3);
    expect(component.parentAGametes().length).toBe(4);
    expect(component.parentBGametes().length).toBe(4);
    expect(component.parentAGametes().every((gamete) => gamete.alleles.length === 3)).toBeTrue();

    const wingAlleles = component.parentAGametes().map((gamete) => gamete.alleles[0].allele);
    expect(wingAlleles.filter((allele) => allele === 'W').length).toBe(2);
    expect(wingAlleles.filter((allele) => allele === 'w').length).toBe(2);
  });

  it('combines one gamete from each parent into four lettered eggs', () => {
    expect(component.fertilizedEggs().length).toBe(4);
    expect(component.fertilizedEggs().every((egg) => egg.genotypes.length === 3)).toBeTrue();
    expect(component.fertilizedEggs().map((egg) => egg.genotypes[0])).toEqual([
      'Ww',
      'Ww',
      'ww',
      'ww',
    ]);
  });

  it('runs the meiosis and fertilization animation after locking a prediction', fakeAsync(() => {
    const locked = jasmine.createSpy('predictionLocked');
    component.predictionLocked.subscribe(locked);

    component.runMeiosis();
    expect(locked).toHaveBeenCalled();
    expect(component.phase()).toBe('separating');
    tick(1300);
    expect(component.phase()).toBe('combining');
    tick(1400);
    expect(component.phase()).toBe('complete');
  }));
});
