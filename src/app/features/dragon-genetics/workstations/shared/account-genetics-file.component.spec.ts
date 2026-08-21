import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubSpecimenThumbnailRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsFileComponent } from './account-genetics-file.component';

describe('AccountGeneticsFileComponent', () => {
  let fixture: ComponentFixture<AccountGeneticsFileComponent>;
  let component: AccountGeneticsFileComponent;

  beforeEach(() => {
    stubSpecimenThumbnailRendering();
    TestBed.configureTestingModule({ imports: [AccountGeneticsFileComponent] });
    fixture = TestBed.createComponent(AccountGeneticsFileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', 'account-inventory-component-spec');
    fixture.componentRef.setInput('dragonsOnly', true);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('stays collapsed until opened, then shuffles a dragon card before activating it', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.file-body')).toBeNull();

    root.querySelector<HTMLButtonElement>('.file-handle')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-dragon-card-deck-selector')).not.toBeNull();
    expect(root.querySelectorAll('.fanned-deck__slot').length).toBe(4);

    root.querySelector<HTMLElement>('.is-next .fanned-deck__peek')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-specimen-thumb')).not.toBeNull();
    expect(root.querySelector('app-specimen-viewport')).toBeNull();

    const selected = component.activeDeckDragon()!;
    spyOn(component.recordSelected, 'emit');
    root.querySelector<HTMLButtonElement>('.deck-selection button')!.click();
    expect(component.recordSelected.emit).toHaveBeenCalledWith(selected);
  });

  it('filters a shared account inventory by dragon sex', () => {
    fixture.componentRef.setInput('sexFilter', 'female');
    component.open.set(true);
    fixture.detectChanges();

    expect(component.visibleRecords().length).toBe(2);
    expect(
      component
        .visibleRecords()
        .every((record) => record.kind === 'dragon' && record.sex === 'female'),
    ).toBeTrue();
  });
});
