import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { AccountDragonRecord } from './account-genetics-library.models';
import { DragonCardDeckSelectorComponent } from './dragon-card-deck-selector.component';

const DRAGONS: readonly AccountDragonRecord[] = DRAGON_PARENTS.map((dragon, index) => ({
  ...dragon,
  kind: 'dragon' as const,
  sex: index % 2 === 0 ? ('female' as const) : ('male' as const),
  source: 'foundation' as const,
  storedAtIso: '2026-01-01T00:00:00.000Z',
  generation: 0,
}));

describe('DragonCardDeckSelectorComponent', () => {
  let fixture: ComponentFixture<DragonCardDeckSelectorComponent>;
  let selector: DragonCardDeckSelectorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragonCardDeckSelectorComponent] });
    fixture = TestBed.createComponent(DragonCardDeckSelectorComponent);
    selector = fixture.componentInstance;
    fixture.componentRef.setInput('dragons', DRAGONS);
    fixture.componentRef.setInput('selectedDragonId', DRAGONS[0].id);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('uses the shared fanned cards and emits an exposed dragon selection', () => {
    const element = fixture.nativeElement as HTMLElement;
    spyOn(selector.dragonSelected, 'emit');

    expect(element.querySelectorAll('.fanned-deck__slot').length).toBe(DRAGONS.length);
    expect(element.querySelector('.is-active')?.textContent).toContain(DRAGONS[0].name);
    element.querySelector<HTMLElement>('.is-next .fanned-deck__peek')!.click();

    expect(selector.dragonSelected.emit).toHaveBeenCalledWith(DRAGONS[1]);
  });

  it('flips the active card and keeps chromosome selection on its back', () => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLElement>('.is-active .dragon-card--front')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.is-active .dragon-card-shell')?.classList).toContain(
      'is-flipped',
    );
    element
      .querySelector<HTMLButtonElement>('.is-active .chromosome-in-cell[data-chromosome="Chr 3"]')!
      .click();
    fixture.detectChanges();

    expect(selector.selectedChromosome(DRAGONS[0].id)).toBe('Chr 3');
    expect(element.querySelector('.is-active .dragon-card__gene-heading')?.textContent).toContain(
      'Chromosome pair 3',
    );
  });
});
