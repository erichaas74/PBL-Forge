import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ACCOUNT_GENETICS_RECORD_DRAG_TYPE } from '../shared/account-genetics-library.models';
import { isBreedingAdult } from './island-diversity.domain';
import { IslandDiversityManagerComponent } from './island-diversity-manager.component';

describe('IslandDiversityManagerComponent', () => {
  let fixture: ComponentFixture<IslandDiversityManagerComponent>;
  let component: IslandDiversityManagerComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [IslandDiversityManagerComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(IslandDiversityManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps an individual genotype out of the DOM until that dragon is scanned', () => {
    const dragon = component.selectedPopulation().dragons[0];
    component.selectDragon(dragon);
    fixture.detectChanges();

    const console = fixture.nativeElement.querySelector('.scanner-readout') as HTMLElement;
    expect(console.textContent).toContain('Genotype sealed');
    expect(console.querySelector('.genotype-grid')).toBeNull();

    component.scanSelectedDragon();
    fixture.detectChanges();
    expect(console.querySelector('.genotype-grid')).not.toBeNull();
    expect(console.textContent).toContain('Horn pigment');
  });

  it('supports both click and drag paths for individual relocation', () => {
    const first = component.selectedPopulation().dragons[0];
    component.selectDragon(first);
    component.relocateSelected('founders-isle');
    expect(
      component.world().islands['founders-isle'].dragons.some((dragon) => dragon.id === first.id),
    ).toBeTrue();

    component.visitIsland('stormbreak');
    const second = component.selectedPopulation().dragons[0];
    component.dropOnIsland(dragEvent('application/x-pbl-island-dragon', second.id), 'moonmist');
    expect(
      component.world().islands.moonmist.dragons.some((dragon) => dragon.id === second.id),
    ).toBeTrue();
  });

  it('supports click and drag paths for protected breeding berths', () => {
    component.visitIsland('sanctuary');
    const adults = component
      .selectedPopulation()
      .dragons.filter(
        (dragon) =>
          isBreedingAdult(dragon) &&
          dragon.ageGenerations <= 3 &&
          component.moonfadeStatus(dragon) !== 'Affected',
      );
    const female = adults.find((dragon) => dragon.sex === 'female')!;
    const male = adults.find((dragon) => dragon.sex === 'male')!;

    component.selectDragon(female);
    component.placeSelectedParent(0);
    component.dropProtectedParent(dragEvent('application/x-pbl-island-dragon', male.id), 1);

    expect(component.selectedPopulation().protectedPair).toEqual([female.id, male.id]);
    expect(component.pairIssue()).toContain('up to two offspring');
  });

  it('advances only the open island and preserves a generation evidence record', () => {
    const stormbreakGeneration = component.world().islands.stormbreak.generation;
    const moonmistGeneration = component.world().islands.moonmist.generation;

    component.advanceGeneration();

    expect(component.world().islands.stormbreak.generation).toBe(stormbreakGeneration + 1);
    expect(component.world().islands.moonmist.generation).toBe(moonmistGeneration);
    expect(component.world().islands.stormbreak.timeline.length).toBe(2);
  });

  it('admits an account dragon through click and chromosome-drop paths without revealing its genotype', () => {
    const ember = component.accountSnapshot().dragons.find((dragon) => dragon.id === 'ember')!;
    component.selectAccountRecord(ember);
    component.admitStagedAccountDragon();
    expect(component.world().admittedAccountDragonIds).toContain('ember');
    expect(component.selectedIslandId()).toBe('sanctuary');

    const chromosome = component
      .accountSnapshot()
      .chromosomes.find((record) => record.dragonId === 'tide')!;
    component.dropOnIsland(
      dragEvent(
        ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
        JSON.stringify({ kind: 'chromosome', id: chromosome.id }),
      ),
      'sanctuary',
    );

    expect(component.world().admittedAccountDragonIds).toContain('tide');
    const accountDragon = component
      .world()
      .islands.sanctuary.dragons.find((dragon) => dragon.accountDragonId === 'tide')!;
    expect(component.world().scannedDragonIds).not.toContain(accountDragon.id);
  });

  it('saves a student-built island note in the persistent world', () => {
    component.updateNote(
      'Stormbreak has few lineages, so I am comparing diversity before and after one relocation.',
    );
    component.saveFieldNote();

    expect(component.world().notes.stormbreak?.text).toContain('few lineages');
    expect(component.ledgerOpen()).toBeFalse();
  });
});

function dragEvent(type: string, value: string): DragEvent {
  return {
    preventDefault: jasmine.createSpy('preventDefault'),
    dataTransfer: {
      types: [type],
      getData: (requestedType: string) => (requestedType === type ? value : ''),
    },
  } as unknown as DragEvent;
}
