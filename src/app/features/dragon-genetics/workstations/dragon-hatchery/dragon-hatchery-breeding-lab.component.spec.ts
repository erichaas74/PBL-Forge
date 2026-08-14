import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonHatcheryBreedingLabComponent } from './dragon-hatchery-breeding-lab.component';

describe('DragonHatcheryBreedingLabComponent', () => {
  const studentId = 'hatchery-parent-selector-spec';
  let fixture: ComponentFixture<DragonHatcheryBreedingLabComponent>;
  let component: DragonHatcheryBreedingLabComponent;

  beforeEach(() => {
    localStorage.removeItem(`pbl-forge.dragon-genetics.account-library.v1.${studentId}`);
    localStorage.removeItem(`pbl-forge.dragon-genetics.hatchery-breeding.v1.${studentId}`);
    TestBed.configureTestingModule({ imports: [DragonHatcheryBreedingLabComponent] });
    fixture = TestBed.createComponent(DragonHatcheryBreedingLabComponent);
    fixture.componentRef.setInput('studentId', studentId);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem(`pbl-forge.dragon-genetics.account-library.v1.${studentId}`);
    localStorage.removeItem(`pbl-forge.dragon-genetics.hatchery-breeding.v1.${studentId}`);
  });

  it('keeps whole-dragon selectors inside the parent setup and splits them by sex', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-account-genetics-file')).toBeNull();
    expect(root.textContent).not.toContain('Chromosomes');
    expect(root.querySelectorAll('.parent-selector.female .dragon-choice').length).toBe(2);
    expect(root.querySelectorAll('.parent-selector.male .dragon-choice').length).toBe(2);
    expect(root.querySelector('.allele-objective')).toBeNull();
  });

  it('loads each dragon only into its matching parent role', () => {
    const female = component.femaleDragons()[0];
    const male = component.maleDragons()[0];

    component.selectParent('female', female);
    component.selectParent('male', male);

    expect(component.eggParent()?.id).toBe(female.id);
    expect(component.spermParent()?.id).toBe(male.id);

    component.selectParent('female', male);
    expect(component.eggParent()?.id).toBe(female.id);
    expect(component.statusMessage()).toContain('female dragon');
  });
});
