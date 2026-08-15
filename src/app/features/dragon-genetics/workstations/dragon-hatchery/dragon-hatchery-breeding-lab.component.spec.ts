import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { generateMeiosisRun } from './meiosis-gamete.domain';
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
    const inventories = fixture.debugElement.queryAll(By.directive(AccountGeneticsFileComponent));

    expect(inventories.length).toBe(2);
    expect(inventories[0].componentInstance.sexFilter()).toBe('female');
    expect(inventories[1].componentInstance.sexFilter()).toBe('male');
    expect(root.textContent).not.toContain('Chromosomes');
    expect(root.querySelector('.allele-objective')).toBeNull();
  });

  it('loads each dragon only into its matching parent role', () => {
    const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
    const male = component.account().dragons.find((dragon) => dragon.sex === 'male')!;

    component.selectParent('female', female);
    component.selectParent('male', male);

    expect(component.eggParent()?.id).toBe(female.id);
    expect(component.spermParent()?.id).toBe(male.id);

    component.selectParent('female', male);
    expect(component.eggParent()?.id).toBe(female.id);
    expect(component.statusMessage()).toContain('female dragon');
  });

  it('saves each fertilized hatchling to the shared inventory with its modeled sex', () => {
    const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
    const male = component.account().dragons.find((dragon) => dragon.sex === 'male')!;
    component.selectParent('female', female);
    component.selectParent('male', male);

    const eggRun = generateMeiosisRun(female, 'female', 'inventory-egg', 'scales');
    const spermRun = generateMeiosisRun(male, 'male', 'inventory-sperm', 'scales');
    const spermGamete =
      spermRun.gametes.find((gamete) =>
        gamete.chromosomes.some((chromosome) => chromosome.sexChromosome === 'Y'),
      ) ?? spermRun.gametes[0];
    component.selectGamete('female', {
      run: eggRun,
      gamete: eggRun.gametes[0],
      reason: '',
      selectedAtIso: new Date().toISOString(),
    });
    component.selectGamete('male', {
      run: spermRun,
      gamete: spermGamete,
      reason: '',
      selectedAtIso: new Date().toISOString(),
    });

    component.fertilize();

    const saved = component.account().dragons.find((dragon) => dragon.source === 'student')!;
    expect(saved.id).toBe(component.clutch()[0].id);
    expect(saved.sex).toBe('male');
    expect(saved.parentIds).toEqual([female.id, male.id]);
    expect(saved.generation).toBe(1);
  });
});
